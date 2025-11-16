'use client';

import React from 'react';
import { SearchResult } from '@/types/hub';
import * as Icons from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SearchResultsProps {
  results: SearchResult[];
  onSelect?: () => void;
}

export default function SearchResults({ results, onSelect }: SearchResultsProps) {
  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    const type = result.type;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'document':
        return Icons.FileText;
      case 'spreadsheet':
        return Icons.Table;
      case 'presentation':
        return Icons.Presentation;
      case 'file':
        return Icons.File;
      case 'folder':
        return Icons.Folder;
      case 'meeting':
        return Icons.Video;
      case 'user':
        return Icons.User;
      default:
        return Icons.File;
    }
  };

  const getTypeLabel = (type: SearchResult['type']) => {
    const labels: Record<SearchResult['type'], string> = {
      document: 'Documents',
      spreadsheet: 'Spreadsheets',
      presentation: 'Presentations',
      file: 'Files',
      folder: 'Folders',
      meeting: 'Meetings',
      user: 'Users',
    };
    return labels[type] || type;
  };

  return (
    <div className="py-2">
      {Object.entries(groupedResults).map(([type, items]) => {
        const TypeIcon = getTypeIcon(type as SearchResult['type']);

        return (
          <div key={type} className="mb-2 last:mb-0">
            {/* Type Header */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase flex items-center">
              <TypeIcon className="w-3 h-3 mr-2" />
              {getTypeLabel(type as SearchResult['type'])} ({items.length})
            </div>

            {/* Results */}
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {items.map((result) => {
                const ItemIcon = getTypeIcon(result.type);

                return (
                  <a
                    key={result.id}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onSelect}
                    className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      {/* App Badge */}
                      <div
                        className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 text-white"
                        style={{ backgroundColor: result.appColor }}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>

                      {/* Result Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {result.title}
                            </h4>
                            {result.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                            {result.snippet && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-1">
                                ...{result.snippet}...
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <span>{result.appName}</span>
                              {result.owner && (
                                <>
                                  <span>•</span>
                                  <span>{result.owner.name}</span>
                                </>
                              )}
                              {result.lastModified && (
                                <>
                                  <span>•</span>
                                  <span>
                                    {formatDistanceToNow(new Date(result.lastModified))} ago
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Thumbnail */}
                          {result.thumbnail && (
                            <img
                              src={result.thumbnail}
                              alt={result.title}
                              className="w-12 h-12 object-cover rounded ml-3"
                            />
                          )}
                        </div>
                      </div>

                      {/* External Link Icon */}
                      <Icons.ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
