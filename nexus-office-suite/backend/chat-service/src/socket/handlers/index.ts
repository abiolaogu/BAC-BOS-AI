import { Socket } from 'socket.io';
import WebSocketService from '../../services/WebSocketService';
import ChatService from '../../services/ChatService';
import ChannelService from '../../services/ChannelService';
import { SocketEvents } from '../../types/socket';
import { User } from '../../models';
import { UserStatus } from '../../types';

export const setupSocketHandlers = (
  socket: Socket,
  wsService: WebSocketService
): void => {
  const userId = socket.data.userId;
  const username = socket.data.username;

  console.log(`Setting up handlers for user ${userId} (${username})`);

  // Handle connection
  handleConnection(socket, wsService, userId);

  // Handle channel operations
  handleChannelOperations(socket, wsService, userId);

  // Handle message operations
  handleMessageOperations(socket, wsService, userId);

  // Handle reactions
  handleReactions(socket, wsService, userId);

  // Handle typing indicators
  handleTypingIndicators(socket, wsService, userId, username);

  // Handle read receipts
  handleReadReceipts(socket, wsService, userId);

  // Handle user status
  handleUserStatus(socket, wsService, userId);

  // Handle disconnection
  handleDisconnection(socket, wsService, userId);
};

function handleConnection(
  socket: Socket,
  wsService: WebSocketService,
  userId: string
): void {
  socket.on(SocketEvents.AUTHENTICATE, async () => {
    try {
      await wsService.addUserConnection(userId, socket.id);
      await wsService.updateUserStatus(userId, UserStatus.ONLINE);

      socket.emit(SocketEvents.AUTHENTICATED, {
        success: true,
        userId,
      });

      // Get user's channels and join them
      const channels = await ChannelService.getUserChannels(userId);

      for (const channel of channels) {
        await wsService.joinChannel(socket.id, channel.id);
      }

      // Notify others that user is online
      socket.broadcast.emit(SocketEvents.USER_ONLINE, {
        userId,
        status: UserStatus.ONLINE,
      });
    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, {
        event: SocketEvents.AUTHENTICATE,
        message: error.message,
      });
    }
  });
}

function handleChannelOperations(
  socket: Socket,
  wsService: WebSocketService,
  userId: string
): void {
  socket.on(SocketEvents.JOIN_CHANNEL, async (data: { channelId: string }) => {
    try {
      const { channelId } = data;

      // Verify user is a member
      await ChannelService.getChannel(channelId, userId);

      // Join socket room
      await wsService.joinChannel(socket.id, channelId);

      socket.emit(SocketEvents.CHANNEL_JOINED, { channelId });

      // Notify other channel members
      wsService.emitToChannel(channelId, SocketEvents.USER_JOINED, {
        channelId,
        userId,
      });
    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, {
        event: SocketEvents.JOIN_CHANNEL,
        message: error.message,
      });
    }
  });

  socket.on(SocketEvents.LEAVE_CHANNEL, async (data: { channelId: string }) => {
    try {
      const { channelId } = data;

      await wsService.leaveChannel(socket.id, channelId);

      socket.emit(SocketEvents.CHANNEL_LEFT, { channelId });

      // Notify other channel members
      wsService.emitToChannel(channelId, SocketEvents.USER_LEFT, {
        channelId,
        userId,
      });
    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, {
        event: SocketEvents.LEAVE_CHANNEL,
        message: error.message,
      });
    }
  });
}

function handleMessageOperations(
  socket: Socket,
  wsService: WebSocketService,
  userId: string
): void {
  socket.on(
    SocketEvents.MESSAGE_SEND,
    async (data: {
      channelId: string;
      content: string;
      type?: string;
      threadId?: string;
      parentId?: string;
      mentions?: string[];
      attachments?: any[];
    }) => {
      try {
        const message = await ChatService.createMessage({
          ...data,
          userId,
        });

        // Emit to channel
        wsService.emitToChannel(data.channelId, SocketEvents.MESSAGE_CREATED, message);

        // Send notifications to mentioned users
        if (data.mentions && data.mentions.length > 0) {
          for (const mentionedUserId of data.mentions) {
            if (mentionedUserId !== userId) {
              await wsService.emitToUser(mentionedUserId, 'notification', {
                type: 'mention',
                channelId: data.channelId,
                messageId: message.id,
                fromUser: userId,
              });
            }
          }
        }

        socket.emit(SocketEvents.MESSAGE_CREATED, message);
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.MESSAGE_SEND,
          message: error.message,
        });
      }
    }
  );

  socket.on(
    SocketEvents.MESSAGE_UPDATE,
    async (data: { messageId: string; content: string }) => {
      try {
        const message = await ChatService.updateMessage(
          data.messageId,
          userId,
          data.content
        );

        // Emit to channel
        wsService.emitToChannel(
          message.channelId,
          SocketEvents.MESSAGE_UPDATED,
          message
        );
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.MESSAGE_UPDATE,
          message: error.message,
        });
      }
    }
  );

  socket.on(SocketEvents.MESSAGE_DELETE, async (data: { messageId: string }) => {
    try {
      const message = await ChatService.updateMessage(data.messageId, userId, '');
      await ChatService.deleteMessage(data.messageId, userId);

      // Emit to channel
      wsService.emitToChannel(
        message.channelId,
        SocketEvents.MESSAGE_DELETED,
        {
          messageId: data.messageId,
          channelId: message.channelId,
        }
      );
    } catch (error: any) {
      socket.emit(SocketEvents.ERROR, {
        event: SocketEvents.MESSAGE_DELETE,
        message: error.message,
      });
    }
  });
}

function handleReactions(
  socket: Socket,
  wsService: WebSocketService,
  userId: string
): void {
  socket.on(
    SocketEvents.REACTION_ADD,
    async (data: { messageId: string; emoji: string }) => {
      try {
        const message = await ChatService.addReaction(
          data.messageId,
          userId,
          data.emoji
        );

        wsService.emitToChannel(message.channelId, SocketEvents.REACTION_ADDED, {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
          reactions: message.reactions,
        });
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.REACTION_ADD,
          message: error.message,
        });
      }
    }
  );

  socket.on(
    SocketEvents.REACTION_REMOVE,
    async (data: { messageId: string; emoji: string }) => {
      try {
        const message = await ChatService.removeReaction(
          data.messageId,
          userId,
          data.emoji
        );

        wsService.emitToChannel(message.channelId, SocketEvents.REACTION_REMOVED, {
          messageId: data.messageId,
          emoji: data.emoji,
          userId,
          reactions: message.reactions,
        });
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.REACTION_REMOVE,
          message: error.message,
        });
      }
    }
  );
}

function handleTypingIndicators(
  socket: Socket,
  wsService: WebSocketService,
  userId: string,
  username: string
): void {
  socket.on(
    SocketEvents.TYPING_START,
    async (data: { channelId: string }) => {
      try {
        await wsService.setTyping(data.channelId, userId, username, true);
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.TYPING_START,
          message: error.message,
        });
      }
    }
  );

  socket.on(
    SocketEvents.TYPING_STOP,
    async (data: { channelId: string }) => {
      try {
        await wsService.setTyping(data.channelId, userId, username, false);
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.TYPING_STOP,
          message: error.message,
        });
      }
    }
  );
}

function handleReadReceipts(
  socket: Socket,
  wsService: WebSocketService,
  userId: string
): void {
  socket.on(
    SocketEvents.MESSAGE_READ,
    async (data: { channelId: string; messageId: string }) => {
      try {
        await ChatService.markAsRead(data.channelId, data.messageId, userId);

        wsService.emitToChannel(data.channelId, SocketEvents.MESSAGES_READ, {
          channelId: data.channelId,
          messageId: data.messageId,
          userId,
          readAt: new Date(),
        });
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.MESSAGE_READ,
          message: error.message,
        });
      }
    }
  );
}

function handleUserStatus(
  socket: Socket,
  wsService: WebSocketService,
  userId: string
): void {
  socket.on(
    SocketEvents.STATUS_UPDATE,
    async (data: { status: UserStatus }) => {
      try {
        await wsService.updateUserStatus(userId, data.status);

        // Update in database
        await User.update(
          { status: data.status, lastSeen: new Date() },
          { where: { id: userId } }
        );
      } catch (error: any) {
        socket.emit(SocketEvents.ERROR, {
          event: SocketEvents.STATUS_UPDATE,
          message: error.message,
        });
      }
    }
  );
}

function handleDisconnection(
  socket: Socket,
  wsService: WebSocketService,
  userId: string
): void {
  socket.on(SocketEvents.DISCONNECT, async () => {
    try {
      await wsService.removeUserConnection(userId, socket.id);

      // Check if user is still online on other devices
      const isOnline = await wsService.isUserOnline(userId);

      if (!isOnline) {
        await wsService.updateUserStatus(userId, UserStatus.OFFLINE);

        // Update last seen in database
        await User.update(
          { status: UserStatus.OFFLINE, lastSeen: new Date() },
          { where: { id: userId } }
        );

        // Notify others
        socket.broadcast.emit(SocketEvents.USER_OFFLINE, {
          userId,
          status: UserStatus.OFFLINE,
        });
      }

      console.log(`User ${userId} disconnected`);
    } catch (error: any) {
      console.error('Disconnection error:', error);
    }
  });
}
