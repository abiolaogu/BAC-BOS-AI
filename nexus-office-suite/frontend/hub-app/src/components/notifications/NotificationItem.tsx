'use client';

import React from 'react';
import { Notification } from '@/types/hub';
import * as Icons from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useHubStore } from '@/store/hubStore';

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

export default function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const { markNotificationRead } = useHubStore();

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'mention':
        return Icons.AtSign;
      case 'share':
        return Icons.Share2;
      case 'comment':
        return Icons.MessageSquare;
      case 'meeting':
        return Icons.Video;
      case 'upload':
        return Icons.Upload;
      case 'system':
        return Icons.Bell;
      default:
        return Icons.Bell;
    }
  };

  const handleClick = async () => {
    if (!notification.read) {
      await markNotificationRead(notification.id);
    }

    if (notification.itemUrl) {
      window.open(notification.itemUrl, '_blank');
    }

    onClose?.();
  };

  const IconComponent = getNotificationIcon(notification.type);

  return (
    <div
      onClick={handleClick}
      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer ${
        !notification.read ? 'bg-blue-50 dark:bg-blue-900/10' : ''
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* App/Type Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
          style={{ backgroundColor: notification.appColor }}
        >
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4
                className={`text-sm font-medium ${
                  !notification.read
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {notification.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {notification.message}
              </p>

              {/* From User */}
              {notification.from && (
                <div className="flex items-center space-x-2 mt-2">
                  {notification.from.avatar ? (
                    <img
                      src={notification.from.avatar}
                      alt={notification.from.name}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-xs text-white">
                        {notification.from.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {notification.from.name}
                  </span>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{notification.appName}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(notification.timestamp))} ago</span>
                {notification.priority === 'high' && (
                  <>
                    <span>•</span>
                    <span className="text-orange-500 font-medium">High Priority</span>
                  </>
                )}
                {notification.priority === 'urgent' && (
                  <>
                    <span>•</span>
                    <span className="text-red-500 font-medium">Urgent</span>
                  </>
                )}
              </div>
            </div>

            {/* Unread Indicator */}
            {!notification.read && (
              <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0" />
            )}
          </div>

          {/* Action Button */}
          {notification.actionUrl && notification.actionLabel && (
            <a
              href={notification.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              {notification.actionLabel} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
