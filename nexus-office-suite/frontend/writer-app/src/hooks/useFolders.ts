import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { foldersApi, type CreateFolderRequest, type UpdateFolderRequest } from '@/lib/api/folders';
import toast from 'react-hot-toast';

export const FOLDER_QUERY_KEYS = {
  folders: ['folders'] as const,
};

// List folders
export function useFolders() {
  return useQuery({
    queryKey: FOLDER_QUERY_KEYS.folders,
    queryFn: () => foldersApi.list(),
  });
}

// Create folder
export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFolderRequest) => foldersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDER_QUERY_KEYS.folders });
      toast.success('Folder created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create folder');
    },
  });
}

// Update folder
export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFolderRequest }) =>
      foldersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDER_QUERY_KEYS.folders });
      toast.success('Folder updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update folder');
    },
  });
}

// Delete folder
export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => foldersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDER_QUERY_KEYS.folders });
      toast.success('Folder deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete folder');
    },
  });
}

// Move folder
export function useMoveFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      foldersApi.move(id, parentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: FOLDER_QUERY_KEYS.folders });
      toast.success('Folder moved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to move folder');
    },
  });
}
