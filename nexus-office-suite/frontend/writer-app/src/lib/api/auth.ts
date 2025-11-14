import { apiClient } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, AuthUser } from '@/types/auth';

export const authApi = {
  // Login
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    const { token, refreshToken } = response.data;

    // Store tokens
    apiClient.setToken(token);
    apiClient.setRefreshToken(refreshToken);

    return response.data;
  },

  // Register
  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/register', data);
    const { token, refreshToken } = response.data;

    // Store tokens
    apiClient.setToken(token);
    apiClient.setRefreshToken(refreshToken);

    return response.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');

    // Clear tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>('/auth/me');
    return response.data;
  },

  // Refresh token
  refreshToken: async (): Promise<LoginResponse> => {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refresh_token')
      : null;

    const response = await apiClient.post<LoginResponse>('/auth/refresh', { refreshToken });
    const { token } = response.data;

    // Update token
    apiClient.setToken(token);

    return response.data;
  },
};
