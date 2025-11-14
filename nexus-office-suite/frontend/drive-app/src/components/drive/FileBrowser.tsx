import React from 'react';
import FileItem from './FileItem';
import { useDriveStore } from '@/store/driveStore';
import type { File, Folder } from '@/types/drive';

interface FileBrowserProps {
  onFileOpen: (file: File) => void;
  onFolderOpen: (folder: Folder) => void;
  onContextMenu: (e: React.MouseEvent, item: File | Folder, type: 'file' | 'folder') => void;
}

const FileBrowser: React.FC<FileBrowserProps> = ({ onFileOpen, onFolderOpen, onContextMenu }) => {
  const { files, folders, viewMode, selectedItems, toggleSelectItem } = useDriveStore();

  const sortedFolders = [...folders].sort((a, b) => a.name.localeCompare(b.name));
  const sortedFiles = [...files].sort((a, b) => a.name.localeCompare(b.name));

  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-400">
        <svg className="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <p className="text-lg font-medium">This folder is empty</p>
        <p className="text-sm mt-1">Upload files or create a new folder to get started</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {sortedFolders.map((folder) => (
          <FileItem
            key={folder.id}
            item={folder}
            type="folder"
            viewMode="grid"
            isSelected={selectedItems.has(folder.id)}
            onSelect={() => toggleSelectItem(folder.id)}
            onDoubleClick={() => onFolderOpen(folder)}
            onContextMenu={(e) => onContextMenu(e, folder, 'folder')}
          />
        ))}
        {sortedFiles.map((file) => (
          <FileItem
            key={file.id}
            item={file}
            type="file"
            viewMode="grid"
            isSelected={selectedItems.has(file.id)}
            onSelect={() => toggleSelectItem(file.id)}
            onDoubleClick={() => onFileOpen(file)}
            onContextMenu={(e) => onContextMenu(e, file, 'file')}
          />
        ))}
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-1">
      {/* List header */}
      <div className="flex items-center px-4 py-2 text-xs font-medium text-gray-500 border-b">
        <div className="flex-shrink-0 w-8 mr-3"></div>
        <div className="flex-1">Name</div>
        <div className="flex-shrink-0 w-32 mx-4">Modified</div>
        <div className="flex-shrink-0 w-24 text-right">Size</div>
        <div className="flex-shrink-0 w-8 ml-2"></div>
      </div>

      {/* Items */}
      {sortedFolders.map((folder) => (
        <FileItem
          key={folder.id}
          item={folder}
          type="folder"
          viewMode="list"
          isSelected={selectedItems.has(folder.id)}
          onSelect={() => toggleSelectItem(folder.id)}
          onDoubleClick={() => onFolderOpen(folder)}
          onContextMenu={(e) => onContextMenu(e, folder, 'folder')}
        />
      ))}
      {sortedFiles.map((file) => (
        <FileItem
          key={file.id}
          item={file}
          type="file"
          viewMode="list"
          isSelected={selectedItems.has(file.id)}
          onSelect={() => toggleSelectItem(file.id)}
          onDoubleClick={() => onFileOpen(file)}
          onContextMenu={(e) => onContextMenu(e, file, 'file')}
        />
      ))}
    </div>
  );
};

export default FileBrowser;
