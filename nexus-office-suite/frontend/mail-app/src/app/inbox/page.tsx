'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { folderAPI } from '@/lib/api/emails';
import { useEmailStore } from '@/store/emailStore';
import Sidebar from '@/components/email/Sidebar';
import SearchBar from '@/components/email/SearchBar';
import EmailList from '@/components/email/EmailList';
import EmailViewer from '@/components/email/EmailViewer';
import EmailComposer from '@/components/email/EmailComposer';

export default function InboxPage() {
  const { currentFolder, setCurrentFolder, viewMode } = useEmailStore();

  // Load inbox folder on mount
  const { data: folders } = useQuery({
    queryKey: ['folders'],
    queryFn: folderAPI.list,
  });

  useEffect(() => {
    if (folders && !currentFolder) {
      const inbox = folders.find((f) => f.type === 'inbox');
      if (inbox) {
        setCurrentFolder(inbox);
      }
    }
  }, [folders, currentFolder, setCurrentFolder]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">NEXUS Mail</h1>
            <span className="text-sm text-gray-500">
              Comprehensive Email Platform
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Settings */}
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-md">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            {/* User menu */}
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                U
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <SearchBar />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Email List */}
        <div className="flex-1 flex overflow-hidden">
          {viewMode === 'list' ? (
            <EmailList />
          ) : (
            <div className="flex flex-1 overflow-hidden">
              <div className="w-1/3 border-r border-gray-200">
                <EmailList />
              </div>
              <div className="flex-1">
                <EmailViewer />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Email Composer Modal */}
      <EmailComposer />
    </div>
  );
}
