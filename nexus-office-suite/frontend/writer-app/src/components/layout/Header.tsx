'use client';

import { useAuthStore, useUIStore, useDocumentStore } from '@/store';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';
import {
  Bars3Icon,
  ShareIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EllipsisVerticalIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { formatRelativeTime } from '@/lib/utils';

export default function Header() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const openShareModal = useUIStore((state) => state.openShareModal);
  const openExportModal = useUIStore((state) => state.openExportModal);
  const openImportModal = useUIStore((state) => state.openImportModal);
  const currentDocument = useDocumentStore((state) => state.currentDocument);
  const isSaving = useDocumentStore((state) => state.isSaving);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-gray-100 rounded-md"
          title="Toggle sidebar"
        >
          <Bars3Icon className="w-6 h-6 text-gray-600" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {currentDocument?.title || 'Untitled Document'}
          </h1>
          {currentDocument && (
            <p className="text-xs text-gray-500">
              {isSaving ? (
                'Saving...'
              ) : (
                <>Last edited {formatRelativeTime(currentDocument.updatedAt)}</>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {currentDocument && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={openShareModal}
            >
              <ShareIcon className="w-4 h-4 mr-2" />
              Share
            </Button>

            <Dropdown
              trigger={
                <button className="p-2 hover:bg-gray-100 rounded-md">
                  <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
                </button>
              }
              items={[
                {
                  label: 'Export',
                  icon: <ArrowDownTrayIcon className="w-4 h-4" />,
                  onClick: openExportModal,
                },
                {
                  label: 'Import',
                  icon: <ArrowUpTrayIcon className="w-4 h-4" />,
                  onClick: openImportModal,
                },
                {
                  label: 'Duplicate',
                  icon: <DocumentDuplicateIcon className="w-4 h-4" />,
                  onClick: () => {
                    // Handle duplicate
                  },
                },
                {
                  label: 'Delete',
                  icon: <TrashIcon className="w-4 h-4" />,
                  onClick: () => {
                    // Handle delete
                  },
                  danger: true,
                },
              ]}
            />
          </>
        )}

        {user && (
          <Dropdown
            trigger={
              <button className="ml-2">
                <Avatar name={user.name} avatar={user.avatar} />
              </button>
            }
            items={[
              {
                label: user.name,
                onClick: () => {},
                disabled: true,
              },
              {
                label: 'Logout',
                onClick: logout,
              },
            ]}
          />
        )}
      </div>
    </header>
  );
}
