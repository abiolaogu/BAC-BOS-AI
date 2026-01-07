/**
 * Secure Authentication Library for Frontend Apps
 *
 * This library provides secure authentication using HTTP-only cookies
 * instead of localStorage, protecting against XSS attacks.
 *
 * Features:
 * - HTTP-only cookie-based token storage
 * - Automatic CSRF token management
 * - Token refresh handling
 * - Secure logout
 */

/**
 * CSRF Token storage (this is the only token stored in memory/localStorage)
 * CSRF tokens are safe to store client-side as they provide CSRF protection,
 * not authentication.
 */
const CSRF_TOKEN_KEY = 'nexus_csrf_token';

/**
 * Get the stored CSRF token
 */
export function getCsrfToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CSRF_TOKEN_KEY);
}

/**
 * Store the CSRF token
 */
export function setCsrfToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CSRF_TOKEN_KEY, token);
}

/**
 * Clear the CSRF token
 */
export function clearCsrfToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CSRF_TOKEN_KEY);
}

/**
 * Authentication API client
 */
export interface AuthConfig {
  apiUrl: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  tenantId?: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  csrfToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  success: boolean;
  csrfToken: string;
  expiresIn: number;
}

/**
 * Create authenticated fetch function
 * Automatically includes credentials and CSRF token
 */
export function createAuthenticatedFetch(config: AuthConfig) {
  return async function authenticatedFetch(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const url = endpoint.startsWith('http') ? endpoint : `${config.apiUrl}${endpoint}`;

    const headers = new Headers(options.headers);

    // Add CSRF token for non-GET requests
    const method = options.method?.toUpperCase() || 'GET';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    }

    // Ensure Content-Type is set for requests with body
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important: This sends cookies with the request
    });

    // Handle 401 - try to refresh token
    if (response.status === 401) {
      const refreshed = await refreshToken(config);
      if (refreshed) {
        // Retry the original request with new CSRF token
        const newCsrfToken = getCsrfToken();
        if (newCsrfToken && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
          headers.set('X-CSRF-Token', newCsrfToken);
        }

        return fetch(url, {
          ...options,
          headers,
          credentials: 'include',
        });
      }
    }

    return response;
  };
}

/**
 * Login function
 */
export async function login(
  config: AuthConfig,
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const response = await fetch(`${config.apiUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Receive cookies from server
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Login failed' }));
    throw new Error(error.message || error.error || 'Login failed');
  }

  const data: AuthResponse = await response.json();

  // Store CSRF token for future requests
  if (data.csrfToken) {
    setCsrfToken(data.csrfToken);
  }

  return data;
}

/**
 * Logout function
 */
export async function logout(config: AuthConfig): Promise<void> {
  try {
    const csrfToken = getCsrfToken();

    await fetch(`${config.apiUrl}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });
  } catch (error) {
    // Ignore errors during logout
    console.warn('Logout request failed:', error);
  } finally {
    // Always clear local state
    clearCsrfToken();
  }
}

/**
 * Refresh token
 */
export async function refreshToken(config: AuthConfig): Promise<boolean> {
  try {
    const csrfToken = getCsrfToken();

    const response = await fetch(`${config.apiUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      credentials: 'include',
    });

    if (!response.ok) {
      clearCsrfToken();
      return false;
    }

    const data: RefreshResponse = await response.json();

    // Update CSRF token
    if (data.csrfToken) {
      setCsrfToken(data.csrfToken);
    }

    return true;
  } catch (error) {
    clearCsrfToken();
    return false;
  }
}

/**
 * Check authentication status
 */
export async function checkAuth(config: AuthConfig): Promise<User | null> {
  try {
    const response = await fetch(`${config.apiUrl}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user;
  } catch (error) {
    return null;
  }
}

/**
 * Setup automatic token refresh
 * Returns a cleanup function to stop the refresh interval
 */
export function setupAutoRefresh(
  config: AuthConfig,
  refreshIntervalMs: number = 5 * 60 * 1000 // 5 minutes
): () => void {
  const intervalId = setInterval(async () => {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      await refreshToken(config);
    }
  }, refreshIntervalMs);

  return () => clearInterval(intervalId);
}

/**
 * Initialize auth on app load
 * Checks if user is authenticated and sets up auto-refresh
 */
export async function initializeAuth(config: AuthConfig): Promise<{
  user: User | null;
  cleanup: () => void;
}> {
  // Check if already authenticated
  const user = await checkAuth(config);

  let cleanup = () => {};

  if (user) {
    // Set up auto-refresh
    cleanup = setupAutoRefresh(config);
  }

  return { user, cleanup };
}
