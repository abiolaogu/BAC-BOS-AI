import { Notification, ApiResponse } from '@/types/hub';
import { writerApi, sheetsApi, slidesApi, driveApi, meetApi } from './client';

/**
 * Get all notifications from all services
 */
export async function getAllNotifications(limit: number = 50): Promise<Notification[]> {
  const notifications: Notification[] = [];

  try {
    // Fetch notifications from all services in parallel
    const [writerNotifs, sheetsNotifs, slidesNotifs, driveNotifs, meetNotifs] =
      await Promise.allSettled([
        fetchWriterNotifications(),
        fetchSheetsNotifications(),
        fetchSlidesNotifications(),
        fetchDriveNotifications(),
        fetchMeetNotifications(),
      ]);

    // Combine all notifications
    if (writerNotifs.status === 'fulfilled') notifications.push(...writerNotifs.value);
    if (sheetsNotifs.status === 'fulfilled') notifications.push(...sheetsNotifs.value);
    if (slidesNotifs.status === 'fulfilled') notifications.push(...slidesNotifs.value);
    if (driveNotifs.status === 'fulfilled') notifications.push(...driveNotifs.value);
    if (meetNotifs.status === 'fulfilled') notifications.push(...meetNotifs.value);

    // Sort by timestamp (newest first) and limit
    return notifications
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const notifications = await getAllNotifications();
  return notifications.filter((n) => !n.read).length;
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  const [appId] = notificationId.split('-');

  try {
    switch (appId) {
      case 'writer':
        await writerApi.put(`/notifications/${notificationId}/read`);
        break;
      case 'sheets':
        await sheetsApi.put(`/notifications/${notificationId}/read`);
        break;
      case 'slides':
        await slidesApi.put(`/notifications/${notificationId}/read`);
        break;
      case 'drive':
        await driveApi.put(`/notifications/${notificationId}/read`);
        break;
      case 'meet':
        await meetApi.put(`/notifications/${notificationId}/read`);
        break;
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  try {
    await Promise.all([
      writerApi.put('/notifications/read-all'),
      sheetsApi.put('/notifications/read-all'),
      slidesApi.put('/notifications/read-all'),
      driveApi.put('/notifications/read-all'),
      meetApi.put('/notifications/read-all'),
    ]);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  const [appId] = notificationId.split('-');

  try {
    switch (appId) {
      case 'writer':
        await writerApi.delete(`/notifications/${notificationId}`);
        break;
      case 'sheets':
        await sheetsApi.delete(`/notifications/${notificationId}`);
        break;
      case 'slides':
        await slidesApi.delete(`/notifications/${notificationId}`);
        break;
      case 'drive':
        await driveApi.delete(`/notifications/${notificationId}`);
        break;
      case 'meet':
        await meetApi.delete(`/notifications/${notificationId}`);
        break;
    }
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
}

// Service-specific notification fetchers
async function fetchWriterNotifications(): Promise<Notification[]> {
  try {
    const response = await writerApi.get<any>('/notifications');
    const notifications = response.notifications || [];

    return notifications.map((notif: any) => ({
      id: `writer-${notif.id}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      appId: 'writer',
      appName: 'NEXUS Writer',
      appColor: '#3b82f6',
      itemId: notif.documentId,
      itemUrl: notif.documentId
        ? `${process.env.NEXT_PUBLIC_WRITER_APP_URL}/editor/${notif.documentId}`
        : undefined,
      from: notif.from,
      read: notif.read || false,
      timestamp: notif.createdAt,
      priority: notif.priority || 'medium',
    }));
  } catch {
    return [];
  }
}

async function fetchSheetsNotifications(): Promise<Notification[]> {
  try {
    const response = await sheetsApi.get<any>('/notifications');
    const notifications = response.notifications || [];

    return notifications.map((notif: any) => ({
      id: `sheets-${notif.id}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      appId: 'sheets',
      appName: 'NEXUS Sheets',
      appColor: '#10b981',
      itemId: notif.spreadsheetId,
      itemUrl: notif.spreadsheetId
        ? `${process.env.NEXT_PUBLIC_SHEETS_APP_URL}/editor/${notif.spreadsheetId}`
        : undefined,
      from: notif.from,
      read: notif.read || false,
      timestamp: notif.createdAt,
      priority: notif.priority || 'medium',
    }));
  } catch {
    return [];
  }
}

async function fetchSlidesNotifications(): Promise<Notification[]> {
  try {
    const response = await slidesApi.get<any>('/notifications');
    const notifications = response.notifications || [];

    return notifications.map((notif: any) => ({
      id: `slides-${notif.id}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      appId: 'slides',
      appName: 'NEXUS Slides',
      appColor: '#f59e0b',
      itemId: notif.presentationId,
      itemUrl: notif.presentationId
        ? `${process.env.NEXT_PUBLIC_SLIDES_APP_URL}/editor/${notif.presentationId}`
        : undefined,
      from: notif.from,
      read: notif.read || false,
      timestamp: notif.createdAt,
      priority: notif.priority || 'medium',
    }));
  } catch {
    return [];
  }
}

async function fetchDriveNotifications(): Promise<Notification[]> {
  try {
    const response = await driveApi.get<any>('/notifications');
    const notifications = response.notifications || [];

    return notifications.map((notif: any) => ({
      id: `drive-${notif.id}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      appId: 'drive',
      appName: 'NEXUS Drive',
      appColor: '#6366f1',
      itemId: notif.fileId,
      itemUrl: notif.fileId
        ? `${process.env.NEXT_PUBLIC_DRIVE_APP_URL}?file=${notif.fileId}`
        : undefined,
      from: notif.from,
      read: notif.read || false,
      timestamp: notif.createdAt,
      priority: notif.priority || 'medium',
    }));
  } catch {
    return [];
  }
}

async function fetchMeetNotifications(): Promise<Notification[]> {
  try {
    const response = await meetApi.get<any>('/notifications');
    const notifications = response.notifications || [];

    return notifications.map((notif: any) => ({
      id: `meet-${notif.id}`,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      appId: 'meet',
      appName: 'NEXUS Meet',
      appColor: '#8b5cf6',
      itemId: notif.meetingId,
      itemUrl: notif.roomId
        ? `${process.env.NEXT_PUBLIC_MEET_APP_URL}/room/${notif.roomId}`
        : undefined,
      from: notif.from,
      read: notif.read || false,
      timestamp: notif.createdAt,
      priority: notif.priority || 'medium',
      actionUrl: notif.actionUrl,
      actionLabel: notif.actionLabel,
    }));
  } catch {
    return [];
  }
}
