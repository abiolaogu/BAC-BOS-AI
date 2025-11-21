import axios, { AxiosInstance } from 'axios';
import { Channel, Message, SearchQuery, PaginationOptions } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.client.interceptors.request.use((config) => {
      const token = this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          this.clearToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private clearToken(): void {
    localStorage.removeItem('token');
  }

  public setToken(token: string): void {
    localStorage.setItem('token', token);
  }

  // Channels
  async getChannels(): Promise<Channel[]> {
    const { data } = await this.client.get('/channels');
    return data.channels;
  }

  async getChannel(channelId: string): Promise<Channel> {
    const { data } = await this.client.get(`/channels/${channelId}`);
    return data.channel;
  }

  async createChannel(channelData: {
    name: string;
    description?: string;
    type: string;
    isPrivate: boolean;
    memberIds?: string[];
  }): Promise<Channel> {
    const { data } = await this.client.post('/channels', channelData);
    return data.channel;
  }

  async createDirectMessage(recipientId: string): Promise<Channel> {
    const { data } = await this.client.post('/channels/direct', { recipientId });
    return data.channel;
  }

  async updateChannel(
    channelId: string,
    updates: {
      name?: string;
      description?: string;
      avatar?: string;
      settings?: any;
    }
  ): Promise<Channel> {
    const { data } = await this.client.patch(`/channels/${channelId}`, updates);
    return data.channel;
  }

  async deleteChannel(channelId: string): Promise<void> {
    await this.client.delete(`/channels/${channelId}`);
  }

  async addChannelMember(channelId: string, memberId: string): Promise<void> {
    await this.client.post(`/channels/${channelId}/members`, { memberId });
  }

  async removeChannelMember(channelId: string, memberId: string): Promise<void> {
    await this.client.delete(`/channels/${channelId}/members/${memberId}`);
  }

  async updateMemberRole(
    channelId: string,
    memberId: string,
    role: string
  ): Promise<void> {
    await this.client.patch(`/channels/${channelId}/members/${memberId}/role`, {
      role,
    });
  }

  async searchChannels(query: string): Promise<Channel[]> {
    const { data } = await this.client.get('/channels/search/query', {
      params: { q: query },
    });
    return data.channels;
  }

  // Messages
  async getMessages(
    channelId: string,
    options: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const { data } = await this.client.get(`/messages/channels/${channelId}`, {
      params: options,
    });
    return data;
  }

  async getThreadReplies(
    messageId: string,
    options: PaginationOptions = { limit: 50, offset: 0 }
  ): Promise<{ messages: Message[]; hasMore: boolean }> {
    const { data } = await this.client.get(`/messages/${messageId}/replies`, {
      params: options,
    });
    return data;
  }

  async createMessage(messageData: {
    channelId: string;
    content: string;
    type?: string;
    threadId?: string;
    parentId?: string;
    mentions?: string[];
    attachments?: any[];
  }): Promise<Message> {
    const { data } = await this.client.post('/messages', messageData);
    return data.message;
  }

  async updateMessage(messageId: string, content: string): Promise<Message> {
    const { data } = await this.client.patch(`/messages/${messageId}`, { content });
    return data.message;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.client.delete(`/messages/${messageId}`);
  }

  async addReaction(messageId: string, emoji: string): Promise<Message> {
    const { data } = await this.client.post(`/messages/${messageId}/reactions`, {
      emoji,
    });
    return data.message;
  }

  async removeReaction(messageId: string, emoji: string): Promise<Message> {
    const { data } = await this.client.delete(
      `/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`
    );
    return data.message;
  }

  async markAsRead(channelId: string, messageId: string): Promise<void> {
    await this.client.post(`/messages/${messageId}/read`, { channelId });
  }

  async getUnreadCount(channelId: string): Promise<number> {
    const { data } = await this.client.get(`/messages/channels/${channelId}/unread`);
    return data.count;
  }

  async searchMessages(query: SearchQuery): Promise<{
    messages: Message[];
    total: number;
    hasMore: boolean;
  }> {
    const { data } = await this.client.get('/messages/search/query', {
      params: {
        q: query.query,
        channelId: query.channelId,
        type: query.type,
        hasAttachments: query.hasAttachments,
        dateFrom: query.dateFrom?.toISOString(),
        dateTo: query.dateTo?.toISOString(),
        limit: query.limit,
        offset: query.offset,
      },
    });
    return data;
  }

  // File upload
  async uploadFile(file: File, channelId: string): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('channelId', channelId);

    const { data } = await this.client.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return data.attachment;
  }
}

export const api = new ApiClient();
