'use client';

import { format } from 'date-fns';
import DOMPurify from 'isomorphic-dompurify';
import { useEmailStore, useComposerStore } from '@/store/emailStore';
import { emailAPI } from '@/lib/api/emails';
import toast from 'react-hot-toast';

export default function EmailViewer() {
  const { selectedEmail, setSelectedEmail } = useEmailStore();
  const { setReplyTo } = useComposerStore();

  if (!selectedEmail) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 text-gray-500">
        Select an email to read
      </div>
    );
  }

  const handleReply = () => {
    setReplyTo(selectedEmail);
  };

  const handleReplyAll = () => {
    setReplyTo(selectedEmail);
    // TODO: Add all recipients to CC
  };

  const handleForward = () => {
    // TODO: Open composer with email content
  };

  const handleDelete = async () => {
    try {
      await emailAPI.delete(selectedEmail.id);
      setSelectedEmail(null);
      toast.success('Email moved to trash');
    } catch (error) {
      toast.error('Failed to delete email');
    }
  };

  const handleStar = async () => {
    try {
      await emailAPI.markAsStarred(selectedEmail.id, !selectedEmail.is_starred);
      toast.success(selectedEmail.is_starred ? 'Unstarred' : 'Starred');
    } catch (error) {
      toast.error('Failed to update email');
    }
  };

  const sanitizedHTML = DOMPurify.sanitize(selectedEmail.body_html || selectedEmail.body);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with actions */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setSelectedEmail(null)}
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>

          <div className="flex items-center space-x-2">
            {/* Star */}
            <button
              onClick={handleStar}
              className="p-2 text-gray-600 hover:text-yellow-500 rounded hover:bg-gray-100"
              title={selectedEmail.is_starred ? 'Unstar' : 'Star'}
            >
              <svg
                className={`h-5 w-5 ${selectedEmail.is_starred ? 'text-yellow-500 fill-current' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </button>

            {/* Reply */}
            <button
              onClick={handleReply}
              className="p-2 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100"
              title="Reply"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
            </button>

            {/* Reply All */}
            <button
              onClick={handleReplyAll}
              className="p-2 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100"
              title="Reply All"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16l-4-4m0 0l4-4m-4 4h12m6 0l-4-4m0 0l4-4"
                />
              </svg>
            </button>

            {/* Forward */}
            <button
              onClick={handleForward}
              className="p-2 text-gray-600 hover:text-blue-600 rounded hover:bg-gray-100"
              title="Forward"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>

            {/* Delete */}
            <button
              onClick={handleDelete}
              className="p-2 text-gray-600 hover:text-red-600 rounded hover:bg-gray-100"
              title="Delete"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Subject */}
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">
          {selectedEmail.subject || '(no subject)'}
        </h1>

        {/* Priority badge */}
        {selectedEmail.priority === 'high' && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            High Priority
          </span>
        )}
      </div>

      {/* Email metadata */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                {(selectedEmail.from_name || selectedEmail.from).charAt(0).toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {selectedEmail.from_name || selectedEmail.from}
              </div>
              <div className="text-sm text-gray-500">{selectedEmail.from}</div>
              <div className="text-xs text-gray-500 mt-1">
                To: {selectedEmail.to.join(', ')}
              </div>
              {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                <div className="text-xs text-gray-500">Cc: {selectedEmail.cc.join(', ')}</div>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {format(new Date(selectedEmail.received_at), 'PPpp')}
          </div>
        </div>
      </div>

      {/* Email body */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {selectedEmail.body_html ? (
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
          />
        ) : (
          <div className="whitespace-pre-wrap text-gray-800">{selectedEmail.body}</div>
        )}
      </div>

      {/* Attachments */}
      {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            Attachments ({selectedEmail.attachments.length})
          </h3>
          <div className="space-y-2">
            {selectedEmail.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <svg
                    className="h-8 w-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {attachment.filename}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(attachment.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <button className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium">
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
