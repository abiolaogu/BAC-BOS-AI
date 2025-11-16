'use client';

import { useActivity } from '@/hooks';
import { useDocumentStore } from '@/store';
import Avatar from '@/components/ui/Avatar';
import Spinner from '@/components/ui/Spinner';
import { formatRelativeTime } from '@/lib/utils';
import { ClockIcon } from '@heroicons/react/24/outline';

export default function ActivityList() {
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const { data: activities, isLoading } = useActivity(currentDocument?.id || '');

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <ClockIcon className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">Open a document to see activity</p>
      </div>
    );
  }

  const getActivityMessage = (action: string, metadata: any) => {
    switch (action) {
      case 'document.created':
        return 'created the document';
      case 'document.updated':
        return 'updated the document';
      case 'document.shared':
        return `shared with ${metadata.sharedWith}`;
      case 'document.exported':
        return `exported as ${metadata.format}`;
      case 'comment.added':
        return 'added a comment';
      case 'version.restored':
        return `restored version ${metadata.version}`;
      default:
        return action;
    }
  };

  return (
    <div className="p-4 space-y-4">
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : activities?.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No activity yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities?.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <Avatar name={activity.user?.name || 'Unknown'} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{activity.user?.name || 'Unknown'}</span>{' '}
                  {getActivityMessage(activity.action, activity.metadata)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
