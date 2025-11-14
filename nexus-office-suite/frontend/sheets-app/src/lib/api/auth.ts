import { apiClient } from './client';
import type { LoginRequest, LoginResponse, RegisterRequest, AuthUser } from '@/types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/login', data);
    const { token, refreshToken } = response.data;

    apiClient.setToken(token);
    apiClient.setRefreshToken(refreshToken);

    return response.data;
  },

  register: async (data: RegisterRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/auth/register', data);
    const { token, refreshToken } = response.data;

    apiClient.setToken(token);
    apiClient.setRefreshToken(refreshToken);

    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');

    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
    }
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>('/auth/me');
    return response.data;
  },

  refreshToken: async (): Promise<LoginResponse> => {
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refresh_token')
      : null;

    const response = await apiClient.post<LoginResponse>('/auth/refresh', { refreshToken });
    const { token } = response.data;

    apiClient.setToken(token);

    return response.data;
  },
};
