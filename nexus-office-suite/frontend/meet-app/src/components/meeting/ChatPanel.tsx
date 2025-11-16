'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { useChatStore } from '@/store/chatStore';
import { useMeetingStore } from '@/store/meetingStore';
import type { ChatMessage } from '@/types/meeting';

interface ChatPanelProps {
  onSendMessage: (message: string, recipientId?: string) => void;
  onClose: () => void;
}

export default function ChatPanel({ onSendMessage, onClose }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState<string>('everyone');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, markAsRead } = useChatStore();
  const { participants, currentParticipant } = useMeetingStore();

  useEffect(() => {
    // Mark messages as read when panel is opened
    markAsRead();
    scrollToBottom();
  }, [messages, markAsRead]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const recipientId = selectedRecipient === 'everyone' ? undefined : selectedRecipient;
    onSendMessage(message, recipientId);
    setMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-20 w-96 bg-gray-800 border-l border-gray-700 flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Chat</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-700 rounded-full transition-colors"
          aria-label="Close chat"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Recipient selector */}
      <div className="p-4 border-b border-gray-700">
        <select
          value={selectedRecipient}
          onChange={(e) => setSelectedRecipient(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="everyone">Everyone</option>
          {participants.map((participant) => (
            <option key={participant.id} value={participant.id}>
              {participant.name} (Private)
            </option>
          ))}
        </select>
      </div>

      {/* Messages list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderId === currentParticipant?.userId;
            const isPrivate = msg.isPrivate;

            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">
                      {isOwnMessage ? 'You' : msg.senderName}
                    </span>
                    {isPrivate && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded">
                        Private
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-white'
                    }`}
                  >
                    {msg.type === 'file' && msg.fileUrl ? (
                      <a
                        href={msg.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 underline"
                      >
                        <Paperclip className="w-4 h-4" />
                        {msg.fileName || 'File attachment'}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-700">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              rows={1}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ maxHeight: '120px' }}
            />
            <button
              type="button"
              className="absolute right-2 bottom-3 p-1 hover:bg-gray-600 rounded transition-colors"
              aria-label="Attach file"
            >
              <Paperclip className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors"
            aria-label="Send message"
          >
            <Send className="w-5 h-5 text-white" />
          </button>
        </div>
      </form>
    </div>
  );
}

const MessageSquare = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);
