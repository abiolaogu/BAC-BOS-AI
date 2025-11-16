'use client';

import { useComments, useCreateComment, useResolveComment, useDeleteComment } from '@/hooks';
import { useDocumentStore } from '@/store';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useState } from 'react';
import { formatRelativeTime } from '@/lib/utils';
import { ChatBubbleLeftRightIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function CommentsList() {
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const [newComment, setNewComment] = useState('');

  const { data: comments, isLoading } = useComments(currentDocument?.id || '');
  const { mutate: createComment, isPending: isCreating } = useCreateComment(currentDocument?.id || '');
  const { mutate: resolveComment } = useResolveComment(currentDocument?.id || '');
  const { mutate: deleteComment } = useDeleteComment(currentDocument?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    createComment(
      { content: newComment },
      {
        onSuccess: () => {
          setNewComment('');
        },
      }
    );
  };

  if (!currentDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm">Open a document to see comments</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
          />
          <Button type="submit" isLoading={isCreating} size="sm" className="w-full">
            Post Comment
          </Button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner />
          </div>
        ) : comments?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No comments yet</p>
          </div>
        ) : (
          comments?.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg ${
                comment.resolved ? 'bg-gray-50 opacity-60' : 'bg-white border border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Avatar name={comment.user?.name || 'Unknown'} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-900">
                      {comment.user?.name || 'Unknown'}
                    </p>
                    <span className="text-xs text-gray-500">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{comment.content}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => resolveComment(comment.id)}
                      className="text-xs text-gray-500 hover:text-primary-600 flex items-center gap-1"
                    >
                      <CheckIcon className="w-4 h-4" />
                      {comment.resolved ? 'Resolved' : 'Resolve'}
                    </button>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
