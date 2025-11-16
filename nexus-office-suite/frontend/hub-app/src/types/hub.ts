// NEXUS Hub Type Definitions

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  createdAt: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  timezone: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  desktop: boolean;
  mentions: boolean;
  shares: boolean;
  comments: boolean;
  meetings: boolean;
}

export interface NexusApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  url: string;
  apiUrl: string;
  wsUrl?: string;
  status: 'online' | 'offline' | 'maintenance';
  version: string;
  category: 'productivity' | 'communication' | 'collaboration' | 'storage';
  features: string[];
  recentItems?: RecentItem[];
  launchCount?: number;
  lastUsed?: string;
}

export interface RecentItem {
  id: string;
  title: string;
  type: string;
  appId: string;
  appName: string;
  url: string;
  thumbnail?: string;
  lastModified: string;
  lastModifiedBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  owner?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface Activity {
  id: string;
  type: 'created' | 'edited' | 'shared' | 'deleted' | 'commented' | 'mentioned' | 'joined' | 'uploaded';
  title: string;
  description: string;
  appId: string;
  appName: string;
  appColor: string;
  itemId?: string;
  itemType?: string;
  itemUrl?: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: 'mention' | 'share' | 'comment' | 'meeting' | 'upload' | 'system';
  title: string;
  message: string;
  appId: string;
  appName: string;
  appColor: string;
  itemId?: string;
  itemUrl?: string;
  from?: {
    id: string;
    name: string;
    avatar?: string;
  };
  read: boolean;
  timestamp: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'spreadsheet' | 'presentation' | 'file' | 'meeting' | 'user' | 'folder';
  appId: string;
  appName: string;
  appColor: string;
  url: string;
  thumbnail?: string;
  snippet?: string;
  relevance: number;
  lastModified?: string;
  owner?: {
    id: string;
    name: string;
    avatar?: string;
  };
  metadata?: Record<string, any>;
}

export interface SearchFilters {
  apps?: string[];
  types?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  owner?: string;
  shared?: boolean;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  action: () => void;
  appId: string;
  shortcut?: string;
}

export interface ServiceStatus {
  appId: string;
  status: 'online' | 'offline' | 'degraded' | 'maintenance';
  uptime: number;
  lastCheck: string;
  latency?: number;
  message?: string;
}

export interface DashboardStats {
  totalDocuments: number;
  totalFiles: number;
  totalMeetings: number;
  storageUsed: number;
  storageLimit: number;
  activeUsers: number;
  recentActivity: number;
}

export interface Theme {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface WebSocketMessage {
  type: 'notification' | 'activity' | 'presence' | 'status';
  payload: any;
  timestamp: string;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string;
  currentApp?: string;
  currentDocument?: string;
}
