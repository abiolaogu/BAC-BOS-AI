import { create } from 'zustand';
import type { ChatMessage } from '@/types/meeting';

interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isTyping: Map<string, boolean>; // participantId -> isTyping

  // Actions
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  markAsRead: () => void;
  clearMessages: () => void;
  setTyping: (participantId: string, isTyping: boolean) => void;
  incrementUnread: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  unreadCount: 0,
  isTyping: new Map(),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  setMessages: (messages) =>
    set({ messages }),

  markAsRead: () =>
    set({ unreadCount: 0 }),

  clearMessages: () =>
    set({
      messages: [],
      unreadCount: 0,
      isTyping: new Map(),
    }),

  setTyping: (participantId, isTyping) =>
    set((state) => {
      const newTyping = new Map(state.isTyping);
      if (isTyping) {
        newTyping.set(participantId, true);
      } else {
        newTyping.delete(participantId);
      }
      return { isTyping: newTyping };
    }),

  incrementUnread: () =>
    set((state) => ({
      unreadCount: state.unreadCount + 1,
    })),
}));
