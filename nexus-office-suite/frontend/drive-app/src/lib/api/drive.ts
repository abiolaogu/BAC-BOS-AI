import apiClient from './client';
import type {
  File,
  Folder,
  FileInfo,
  FileVersion,
  Permission,
  ShareLink,
  CreateFolderRequest,
  UpdateFileRequest,
  UpdateFolderRequest,
  CreatePermissionRequest,
  CreateShareLinkRequest,
} from '@/types/drive';

export const driveApi = {
  // File operations
  uploadFile: async (file: globalThis.File, folderId?: string): Promise<File> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folder_id', folderId);
    }

    const response = await apiClient.post<File>('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  listFiles: async (folderId?: string, includeShared = false): Promise<File[]> => {
    const params: any = { include_shared: includeShared };
    if (folderId) {
      params.folder_id = folderId;
    }
    const response = await apiClient.get<File[]>('/files', { params });
    return response.data;
  },

  getFile: async (fileId: string): Promise<File> => {
    const response = await apiClient.get<File>(`/files/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId: string): Promise<Blob> => {
    const response = await apiClient.get(`/files/${fileId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  updateFile: async (fileId: string, data: UpdateFileRequest): Promise<File> => {
    const response = await apiClient.put<File>(`/files/${fileId}`, data);
    return response.data;
  },

  deleteFile: async (fileId: string): Promise<void> => {
    await apiClient.delete(`/files/${fileId}`);
  },

  moveFile: async (fileId: string, folderId?: string): Promise<File> => {
    const response = await apiClient.post<File>(`/files/${fileId}/move`, {
      folder_id: folderId,
    });
    return response.data;
  },

  copyFile: async (fileId: string, folderId?: string): Promise<File> => {
    const response = await apiClient.post<File>(`/files/${fileId}/copy`, {
      folder_id: folderId,
    });
    return response.data;
  },

  searchFiles: async (query: string, fileType?: string): Promise<File[]> => {
    const params: any = { q: query };
    if (fileType) {
      params.type = fileType;
    }
    const response = await apiClient.get<File[]>('/files/search', { params });
    return response.data;
  },

  getStarredFiles: async (): Promise<File[]> => {
    const response = await apiClient.get<File[]>('/files/starred');
    return response.data;
  },

  getRecentFiles: async (limit = 20): Promise<File[]> => {
    const response = await apiClient.get<File[]>('/files/recent', {
      params: { limit },
    });
    return response.data;
  },

  // Folder operations
  createFolder: async (data: CreateFolderRequest): Promise<Folder> => {
    const response = await apiClient.post<Folder>('/folders', data);
    return response.data;
  },

  listFolders: async (parentId?: string, includeShared = false): Promise<Folder[]> => {
    const params: any = { include_shared: includeShared };
    if (parentId) {
      params.parent_id = parentId;
    }
    const response = await apiClient.get<Folder[]>('/folders', { params });
    return response.data;
  },

  getFolder: async (folderId: string): Promise<Folder> => {
    const response = await apiClient.get<Folder>(`/folders/${folderId}`);
    return response.data;
  },

  updateFolder: async (folderId: string, data: UpdateFolderRequest): Promise<Folder> => {
    const response = await apiClient.put<Folder>(`/folders/${folderId}`, data);
    return response.data;
  },

  deleteFolder: async (folderId: string): Promise<void> => {
    await apiClient.delete(`/folders/${folderId}`);
  },

  // Trash operations
  listTrashed: async (): Promise<FileInfo[]> => {
    const response = await apiClient.get<FileInfo[]>('/trash');
    return response.data;
  },

  restoreFromTrash: async (resourceId: string, resourceType: 'file' | 'folder'): Promise<void> => {
    await apiClient.post('/trash/restore', { resource_id: resourceId, resource_type: resourceType });
  },

  emptyTrash: async (): Promise<void> => {
    await apiClient.post('/trash/empty');
  },

  // Permission operations
  grantPermission: async (data: CreatePermissionRequest): Promise<Permission> => {
    const response = await apiClient.post<Permission>('/permissions', data);
    return response.data;
  },

  revokePermission: async (permissionId: string): Promise<void> => {
    await apiClient.delete(`/permissions/${permissionId}`);
  },

  listPermissions: async (resourceId: string, resourceType: 'file' | 'folder'): Promise<Permission[]> => {
    const response = await apiClient.get<Permission[]>(`/permissions/${resourceType}/${resourceId}`);
    return response.data;
  },

  // Share link operations
  createShareLink: async (data: CreateShareLinkRequest): Promise<ShareLink> => {
    const response = await apiClient.post<ShareLink>('/share-links', data);
    return response.data;
  },

  getShareLink: async (token: string): Promise<ShareLink> => {
    const response = await apiClient.get<ShareLink>(`/share/${token}`);
    return response.data;
  },

  deleteShareLink: async (linkId: string): Promise<void> => {
    await apiClient.delete(`/share-links/${linkId}`);
  },

  // Version operations
  listVersions: async (fileId: string): Promise<FileVersion[]> => {
    const response = await apiClient.get<FileVersion[]>(`/files/${fileId}/versions`);
    return response.data;
  },

  restoreVersion: async (fileId: string, versionNum: number): Promise<File> => {
    const response = await apiClient.post<File>(`/files/${fileId}/versions/restore`, {
      version_num: versionNum,
    });
    return response.data;
  },
};
