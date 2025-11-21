import { create } from 'zustand';
import { Channel, Message, User, TypingIndicator } from '@/types';

interface ChatState {
  // Channels
  channels: Channel[];
  activeChannelId: string | null;
  setChannels: (channels: Channel[]) => void;
  addChannel: (channel: Channel) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  removeChannel: (channelId: string) => void;
  setActiveChannel: (channelId: string | null) => void;
  getActiveChannel: () => Channel | null;

  // Messages
  messages: Record<string, Message[]>;
  setMessages: (channelId: string, messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  removeMessage: (messageId: string) => void;
  prependMessages: (channelId: string, messages: Message[]) => void;

  // Typing indicators
  typingUsers: Record<string, TypingIndicator[]>;
  addTypingUser: (typing: TypingIndicator) => void;
  removeTypingUser: (channelId: string, userId: string) => void;

  // Thread
  activeThreadId: string | null;
  threadMessages: Record<string, Message[]>;
  setActiveThread: (messageId: string | null) => void;
  setThreadMessages: (messageId: string, messages: Message[]) => void;
  addThreadMessage: (message: Message) => void;

  // UI State
  isSidebarOpen: boolean;
  isUserListOpen: boolean;
  toggleSidebar: () => void;
  toggleUserList: () => void;

  // Search
  searchQuery: string;
  searchResults: Message[];
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: Message[]) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Channels
  channels: [],
  activeChannelId: null,

  setChannels: (channels) => set({ channels }),

  addChannel: (channel) =>
    set((state) => ({
      channels: [channel, ...state.channels],
    })),

  updateChannel: (channelId, updates) =>
    set((state) => ({
      channels: state.channels.map((ch) =>
        ch.id === channelId ? { ...ch, ...updates } : ch
      ),
    })),

  removeChannel: (channelId) =>
    set((state) => ({
      channels: state.channels.filter((ch) => ch.id !== channelId),
      activeChannelId:
        state.activeChannelId === channelId ? null : state.activeChannelId,
    })),

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

  getActiveChannel: () => {
    const state = get();
    return state.channels.find((ch) => ch.id === state.activeChannelId) || null;
  },

  // Messages
  messages: {},

  setMessages: (channelId, messages) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: messages,
      },
    })),

  addMessage: (message) =>
    set((state) => {
      const channelMessages = state.messages[message.channelId] || [];

      // Check if message already exists
      if (channelMessages.some((m) => m.id === message.id)) {
        return state;
      }

      return {
        messages: {
          ...state.messages,
          [message.channelId]: [...channelMessages, message],
        },
      };
    }),

  updateMessage: (messageId, updates) =>
    set((state) => {
      const newMessages = { ...state.messages };

      Object.keys(newMessages).forEach((channelId) => {
        newMessages[channelId] = newMessages[channelId].map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
      });

      return { messages: newMessages };
    }),

  removeMessage: (messageId) =>
    set((state) => {
      const newMessages = { ...state.messages };

      Object.keys(newMessages).forEach((channelId) => {
        newMessages[channelId] = newMessages[channelId].filter(
          (msg) => msg.id !== messageId
        );
      });

      return { messages: newMessages };
    }),

  prependMessages: (channelId, messages) =>
    set((state) => {
      const existingMessages = state.messages[channelId] || [];

      // Filter out duplicates
      const newMessages = messages.filter(
        (msg) => !existingMessages.some((em) => em.id === msg.id)
      );

      return {
        messages: {
          ...state.messages,
          [channelId]: [...newMessages, ...existingMessages],
        },
      };
    }),

  // Typing indicators
  typingUsers: {},

  addTypingUser: (typing) =>
    set((state) => {
      const channelTyping = state.typingUsers[typing.channelId] || [];

      // Remove existing entry for this user
      const filtered = channelTyping.filter((t) => t.userId !== typing.userId);

      return {
        typingUsers: {
          ...state.typingUsers,
          [typing.channelId]: [...filtered, typing],
        },
      };
    }),

  removeTypingUser: (channelId, userId) =>
    set((state) => {
      const channelTyping = state.typingUsers[channelId] || [];

      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: channelTyping.filter((t) => t.userId !== userId),
        },
      };
    }),

  // Thread
  activeThreadId: null,
  threadMessages: {},

  setActiveThread: (messageId) => set({ activeThreadId: messageId }),

  setThreadMessages: (messageId, messages) =>
    set((state) => ({
      threadMessages: {
        ...state.threadMessages,
        [messageId]: messages,
      },
    })),

  addThreadMessage: (message) =>
    set((state) => {
      if (!message.parentId) return state;

      const threadMessages = state.threadMessages[message.parentId] || [];

      return {
        threadMessages: {
          ...state.threadMessages,
          [message.parentId]: [...threadMessages, message],
        },
      };
    }),

  // UI State
  isSidebarOpen: true,
  isUserListOpen: false,

  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  toggleUserList: () =>
    set((state) => ({ isUserListOpen: !state.isUserListOpen })),

  // Search
  searchQuery: '',
  searchResults: [],

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
}));
