import axios, { AxiosInstance } from 'axios';
import {
  Calendar,
  CreateCalendarRequest,
  UpdateCalendarRequest,
  ShareCalendarRequest,
  Event,
  EventResponse,
  CreateEventRequest,
  UpdateEventRequest,
  RSVPRequest,
} from '@/types';

class CalendarAPI {
  private client: AxiosInstance;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_CALENDAR_API_URL || 'http://localhost:8083') {
    this.client = axios.create({
      baseURL: `${baseURL}/api/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Calendar methods
  async getCalendars(): Promise<Calendar[]> {
    const response = await this.client.get<Calendar[]>('/calendars');
    return response.data;
  }

  async getCalendar(id: string): Promise<Calendar> {
    const response = await this.client.get<Calendar>(`/calendars/${id}`);
    return response.data;
  }

  async createCalendar(data: CreateCalendarRequest): Promise<Calendar> {
    const response = await this.client.post<Calendar>('/calendars', data);
    return response.data;
  }

  async updateCalendar(id: string, data: UpdateCalendarRequest): Promise<Calendar> {
    const response = await this.client.put<Calendar>(`/calendars/${id}`, data);
    return response.data;
  }

  async deleteCalendar(id: string): Promise<void> {
    await this.client.delete(`/calendars/${id}`);
  }

  async shareCalendar(id: string, data: ShareCalendarRequest): Promise<void> {
    await this.client.post(`/calendars/${id}/share`, data);
  }

  // Event methods
  async getEvents(startTime: string, endTime: string): Promise<EventResponse[]> {
    const response = await this.client.get<EventResponse[]>('/events', {
      params: { start_time: startTime, end_time: endTime },
    });
    return response.data;
  }

  async getCalendarEvents(calendarId: string, startTime: string, endTime: string): Promise<EventResponse[]> {
    const response = await this.client.get<EventResponse[]>(`/calendars/${calendarId}/events`, {
      params: { start_time: startTime, end_time: endTime },
    });
    return response.data;
  }

  async getEvent(id: string): Promise<EventResponse> {
    const response = await this.client.get<EventResponse>(`/events/${id}`);
    return response.data;
  }

  async createEvent(data: CreateEventRequest): Promise<EventResponse> {
    const response = await this.client.post<EventResponse>('/events', data);
    return response.data;
  }

  async updateEvent(id: string, data: UpdateEventRequest): Promise<EventResponse> {
    const response = await this.client.put<EventResponse>(`/events/${id}`, data);
    return response.data;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.client.delete(`/events/${id}`);
  }

  async respondToEvent(id: string, data: RSVPRequest, email?: string): Promise<void> {
    await this.client.post(`/events/${id}/rsvp`, data, {
      params: email ? { email } : undefined,
    });
  }

  async searchEvents(query: string): Promise<EventResponse[]> {
    const response = await this.client.get<EventResponse[]>('/events/search', {
      params: { q: query },
    });
    return response.data;
  }

  // CalDAV methods
  async exportCalendar(calendarId: string, startTime?: string, endTime?: string): Promise<string> {
    const response = await this.client.get(`/caldav/calendars/${calendarId}/export`, {
      params: { start_time: startTime, end_time: endTime },
      responseType: 'text',
    });
    return response.data;
  }

  async importCalendar(calendarId: string, icsData: string): Promise<void> {
    await this.client.post(`/caldav/calendars/${calendarId}/import`, icsData, {
      headers: { 'Content-Type': 'text/calendar' },
    });
  }

  async getCalDAVURL(calendarId: string, baseURL?: string): Promise<string> {
    const response = await this.client.get<{ caldav_url: string }>(
      `/caldav/calendars/${calendarId}/url`,
      {
        params: baseURL ? { base_url: baseURL } : undefined,
      }
    );
    return response.data.caldav_url;
  }
}

export const calendarAPI = new CalendarAPI();
export default calendarAPI;
