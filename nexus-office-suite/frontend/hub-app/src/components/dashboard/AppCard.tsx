'use client';

import React from 'react';
import { NexusApp } from '@/types/hub';
import * as Icons from 'lucide-react';
import { launchApp } from '@/lib/api/apps';

interface AppCardProps {
  app: NexusApp;
  showRecent?: boolean;
}

export default function AppCard({ app, showRecent = false }: AppCardProps) {
  const IconComponent = Icons[app.icon as keyof typeof Icons] as any;

  const handleLaunch = async () => {
    await launchApp(app.id);
    window.open(app.url, '_blank');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-200 dark:border-gray-700 overflow-hidden group">
      {/* App Header */}
      <div
        className="p-6 cursor-pointer"
        onClick={handleLaunch}
        style={{ borderTopColor: app.color, borderTopWidth: '3px' }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white transition-transform group-hover:scale-110"
              style={{ backgroundColor: app.color }}
            >
              {IconComponent && <IconComponent className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                {app.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {app.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                app.status === 'online'
                  ? 'bg-green-500'
                  : app.status === 'offline'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`}
              title={app.status}
            />
            <Icons.ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Features */}
        <div className="mt-4 flex flex-wrap gap-2">
          {app.features.slice(0, 3).map((feature, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
            >
              {feature}
            </span>
          ))}
          {app.features.length > 3 && (
            <span className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400">
              +{app.features.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Recent Items */}
      {showRecent && app.recentItems && app.recentItems.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-750">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">
            Recent Items
          </h4>
          <div className="space-y-2">
            {app.recentItems.slice(0, 3).map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 truncate"
              >
                <Icons.FileText className="w-3 h-3 inline mr-1" />
                {item.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
