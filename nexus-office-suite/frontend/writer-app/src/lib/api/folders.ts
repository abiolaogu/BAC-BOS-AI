import { apiClient } from './client';
import type { Folder } from '@/types/document';

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

export interface UpdateFolderRequest {
  name: string;
}

export const foldersApi = {
  // List all folders
  list: async (): Promise<Folder[]> => {
    const response = await apiClient.get<Folder[]>('/folders');
    return response.data;
  },

  // Create a new folder
  create: async (data: CreateFolderRequest): Promise<Folder> => {
    const response = await apiClient.post<Folder>('/folders', data);
    return response.data;
  },

  // Update a folder
  update: async (id: string, data: UpdateFolderRequest): Promise<Folder> => {
    const response = await apiClient.put<Folder>(`/folders/${id}`, data);
    return response.data;
  },

  // Delete a folder
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/folders/${id}`);
  },

  // Move a folder
  move: async (id: string, parentId: string | null): Promise<Folder> => {
    const response = await apiClient.put<Folder>(`/folders/${id}/move`, { parentId });
    return response.data;
  },
};
