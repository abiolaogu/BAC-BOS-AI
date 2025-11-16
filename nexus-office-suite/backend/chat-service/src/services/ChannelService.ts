import { Op } from 'sequelize';
import { Channel, ChannelMember, User, Message } from '../models';
import { ChannelType, MemberRole } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ChannelService {
  // Create a new channel
  async createChannel(data: {
    name: string;
    description?: string;
    type: ChannelType;
    isPrivate: boolean;
    createdBy: string;
    memberIds?: string[];
  }): Promise<Channel> {
    const { name, description, type, isPrivate, createdBy, memberIds = [] } = data;

    // Create channel
    const channel = await Channel.create({
      name,
      description,
      type,
      isPrivate,
      createdBy,
      settings: {
        allowThreads: true,
        allowReactions: true,
        allowFileSharing: true,
        allowBots: false,
        muteNotifications: false,
      },
    });

    // Add creator as owner
    await ChannelMember.create({
      channelId: channel.id,
      userId: createdBy,
      role: MemberRole.OWNER,
      joinedAt: new Date(),
    });

    // Add other members
    if (memberIds.length > 0) {
      const members = memberIds
        .filter((id) => id !== createdBy)
        .map((userId) => ({
          channelId: channel.id,
          userId,
          role: MemberRole.MEMBER,
          joinedAt: new Date(),
        }));

      await ChannelMember.bulkCreate(members);
    }

    return channel;
  }

  // Create direct message channel
  async createDirectMessage(userId1: string, userId2: string): Promise<Channel> {
    // Check if DM already exists
    const existingChannel = await Channel.findOne({
      where: { type: ChannelType.DIRECT },
      include: [
        {
          model: User,
          as: 'members',
          where: {
            id: { [Op.in]: [userId1, userId2] },
          },
          through: { attributes: [] },
        },
      ],
      having: Channel.sequelize?.literal('COUNT(DISTINCT "members"."id") = 2'),
      group: ['Channel.id'],
    });

    if (existingChannel) {
      return existingChannel;
    }

    // Create new DM channel
    const user1 = await User.findByPk(userId1);
    const user2 = await User.findByPk(userId2);

    if (!user1 || !user2) {
      throw new Error('User not found');
    }

    const channel = await Channel.create({
      name: `${user1.username},${user2.username}`,
      type: ChannelType.DIRECT,
      isPrivate: true,
      createdBy: userId1,
      settings: {
        allowThreads: true,
        allowReactions: true,
        allowFileSharing: true,
        allowBots: false,
        muteNotifications: false,
      },
    });

    // Add both users as members
    await ChannelMember.bulkCreate([
      {
        channelId: channel.id,
        userId: userId1,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      },
      {
        channelId: channel.id,
        userId: userId2,
        role: MemberRole.MEMBER,
        joinedAt: new Date(),
      },
    ]);

    return channel;
  }

  // Get user's channels
  async getUserChannels(userId: string): Promise<any[]> {
    const members = await ChannelMember.findAll({
      where: { userId },
      include: [
        {
          model: Channel,
          as: 'channel',
          include: [
            {
              model: User,
              as: 'members',
              attributes: ['id', 'username', 'displayName', 'avatar', 'status'],
              through: { attributes: [] },
            },
          ],
        },
      ],
      order: [[{ model: Channel, as: 'channel' }, 'lastMessageAt', 'DESC NULLS LAST']],
    });

    return members.map((member: any) => ({
      ...member.channel.toJSON(),
      memberRole: member.role,
      lastReadAt: member.lastReadAt,
      isMuted: member.isMuted,
      isPinned: member.isPinned,
    }));
  }

  // Get channel by ID
  async getChannel(channelId: string, userId: string): Promise<Channel> {
    const member = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (!member) {
      throw new Error('User is not a member of this channel');
    }

    const channel = await Channel.findByPk(channelId, {
      include: [
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status'],
          through: {
            attributes: ['role', 'lastReadAt', 'joinedAt'],
          },
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName', 'avatar'],
        },
      ],
    });

    if (!channel) {
      throw new Error('Channel not found');
    }

    return channel;
  }

  // Add member to channel
  async addMember(
    channelId: string,
    userId: string,
    addedBy: string
  ): Promise<ChannelMember> {
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check if requester has permission
    const requesterMember = await ChannelMember.findOne({
      where: { channelId, userId: addedBy },
    });

    if (!requesterMember) {
      throw new Error('Requester is not a member of this channel');
    }

    const canAddMember =
      requesterMember.role === MemberRole.OWNER ||
      requesterMember.role === MemberRole.ADMIN ||
      requesterMember.role === MemberRole.MODERATOR;

    if (channel.isPrivate && !canAddMember) {
      throw new Error('Only moderators and above can add members to private channels');
    }

    // Check if user is already a member
    const existingMember = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (existingMember) {
      throw new Error('User is already a member of this channel');
    }

    // Add member
    const member = await ChannelMember.create({
      channelId,
      userId,
      role: MemberRole.MEMBER,
      joinedAt: new Date(),
    });

    return member;
  }

  // Remove member from channel
  async removeMember(
    channelId: string,
    userId: string,
    removedBy: string
  ): Promise<void> {
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    // Check permissions
    const requesterMember = await ChannelMember.findOne({
      where: { channelId, userId: removedBy },
    });

    const targetMember = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (!targetMember) {
      throw new Error('User is not a member of this channel');
    }

    // Can remove self or if you're owner/admin
    const canRemove =
      userId === removedBy ||
      requesterMember?.role === MemberRole.OWNER ||
      requesterMember?.role === MemberRole.ADMIN;

    if (!canRemove) {
      throw new Error('Insufficient permissions to remove member');
    }

    // Cannot remove the owner
    if (targetMember.role === MemberRole.OWNER && userId !== removedBy) {
      throw new Error('Cannot remove channel owner');
    }

    await targetMember.destroy();
  }

  // Update member role
  async updateMemberRole(
    channelId: string,
    userId: string,
    newRole: MemberRole,
    updatedBy: string
  ): Promise<ChannelMember> {
    const requesterMember = await ChannelMember.findOne({
      where: { channelId, userId: updatedBy },
    });

    if (
      requesterMember?.role !== MemberRole.OWNER &&
      requesterMember?.role !== MemberRole.ADMIN
    ) {
      throw new Error('Only owners and admins can change member roles');
    }

    const targetMember = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (!targetMember) {
      throw new Error('Member not found');
    }

    // Only owner can change other admins
    if (
      targetMember.role === MemberRole.ADMIN &&
      requesterMember?.role !== MemberRole.OWNER
    ) {
      throw new Error('Only owner can modify admin roles');
    }

    targetMember.role = newRole;
    await targetMember.save();

    return targetMember;
  }

  // Update channel
  async updateChannel(
    channelId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      avatar?: string;
      settings?: any;
    }
  ): Promise<Channel> {
    const member = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    const canUpdate =
      member?.role === MemberRole.OWNER ||
      member?.role === MemberRole.ADMIN ||
      member?.role === MemberRole.MODERATOR;

    if (!canUpdate) {
      throw new Error('Insufficient permissions to update channel');
    }

    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      throw new Error('Channel not found');
    }

    if (updates.name) channel.name = updates.name;
    if (updates.description !== undefined) channel.description = updates.description;
    if (updates.avatar !== undefined) channel.avatar = updates.avatar;
    if (updates.settings) {
      channel.settings = { ...channel.settings, ...updates.settings };
    }

    await channel.save();
    return channel;
  }

  // Delete channel
  async deleteChannel(channelId: string, userId: string): Promise<void> {
    const member = await ChannelMember.findOne({
      where: { channelId, userId },
    });

    if (member?.role !== MemberRole.OWNER) {
      throw new Error('Only channel owner can delete the channel');
    }

    await Channel.destroy({ where: { id: channelId } });
  }

  // Search channels
  async searchChannels(query: string, userId: string): Promise<Channel[]> {
    const channels = await Channel.findAll({
      where: {
        name: {
          [Op.iLike]: `%${query}%`,
        },
        isPrivate: false,
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'displayName'],
        },
      ],
      limit: 20,
    });

    return channels;
  }
}

export default new ChannelService();
