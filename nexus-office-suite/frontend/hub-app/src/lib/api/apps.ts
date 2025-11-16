import { NexusApp, ServiceStatus, ApiResponse } from '@/types/hub';
import { checkServiceHealth } from './client';

// Predefined NEXUS applications
export const NEXUS_APPS: Omit<NexusApp, 'status' | 'recentItems'>[] = [
  {
    id: 'writer',
    name: 'NEXUS Writer',
    description: 'Create and edit documents with rich text formatting',
    icon: 'FileText',
    color: '#3b82f6',
    url: process.env.NEXT_PUBLIC_WRITER_APP_URL || 'http://localhost:3001',
    apiUrl: process.env.NEXT_PUBLIC_WRITER_API_URL || 'http://localhost:8091/api',
    wsUrl: process.env.NEXT_PUBLIC_WRITER_WS_URL || 'ws://localhost:8091',
    version: '1.0.0',
    category: 'productivity',
    features: ['Rich text editing', 'Real-time collaboration', 'Version history', 'Templates'],
  },
  {
    id: 'sheets',
    name: 'NEXUS Sheets',
    description: 'Build powerful spreadsheets and analyze data',
    icon: 'Table',
    color: '#10b981',
    url: process.env.NEXT_PUBLIC_SHEETS_APP_URL || 'http://localhost:3002',
    apiUrl: process.env.NEXT_PUBLIC_SHEETS_API_URL || 'http://localhost:8092/api',
    wsUrl: process.env.NEXT_PUBLIC_SHEETS_WS_URL || 'ws://localhost:8092',
    version: '1.0.0',
    category: 'productivity',
    features: ['Formulas & functions', 'Charts & graphs', 'Data validation', 'Pivot tables'],
  },
  {
    id: 'slides',
    name: 'NEXUS Slides',
    description: 'Design beautiful presentations and slideshows',
    icon: 'Presentation',
    color: '#f59e0b',
    url: process.env.NEXT_PUBLIC_SLIDES_APP_URL || 'http://localhost:3004',
    apiUrl: process.env.NEXT_PUBLIC_SLIDES_API_URL || 'http://localhost:8094/api',
    wsUrl: process.env.NEXT_PUBLIC_SLIDES_WS_URL || 'ws://localhost:8094',
    version: '1.0.0',
    category: 'productivity',
    features: ['Slide templates', 'Animations', 'Presenter mode', 'Export to PDF'],
  },
  {
    id: 'drive',
    name: 'NEXUS Drive',
    description: 'Store and share files securely in the cloud',
    icon: 'HardDrive',
    color: '#6366f1',
    url: process.env.NEXT_PUBLIC_DRIVE_APP_URL || 'http://localhost:3003',
    apiUrl: process.env.NEXT_PUBLIC_DRIVE_API_URL || 'http://localhost:8093/api',
    wsUrl: process.env.NEXT_PUBLIC_DRIVE_WS_URL || 'ws://localhost:8093',
    version: '1.0.0',
    category: 'storage',
    features: ['File upload/download', 'Folder organization', 'Sharing & permissions', 'Search'],
  },
  {
    id: 'meet',
    name: 'NEXUS Meet',
    description: 'Host video conferences and virtual meetings',
    icon: 'Video',
    color: '#8b5cf6',
    url: process.env.NEXT_PUBLIC_MEET_APP_URL || 'http://localhost:3005',
    apiUrl: process.env.NEXT_PUBLIC_MEET_API_URL || 'http://localhost:8095/api',
    wsUrl: process.env.NEXT_PUBLIC_MEET_WS_URL || 'ws://localhost:8095',
    version: '1.0.0',
    category: 'communication',
    features: ['Video conferencing', 'Screen sharing', 'Chat', 'Recording'],
  },
];

// Future apps (placeholder)
export const FUTURE_APPS = [
  {
    id: 'mail',
    name: 'NEXUS Mail',
    description: 'Manage your email efficiently',
    icon: 'Mail',
    color: '#ef4444',
    status: 'offline' as const,
    version: '0.0.0',
    category: 'communication' as const,
    features: ['Coming soon'],
  },
  {
    id: 'calendar',
    name: 'NEXUS Calendar',
    description: 'Schedule and organize your time',
    icon: 'Calendar',
    color: '#ec4899',
    status: 'offline' as const,
    version: '0.0.0',
    category: 'productivity' as const,
    features: ['Coming soon'],
  },
];

/**
 * Get all NEXUS applications with their current status
 */
export async function getAllApps(): Promise<NexusApp[]> {
  const apps = await Promise.all(
    NEXUS_APPS.map(async (app) => {
      const isOnline = await checkServiceHealth(app.apiUrl);
      return {
        ...app,
        status: isOnline ? ('online' as const) : ('offline' as const),
        recentItems: [],
      };
    })
  );

  return apps;
}

/**
 * Get a specific app by ID
 */
export async function getAppById(id: string): Promise<NexusApp | null> {
  const app = NEXUS_APPS.find((a) => a.id === id);
  if (!app) return null;

  const isOnline = await checkServiceHealth(app.apiUrl);
  return {
    ...app,
    status: isOnline ? 'online' : 'offline',
    recentItems: [],
  };
}

/**
 * Get status of all services
 */
export async function getAllServiceStatuses(): Promise<ServiceStatus[]> {
  const statuses = await Promise.all(
    NEXUS_APPS.map(async (app) => {
      const startTime = Date.now();
      const isOnline = await checkServiceHealth(app.apiUrl);
      const latency = Date.now() - startTime;

      return {
        appId: app.id,
        status: isOnline ? ('online' as const) : ('offline' as const),
        uptime: isOnline ? 100 : 0,
        lastCheck: new Date().toISOString(),
        latency: isOnline ? latency : undefined,
      };
    })
  );

  return statuses;
}

/**
 * Launch an application (track usage)
 */
export async function launchApp(appId: string): Promise<void> {
  // Track app launch analytics
  console.log(`Launching app: ${appId}`);

  // Update last used timestamp in local storage
  if (typeof window !== 'undefined') {
    const usage = JSON.parse(localStorage.getItem('app_usage') || '{}');
    usage[appId] = {
      lastUsed: new Date().toISOString(),
      launchCount: (usage[appId]?.launchCount || 0) + 1,
    };
    localStorage.setItem('app_usage', JSON.stringify(usage));
  }
}
