'use client';

import { useState, useRef, useEffect } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Send, Paperclip, Smile, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  onSend: (content: string, attachments?: File[]) => void;
  onTyping?: (isTyping: boolean) => void;
  placeholder?: string;
  replyTo?: { id: string; content: string; username: string } | null;
  onCancelReply?: () => void;
  editingMessage?: { id: string; content: string } | null;
  onCancelEdit?: () => void;
}

export function MessageComposer({
  onSend,
  onTyping,
  placeholder = 'Type a message...',
  replyTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (editingMessage) {
      setMessage(editingMessage.content);
      textareaRef.current?.focus();
    }
  }, [editingMessage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage && attachments.length === 0) {
      return;
    }

    onSend(trimmedMessage, attachments);
    setMessage('');
    setAttachments([]);
    textareaRef.current?.focus();

    if (onTyping) {
      onTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }

    if (e.key === 'Escape') {
      if (editingMessage && onCancelEdit) {
        onCancelEdit();
        setMessage('');
      } else if (replyTo && onCancelReply) {
        onCancelReply();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Typing indicator
    if (onTyping) {
      onTyping(true);

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Reply/Edit indicator */}
      {(replyTo || editingMessage) && (
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-900">
          <div className="flex-1 min-w-0">
            {replyTo && (
              <div>
                <p className="text-xs text-gray-500">
                  Replying to {replyTo.username}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {replyTo.content}
                </p>
              </div>
            )}
            {editingMessage && (
              <div>
                <p className="text-xs text-gray-500">Editing message</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {editingMessage.content}
                </p>
              </div>
            )}
          </div>
          <button
            onClick={editingMessage ? onCancelEdit : onCancelReply}
            className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded bg-gray-100 dark:bg-gray-700 px-3 py-2"
              >
                <span className="text-sm">{file.name}</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="rounded-full p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
          title="Attach file"
        >
          <Paperclip size={20} />
        </button>

        <div className="flex-1 relative">
          <TextareaAutosize
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            minRows={1}
            maxRows={10}
            className="w-full resize-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <button
          type="button"
          className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400"
          title="Add emoji"
        >
          <Smile size={20} />
        </button>

        <button
          type="submit"
          disabled={!message.trim() && attachments.length === 0}
          className={cn(
            'rounded-lg p-2 transition-colors',
            message.trim() || attachments.length > 0
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
          title="Send message"
        >
          <Send size={20} />
        </button>
      </form>

      {/* Keyboard shortcuts hint */}
      <div className="px-4 pb-2 text-xs text-gray-500">
        <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1">Enter</kbd> to
        send, <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1">Shift</kbd>{' '}
        + <kbd className="rounded bg-gray-100 dark:bg-gray-700 px-1">Enter</kbd> for
        new line
      </div>
    </div>
  );
}
