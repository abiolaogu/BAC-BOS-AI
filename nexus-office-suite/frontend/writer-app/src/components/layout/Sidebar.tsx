'use client';

import { useUIStore } from '@/store';
import { cn } from '@/lib/utils';
import {
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import DocumentList from '@/components/documents/DocumentList';
import CommentsList from '@/components/comments/CommentsList';
import ActivityList from '@/components/activity/ActivityList';

export default function Sidebar() {
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const sidebarTab = useUIStore((state) => state.sidebarTab);
  const setSidebarTab = useUIStore((state) => state.setSidebarTab);

  const tabs = [
    { id: 'documents' as const, label: 'Documents', icon: DocumentTextIcon },
    { id: 'comments' as const, label: 'Comments', icon: ChatBubbleLeftRightIcon },
    { id: 'activity' as const, label: 'Activity', icon: ClockIcon },
  ];

  return (
    <aside
      className={cn(
        'h-full bg-white border-r border-gray-200 transition-all duration-300',
        sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'
      )}
    >
      <div className="h-full flex flex-col">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSidebarTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                sidebarTab === tab.id
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              <tab.icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {sidebarTab === 'documents' && <DocumentList />}
          {sidebarTab === 'comments' && <CommentsList />}
          {sidebarTab === 'activity' && <ActivityList />}
        </div>
      </div>
    </aside>
  );
}
