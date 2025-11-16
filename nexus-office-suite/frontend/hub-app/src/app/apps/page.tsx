'use client';

import React, { useEffect, useState } from 'react';
import { useHubStore } from '@/store/hubStore';
import { useThemeStore } from '@/store/themeStore';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import AppCard from '@/components/dashboard/AppCard';
import { Grid3x3, List, Loader2 } from 'lucide-react';

export default function AppsPage() {
  const { apps, loadApps, isLoading } = useHubStore();
  const { loadTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  useEffect(() => {
    loadTheme();
    loadApps();
  }, [loadTheme, loadApps]);

  const categories = [
    { id: 'all', name: 'All Apps' },
    { id: 'productivity', name: 'Productivity' },
    { id: 'communication', name: 'Communication' },
    { id: 'collaboration', name: 'Collaboration' },
    { id: 'storage', name: 'Storage' },
  ];

  const filteredApps =
    filterCategory === 'all'
      ? apps
      : apps.filter((app) => app.category === filterCategory);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                All Applications
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Browse and launch all NEXUS applications
              </p>
            </div>

            {/* Filters and View Toggle */}
            <div className="flex items-center justify-between mb-6">
              {/* Category Filter */}
              <div className="flex items-center space-x-2 overflow-x-auto">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setFilterCategory(category.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      filterCategory === category.id
                        ? 'bg-primary-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${
                    viewMode === 'grid'
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="Grid view"
                >
                  <Grid3x3 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${
                    viewMode === 'list'
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  title="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Apps Grid/List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                    : 'space-y-4'
                }
              >
                {filteredApps.map((app) => (
                  <AppCard key={app.id} app={app} showRecent={true} />
                ))}
              </div>
            )}

            {filteredApps.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  No apps found in this category.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
