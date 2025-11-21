'use client';

import { useEffect, useRef } from 'react';
import { Message as MessageType } from '@/types';
import { cn, formatMessageTime, getInitials, getAvatarColor } from '@/lib/utils';
import { MoreVertical, Reply, Smile, Edit2, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface MessageListProps {
  messages: MessageType[];
  currentUserId: string;
  onReply?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MessageList({
  messages,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  onLoadMore,
  hasMore,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  const handleScroll = () => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    setAutoScroll(isNearBottom);

    // Load more when scrolled to top
    if (scrollTop < 100 && hasMore && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {hasMore && (
        <div className="text-center">
          <button
            onClick={onLoadMore}
            className="text-sm text-primary-500 hover:text-primary-600"
          >
            Load more messages
          </button>
        </div>
      )}

      {messages.map((message, index) => {
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showAvatar =
          !prevMessage ||
          prevMessage.userId !== message.userId ||
          new Date(message.createdAt).getTime() -
            new Date(prevMessage.createdAt).getTime() >
            300000; // 5 minutes

        return (
          <MessageItem
            key={message.id}
            message={message}
            showAvatar={showAvatar}
            isOwnMessage={message.userId === currentUserId}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            onReaction={onReaction}
          />
        );
      })}
    </div>
  );
}

interface MessageItemProps {
  message: MessageType;
  showAvatar: boolean;
  isOwnMessage: boolean;
  onReply?: (message: MessageType) => void;
  onEdit?: (message: MessageType) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
}

function MessageItem({
  message,
  showAvatar,
  isOwnMessage,
  onReply,
  onEdit,
  onDelete,
  onReaction,
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉'];

  return (
    <div
      className={cn(
        'group relative',
        showAvatar ? 'mt-4' : 'mt-1',
        isOwnMessage && 'flex justify-end'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactionPicker(false);
      }}
    >
      <div className={cn('flex gap-3 max-w-3xl', !showAvatar && 'ml-11')}>
        {/* Avatar */}
        {showAvatar && !isOwnMessage && (
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0',
              message.user?.avatar ? '' : getAvatarColor(message.userId)
            )}
          >
            {message.user?.avatar ? (
              <img
                src={message.user.avatar}
                alt={message.user.displayName}
                className="h-8 w-8 rounded-full"
              />
            ) : (
              <span className="text-white">
                {getInitials(message.user?.displayName || 'Unknown')}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Message Header */}
          {showAvatar && (
            <div className="mb-1 flex items-baseline gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {message.user?.displayName || 'Unknown User'}
              </span>
              <span className="text-xs text-gray-500">
                {formatMessageTime(message.createdAt)}
              </span>
            </div>
          )}

          {/* Message Content */}
          <div
            className={cn(
              'relative rounded-lg px-3 py-2',
              isOwnMessage
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
              message.isDeleted && 'opacity-50 italic'
            )}
          >
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.content}
            </p>

            {message.isEdited && !message.isDeleted && (
              <span className="ml-1 text-xs opacity-60">(edited)</span>
            )}

            {/* Attachments */}
            {message.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {message.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-2 rounded bg-black/10 p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {attachment.name}
                      </p>
                      <p className="text-xs opacity-70">{attachment.size} bytes</p>
                    </div>
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* Reactions */}
            {message.reactions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.reactions.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    onClick={() => onReaction?.(message.id, reaction.emoji)}
                    className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-sm hover:bg-black/20"
                  >
                    <span>{reaction.emoji}</span>
                    <span className="text-xs">{reaction.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Thread indicator */}
          {message.replyCount > 0 && (
            <button
              onClick={() => onReply?.(message)}
              className="mt-1 text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {message.replyCount} {message.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      </div>

      {/* Message Actions */}
      {showActions && !message.isDeleted && (
        <div className="absolute -top-3 right-0 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Add reaction"
          >
            <Smile size={16} />
          </button>

          {onReply && (
            <button
              onClick={() => onReply(message)}
              className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Reply"
            >
              <Reply size={16} />
            </button>
          )}

          {isOwnMessage && onEdit && (
            <button
              onClick={() => onEdit(message)}
              className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit"
            >
              <Edit2 size={16} />
            </button>
          )}

          {isOwnMessage && onDelete && (
            <button
              onClick={() => onDelete(message.id)}
              className="rounded p-1 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )}

      {/* Quick Reaction Picker */}
      {showReactionPicker && (
        <div className="absolute -top-12 right-0 flex gap-1 rounded-lg border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReaction?.(message.id, emoji);
                setShowReactionPicker(false);
              }}
              className="rounded p-1 text-xl hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
