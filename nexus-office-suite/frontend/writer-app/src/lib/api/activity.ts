import { apiClient } from './client';
import type { Activity } from '@/types/document';

export const activityApi = {
  // Get activity log for a document
  list: async (documentId: string): Promise<Activity[]> => {
    const response = await apiClient.get<Activity[]>(`/documents/${documentId}/activity`);
    return response.data;
  },
};
