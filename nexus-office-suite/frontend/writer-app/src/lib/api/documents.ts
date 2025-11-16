import { apiClient } from './client';
import type {
  Document,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  ListDocumentsQuery,
  ListDocumentsResponse,
  DocumentVersion,
  ShareDocumentRequest,
  Permission,
  ExportFormat,
  ImportDocumentRequest,
} from '@/types/document';

export const documentsApi = {
  // Create a new document
  create: async (data: CreateDocumentRequest): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents', data);
    return response.data;
  },

  // Get a document by ID
  get: async (id: string): Promise<Document> => {
    const response = await apiClient.get<Document>(`/documents/${id}`);
    return response.data;
  },

  // List documents with optional filters
  list: async (query?: ListDocumentsQuery): Promise<ListDocumentsResponse> => {
    const response = await apiClient.get<ListDocumentsResponse>('/documents', query);
    return response.data;
  },

  // Update a document
  update: async (id: string, data: UpdateDocumentRequest): Promise<Document> => {
    const response = await apiClient.put<Document>(`/documents/${id}`, data);
    return response.data;
  },

  // Delete a document (soft delete)
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}`);
  },

  // Duplicate a document
  duplicate: async (id: string): Promise<Document> => {
    const response = await apiClient.post<Document>(`/documents/${id}/duplicate`);
    return response.data;
  },

  // Get document versions
  getVersions: async (id: string): Promise<DocumentVersion[]> => {
    const response = await apiClient.get<DocumentVersion[]>(`/documents/${id}/versions`);
    return response.data;
  },

  // Restore a specific version
  restoreVersion: async (id: string, versionId: string): Promise<Document> => {
    const response = await apiClient.post<Document>(`/documents/${id}/versions/${versionId}/restore`);
    return response.data;
  },

  // Share document with user
  share: async (id: string, data: ShareDocumentRequest): Promise<Permission> => {
    const response = await apiClient.post<Permission>(`/documents/${id}/share`, data);
    return response.data;
  },

  // Update sharing permission
  updatePermission: async (id: string, permissionId: string, role: string): Promise<Permission> => {
    const response = await apiClient.put<Permission>(
      `/documents/${id}/permissions/${permissionId}`,
      { role }
    );
    return response.data;
  },

  // Remove sharing permission
  removePermission: async (id: string, permissionId: string): Promise<void> => {
    await apiClient.delete(`/documents/${id}/permissions/${permissionId}`);
  },

  // Get document permissions
  getPermissions: async (id: string): Promise<Permission[]> => {
    const response = await apiClient.get<Permission[]>(`/documents/${id}/permissions`);
    return response.data;
  },

  // Export document
  export: async (id: string, format: ExportFormat['format']): Promise<void> => {
    const filename = `document-${id}.${format}`;
    await apiClient.download(`/documents/${id}/export/${format}`, filename);
  },

  // Import document
  import: async (file: File, title?: string, folderId?: string): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);
    if (folderId) formData.append('folderId', folderId);

    const response = await apiClient.upload<Document>('/documents/import', formData);
    return response.data;
  },

  // Move document to folder
  move: async (id: string, folderId: string | null): Promise<Document> => {
    const response = await apiClient.put<Document>(`/documents/${id}/move`, { folderId });
    return response.data;
  },

  // Create from template
  createFromTemplate: async (templateId: string, title: string): Promise<Document> => {
    const response = await apiClient.post<Document>('/documents', {
      title,
      templateId,
    });
    return response.data;
  },

  // Convert to template
  convertToTemplate: async (id: string): Promise<Document> => {
    const response = await apiClient.post<Document>(`/documents/${id}/convert-to-template`);
    return response.data;
  },
};
