import { Message, Reaction, UserStatus, TypingIndicator } from './index';

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
  PRESENCE_UPDATE = 'presence:update',
  USER_JOINED = 'user:joined',
  USER_LEFT = 'user:left'
}

export interface SocketMessage {
  channelId: string;
  content: string;
  type?: string;
  threadId?: string;
  parentId?: string;
  mentions?: string[];
  attachments?: any[];
}

export interface SocketReaction {
  messageId: string;
  emoji: string;
}

export interface SocketTyping {
  channelId: string;
  isTyping: boolean;
}

export interface SocketReadReceipt {
  channelId: string;
  messageId: string;
}

export interface SocketStatusUpdate {
  status: UserStatus;
}

export interface SocketError {
  event: string;
  message: string;
  code?: string;
}

export interface AuthPayload {
  token: string;
}

export interface JoinChannelPayload {
  channelId: string;
}
