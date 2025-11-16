'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: Icons.LayoutDashboard,
    },
    {
      name: 'All Apps',
      href: '/apps',
      icon: Icons.Grid3x3,
    },
    {
      name: 'Search',
      href: '/search',
      icon: Icons.Search,
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: Icons.Settings,
    },
  ];

  const apps = [
    {
      name: 'Writer',
      href: process.env.NEXT_PUBLIC_WRITER_APP_URL || '',
      icon: Icons.FileText,
      color: '#3b82f6',
    },
    {
      name: 'Sheets',
      href: process.env.NEXT_PUBLIC_SHEETS_APP_URL || '',
      icon: Icons.Table,
      color: '#10b981',
    },
    {
      name: 'Slides',
      href: process.env.NEXT_PUBLIC_SLIDES_APP_URL || '',
      icon: Icons.Presentation,
      color: '#f59e0b',
    },
    {
      name: 'Drive',
      href: process.env.NEXT_PUBLIC_DRIVE_APP_URL || '',
      icon: Icons.HardDrive,
      color: '#6366f1',
    },
    {
      name: 'Meet',
      href: process.env.NEXT_PUBLIC_MEET_APP_URL || '',
      icon: Icons.Video,
      color: '#8b5cf6',
    },
  ];

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo (Mobile) */}
          <div className="lg:hidden p-4 border-b border-gray-200 dark:border-gray-700">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">N</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                NEXUS Hub
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            {/* Main Navigation */}
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Quick Access Apps */}
            <div className="mt-8">
              <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Quick Access
              </h3>
              <div className="space-y-1">
                {apps.map((app) => {
                  const Icon = app.icon;

                  return (
                    <a
                      key={app.name}
                      href={app.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
                    >
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-white mr-3 group-hover:scale-110 transition-transform"
                        style={{ backgroundColor: app.color }}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                      {app.name}
                      <Icons.ExternalLink className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p className="font-medium">NEXUS Hub v1.0.0</p>
              <p className="mt-1">Your unified workspace</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
