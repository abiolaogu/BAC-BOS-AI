'use client';

import { useState } from 'react';
import { useEmailStore } from '@/store/emailStore';
import { emailAPI } from '@/lib/api/emails';
import toast from 'react-hot-toast';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useEmailStore();
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    try {
      const results = await emailAPI.search({
        query: searchQuery,
        page: 1,
        page_size: 50,
      });

      // TODO: Display search results
      toast.success(`Found ${results.total} emails`);
    } catch (error) {
      toast.error('Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-4 py-3">
        <form onSubmit={handleSearch} className="flex items-center space-x-2">
          {/* Search input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search emails..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <svg
                  className="h-5 w-5 text-gray-400 hover:text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Search button */}
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
            title="Advanced filters"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </button>
        </form>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Has Attachment
                </label>
                <select className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="">Any</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Read Status
                </label>
                <select className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="">Any</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option value="">Any time</option>
                  <option value="today">Today</option>
                  <option value="week">Past week</option>
                  <option value="month">Past month</option>
                  <option value="year">Past year</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search suggestions */}
      {searchQuery && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500">Suggestions:</span>
            <button className="text-xs text-blue-600 hover:text-blue-800">
              from:{searchQuery}
            </button>
            <button className="text-xs text-blue-600 hover:text-blue-800">
              subject:{searchQuery}
            </button>
            <button className="text-xs text-blue-600 hover:text-blue-800">
              has:attachment {searchQuery}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
