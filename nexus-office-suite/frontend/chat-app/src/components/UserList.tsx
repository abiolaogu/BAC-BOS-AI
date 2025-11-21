'use client';

import { User, UserStatus } from '@/types';
import { cn, getInitials, getAvatarColor } from '@/lib/utils';
import { X } from 'lucide-react';

interface UserListProps {
  users: User[];
  onClose?: () => void;
  onUserClick?: (user: User) => void;
}

export function UserList({ users, onClose, onUserClick }: UserListProps) {
  const onlineUsers = users.filter((u) => u.status === UserStatus.ONLINE);
  const awayUsers = users.filter((u) => u.status === UserStatus.AWAY);
  const busyUsers = users.filter((u) => u.status === UserStatus.BUSY);
  const offlineUsers = users.filter((u) => u.status === UserStatus.OFFLINE);

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          Members ({users.length})
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto">
        {onlineUsers.length > 0 && (
          <UserSection title="Online" count={onlineUsers.length}>
            {onlineUsers.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                onClick={() => onUserClick?.(user)}
              />
            ))}
          </UserSection>
        )}

        {awayUsers.length > 0 && (
          <UserSection title="Away" count={awayUsers.length}>
            {awayUsers.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                onClick={() => onUserClick?.(user)}
              />
            ))}
          </UserSection>
        )}

        {busyUsers.length > 0 && (
          <UserSection title="Busy" count={busyUsers.length}>
            {busyUsers.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                onClick={() => onUserClick?.(user)}
              />
            ))}
          </UserSection>
        )}

        {offlineUsers.length > 0 && (
          <UserSection title="Offline" count={offlineUsers.length}>
            {offlineUsers.map((user) => (
              <UserItem
                key={user.id}
                user={user}
                onClick={() => onUserClick?.(user)}
              />
            ))}
          </UserSection>
        )}
      </div>
    </div>
  );
}

interface UserSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

function UserSection({ title, count, children }: UserSectionProps) {
  return (
    <div className="mb-4">
      <div className="px-4 py-2 text-xs font-semibold uppercase text-gray-500">
        {title} — {count}
      </div>
      <div>{children}</div>
    </div>
  );
}

interface UserItemProps {
  user: User;
  onClick?: () => void;
}

function UserItem({ user, onClick }: UserItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      {/* Avatar */}
      <div className="relative">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
            user.avatar ? '' : getAvatarColor(user.id)
          )}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.displayName}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <span className="text-white">{getInitials(user.displayName)}</span>
          )}
        </div>

        {/* Status indicator */}
        <div
          className={cn(
            'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-gray-900',
            user.status === UserStatus.ONLINE && 'bg-green-500',
            user.status === UserStatus.AWAY && 'bg-yellow-500',
            user.status === UserStatus.BUSY && 'bg-red-500',
            user.status === UserStatus.OFFLINE && 'bg-gray-400'
          )}
        />
      </div>

      {/* User Info */}
      <div className="flex-1 text-left min-w-0">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {user.displayName}
        </p>
        <p className="truncate text-xs text-gray-500">@{user.username}</p>
      </div>
    </button>
  );
}
