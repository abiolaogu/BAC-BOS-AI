import { Op } from 'sequelize';
import {
  Message,
  Channel,
  ChannelMember,
  User,
  ReadReceipt,
} from '../models';
import {
  Message as MessageType,
  SearchQuery,
  SearchResult,
  PaginationOptions,
  Reaction,
  MemberRole,
} from '../types';
import redisClient from '../config/redis';

export class ChatService {
  // Create a new message
  async createMessage(data: {
    channelId: string;
    userId: string;
    content: string;
    type?: string;
    threadId?: string;
    parentId?: string;
    mentions?: string[];
    attachments?: any[];
  }): Promise<Message> {
    // Check if user is a member of the channel
    const member = await ChannelMember.findOne({
      where: {
        channelId: data.channelId,
        userId: data.userId,
      },
    });

    if (!member) {
      throw new Error('User is not a member of this channel');
    }

    const message = await Message.create({
      ...data,
      mentions: data.mentions || [],
      attachments: data.attachments || [],
      reactions: [],
      replyCount: 0,
      isEdited: false,
      isDeleted: false,
    });

    // Update channel's last message timestamp
    await Channel.update(
      { lastMessageAt: new Date() },
      { where: { id: data.channelId } }
    );

    // Increment reply count if this is a reply
    if (data.parentId) {
      await Message.increment('replyCount', {
        where: { id: data.parentId },
      });
    }

    // Load user information
    const messageWithUser = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status'],
        },
      ],
    });

    return messageWithUser as Message;
  }

  // Get messages for a channel
  async getMessages(
    channelId: string,
    userId: string,
    options: PaginationOptions
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    // Verify user is a member
    const member = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (!member) {
      throw new Error('User is not a member of this channel');
    }

    const { limit = 50, offset = 0, before, after } = options;

    const whereClause: any = {
      channelId,
      isDeleted: false,
      threadId: null, // Only get top-level messages
    };

    if (before) {
      whereClause.createdAt = { [Op.lt]: before };
    }

    if (after) {
      whereClause.createdAt = { [Op.gt]: after };
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
      offset,
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: resultMessages,
      hasMore,
    };
  }

  // Get thread replies
  async getThreadReplies(
    messageId: string,
    userId: string,
    options: PaginationOptions
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const parentMessage = await Message.findByPk(messageId);
    if (!parentMessage) {
      throw new Error('Parent message not found');
    }

    // Verify user is a member of the channel
    const member = await ChannelMember.findOne({
      where: { channelId: parentMessage.channelId, userId },
    });

    if (!member) {
      throw new Error('User is not a member of this channel');
    }

    const { limit = 50, offset = 0 } = options;

    const messages = await Message.findAll({
      where: {
        parentId: messageId,
        isDeleted: false,
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status'],
        },
      ],
      order: [['createdAt', 'ASC']],
      limit: limit + 1,
      offset,
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: resultMessages,
      hasMore,
    };
  }

  // Update message
  async updateMessage(
    messageId: string,
    userId: string,
    content: string
  ): Promise<Message> {
    const message = await Message.findByPk(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.userId !== userId) {
      throw new Error('Unauthorized to edit this message');
    }

    if (message.isDeleted) {
      throw new Error('Cannot edit a deleted message');
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    return message;
  }

  // Delete message
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findByPk(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    // Check if user is the message author or channel admin
    const member = await ChannelMember.findOne({
      where: { channelId: message.channelId, userId },
    });

    const canDelete =
      message.userId === userId ||
      member?.role === MemberRole.ADMIN ||
      member?.role === MemberRole.OWNER;

    if (!canDelete) {
      throw new Error('Unauthorized to delete this message');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = '[Message deleted]';
    await message.save();
  }

  // Add reaction to message
  async addReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<Message> {
    const message = await Message.findByPk(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    const reactions = [...message.reactions];
    const existingReaction = reactions.find((r) => r.emoji === emoji);

    if (existingReaction) {
      // Add user to existing reaction if not already there
      if (!existingReaction.users.includes(userId)) {
        existingReaction.users.push(userId);
        existingReaction.count = existingReaction.users.length;
      }
    } else {
      // Create new reaction
      reactions.push({
        emoji,
        users: [userId],
        count: 1,
      });
    }

    message.reactions = reactions;
    await message.save();

    return message;
  }

  // Remove reaction from message
  async removeReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<Message> {
    const message = await Message.findByPk(messageId);

    if (!message) {
      throw new Error('Message not found');
    }

    const reactions = message.reactions
      .map((r) => {
        if (r.emoji === emoji) {
          const users = r.users.filter((uid) => uid !== userId);
          return users.length > 0
            ? { ...r, users, count: users.length }
            : null;
        }
        return r;
      })
      .filter((r): r is Reaction => r !== null);

    message.reactions = reactions;
    await message.save();

    return message;
  }

  // Mark messages as read
  async markAsRead(
    channelId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    // Update channel member's last read timestamp
    await ChannelMember.update(
      { lastReadAt: new Date() },
      { where: { channelId, userId } }
    );

    // Create read receipt
    await ReadReceipt.findOrCreate({
      where: { messageId, userId },
      defaults: {
        messageId,
        userId,
        readAt: new Date(),
      },
    });

    // Invalidate unread count cache
    await redisClient.del(`unread:${userId}:${channelId}`);
  }

  // Get unread count
  async getUnreadCount(channelId: string, userId: string): Promise<number> {
    const cacheKey = `unread:${userId}:${channelId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return parseInt(cached, 10);
    }

    const member = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (!member) {
      return 0;
    }

    const count = await Message.count({
      where: {
        channelId,
        isDeleted: false,
        createdAt: {
          [Op.gt]: member.lastReadAt || member.joinedAt,
        },
      },
    });

    // Cache for 1 minute
    await redisClient.setEx(cacheKey, 60, count.toString());

    return count;
  }

  // Search messages
  async searchMessages(
    userId: string,
    query: SearchQuery
  ): Promise<SearchResult> {
    const {
      query: searchQuery,
      channelId,
      type,
      hasAttachments,
      dateFrom,
      dateTo,
      limit = 50,
      offset = 0,
    } = query;

    // Get user's channels
    const userChannels = await ChannelMember.findAll({
      where: { userId },
      attributes: ['channelId'],
    });

    const channelIds = userChannels.map((m) => m.channelId);

    const whereClause: any = {
      channelId: channelId || { [Op.in]: channelIds },
      isDeleted: false,
      content: {
        [Op.iLike]: `%${searchQuery}%`,
      },
    };

    if (type) {
      whereClause.type = type;
    }

    if (hasAttachments) {
      whereClause.attachments = {
        [Op.not]: [],
      };
    }

    if (dateFrom || dateTo) {
      whereClause.createdAt = {};
      if (dateFrom) whereClause.createdAt[Op.gte] = dateFrom;
      if (dateTo) whereClause.createdAt[Op.lte] = dateTo;
    }

    const { count, rows } = await Message.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'displayName', 'avatar'],
        },
        {
          model: Channel,
          as: 'channel',
          attributes: ['id', 'name', 'type'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: limit + 1,
      offset,
    });

    const hasMore = rows.length > limit;
    const messages = hasMore ? rows.slice(0, limit) : rows;

    return {
      messages,
      total: count,
      hasMore,
    };
  }
}

export default new ChatService();
