import React from 'react';
import { formatFileSize, getFileIcon, getFileTypeColor } from '@/types/drive';
import type { File, Folder } from '@/types/drive';
import { formatDistanceToNow } from 'date-fns';
import { Star, MoreVertical, Folder as FolderIcon } from 'lucide-react';
import clsx from 'clsx';

interface FileItemProps {
  item: File | Folder;
  type: 'file' | 'folder';
  viewMode: 'grid' | 'list';
  isSelected: boolean;
  onSelect: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const FileItem: React.FC<FileItemProps> = ({
  item,
  type,
  viewMode,
  isSelected,
  onSelect,
  onDoubleClick,
  onContextMenu,
}) => {
  if (viewMode === 'grid') {
    return (
      <div
        className={clsx(
          'relative flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all',
          isSelected
            ? 'border-primary-500 bg-primary-50'
            : 'border-transparent hover:border-gray-300 hover:bg-gray-50'
        )}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        {/* Icon */}
        <div className="text-5xl mb-2">
          {type === 'folder' ? (
            <FolderIcon className="w-12 h-12 text-yellow-500" />
          ) : (
            <span className={getFileTypeColor((item as File).file_type)}>
              {getFileIcon((item as File).file_type)}
            </span>
          )}
        </div>

        {/* Name */}
        <div className="text-sm font-medium text-center truncate w-full">{item.name}</div>

        {/* File size for files */}
        {type === 'file' && (
          <div className="text-xs text-gray-500 mt-1">
            {formatFileSize((item as File).size)}
          </div>
        )}

        {/* Starred icon */}
        {item.is_starred && (
          <Star className="absolute top-2 right-2 w-4 h-4 fill-yellow-400 text-yellow-400" />
        )}

        {/* More actions */}
        <button
          className="absolute top-2 left-2 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e);
          }}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // List view
  return (
    <div
      className={clsx(
        'flex items-center px-4 py-2 rounded-md cursor-pointer transition-colors',
        isSelected ? 'bg-primary-50 border-l-2 border-primary-500' : 'hover:bg-gray-50'
      )}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-8 mr-3">
        {type === 'folder' ? (
          <FolderIcon className="w-6 h-6 text-yellow-500" />
        ) : (
          <span className={clsx('text-2xl', getFileTypeColor((item as File).file_type))}>
            {getFileIcon((item as File).file_type)}
          </span>
        )}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center">
          <span className="text-sm font-medium truncate">{item.name}</span>
          {item.is_starred && (
            <Star className="ml-2 w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Modified */}
      <div className="flex-shrink-0 w-32 text-sm text-gray-500 mx-4">
        {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
      </div>

      {/* Size (for files only) */}
      <div className="flex-shrink-0 w-24 text-sm text-gray-500 text-right">
        {type === 'file' ? formatFileSize((item as File).size) : '—'}
      </div>

      {/* Actions */}
      <button
        className="flex-shrink-0 ml-2 p-1 rounded hover:bg-gray-200"
        onClick={(e) => {
          e.stopPropagation();
          onContextMenu(e);
        }}
      >
        <MoreVertical className="w-4 h-4" />
      </button>
    </div>
  );
};

export default FileItem;
