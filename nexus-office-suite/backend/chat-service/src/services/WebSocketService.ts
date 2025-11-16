import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import redisClient from '../config/redis';
import { UserStatus, SocketUser } from '../types';
import { SocketEvents } from '../types/socket';

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '5000'),
      pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
    });

    this.setupMiddleware();
  }

  private setupMiddleware(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error('Authentication error: Token missing'));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || 'secret'
        ) as any;

        socket.data.userId = decoded.userId || decoded.id;
        socket.data.username = decoded.username;

        next();
      } catch (error) {
        next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  public getIO(): SocketIOServer {
    return this.io;
  }

  public async addUserConnection(userId: string, socketId: string): Promise<void> {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }

    this.connectedUsers.get(userId)!.add(socketId);

    // Store in Redis for cross-server communication
    const socketUser: SocketUser = {
      userId,
      socketId,
      channels: [],
      status: UserStatus.ONLINE,
      connectedAt: new Date(),
    };

    await redisClient.hSet(
      'socket:users',
      socketId,
      JSON.stringify(socketUser)
    );

    // Update user count
    await redisClient.sAdd(`user:sockets:${userId}`, socketId);

    console.log(`User ${userId} connected with socket ${socketId}`);
  }

  public async removeUserConnection(userId: string, socketId: string): Promise<void> {
    const userSockets = this.connectedUsers.get(userId);

    if (userSockets) {
      userSockets.delete(socketId);

      if (userSockets.size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Remove from Redis
    await redisClient.hDel('socket:users', socketId);
    await redisClient.sRem(`user:sockets:${userId}`, socketId);

    // Check if user has any other connections
    const remainingSockets = await redisClient.sMembers(`user:sockets:${userId}`);

    if (remainingSockets.length === 0) {
      // User is completely offline
      await redisClient.del(`user:sockets:${userId}`);
    }

    console.log(`User ${userId} disconnected socket ${socketId}`);
  }

  public async isUserOnline(userId: string): Promise<boolean> {
    const sockets = await redisClient.sMembers(`user:sockets:${userId}`);
    return sockets.length > 0;
  }

  public async getUserSocketIds(userId: string): Promise<string[]> {
    const sockets = await redisClient.sMembers(`user:sockets:${userId}`);
    return sockets;
  }

  public async joinChannel(socketId: string, channelId: string): Promise<void> {
    const socket = this.io.sockets.sockets.get(socketId);

    if (socket) {
      socket.join(`channel:${channelId}`);

      // Update in Redis
      const userData = await redisClient.hGet('socket:users', socketId);

      if (userData) {
        const socketUser: SocketUser = JSON.parse(userData);
        if (!socketUser.channels.includes(channelId)) {
          socketUser.channels.push(channelId);
          await redisClient.hSet(
            'socket:users',
            socketId,
            JSON.stringify(socketUser)
          );
        }
      }

      console.log(`Socket ${socketId} joined channel ${channelId}`);
    }
  }

  public async leaveChannel(socketId: string, channelId: string): Promise<void> {
    const socket = this.io.sockets.sockets.get(socketId);

    if (socket) {
      socket.leave(`channel:${channelId}`);

      // Update in Redis
      const userData = await redisClient.hGet('socket:users', socketId);

      if (userData) {
        const socketUser: SocketUser = JSON.parse(userData);
        socketUser.channels = socketUser.channels.filter((ch) => ch !== channelId);
        await redisClient.hSet(
          'socket:users',
          socketId,
          JSON.stringify(socketUser)
        );
      }

      console.log(`Socket ${socketId} left channel ${channelId}`);
    }
  }

  public emitToChannel(channelId: string, event: string, data: any): void {
    this.io.to(`channel:${channelId}`).emit(event, data);
  }

  public async emitToUser(userId: string, event: string, data: any): Promise<void> {
    const socketIds = await this.getUserSocketIds(userId);

    socketIds.forEach((socketId) => {
      this.io.to(socketId).emit(event, data);
    });
  }

  public emitToSocket(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data);
  }

  public broadcast(event: string, data: any): void {
    this.io.emit(event, data);
  }

  // Typing indicators with throttling
  public async setTyping(
    channelId: string,
    userId: string,
    username: string,
    isTyping: boolean
  ): Promise<void> {
    const key = `typing:${channelId}:${userId}`;

    if (isTyping) {
      await redisClient.setEx(key, 5, username); // 5 seconds TTL

      this.emitToChannel(channelId, SocketEvents.USER_TYPING, {
        channelId,
        userId,
        username,
        isTyping: true,
      });
    } else {
      await redisClient.del(key);

      this.emitToChannel(channelId, SocketEvents.USER_TYPING, {
        channelId,
        userId,
        username,
        isTyping: false,
      });
    }
  }

  public async getTypingUsers(channelId: string): Promise<string[]> {
    const pattern = `typing:${channelId}:*`;
    const keys = await redisClient.keys(pattern);

    const users = await Promise.all(
      keys.map((key) => redisClient.get(key))
    );

    return users.filter((user): user is string => user !== null);
  }

  // User status management
  public async updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    await redisClient.hSet('user:status', userId, status);

    // Notify all connected users
    this.broadcast(SocketEvents.STATUS_UPDATED, {
      userId,
      status,
    });
  }

  public async getUserStatus(userId: string): Promise<UserStatus> {
    const status = await redisClient.hGet('user:status', userId);
    return (status as UserStatus) || UserStatus.OFFLINE;
  }

  // Presence tracking
  public async trackPresence(userId: string): Promise<void> {
    const key = `presence:${userId}`;
    await redisClient.setEx(key, 60, Date.now().toString()); // 60 seconds TTL
  }

  public async getOnlineUsers(): Promise<string[]> {
    const pattern = 'presence:*';
    const keys = await redisClient.keys(pattern);
    return keys.map((key) => key.replace('presence:', ''));
  }

  // Cleanup on shutdown
  public async cleanup(): Promise<void> {
    console.log('Cleaning up WebSocket connections...');

    // Close all socket connections
    this.io.close();

    // Clear connected users
    this.connectedUsers.clear();

    console.log('WebSocket cleanup complete');
  }
}

export default WebSocketService;
