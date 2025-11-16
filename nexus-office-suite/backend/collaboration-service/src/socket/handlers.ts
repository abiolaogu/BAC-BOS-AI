import { Server, Socket } from 'socket.io';
import { logger } from '../middleware/logger';
import { PresenceService } from '../services/presence.service';
import { CursorService } from '../services/cursor.service';
import { OTService } from '../services/ot.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userName?: string;
  documentId?: string;
}

export class SocketHandlers {
  constructor(
    private io: Server,
    private presenceService: PresenceService,
    private cursorService: CursorService,
    private otService: OTService
  ) {}

  setupHandlers(): void {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info('Client connected', { socketId: socket.id });

      // Authentication
      socket.on('authenticate', async (data: { token: string; userName: string }) => {
        try {
          const userId = this.extractUserIdFromToken(data.token);

          if (userId) {
            socket.userId = userId;
            socket.userName = data.userName;

            await this.presenceService.setUserPresence(userId, data.userName);

            socket.emit('authenticated', { userId });
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

      // Join document room
      socket.on('join_document', async (documentId: string) => {
        if (!socket.userId || !socket.userName) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          // Leave previous document if any
          if (socket.documentId) {
            await this.leaveDocument(socket, socket.documentId);
          }

          // Join new document
          socket.documentId = documentId;
          socket.join(`doc:${documentId}`);

          // Update presence
          await this.presenceService.setUserPresence(
            socket.userId,
            socket.userName,
            documentId
          );

          // Get document version
          const version = await this.otService.getDocumentVersion(documentId);

          // Send current state to client
          const presence = await this.presenceService.getDocumentPresence(documentId);
          const cursors = await this.cursorService.getDocumentCursors(documentId);

          socket.emit('document_state', {
            version: version?.version || 0,
            content: version?.content || '',
            presence,
            cursors,
          });

          // Notify others
          socket.to(`doc:${documentId}`).emit('user_joined', {
            userId: socket.userId,
            userName: socket.userName,
          });

          logger.info('User joined document', { userId: socket.userId, documentId });
        } catch (error) {
          logger.error('Failed to join document', { error, documentId });
          socket.emit('error', { message: 'Failed to join document' });
        }
      });

      // Leave document
      socket.on('leave_document', async () => {
        if (socket.documentId) {
          await this.leaveDocument(socket, socket.documentId);
        }
      });

      // Update cursor position
      socket.on('cursor_update', async (data: any) => {
        if (!socket.userId || !socket.userName || !socket.documentId) return;

        try {
          const cursor = {
            userId: socket.userId,
            userName: socket.userName,
            documentId: socket.documentId,
            position: data.position,
            selection: data.selection,
            color: data.color,
            timestamp: Date.now(),
          };

          await this.cursorService.updateCursor(cursor);

          // Broadcast to others in document
          socket.to(`doc:${socket.documentId}`).emit('cursor_update', cursor);
        } catch (error) {
          logger.error('Failed to update cursor', { error });
        }
      });

      // Apply operation
      socket.on('operation', async (data: any) => {
        if (!socket.userId || !socket.documentId) return;

        try {
          const docOp = {
            documentId: socket.documentId,
            userId: socket.userId,
            operations: data.operations,
            version: data.version,
            timestamp: Date.now(),
          };

          const result = await this.otService.applyOperation(docOp);

          // Send acknowledgment to sender
          socket.emit('operation_ack', {
            version: result.version,
            timestamp: result.timestamp,
          });

          // Broadcast to others in document
          socket.to(`doc:${socket.documentId}`).emit('operation', result);

          logger.debug('Operation applied and broadcast', {
            documentId: socket.documentId,
            version: result.version,
          });
        } catch (error) {
          logger.error('Failed to apply operation', { error });
          socket.emit('operation_error', { message: 'Failed to apply operation' });
        }
      });

      // Typing indicator
      socket.on('typing_start', () => {
        if (!socket.documentId) return;
        socket.to(`doc:${socket.documentId}`).emit('user_typing', {
          userId: socket.userId,
          userName: socket.userName,
        });
      });

      socket.on('typing_stop', () => {
        if (!socket.documentId) return;
        socket.to(`doc:${socket.documentId}`).emit('user_stopped_typing', {
          userId: socket.userId,
        });
      });

      // Presence heartbeat
      socket.on('heartbeat', async () => {
        if (!socket.userId) return;

        try {
          await this.presenceService.heartbeat(socket.userId);
        } catch (error) {
          logger.error('Failed to update heartbeat', { error });
        }
      });

      // Update status
      socket.on('status_update', async (status: 'online' | 'away' | 'offline') => {
        if (!socket.userId) return;

        try {
          await this.presenceService.updateUserStatus(socket.userId, status);

          if (socket.documentId) {
            socket.to(`doc:${socket.documentId}`).emit('user_status_changed', {
              userId: socket.userId,
              status,
            });
          }
        } catch (error) {
          logger.error('Failed to update status', { error });
        }
      });

      // Disconnect
      socket.on('disconnect', async () => {
        logger.info('Client disconnected', { socketId: socket.id, userId: socket.userId });

        if (socket.documentId) {
          await this.leaveDocument(socket, socket.documentId);
        }

        if (socket.userId) {
          await this.presenceService.removeUserPresence(socket.userId);
        }
      });
    });
  }

  private async leaveDocument(socket: AuthenticatedSocket, documentId: string): Promise<void> {
    socket.leave(`doc:${documentId}`);

    if (socket.userId) {
      await this.cursorService.removeCursor(documentId, socket.userId);

      socket.to(`doc:${documentId}`).emit('user_left', {
        userId: socket.userId,
      });

      logger.info('User left document', { userId: socket.userId, documentId });
    }

    socket.documentId = undefined;
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      return payload.userId || null;
    } catch (error) {
      return null;
    }
  }
}
