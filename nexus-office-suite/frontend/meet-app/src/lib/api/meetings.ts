import axios, { AxiosInstance } from 'axios';
import type {
  Meeting,
  CreateMeetingRequest,
  UpdateMeetingRequest,
  JoinMeetingRequest,
} from '@/types/meeting';

class MeetingsAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8095',
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
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  // Create a new meeting
  async createMeeting(data: CreateMeetingRequest): Promise<Meeting> {
    const response = await this.client.post<Meeting>('/api/meet/meetings', data);
    return response.data;
  }

  // Get a meeting by ID
  async getMeeting(meetingId: string): Promise<Meeting> {
    const response = await this.client.get<Meeting>(`/api/meet/meetings/${meetingId}`);
    return response.data;
  }

  // List all meetings
  async listMeetings(params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ meetings: Meeting[]; total: number }> {
    const response = await this.client.get<{ meetings: Meeting[]; total: number }>(
      '/api/meet/meetings',
      { params }
    );
    return response.data;
  }

  // Update a meeting
  async updateMeeting(meetingId: string, data: UpdateMeetingRequest): Promise<Meeting> {
    const response = await this.client.put<Meeting>(
      `/api/meet/meetings/${meetingId}`,
      data
    );
    return response.data;
  }

  // Delete a meeting
  async deleteMeeting(meetingId: string): Promise<void> {
    await this.client.delete(`/api/meet/meetings/${meetingId}`);
  }

  // Join a meeting
  async joinMeeting(meetingId: string, data: JoinMeetingRequest): Promise<{
    meeting: Meeting;
    participant: any;
    token: string;
  }> {
    const response = await this.client.post(
      `/api/meet/meetings/${meetingId}/join`,
      data
    );
    return response.data;
  }

  // Leave a meeting
  async leaveMeeting(meetingId: string): Promise<void> {
    await this.client.post(`/api/meet/meetings/${meetingId}/leave`);
  }

  // Start a meeting
  async startMeeting(meetingId: string): Promise<Meeting> {
    const response = await this.client.post<Meeting>(
      `/api/meet/meetings/${meetingId}/start`
    );
    return response.data;
  }

  // End a meeting
  async endMeeting(meetingId: string): Promise<void> {
    await this.client.post(`/api/meet/meetings/${meetingId}/end`);
  }

  // Get meeting participants
  async getParticipants(meetingId: string): Promise<any[]> {
    const response = await this.client.get(`/api/meet/meetings/${meetingId}/participants`);
    return response.data;
  }

  // Remove a participant from meeting
  async removeParticipant(meetingId: string, participantId: string): Promise<void> {
    await this.client.delete(
      `/api/meet/meetings/${meetingId}/participants/${participantId}`
    );
  }

  // Get meeting chat messages
  async getChatMessages(meetingId: string): Promise<any[]> {
    const response = await this.client.get(`/api/meet/meetings/${meetingId}/messages`);
    return response.data;
  }

  // Send a chat message
  async sendChatMessage(meetingId: string, message: string, recipientId?: string): Promise<any> {
    const response = await this.client.post(`/api/meet/meetings/${meetingId}/messages`, {
      message,
      recipientId,
    });
    return response.data;
  }

  // Get WebRTC router capabilities
  async getRouterCapabilities(meetingId: string): Promise<any> {
    const response = await this.client.get(
      `/api/meet/meetings/${meetingId}/router-capabilities`
    );
    return response.data;
  }

  // Create WebRTC transport
  async createTransport(meetingId: string, direction: 'send' | 'recv'): Promise<any> {
    const response = await this.client.post(
      `/api/meet/meetings/${meetingId}/transports`,
      { direction }
    );
    return response.data;
  }

  // Connect WebRTC transport
  async connectTransport(
    meetingId: string,
    transportId: string,
    dtlsParameters: any
  ): Promise<void> {
    await this.client.post(
      `/api/meet/meetings/${meetingId}/transports/${transportId}/connect`,
      { dtlsParameters }
    );
  }

  // Create producer
  async createProducer(
    meetingId: string,
    transportId: string,
    kind: 'audio' | 'video',
    rtpParameters: any
  ): Promise<{ producerId: string }> {
    const response = await this.client.post(
      `/api/meet/meetings/${meetingId}/transports/${transportId}/produce`,
      { kind, rtpParameters }
    );
    return response.data;
  }

  // Create consumer
  async createConsumer(
    meetingId: string,
    transportId: string,
    producerId: string,
    rtpCapabilities: any
  ): Promise<any> {
    const response = await this.client.post(
      `/api/meet/meetings/${meetingId}/transports/${transportId}/consume`,
      { producerId, rtpCapabilities }
    );
    return response.data;
  }

  // Authentication
  async login(email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await this.client.post('/api/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async register(name: string, email: string, password: string): Promise<{ token: string; user: any }> {
    const response = await this.client.post('/api/auth/register', { name, email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  }

  async logout(): Promise<void> {
    localStorage.removeItem('token');
  }

  async getCurrentUser(): Promise<any> {
    const response = await this.client.get('/api/auth/me');
    return response.data;
  }
}

// Singleton instance
export const meetingsAPI = new MeetingsAPI();
