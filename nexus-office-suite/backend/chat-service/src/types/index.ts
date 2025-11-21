export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  type: ChannelType;
  isPrivate: boolean;
  createdBy: string;
  avatar?: string;
  settings: ChannelSettings;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  PUBLIC = 'public',
  PRIVATE = 'private'
}

export interface ChannelSettings {
  allowThreads: boolean;
  allowReactions: boolean;
  allowFileSharing: boolean;
  allowBots: boolean;
  muteNotifications: boolean;
  retentionDays?: number;
}

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  content: string;
  type: MessageType;
  threadId?: string;
  parentId?: string;
  replyCount: number;
  attachments: Attachment[];
  mentions: string[];
  reactions: Reaction[];
  isEdited: boolean;
  isDeleted: boolean;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  SYSTEM = 'system',
  BOT = 'bot'
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface Reaction {
  emoji: string;
  users: string[];
  count: number;
}

export interface ChannelMember {
  id: string;
  channelId: string;
  userId: string;
  role: MemberRole;
  lastReadAt?: Date;
  joinedAt: Date;
  mutedUntil?: Date;
  isMuted: boolean;
  isPinned: boolean;
}

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest'
}

export interface ReadReceipt {
  id: string;
  messageId: string;
  userId: string;
  readAt: Date;
}

export interface TypingIndicator {
  channelId: string;
  userId: string;
  username: string;
  timestamp: Date;
}

export interface Webhook {
  id: string;
  channelId: string;
  name: string;
  url: string;
  secret: string;
  isActive: boolean;
  events: WebhookEvent[];
  createdBy: string;
  createdAt: Date;
}

export enum WebhookEvent {
  MESSAGE_CREATED = 'message.created',
  MESSAGE_UPDATED = 'message.updated',
  MESSAGE_DELETED = 'message.deleted',
  CHANNEL_CREATED = 'channel.created',
  MEMBER_JOINED = 'member.joined',
  MEMBER_LEFT = 'member.left'
}

export interface Bot {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  token: string;
  isActive: boolean;
  permissions: string[];
  createdBy: string;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  channelId: string;
  messageId?: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: Date;
}

export enum NotificationType {
  MENTION = 'mention',
  REPLY = 'reply',
  DIRECT_MESSAGE = 'direct_message',
  CHANNEL_INVITE = 'channel_invite',
  REACTION = 'reaction'
}

export interface SocketUser {
  userId: string;
  socketId: string;
  channels: string[];
  status: UserStatus;
  connectedAt: Date;
}

export interface SearchQuery {
  query: string;
  channelId?: string;
  userId?: string;
  type?: MessageType;
  hasAttachments?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export interface PaginationOptions {
  limit: number;
  offset: number;
  before?: string;
  after?: string;
}

export interface ChannelInvite {
  id: string;
  channelId: string;
  code: string;
  createdBy: string;
  maxUses?: number;
  usedCount: number;
  expiresAt?: Date;
  createdAt: Date;
}
