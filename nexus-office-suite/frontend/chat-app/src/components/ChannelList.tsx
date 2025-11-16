'use client';

import { useState } from 'react';
import { Channel, ChannelType } from '@/types';
import { useChatStore } from '@/store/chatStore';
import { cn, formatRelativeTime, getInitials, getAvatarColor } from '@/lib/utils';
import { Hash, Lock, Users, MessageSquare, Plus, Search } from 'lucide-react';

interface ChannelListProps {
  channels: Channel[];
  onChannelSelect: (channelId: string) => void;
  onCreateChannel?: () => void;
}

export function ChannelList({
  channels,
  onChannelSelect,
  onCreateChannel,
}: ChannelListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const activeChannelId = useChatStore((state) => state.activeChannelId);

  const filteredChannels = channels.filter((channel) =>
    channel.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const directChannels = filteredChannels.filter(
    (ch) => ch.type === ChannelType.DIRECT
  );
  const groupChannels = filteredChannels.filter(
    (ch) => ch.type === ChannelType.GROUP || ch.type === ChannelType.PUBLIC
  );
  const privateChannels = filteredChannels.filter(
    (ch) => ch.type === ChannelType.PRIVATE
  );

  return (
    <div className="flex h-full flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-lg font-semibold text-white">NEXUS Chat</h2>
        {onCreateChannel && (
          <button
            onClick={onCreateChannel}
            className="rounded p-1 hover:bg-gray-800 text-gray-400 hover:text-white"
            title="Create channel"
          >
            <Plus size={20} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded bg-gray-800 py-1.5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Channel Lists */}
      <div className="flex-1 overflow-y-auto">
        {/* Direct Messages */}
        {directChannels.length > 0 && (
          <ChannelSection title="Direct Messages" icon={MessageSquare}>
            {directChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                onClick={() => onChannelSelect(channel.id)}
              />
            ))}
          </ChannelSection>
        )}

        {/* Channels */}
        {groupChannels.length > 0 && (
          <ChannelSection title="Channels" icon={Hash}>
            {groupChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                onClick={() => onChannelSelect(channel.id)}
              />
            ))}
          </ChannelSection>
        )}

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <ChannelSection title="Private" icon={Lock}>
            {privateChannels.map((channel) => (
              <ChannelItem
                key={channel.id}
                channel={channel}
                isActive={channel.id === activeChannelId}
                onClick={() => onChannelSelect(channel.id)}
              />
            ))}
          </ChannelSection>
        )}
      </div>
    </div>
  );
}

interface ChannelSectionProps {
  title: string;
  icon: any;
  children: React.ReactNode;
}

function ChannelSection({ title, icon: Icon, children }: ChannelSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-300"
      >
        <Icon size={14} className="mr-1.5" />
        <span className="flex-1 text-left uppercase">{title}</span>
        <svg
          className={cn(
            'h-3 w-3 transition-transform',
            isExpanded ? 'rotate-0' : '-rotate-90'
          )}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isExpanded && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

interface ChannelItemProps {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}

function ChannelItem({ channel, isActive, onClick }: ChannelItemProps) {
  const isDirect = channel.type === ChannelType.DIRECT;
  const hasUnread = (channel.unreadCount || 0) > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-2 px-3 py-2 text-left transition-colors',
        isActive
          ? 'bg-primary-600 text-white'
          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
      )}
    >
      {/* Avatar/Icon */}
      {isDirect ? (
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
            channel.avatar ? '' : getAvatarColor(channel.id)
          )}
        >
          {channel.avatar ? (
            <img
              src={channel.avatar}
              alt={channel.name}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <span>{getInitials(channel.name)}</span>
          )}
        </div>
      ) : (
        <div className="flex h-8 w-8 items-center justify-center">
          {channel.isPrivate ? (
            <Lock size={16} />
          ) : channel.type === ChannelType.GROUP ? (
            <Users size={16} />
          ) : (
            <Hash size={16} />
          )}
        </div>
      )}

      {/* Channel Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'truncate text-sm',
              hasUnread && !isActive && 'font-semibold text-white'
            )}
          >
            {channel.name}
          </span>
          {channel.lastMessageAt && (
            <span className="ml-2 text-xs opacity-60">
              {formatRelativeTime(channel.lastMessageAt)}
            </span>
          )}
        </div>
        {hasUnread && (
          <div className="mt-0.5 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-primary-500" />
            <span className="text-xs font-medium">
              {channel.unreadCount} new
            </span>
          </div>
        )}
      </div>

      {/* Pinned indicator */}
      {channel.isPinned && (
        <div className="text-gray-500">
          <svg
            className="h-4 w-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L11 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c-.25.78-.03 1.631.58 2.112.609.48 1.44.629 2.166.37.727-.26 1.293-.87 1.513-1.645l.818-2.552c.25-.78.03-1.631-.58-2.112-.609-.48-1.44-.629-2.166-.37-.727.26-1.293.87-1.513 1.645z" />
          </svg>
        </div>
      )}
    </button>
  );
}
