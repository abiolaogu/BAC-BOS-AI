import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commentsApi, type CreateCommentRequest, type UpdateCommentRequest } from '@/lib/api/comments';
import toast from 'react-hot-toast';

export const COMMENT_QUERY_KEYS = {
  comments: (documentId: string) => ['documents', documentId, 'comments'] as const,
};

// Get comments for a document
export function useComments(documentId: string) {
  return useQuery({
    queryKey: COMMENT_QUERY_KEYS.comments(documentId),
    queryFn: () => commentsApi.list(documentId),
    enabled: !!documentId,
  });
}

// Create comment
export function useCreateComment(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCommentRequest) => commentsApi.create(documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.comments(documentId) });
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    },
  });
}

// Update comment
export function useUpdateComment(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, data }: { commentId: string; data: UpdateCommentRequest }) =>
      commentsApi.update(documentId, commentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.comments(documentId) });
      toast.success('Comment updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update comment');
    },
  });
}

// Delete comment
export function useDeleteComment(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsApi.delete(documentId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.comments(documentId) });
      toast.success('Comment deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete comment');
    },
  });
}

// Resolve comment
export function useResolveComment(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsApi.resolve(documentId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.comments(documentId) });
      toast.success('Comment resolved');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve comment');
    },
  });
}

// Unresolve comment
export function useUnresolveComment(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => commentsApi.unresolve(documentId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COMMENT_QUERY_KEYS.comments(documentId) });
      toast.success('Comment reopened');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reopen comment');
    },
  });
}
