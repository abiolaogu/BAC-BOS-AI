import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

// Base API client configuration
export class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          const refreshed = await this.refreshToken();
          if (refreshed && error.config) {
            return this.client.request(error.config);
          }
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('nexus_token');
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('nexus_token', token);
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('nexus_refresh_token');
      if (!refreshToken) return false;

      const response = await axios.post(`${process.env.NEXT_PUBLIC_AUTH_API_URL}/auth/refresh`, {
        refreshToken,
      });

      if (response.data.token) {
        this.setToken(response.data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

// Service-specific API clients
export const writerApi = new ApiClient(process.env.NEXT_PUBLIC_WRITER_API_URL || '');
export const sheetsApi = new ApiClient(process.env.NEXT_PUBLIC_SHEETS_API_URL || '');
export const slidesApi = new ApiClient(process.env.NEXT_PUBLIC_SLIDES_API_URL || '');
export const driveApi = new ApiClient(process.env.NEXT_PUBLIC_DRIVE_API_URL || '');
export const meetApi = new ApiClient(process.env.NEXT_PUBLIC_MEET_API_URL || '');
export const authApi = new ApiClient(process.env.NEXT_PUBLIC_AUTH_API_URL || '');

// Health check utility
export async function checkServiceHealth(apiUrl: string): Promise<boolean> {
  try {
    const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
}
