import { Server, Socket } from 'socket.io';
import { logger } from '../middleware/logger';
import { NotificationService } from '../services/notification.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export class SocketHandlers {
  constructor(
    private io: Server,
    private notificationService: NotificationService
  ) {}

  setupHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Authentication
      socket.on('authenticate', async (token: string) => {
        try {
          // In a real implementation, verify JWT token
          // For now, extract userId from token payload
          const userId = this.extractUserIdFromToken(token);

          if (userId) {
            socket.userId = userId;
            socket.join(`user:${userId}`);

            // Send unread count on connect
            const unreadCount = await this.notificationService.getUnreadCount(userId);
            socket.emit('unread_count', unreadCount);

            logger.info('Client authenticated', { socketId: socket.id, userId });
          } else {
            socket.emit('error', { message: 'Invalid token' });
            socket.disconnect();
          }
        } catch (error) {
          logger.error('Authentication error', { error, socketId: socket.id });
          socket.emit('error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      // Get notifications
      socket.on('get_notifications', async (data: { limit?: number; offset?: number }) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const notifications = await this.notificationService.getNotifications(
            socket.userId,
            data.limit,
            data.offset
          );
          socket.emit('notifications', notifications);
        } catch (error) {
          logger.error('Failed to get notifications', { error, userId: socket.userId });
          socket.emit('error', { message: 'Failed to get notifications' });
        }
      });

      // Mark notification as read
      socket.on('mark_read', async (notificationId: string) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          await this.notificationService.markAsRead(notificationId);

          // Send updated unread count
          const unreadCount = await this.notificationService.getUnreadCount(socket.userId);
          socket.emit('unread_count', unreadCount);

          logger.info('Notification marked as read', { notificationId, userId: socket.userId });
        } catch (error) {
          logger.error('Failed to mark notification as read', { error, notificationId });
          socket.emit('error', { message: 'Failed to mark as read' });
        }
      });

      // Mark all as read
      socket.on('mark_all_read', async () => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          await this.notificationService.markAllAsRead(socket.userId);
          socket.emit('unread_count', 0);
          logger.info('All notifications marked as read', { userId: socket.userId });
        } catch (error) {
          logger.error('Failed to mark all as read', { error, userId: socket.userId });
          socket.emit('error', { message: 'Failed to mark all as read' });
        }
      });

      // Delete notification
      socket.on('delete_notification', async (notificationId: string) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          await this.notificationService.deleteNotification(notificationId);
          logger.info('Notification deleted', { notificationId, userId: socket.userId });
        } catch (error) {
          logger.error('Failed to delete notification', { error, notificationId });
          socket.emit('error', { message: 'Failed to delete notification' });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        logger.info('Client disconnected', { socketId: socket.id, userId: socket.userId });
      });
    });
  }

  // Send notification to specific user
  sendToUser(userId: string, notification: any): void {
    this.io.to(`user:${userId}`).emit('notification', notification);
  }

  // Send unread count update to user
  sendUnreadCountToUser(userId: string, count: number): void {
    this.io.to(`user:${userId}`).emit('unread_count', count);
  }

  private extractUserIdFromToken(token: string): string | null {
    // In a real implementation, verify and decode JWT
    // For now, return a placeholder
    try {
      // This is a simplified version
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.userId || null;
    } catch (error) {
      return null;
    }
  }
}
