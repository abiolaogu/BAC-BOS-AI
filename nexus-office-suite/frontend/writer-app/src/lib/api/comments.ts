import { apiClient } from './client';
import type { Comment } from '@/types/document';

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
  selectionState?: any;
  position?: {
    offset: number;
    length: number;
  };
}

export interface UpdateCommentRequest {
  content: string;
}

export const commentsApi = {
  // Get all comments for a document
  list: async (documentId: string): Promise<Comment[]> => {
    const response = await apiClient.get<Comment[]>(`/documents/${documentId}/comments`);
    return response.data;
  },

  // Create a new comment
  create: async (documentId: string, data: CreateCommentRequest): Promise<Comment> => {
    const response = await apiClient.post<Comment>(`/documents/${documentId}/comments`, data);
    return response.data;
  },

  // Update a comment
  update: async (documentId: string, commentId: string, data: UpdateCommentRequest): Promise<Comment> => {
    const response = await apiClient.put<Comment>(
      `/documents/${documentId}/comments/${commentId}`,
      data
    );
    return response.data;
  },

  // Delete a comment
  delete: async (documentId: string, commentId: string): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}/comments/${commentId}`);
  },

  // Resolve a comment
  resolve: async (documentId: string, commentId: string): Promise<Comment> => {
    const response = await apiClient.put<Comment>(
      `/documents/${documentId}/comments/${commentId}/resolve`
    );
    return response.data;
  },

  // Unresolve a comment
  unresolve: async (documentId: string, commentId: string): Promise<Comment> => {
    const response = await apiClient.put<Comment>(
      `/documents/${documentId}/comments/${commentId}/unresolve`
    );
    return response.data;
  },
};
