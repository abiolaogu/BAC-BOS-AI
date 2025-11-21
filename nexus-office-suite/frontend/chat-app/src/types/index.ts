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
  OFFLINE = 'offline',
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
  members?: User[];
  memberRole?: MemberRole;
  lastReadAt?: Date;
  isMuted?: boolean;
  isPinned?: boolean;
  unreadCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export enum ChannelType {
  DIRECT = 'direct',
  GROUP = 'group',
  PUBLIC = 'public',
  PRIVATE = 'private',
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
  user?: User;
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
  BOT = 'bot',
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

export enum MemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MODERATOR = 'moderator',
  MEMBER = 'member',
  GUEST = 'guest',
}

export interface TypingIndicator {
  channelId: string;
  userId: string;
  username: string;
  timestamp: Date;
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

export interface PaginationOptions {
  limit: number;
  offset: number;
  before?: string;
  after?: string;
}
