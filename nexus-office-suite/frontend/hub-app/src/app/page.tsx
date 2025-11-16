'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useHubStore } from '@/store/hubStore';
import { useThemeStore } from '@/store/themeStore';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import AppCard from '@/components/dashboard/AppCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import QuickActions from '@/components/dashboard/QuickActions';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { apps, activities, recentItems, isLoading, loadAllData } = useHubStore();
  const { loadTheme } = useThemeStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load theme on mount
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  // Check authentication
  useEffect(() => {
    // For demo purposes, we'll skip authentication
    // In production, uncomment this:
    // if (!isAuthenticated) {
    //   router.push('/login');
    // }
  }, [isAuthenticated, router]);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  if (isLoading && apps.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading NEXUS Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to NEXUS Hub
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your unified workspace for productivity and collaboration
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <QuickActions />
            </div>

            {/* Apps Grid */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Your Apps
                </h2>
                <a
                  href="/apps"
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
                >
                  View All →
                </a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {apps.slice(0, 6).map((app) => (
                  <AppCard key={app.id} app={app} showRecent={false} />
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mb-8">
              <ActivityFeed activities={activities} limit={10} />
            </div>

            {/* Recent Items */}
            {recentItems.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Recent Items
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentItems.slice(0, 6).map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.appName}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
