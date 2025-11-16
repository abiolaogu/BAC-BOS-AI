import { create } from 'zustand';
import { User } from '@/types/hub';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Invalid credentials');
      }

      const data = await response.json();

      // Store token
      localStorage.setItem('nexus_token', data.token);
      localStorage.setItem('nexus_refresh_token', data.refreshToken);

      set({
        user: data.user,
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('nexus_token');
    localStorage.removeItem('nexus_refresh_token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
  },

  refreshToken: async () => {
    try {
      const refreshToken = localStorage.getItem('nexus_refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_AUTH_API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      localStorage.setItem('nexus_token', data.token);

      set({ token: data.token });
    } catch (error) {
      get().logout();
    }
  },

  updateUser: (userData: Partial<User>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...userData } : null,
    }));
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: true });
  },

  setToken: (token: string) => {
    localStorage.setItem('nexus_token', token);
    set({ token, isAuthenticated: true });
  },

  clearError: () => {
    set({ error: null });
  },
}));
