'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { emailAPI } from '@/lib/api/emails';
import { useEmailStore } from '@/store/emailStore';
import type { Email } from '@/types/email';

export default function EmailList() {
  const { currentFolder, selectedEmail, setSelectedEmail, selectedEmails, toggleEmailSelection } =
    useEmailStore();
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, error } = useQuery({
    queryKey: ['emails', currentFolder?.id, page],
    queryFn: () =>
      emailAPI.list({
        folder_id: currentFolder?.id,
        page,
        page_size: pageSize,
      }),
    enabled: !!currentFolder,
  });

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    if (!email.is_read) {
      emailAPI.markAsRead(email.id, true);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, emailId: string) => {
    e.stopPropagation();
    toggleEmailSelection(emailId);
  };

  if (!currentFolder) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Select a folder to view emails
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-500">
        Error loading emails
      </div>
    );
  }

  if (!data || data.emails.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        No emails in this folder
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Email list header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">{currentFolder.name}</h2>
        <p className="text-sm text-gray-500">
          {data.total} emails • {currentFolder.unread_count} unread
        </p>
      </div>

      {/* Email list */}
      <div className="flex-1 overflow-y-auto">
        {data.emails.map((email) => (
          <div
            key={email.id}
            onClick={() => handleEmailClick(email)}
            className={`
              border-b border-gray-200 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors
              ${selectedEmail?.id === email.id ? 'bg-blue-50' : ''}
              ${!email.is_read ? 'bg-blue-50/30' : ''}
            `}
          >
            <div className="flex items-start space-x-3">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedEmails.includes(email.id)}
                onChange={(e) => handleCheckboxClick(e as any, email.id)}
                className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />

              {/* Star button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  emailAPI.markAsStarred(email.id, !email.is_starred);
                }}
                className="mt-1 text-gray-400 hover:text-yellow-500"
              >
                <svg
                  className={`h-5 w-5 ${email.is_starred ? 'text-yellow-500 fill-current' : ''}`}
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

              {/* Email content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-sm ${
                        !email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'
                      }`}
                    >
                      {email.from_name || email.from}
                    </span>
                    {!email.is_read && (
                      <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(email.received_at), { addSuffix: true })}
                  </span>
                </div>

                <div
                  className={`text-sm mb-1 ${
                    !email.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'
                  }`}
                >
                  {email.subject || '(no subject)'}
                </div>

                <div className="text-sm text-gray-600 truncate">
                  {email.body.substring(0, 100)}...
                </div>

                {/* Badges */}
                <div className="flex items-center space-x-2 mt-2">
                  {email.has_attachments && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      <svg
                        className="h-3 w-3 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      {email.attachments?.length || 0}
                    </span>
                  )}
                  {email.priority === 'high' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      High Priority
                    </span>
                  )}
                  {email.labels?.map((label) => (
                    <span
                      key={label.id}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: label.color + '20', color: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {data.has_more && (
        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={!data.has_more}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
