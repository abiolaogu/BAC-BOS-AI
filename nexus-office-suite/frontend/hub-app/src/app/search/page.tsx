'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import SearchResults from '@/components/search/SearchResults';
import { universalSearch } from '@/lib/api/search';
import { SearchResult } from '@/types/hub';
import { Search, Loader2 } from 'lucide-react';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') || '';

  const { loadTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  useEffect(() => {
    if (queryParam) {
      setQuery(queryParam);
      performSearch(queryParam);
    }
  }, [queryParam]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await universalSearch(searchQuery);
      setResults(searchResults);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Search Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Search
              </h1>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search across all NEXUS apps..."
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white text-lg"
                  autoFocus
                />
              </form>
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mr-3" />
                <span className="text-gray-600 dark:text-gray-400">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Found {results.length} result{results.length !== 1 ? 's' : ''} for &quot;
                  {query}&quot;
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                  <SearchResults results={results} />
                </div>
              </div>
            ) : query ? (
              <div className="text-center py-12">
                <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No results found for &quot;{query}&quot;
                </p>
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Enter a search term to get started
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
