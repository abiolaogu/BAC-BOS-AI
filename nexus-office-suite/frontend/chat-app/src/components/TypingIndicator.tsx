'use client';

import { TypingIndicator as TypingIndicatorType } from '@/types';

interface TypingIndicatorProps {
  typingUsers: TypingIndicatorType[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const displayText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].username} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].username} and ${typingUsers[1].username} are typing...`;
    } else {
      return `${typingUsers[0].username} and ${typingUsers.length - 1} others are typing...`;
    }
  };

  return (
    <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '0ms' }} />
          <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '200ms' }} />
          <div className="h-2 w-2 rounded-full bg-gray-400 animate-pulse-dot" style={{ animationDelay: '400ms' }} />
        </div>
        <span>{displayText()}</span>
      </div>
    </div>
  );
}
