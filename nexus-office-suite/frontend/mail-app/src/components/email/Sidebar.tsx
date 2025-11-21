'use client';

import { useQuery } from '@tanstack/react-query';
import { folderAPI, labelAPI } from '@/lib/api/emails';
import { useEmailStore, useComposerStore } from '@/store/emailStore';
import type { Folder } from '@/types/email';

const folderIcons: Record<string, string> = {
  inbox: '📥',
  sent: '📤',
  drafts: '📝',
  trash: '🗑️',
  spam: '🚫',
  starred: '⭐',
};

export default function Sidebar() {
  const { currentFolder, setCurrentFolder, folders, setFolders, labels, setLabels } =
    useEmailStore();
  const { openComposer } = useComposerStore();

  // Fetch folders
  const { data: foldersData } = useQuery({
    queryKey: ['folders'],
    queryFn: folderAPI.list,
    onSuccess: (data) => setFolders(data),
  });

  // Fetch labels
  const { data: labelsData } = useQuery({
    queryKey: ['labels'],
    queryFn: labelAPI.list,
    onSuccess: (data) => setLabels(data),
  });

  const handleFolderClick = (folder: Folder) => {
    setCurrentFolder(folder);
  };

  const systemFolders = foldersData?.filter((f) => f.type !== 'custom') || [];
  const customFolders = foldersData?.filter((f) => f.type === 'custom') || [];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* Compose button */}
      <div className="p-4">
        <button
          onClick={openComposer}
          className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Compose
        </button>
      </div>

      {/* Folders */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="mb-6">
          <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Folders
          </h3>
          <nav className="space-y-1">
            {systemFolders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => handleFolderClick(folder)}
                className={`
                  w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${
                    currentFolder?.id === folder.id
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <div className="flex items-center">
                  <span className="mr-3 text-lg">
                    {folderIcons[folder.type] || '📁'}
                  </span>
                  <span>{folder.name}</span>
                </div>
                {folder.unread_count > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                    {folder.unread_count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Custom folders */}
        {customFolders.length > 0 && (
          <div className="mb-6">
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Custom Folders
            </h3>
            <nav className="space-y-1">
              {customFolders.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder)}
                  className={`
                    w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${
                      currentFolder?.id === folder.id
                        ? 'bg-blue-100 text-blue-900'
                        : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-lg">📁</span>
                    <span>{folder.name}</span>
                  </div>
                  {folder.unread_count > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                      {folder.unread_count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Labels */}
        {labelsData && labelsData.length > 0 && (
          <div className="mb-6">
            <h3 className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Labels
            </h3>
            <nav className="space-y-1">
              {labelsData.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center px-3 py-2 text-sm text-gray-700"
                >
                  <span
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: label.color }}
                  ></span>
                  <span>{label.name}</span>
                </div>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* Storage info */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-2">Storage</div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '45%' }}></div>
        </div>
        <div className="text-xs text-gray-500">2.3 GB of 5 GB used</div>
      </div>
    </div>
  );
}
