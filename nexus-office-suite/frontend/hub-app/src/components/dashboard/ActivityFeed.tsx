'use client';

import React from 'react';
import { Activity } from '@/types/hub';
import * as Icons from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityFeedProps {
  activities: Activity[];
  limit?: number;
}

export default function ActivityFeed({ activities, limit = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, limit);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'created':
        return Icons.FilePlus;
      case 'edited':
        return Icons.Edit;
      case 'shared':
        return Icons.Share2;
      case 'deleted':
        return Icons.Trash2;
      case 'commented':
        return Icons.MessageSquare;
      case 'mentioned':
        return Icons.AtSign;
      case 'joined':
        return Icons.UserPlus;
      case 'uploaded':
        return Icons.Upload;
      default:
        return Icons.Activity;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center">
          <Icons.Activity className="w-5 h-5 mr-2" />
          Recent Activity
        </h2>
      </div>

      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {displayActivities.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Icons.Inbox className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          displayActivities.map((activity) => {
            const IconComponent = getActivityIcon(activity.type);

            return (
              <div
                key={activity.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  {/* App Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                    style={{ backgroundColor: activity.appColor }}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>

                  {/* Activity Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {activity.description}
                        </p>
                        <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>{activity.user.name}</span>
                          <span>•</span>
                          <span>{activity.appName}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(activity.timestamp))} ago</span>
                        </div>
                      </div>

                      {/* Action Link */}
                      {activity.itemUrl && (
                        <a
                          href={activity.itemUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 ml-4"
                        >
                          <Icons.ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {activities.length > limit && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button className="w-full text-center text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
}
