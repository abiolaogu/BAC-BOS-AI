'use client';

import { useEffect, useState } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useUserStore } from '@/store/userStore';
import { api } from '@/lib/api';
import { socket, SocketEvents } from '@/lib/socket';
import { ChannelList } from '@/components/ChannelList';
import { MessageList } from '@/components/MessageList';
import { MessageComposer } from '@/components/MessageComposer';
import { UserList } from '@/components/UserList';
import { TypingIndicator } from '@/components/TypingIndicator';
import { Message, Channel, User } from '@/types';
import { Menu, X, Users as UsersIcon, Hash } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

export default function ChatPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const {
    channels,
    activeChannelId,
    messages,
    typingUsers,
    isSidebarOpen,
    isUserListOpen,
    setChannels,
    setActiveChannel,
    addMessage,
    updateMessage,
    removeMessage,
    setMessages,
    addTypingUser,
    removeTypingUser,
    toggleSidebar,
    toggleUserList,
    getActiveChannel,
  } = useChatStore();

  const { currentUser, setCurrentUser } = useUserStore();

  // Initialize
  useEffect(() => {
    // Get token from localStorage (in real app, this would come from auth)
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      // Redirect to login
      window.location.href = '/login';
      return;
    }

    setToken(storedToken);
    api.setToken(storedToken);

    // Load initial data
    loadChannels();
    connectWebSocket(storedToken);

    return () => {
      socket.disconnect();
    };
  }, []);

  const loadChannels = async () => {
    try {
      const channelsData = await api.getChannels();
      setChannels(channelsData);
      setIsLoading(false);

      // Select first channel by default
      if (channelsData.length > 0) {
        selectChannel(channelsData[0].id);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
      toast.error('Failed to load channels');
      setIsLoading(false);
    }
  };

  const connectWebSocket = (token: string) => {
    socket.connect(token);

    // Handle socket events
    socket.on(SocketEvents.MESSAGE_CREATED, (message: Message) => {
      addMessage(message);
    });

    socket.on(SocketEvents.MESSAGE_UPDATED, (message: Message) => {
      updateMessage(message.id, message);
    });

    socket.on(SocketEvents.MESSAGE_DELETED, ({ messageId }: any) => {
      removeMessage(messageId);
    });

    socket.on(SocketEvents.USER_TYPING, (data: any) => {
      if (data.isTyping) {
        addTypingUser(data);
      } else {
        removeTypingUser(data.channelId, data.userId);
      }
    });

    socket.on(SocketEvents.REACTION_ADDED, ({ messageId, reactions }: any) => {
      updateMessage(messageId, { reactions });
    });

    socket.on(SocketEvents.REACTION_REMOVED, ({ messageId, reactions }: any) => {
      updateMessage(messageId, { reactions });
    });
  };

  const selectChannel = async (channelId: string) => {
    setActiveChannel(channelId);

    // Load messages for this channel
    try {
      const { messages: channelMessages } = await api.getMessages(channelId);
      setMessages(channelId, channelMessages);

      // Join channel via WebSocket
      socket.joinChannel(channelId);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const handleSendMessage = async (content: string, attachments?: File[]) => {
    if (!activeChannelId) return;

    try {
      // Upload attachments if any
      const uploadedAttachments = [];
      if (attachments && attachments.length > 0) {
        for (const file of attachments) {
          const attachment = await api.uploadFile(file, activeChannelId);
          uploadedAttachments.push(attachment);
        }
      }

      // Send message via WebSocket
      socket.sendMessage({
        channelId: activeChannelId,
        content,
        attachments: uploadedAttachments,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!activeChannelId) return;

    if (isTyping) {
      socket.startTyping(activeChannelId);
    } else {
      socket.stopTyping(activeChannelId);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      socket.addReaction(messageId, emoji);
    } catch (error) {
      console.error('Failed to add reaction:', error);
      toast.error('Failed to add reaction');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      socket.deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const activeChannel = getActiveChannel();
  const activeMessages = activeChannelId ? messages[activeChannelId] || [] : [];
  const activeTypingUsers = activeChannelId
    ? typingUsers[activeChannelId] || []
    : [];

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-600">Loading NEXUS Chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Toaster position="top-right" />

      {/* Sidebar - Channel List */}
      {isSidebarOpen && (
        <div className="w-64 flex-shrink-0">
          <ChannelList
            channels={channels}
            onChannelSelect={selectChannel}
            onCreateChannel={() => toast('Create channel feature coming soon!')}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col">
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-3">
              <div className="flex items-center gap-3">
                {!isSidebarOpen && (
                  <button
                    onClick={toggleSidebar}
                    className="rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <Menu size={20} />
                  </button>
                )}

                <Hash size={20} className="text-gray-500" />
                <div>
                  <h1 className="font-semibold text-gray-900 dark:text-white">
                    {activeChannel.name}
                  </h1>
                  {activeChannel.description && (
                    <p className="text-xs text-gray-500">
                      {activeChannel.description}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={toggleUserList}
                className="rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <UsersIcon size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
              <MessageList
                messages={activeMessages}
                currentUserId={currentUser?.id || ''}
                onReaction={handleReaction}
                onDelete={handleDeleteMessage}
              />
              <TypingIndicator typingUsers={activeTypingUsers} />
            </div>

            {/* Message Composer */}
            <MessageComposer onSend={handleSendMessage} onTyping={handleTyping} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center">
              <Hash size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                Welcome to NEXUS Chat
              </p>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Select a channel to start messaging
              </p>
            </div>
          </div>
        )}
      </div>

      {/* User List Sidebar */}
      {isUserListOpen && activeChannel?.members && (
        <div className="w-64 flex-shrink-0">
          <UserList
            users={activeChannel.members}
            onClose={toggleUserList}
            onUserClick={(user) => toast(`User: ${user.displayName}`)}
          />
        </div>
      )}
    </div>
  );
}
