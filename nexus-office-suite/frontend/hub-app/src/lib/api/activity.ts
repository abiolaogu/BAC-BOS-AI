import { Activity, RecentItem, PaginatedResponse, ApiResponse } from '@/types/hub';
import { writerApi, sheetsApi, slidesApi, driveApi, meetApi } from './client';

/**
 * Get recent activity feed from all services
 */
export async function getRecentActivity(limit: number = 20): Promise<Activity[]> {
  const activities: Activity[] = [];

  try {
    // Fetch recent activity from each service in parallel
    const [writerActivities, sheetsActivities, slidesActivities, driveActivities, meetActivities] =
      await Promise.allSettled([
        fetchWriterActivity(),
        fetchSheetsActivity(),
        fetchSlidesActivity(),
        fetchDriveActivity(),
        fetchMeetActivity(),
      ]);

    // Combine all activities
    if (writerActivities.status === 'fulfilled') activities.push(...writerActivities.value);
    if (sheetsActivities.status === 'fulfilled') activities.push(...sheetsActivities.value);
    if (slidesActivities.status === 'fulfilled') activities.push(...slidesActivities.value);
    if (driveActivities.status === 'fulfilled') activities.push(...driveActivities.value);
    if (meetActivities.status === 'fulfilled') activities.push(...meetActivities.value);

    // Sort by timestamp (newest first) and limit
    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching activity:', error);
    return [];
  }
}

/**
 * Get recent items from all services
 */
export async function getRecentItems(limit: number = 10): Promise<RecentItem[]> {
  const items: RecentItem[] = [];

  try {
    // Fetch recent items from each service
    const [writerItems, sheetsItems, slidesItems, driveItems] = await Promise.allSettled([
      fetchWriterRecentItems(),
      fetchSheetsRecentItems(),
      fetchSlidesRecentItems(),
      fetchDriveRecentItems(),
    ]);

    if (writerItems.status === 'fulfilled') items.push(...writerItems.value);
    if (sheetsItems.status === 'fulfilled') items.push(...sheetsItems.value);
    if (slidesItems.status === 'fulfilled') items.push(...slidesItems.value);
    if (driveItems.status === 'fulfilled') items.push(...driveItems.value);

    // Sort by last modified (newest first) and limit
    return items
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching recent items:', error);
    return [];
  }
}

// Service-specific activity fetchers
async function fetchWriterActivity(): Promise<Activity[]> {
  try {
    const response = await writerApi.get<any>('/documents/recent');
    const documents = response.documents || [];

    return documents.map((doc: any) => ({
      id: `writer-${doc.id}`,
      type: doc.createdAt === doc.updatedAt ? 'created' : 'edited',
      title: doc.title || 'Untitled Document',
      description: `${doc.type === 'created' ? 'Created' : 'Updated'} document`,
      appId: 'writer',
      appName: 'NEXUS Writer',
      appColor: '#3b82f6',
      itemId: doc.id,
      itemType: 'document',
      itemUrl: `${process.env.NEXT_PUBLIC_WRITER_APP_URL}/editor/${doc.id}`,
      user: {
        id: doc.ownerId || '',
        name: doc.ownerName || 'Unknown User',
      },
      timestamp: doc.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function fetchSheetsActivity(): Promise<Activity[]> {
  try {
    const response = await sheetsApi.get<any>('/spreadsheets/recent');
    const spreadsheets = response.spreadsheets || [];

    return spreadsheets.map((sheet: any) => ({
      id: `sheets-${sheet.id}`,
      type: sheet.createdAt === sheet.updatedAt ? 'created' : 'edited',
      title: sheet.title || 'Untitled Spreadsheet',
      description: `${sheet.type === 'created' ? 'Created' : 'Updated'} spreadsheet`,
      appId: 'sheets',
      appName: 'NEXUS Sheets',
      appColor: '#10b981',
      itemId: sheet.id,
      itemType: 'spreadsheet',
      itemUrl: `${process.env.NEXT_PUBLIC_SHEETS_APP_URL}/editor/${sheet.id}`,
      user: {
        id: sheet.ownerId || '',
        name: sheet.ownerName || 'Unknown User',
      },
      timestamp: sheet.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function fetchSlidesActivity(): Promise<Activity[]> {
  try {
    const response = await slidesApi.get<any>('/presentations/recent');
    const presentations = response.presentations || [];

    return presentations.map((pres: any) => ({
      id: `slides-${pres.id}`,
      type: pres.createdAt === pres.updatedAt ? 'created' : 'edited',
      title: pres.title || 'Untitled Presentation',
      description: `${pres.type === 'created' ? 'Created' : 'Updated'} presentation`,
      appId: 'slides',
      appName: 'NEXUS Slides',
      appColor: '#f59e0b',
      itemId: pres.id,
      itemType: 'presentation',
      itemUrl: `${process.env.NEXT_PUBLIC_SLIDES_APP_URL}/editor/${pres.id}`,
      user: {
        id: pres.ownerId || '',
        name: pres.ownerName || 'Unknown User',
      },
      timestamp: pres.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function fetchDriveActivity(): Promise<Activity[]> {
  try {
    const response = await driveApi.get<any>('/files/recent');
    const files = response.files || [];

    return files.map((file: any) => ({
      id: `drive-${file.id}`,
      type: 'uploaded',
      title: file.name || 'Untitled File',
      description: `Uploaded file`,
      appId: 'drive',
      appName: 'NEXUS Drive',
      appColor: '#6366f1',
      itemId: file.id,
      itemType: 'file',
      itemUrl: `${process.env.NEXT_PUBLIC_DRIVE_APP_URL}?file=${file.id}`,
      user: {
        id: file.ownerId || '',
        name: file.ownerName || 'Unknown User',
      },
      timestamp: file.uploadedAt || file.updatedAt,
    }));
  } catch {
    return [];
  }
}

async function fetchMeetActivity(): Promise<Activity[]> {
  try {
    const response = await meetApi.get<any>('/meetings/recent');
    const meetings = response.meetings || [];

    return meetings.map((meeting: any) => ({
      id: `meet-${meeting.id}`,
      type: 'created',
      title: meeting.title || 'Untitled Meeting',
      description: `Scheduled meeting`,
      appId: 'meet',
      appName: 'NEXUS Meet',
      appColor: '#8b5cf6',
      itemId: meeting.id,
      itemType: 'meeting',
      itemUrl: `${process.env.NEXT_PUBLIC_MEET_APP_URL}/room/${meeting.roomId}`,
      user: {
        id: meeting.hostId || '',
        name: meeting.hostName || 'Unknown User',
      },
      timestamp: meeting.createdAt,
    }));
  } catch {
    return [];
  }
}

// Recent items fetchers
async function fetchWriterRecentItems(): Promise<RecentItem[]> {
  try {
    const response = await writerApi.get<any>('/documents/recent');
    const documents = response.documents || [];

    return documents.map((doc: any) => ({
      id: doc.id,
      title: doc.title || 'Untitled Document',
      type: 'document',
      appId: 'writer',
      appName: 'NEXUS Writer',
      url: `${process.env.NEXT_PUBLIC_WRITER_APP_URL}/editor/${doc.id}`,
      lastModified: doc.updatedAt,
      owner: {
        id: doc.ownerId || '',
        name: doc.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

async function fetchSheetsRecentItems(): Promise<RecentItem[]> {
  try {
    const response = await sheetsApi.get<any>('/spreadsheets/recent');
    const spreadsheets = response.spreadsheets || [];

    return spreadsheets.map((sheet: any) => ({
      id: sheet.id,
      title: sheet.title || 'Untitled Spreadsheet',
      type: 'spreadsheet',
      appId: 'sheets',
      appName: 'NEXUS Sheets',
      url: `${process.env.NEXT_PUBLIC_SHEETS_APP_URL}/editor/${sheet.id}`,
      lastModified: sheet.updatedAt,
      owner: {
        id: sheet.ownerId || '',
        name: sheet.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

async function fetchSlidesRecentItems(): Promise<RecentItem[]> {
  try {
    const response = await slidesApi.get<any>('/presentations/recent');
    const presentations = response.presentations || [];

    return presentations.map((pres: any) => ({
      id: pres.id,
      title: pres.title || 'Untitled Presentation',
      type: 'presentation',
      appId: 'slides',
      appName: 'NEXUS Slides',
      url: `${process.env.NEXT_PUBLIC_SLIDES_APP_URL}/editor/${pres.id}`,
      lastModified: pres.updatedAt,
      owner: {
        id: pres.ownerId || '',
        name: pres.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}

async function fetchDriveRecentItems(): Promise<RecentItem[]> {
  try {
    const response = await driveApi.get<any>('/files/recent');
    const files = response.files || [];

    return files.map((file: any) => ({
      id: file.id,
      title: file.name || 'Untitled File',
      type: 'file',
      appId: 'drive',
      appName: 'NEXUS Drive',
      url: `${process.env.NEXT_PUBLIC_DRIVE_APP_URL}?file=${file.id}`,
      lastModified: file.uploadedAt || file.updatedAt,
      owner: {
        id: file.ownerId || '',
        name: file.ownerName || 'Unknown User',
      },
    }));
  } catch {
    return [];
  }
}
