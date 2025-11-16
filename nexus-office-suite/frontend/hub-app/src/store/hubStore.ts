import { create } from 'zustand';
import { NexusApp, Activity, Notification, RecentItem, ServiceStatus } from '@/types/hub';
import { getAllApps } from '@/lib/api/apps';
import { getRecentActivity, getRecentItems } from '@/lib/api/activity';
import { getAllNotifications, markAsRead, markAllAsRead } from '@/lib/api/notifications';

interface HubState {
  // Data
  apps: NexusApp[];
  activities: Activity[];
  notifications: Notification[];
  recentItems: RecentItem[];
  serviceStatuses: ServiceStatus[];

  // UI State
  isLoading: boolean;
  error: string | null;
  selectedApp: string | null;

  // Actions
  loadApps: () => Promise<void>;
  loadActivities: () => Promise<void>;
  loadNotifications: () => Promise<void>;
  loadRecentItems: () => Promise<void>;
  loadAllData: () => Promise<void>;

  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  selectApp: (appId: string | null) => void;
  clearError: () => void;

  getUnreadCount: () => number;
  getAppById: (id: string) => NexusApp | undefined;
}

export const useHubStore = create<HubState>((set, get) => ({
  // Initial state
  apps: [],
  activities: [],
  notifications: [],
  recentItems: [],
  serviceStatuses: [],
  isLoading: false,
  error: null,
  selectedApp: null,

  // Load apps
  loadApps: async () => {
    try {
      set({ isLoading: true, error: null });
      const apps = await getAllApps();
      set({ apps, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Load activities
  loadActivities: async () => {
    try {
      const activities = await getRecentActivity(20);
      set({ activities });
    } catch (error: any) {
      console.error('Failed to load activities:', error);
    }
  },

  // Load notifications
  loadNotifications: async () => {
    try {
      const notifications = await getAllNotifications(50);
      set({ notifications });
    } catch (error: any) {
      console.error('Failed to load notifications:', error);
    }
  },

  // Load recent items
  loadRecentItems: async () => {
    try {
      const recentItems = await getRecentItems(10);
      set({ recentItems });
    } catch (error: any) {
      console.error('Failed to load recent items:', error);
    }
  },

  // Load all data
  loadAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      await Promise.all([
        get().loadApps(),
        get().loadActivities(),
        get().loadNotifications(),
        get().loadRecentItems(),
      ]);
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  // Mark notification as read
  markNotificationRead: async (id: string) => {
    try {
      await markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      }));
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
    }
  },

  // Mark all notifications as read
  markAllNotificationsRead: async () => {
    try {
      await markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      }));
    } catch (error: any) {
      console.error('Failed to mark all notifications as read:', error);
    }
  },

  // Select app
  selectApp: (appId: string | null) => {
    set({ selectedApp: appId });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Get unread notification count
  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  // Get app by ID
  getAppById: (id: string) => {
    return get().apps.find((app) => app.id === id);
  },
}));
