'use client';

import React from 'react';
import * as Icons from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Icons;
  color: string;
  action: () => void;
}

export default function QuickActions() {
  const quickActions: QuickAction[] = [
    {
      id: 'new-doc',
      title: 'New Document',
      description: 'Create a document',
      icon: 'FileText',
      color: '#3b82f6',
      action: () => window.open(`${process.env.NEXT_PUBLIC_WRITER_APP_URL}/editor/new`, '_blank'),
    },
    {
      id: 'new-sheet',
      title: 'New Spreadsheet',
      description: 'Create a spreadsheet',
      icon: 'Table',
      color: '#10b981',
      action: () => window.open(`${process.env.NEXT_PUBLIC_SHEETS_APP_URL}/editor/new`, '_blank'),
    },
    {
      id: 'new-slides',
      title: 'New Presentation',
      description: 'Create a presentation',
      icon: 'Presentation',
      color: '#f59e0b',
      action: () => window.open(`${process.env.NEXT_PUBLIC_SLIDES_APP_URL}/editor/new`, '_blank'),
    },
    {
      id: 'upload-file',
      title: 'Upload File',
      description: 'Upload to Drive',
      icon: 'Upload',
      color: '#6366f1',
      action: () => window.open(process.env.NEXT_PUBLIC_DRIVE_APP_URL || '', '_blank'),
    },
    {
      id: 'new-meeting',
      title: 'Start Meeting',
      description: 'Start instant meeting',
      icon: 'Video',
      color: '#8b5cf6',
      action: () => window.open(`${process.env.NEXT_PUBLIC_MEET_APP_URL}/room/new`, '_blank'),
    },
    {
      id: 'schedule-meeting',
      title: 'Schedule Meeting',
      description: 'Plan for later',
      icon: 'Calendar',
      color: '#ec4899',
      action: () => alert('Calendar coming soon!'),
    },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <Icons.Zap className="w-5 h-5 mr-2" />
        Quick Actions
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const IconComponent = Icons[action.icon] as any;

          return (
            <button
              key={action.id}
              onClick={action.action}
              className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors group"
              title={action.description}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: action.color }}
              >
                {IconComponent && <IconComponent className="w-6 h-6" />}
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                {action.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
