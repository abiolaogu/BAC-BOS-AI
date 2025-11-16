import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsApi } from '@/lib/api';
import type {
  Document,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  ListDocumentsQuery,
  ShareDocumentRequest,
  ExportFormat,
} from '@/types/document';
import { useDocumentStore } from '@/store';
import toast from 'react-hot-toast';

export const QUERY_KEYS = {
  documents: ['documents'] as const,
  document: (id: string) => ['documents', id] as const,
  documentVersions: (id: string) => ['documents', id, 'versions'] as const,
  documentPermissions: (id: string) => ['documents', id, 'permissions'] as const,
};

// List documents
export function useDocuments(query?: ListDocumentsQuery) {
  return useQuery({
    queryKey: [...QUERY_KEYS.documents, query],
    queryFn: () => documentsApi.list(query),
  });
}

// Get single document
export function useDocument(id: string) {
  const setCurrentDocument = useDocumentStore((state) => state.setCurrentDocument);

  return useQuery({
    queryKey: QUERY_KEYS.document(id),
    queryFn: () => documentsApi.get(id),
    enabled: !!id,
    onSuccess: (data) => {
      setCurrentDocument(data);
    },
  });
}

// Create document
export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDocumentRequest) => documentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      toast.success('Document created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create document');
    },
  });
}

// Update document
export function useUpdateDocument(id: string) {
  const queryClient = useQueryClient();
  const updateDocument = useDocumentStore((state) => state.updateDocument);

  return useMutation({
    mutationFn: (data: UpdateDocumentRequest) => documentsApi.update(id, data),
    onMutate: async (data) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.document(id) });
      const previousDocument = queryClient.getQueryData<Document>(QUERY_KEYS.document(id));

      if (previousDocument) {
        queryClient.setQueryData<Document>(QUERY_KEYS.document(id), {
          ...previousDocument,
          ...data,
        });
        updateDocument(data);
      }

      return { previousDocument };
    },
    onError: (error: any, variables, context) => {
      // Rollback on error
      if (context?.previousDocument) {
        queryClient.setQueryData(QUERY_KEYS.document(id), context.previousDocument);
      }
      toast.error(error.response?.data?.message || 'Failed to update document');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
    },
  });
}

// Delete document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      toast.success('Document deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete document');
    },
  });
}

// Duplicate document
export function useDuplicateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => documentsApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      toast.success('Document duplicated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to duplicate document');
    },
  });
}

// Get document versions
export function useDocumentVersions(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.documentVersions(id),
    queryFn: () => documentsApi.getVersions(id),
    enabled: !!id,
  });
}

// Restore version
export function useRestoreVersion(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (versionId: string) => documentsApi.restoreVersion(id, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.document(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documentVersions(id) });
      toast.success('Version restored successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to restore version');
    },
  });
}

// Share document
export function useShareDocument(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShareDocumentRequest) => documentsApi.share(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documentPermissions(id) });
      toast.success('Document shared successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to share document');
    },
  });
}

// Get permissions
export function useDocumentPermissions(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.documentPermissions(id),
    queryFn: () => documentsApi.getPermissions(id),
    enabled: !!id,
  });
}

// Update permission
export function useUpdatePermission(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ permissionId, role }: { permissionId: string; role: string }) =>
      documentsApi.updatePermission(documentId, permissionId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documentPermissions(documentId) });
      toast.success('Permission updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update permission');
    },
  });
}

// Remove permission
export function useRemovePermission(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (permissionId: string) =>
      documentsApi.removePermission(documentId, permissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documentPermissions(documentId) });
      toast.success('Permission removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove permission');
    },
  });
}

// Export document
export function useExportDocument() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format: ExportFormat['format'] }) =>
      documentsApi.export(id, format),
    onSuccess: () => {
      toast.success('Document exported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export document');
    },
  });
}

// Import document
export function useImportDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, title, folderId }: { file: File; title?: string; folderId?: string }) =>
      documentsApi.import(file, title, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      toast.success('Document imported successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to import document');
    },
  });
}

// Move document
export function useMoveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      documentsApi.move(id, folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.documents });
      toast.success('Document moved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to move document');
    },
  });
}
