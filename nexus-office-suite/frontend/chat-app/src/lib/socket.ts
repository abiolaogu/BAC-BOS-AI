import { io, Socket } from 'socket.io-client';
import { Message, UserStatus, TypingIndicator } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';

export enum SocketEvents {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // Authentication
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',

  // Channels
  JOIN_CHANNEL = 'channel:join',
  LEAVE_CHANNEL = 'channel:leave',
  CHANNEL_JOINED = 'channel:joined',
  CHANNEL_LEFT = 'channel:left',

  // Messages
  MESSAGE_SEND = 'message:send',
  MESSAGE_CREATED = 'message:created',
  MESSAGE_UPDATE = 'message:update',
  MESSAGE_UPDATED = 'message:updated',
  MESSAGE_DELETE = 'message:delete',
  MESSAGE_DELETED = 'message:deleted',

  // Reactions
  REACTION_ADD = 'reaction:add',
  REACTION_ADDED = 'reaction:added',
  REACTION_REMOVE = 'reaction:remove',
  REACTION_REMOVED = 'reaction:removed',

  // Typing
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  USER_TYPING = 'user:typing',

  // Read Receipts
  MESSAGE_READ = 'message:read',
  MESSAGES_READ = 'messages:read',

  // User Status
  STATUS_UPDATE = 'status:update',
  STATUS_UPDATED = 'status:updated',
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',

  // Presence
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left',
}

type EventCallback = (...args: any[]) => void;

class SocketClient {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.eventHandlers.clear();
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on(SocketEvents.CONNECT, () => {
      console.log('Socket connected');
      this.reconnectAttempts = 0;
      this.authenticate();
      this.triggerEvent(SocketEvents.CONNECT);
    });

    this.socket.on(SocketEvents.DISCONNECT, (reason) => {
      console.log('Socket disconnected:', reason);
      this.triggerEvent(SocketEvents.DISCONNECT, reason);
    });

    this.socket.on(SocketEvents.ERROR, (error) => {
      console.error('Socket error:', error);
      this.triggerEvent(SocketEvents.ERROR, error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.disconnect();
      }
    });

    // Set up all other event listeners
    Object.values(SocketEvents).forEach((event) => {
      if (
        event !== SocketEvents.CONNECT &&
        event !== SocketEvents.DISCONNECT &&
        event !== SocketEvents.ERROR
      ) {
        this.socket?.on(event, (...args) => {
          this.triggerEvent(event, ...args);
        });
      }
    });
  }

  private authenticate(): void {
    this.emit(SocketEvents.AUTHENTICATE);
  }

  emit(event: string, data?: any): void {
    if (!this.socket?.connected) {
      console.warn('Socket not connected, cannot emit event:', event);
      return;
    }

    this.socket.emit(event, data);
  }

  on(event: string, callback: EventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(callback);
    }
  }

  private triggerEvent(event: string, ...args: any[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((callback) => callback(...args));
    }
  }

  // Channel operations
  joinChannel(channelId: string): void {
    this.emit(SocketEvents.JOIN_CHANNEL, { channelId });
  }

  leaveChannel(channelId: string): void {
    this.emit(SocketEvents.LEAVE_CHANNEL, { channelId });
  }

  // Message operations
  sendMessage(data: {
    channelId: string;
    content: string;
    type?: string;
    threadId?: string;
    parentId?: string;
    mentions?: string[];
    attachments?: any[];
  }): void {
    this.emit(SocketEvents.MESSAGE_SEND, data);
  }

  updateMessage(messageId: string, content: string): void {
    this.emit(SocketEvents.MESSAGE_UPDATE, { messageId, content });
  }

  deleteMessage(messageId: string): void {
    this.emit(SocketEvents.MESSAGE_DELETE, { messageId });
  }

  // Reactions
  addReaction(messageId: string, emoji: string): void {
    this.emit(SocketEvents.REACTION_ADD, { messageId, emoji });
  }

  removeReaction(messageId: string, emoji: string): void {
    this.emit(SocketEvents.REACTION_REMOVE, { messageId, emoji });
  }

  // Typing indicators
  startTyping(channelId: string): void {
    this.emit(SocketEvents.TYPING_START, { channelId });
  }

  stopTyping(channelId: string): void {
    this.emit(SocketEvents.TYPING_STOP, { channelId });
  }

  // Read receipts
  markAsRead(channelId: string, messageId: string): void {
    this.emit(SocketEvents.MESSAGE_READ, { channelId, messageId });
  }

  // User status
  updateStatus(status: UserStatus): void {
    this.emit(SocketEvents.STATUS_UPDATE, { status });
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socket = new SocketClient();
