/**
 * Secure Authentication Store (Zustand)
 *
 * This store uses HTTP-only cookies for token storage instead of localStorage.
 * The only client-side stored value is the CSRF token, which is safe to store.
 *
 * Migration Guide:
 * 1. Replace localStorage token storage with HTTP-only cookies (server-side)
 * 2. Update login/logout to use the new cookie-based endpoints
 * 3. Update API calls to use credentials: 'include' for cookies
 * 4. Include CSRF token in non-GET requests
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  login as authLogin,
  logout as authLogout,
  refreshToken,
  checkAuth,
  getCsrfToken,
  setCsrfToken,
  clearCsrfToken,
  setupAutoRefresh,
  type User,
  type AuthConfig,
} from '../lib/auth';

/**
 * Auth State Interface
 */
interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  csrfToken: string | null;

  // Internal
  _refreshCleanup: (() => void) | null;

  // Actions
  initialize: (config: AuthConfig) => Promise<void>;
  login: (config: AuthConfig, email: string, password: string) => Promise<void>;
  logout: (config: AuthConfig) => Promise<void>;
  refresh: (config: AuthConfig) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

/**
 * Create secure auth store
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isInitialized: false,
      error: null,
      csrfToken: null,
      _refreshCleanup: null,

      /**
       * Initialize auth state on app load
       */
      initialize: async (config: AuthConfig) => {
        set({ isLoading: true });

        try {
          // Check if already authenticated (session cookie exists)
          const user = await checkAuth(config);

          if (user) {
            // Restore CSRF token from storage
            const csrfToken = getCsrfToken();

            // Setup auto-refresh
            const cleanup = setupAutoRefresh(config);

            set({
              user,
              isAuthenticated: true,
              csrfToken,
              _refreshCleanup: cleanup,
            });
          } else {
            // Clear any stale tokens
            clearCsrfToken();

            set({
              user: null,
              isAuthenticated: false,
              csrfToken: null,
            });
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          clearCsrfToken();

          set({
            user: null,
            isAuthenticated: false,
            csrfToken: null,
          });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      /**
       * Login with email and password
       * Tokens are stored in HTTP-only cookies by the server
       */
      login: async (config: AuthConfig, email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await authLogin(config, { email, password });

          // Store CSRF token (only client-side token)
          if (response.csrfToken) {
            setCsrfToken(response.csrfToken);
          }

          // Setup auto-refresh
          const cleanup = setupAutoRefresh(config);

          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            csrfToken: response.csrfToken,
            _refreshCleanup: cleanup,
          });
        } catch (error: any) {
          set({
            error: error.message || 'Login failed',
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          throw error;
        }
      },

      /**
       * Logout
       * Server clears HTTP-only cookies
       */
      logout: async (config: AuthConfig) => {
        const { _refreshCleanup } = get();

        // Stop auto-refresh
        if (_refreshCleanup) {
          _refreshCleanup();
        }

        try {
          await authLogout(config);
        } finally {
          // Always clear local state
          clearCsrfToken();

          set({
            user: null,
            isAuthenticated: false,
            error: null,
            csrfToken: null,
            _refreshCleanup: null,
          });
        }
      },

      /**
       * Refresh the session
       */
      refresh: async (config: AuthConfig) => {
        try {
          const success = await refreshToken(config);

          if (!success) {
            // Refresh failed, logout user
            await get().logout(config);
            return false;
          }

          // Update CSRF token
          const newCsrfToken = getCsrfToken();
          set({ csrfToken: newCsrfToken });

          return true;
        } catch (error) {
          await get().logout(config);
          return false;
        }
      },

      /**
       * Update user data
       */
      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'nexus-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist user data, not tokens (tokens are in HTTP-only cookies)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        csrfToken: state.csrfToken,
      }),
    }
  )
);

/**
 * Hook to get auth config
 */
export function useAuthConfig(): AuthConfig {
  return {
    apiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3001',
  };
}

/**
 * Custom hook for authenticated API calls
 */
export function useAuthenticatedFetch() {
  const csrfToken = useAuthStore((state) => state.csrfToken);

  return async function authFetch(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(options.headers);

    // Add CSRF token for non-GET requests
    const method = options.method?.toUpperCase() || 'GET';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }

    return fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  };
}

export type { User, AuthConfig };
