import { config } from 'dotenv';

config();

export interface ServiceConfig {
  name: string;
  url: string;
  path: string;
  healthCheck?: string;
}

export const services: ServiceConfig[] = [
  {
    name: 'auth',
    url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    path: '/api/auth',
    healthCheck: '/health',
  },
  {
    name: 'writer',
    url: process.env.WRITER_SERVICE_URL || 'http://writer-service:3002',
    path: '/api/writer',
    healthCheck: '/health',
  },
  {
    name: 'sheets',
    url: process.env.SHEETS_SERVICE_URL || 'http://sheets-service:3003',
    path: '/api/sheets',
    healthCheck: '/health',
  },
  {
    name: 'slides',
    url: process.env.SLIDES_SERVICE_URL || 'http://slides-service:3004',
    path: '/api/slides',
    healthCheck: '/health',
  },
  {
    name: 'drive',
    url: process.env.DRIVE_SERVICE_URL || 'http://drive-service:3005',
    path: '/api/drive',
    healthCheck: '/health',
  },
  {
    name: 'meet',
    url: process.env.MEET_SERVICE_URL || 'http://meet-service:3006',
    path: '/api/meet',
    healthCheck: '/health',
  },
  {
    name: 'notification',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3007',
    path: '/api/notifications',
    healthCheck: '/health',
  },
  {
    name: 'collaboration',
    url: process.env.COLLABORATION_SERVICE_URL || 'http://collaboration-service:3008',
    path: '/api/collaboration',
    healthCheck: '/health',
  },
];

export const getServiceByName = (name: string): ServiceConfig | undefined => {
  return services.find((service) => service.name === name);
};

export const getServiceByPath = (path: string): ServiceConfig | undefined => {
  return services.find((service) => path.startsWith(service.path));
};
