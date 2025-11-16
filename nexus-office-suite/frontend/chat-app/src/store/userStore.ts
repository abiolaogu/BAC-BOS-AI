import { create } from 'zustand';
import { User, UserStatus } from '@/types';

interface UserState {
  currentUser: User | null;
  onlineUsers: Record<string, UserStatus>;
  setCurrentUser: (user: User | null) => void;
  updateCurrentUser: (updates: Partial<User>) => void;
  setUserStatus: (userId: string, status: UserStatus) => void;
  isUserOnline: (userId: string) => boolean;
}

export const useUserStore = create<UserState>((set, get) => ({
  currentUser: null,
  onlineUsers: {},

  setCurrentUser: (user) => set({ currentUser: user }),

  updateCurrentUser: (updates) =>
    set((state) => ({
      currentUser: state.currentUser
        ? { ...state.currentUser, ...updates }
        : null,
    })),

  setUserStatus: (userId, status) =>
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: status,
      },
    })),

  isUserOnline: (userId) => {
    const status = get().onlineUsers[userId];
    return status === UserStatus.ONLINE || status === UserStatus.AWAY;
  },
}));
