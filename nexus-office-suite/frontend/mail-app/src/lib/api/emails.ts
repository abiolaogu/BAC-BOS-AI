import axios from 'axios';
import type {
  Email,
  EmailListResponse,
  ComposeEmailRequest,
  SearchEmailRequest,
  BulkActionRequest,
  Folder,
  Label,
} from '@/types/email';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8085/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  // TODO: Add JWT token from auth context
  // const token = localStorage.getItem('token');
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`;
  // }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Email API

export const emailAPI = {
  // List emails
  list: async (params: {
    folder_id?: string;
    page?: number;
    page_size?: number;
    is_read?: boolean;
    is_starred?: boolean;
    has_attachments?: boolean;
  }): Promise<EmailListResponse> => {
    const response = await apiClient.get('/emails', { params });
    return response.data;
  },

  // Get single email
  get: async (emailId: string): Promise<Email> => {
    const response = await apiClient.get(`/emails/${emailId}`);
    return response.data;
  },

  // Send email
  send: async (email: ComposeEmailRequest): Promise<Email> => {
    const response = await apiClient.post('/emails/send', email);
    return response.data;
  },

  // Save draft
  saveDraft: async (email: ComposeEmailRequest): Promise<Email> => {
    const response = await apiClient.post('/emails/draft', email);
    return response.data;
  },

  // Search emails
  search: async (searchParams: SearchEmailRequest): Promise<EmailListResponse> => {
    const response = await apiClient.post('/emails/search', searchParams);
    return response.data;
  },

  // Mark as read/unread
  markAsRead: async (emailId: string, isRead: boolean): Promise<void> => {
    await apiClient.put(`/emails/${emailId}/read`, { is_read: isRead });
  },

  // Star/unstar email
  markAsStarred: async (emailId: string, isStarred: boolean): Promise<void> => {
    await apiClient.put(`/emails/${emailId}/star`, { is_starred: isStarred });
  },

  // Move to folder
  moveToFolder: async (emailId: string, folderId: string): Promise<void> => {
    await apiClient.put(`/emails/${emailId}/move`, { folder_id: folderId });
  },

  // Delete email
  delete: async (emailId: string): Promise<void> => {
    await apiClient.delete(`/emails/${emailId}`);
  },

  // Get email thread
  getThread: async (threadId: string): Promise<Email[]> => {
    const response = await apiClient.get(`/emails/${threadId}/thread`);
    return response.data.emails;
  },

  // Bulk actions
  bulkAction: async (action: BulkActionRequest): Promise<void> => {
    await apiClient.post('/emails/bulk', action);
  },
};

// Folder API

export const folderAPI = {
  // List folders
  list: async (): Promise<Folder[]> => {
    const response = await apiClient.get('/folders');
    return response.data.folders;
  },

  // Get folder
  get: async (folderId: string): Promise<Folder> => {
    const response = await apiClient.get(`/folders/${folderId}`);
    return response.data;
  },

  // Create folder
  create: async (folder: Partial<Folder>): Promise<Folder> => {
    const response = await apiClient.post('/folders', folder);
    return response.data;
  },

  // Update folder
  update: async (folderId: string, folder: Partial<Folder>): Promise<Folder> => {
    const response = await apiClient.put(`/folders/${folderId}`, folder);
    return response.data;
  },

  // Delete folder
  delete: async (folderId: string): Promise<void> => {
    await apiClient.delete(`/folders/${folderId}`);
  },
};

// Label API

export const labelAPI = {
  // List labels
  list: async (): Promise<Label[]> => {
    const response = await apiClient.get('/labels');
    return response.data.labels;
  },

  // Get label
  get: async (labelId: string): Promise<Label> => {
    const response = await apiClient.get(`/labels/${labelId}`);
    return response.data;
  },

  // Create label
  create: async (label: Partial<Label>): Promise<Label> => {
    const response = await apiClient.post('/labels', label);
    return response.data;
  },

  // Update label
  update: async (labelId: string, label: Partial<Label>): Promise<Label> => {
    const response = await apiClient.put(`/labels/${labelId}`, label);
    return response.data;
  },

  // Delete label
  delete: async (labelId: string): Promise<void> => {
    await apiClient.delete(`/labels/${labelId}`);
  },
};

// Attachment API

export const attachmentAPI = {
  // Download attachment
  download: async (attachmentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Upload attachment (placeholder - implement with multipart/form-data)
  upload: async (file: File): Promise<{ id: string; url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/attachments/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default apiClient;
