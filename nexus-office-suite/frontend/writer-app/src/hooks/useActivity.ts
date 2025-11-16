import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/lib/api';

export const ACTIVITY_QUERY_KEYS = {
  activity: (documentId: string) => ['documents', documentId, 'activity'] as const,
};

// Get activity log for a document
export function useActivity(documentId: string) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.activity(documentId),
    queryFn: () => activityApi.list(documentId),
    enabled: !!documentId,
  });
}
