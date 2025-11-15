import apiClient from './client';
import type {
  Presentation,
  Slide,
  Theme,
  CreatePresentationRequest,
  UpdatePresentationRequest,
  CreateSlideRequest,
  UpdateSlideRequest,
  ReorderSlidesRequest,
} from '@/types/presentation';

export const presentationsApi = {
  // Presentation operations
  create: async (data: CreatePresentationRequest): Promise<Presentation> => {
    const response = await apiClient.post<Presentation>('/presentations', data);
    return response.data;
  },

  list: async (): Promise<Presentation[]> => {
    const response = await apiClient.get<Presentation[]>('/presentations');
    return response.data;
  },

  get: async (id: string): Promise<Presentation> => {
    const response = await apiClient.get<Presentation>(`/presentations/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdatePresentationRequest): Promise<Presentation> => {
    const response = await apiClient.put<Presentation>(`/presentations/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/presentations/${id}`);
  },

  // Slide operations
  createSlide: async (data: CreateSlideRequest): Promise<Slide> => {
    const response = await apiClient.post<Slide>('/slides', data);
    return response.data;
  },

  getSlides: async (presentationId: string): Promise<Slide[]> => {
    const response = await apiClient.get<Slide[]>(`/presentations/${presentationId}/slides`);
    return response.data;
  },

  getSlide: async (id: string): Promise<Slide> => {
    const response = await apiClient.get<Slide>(`/slides/${id}`);
    return response.data;
  },

  updateSlide: async (id: string, data: UpdateSlideRequest): Promise<Slide> => {
    const response = await apiClient.put<Slide>(`/slides/${id}`, data);
    return response.data;
  },

  deleteSlide: async (id: string): Promise<void> => {
    await apiClient.delete(`/slides/${id}`);
  },

  reorderSlides: async (presentationId: string, data: ReorderSlidesRequest): Promise<void> => {
    await apiClient.post(`/presentations/${presentationId}/reorder`, data);
  },

  // Theme operations
  listThemes: async (): Promise<Theme[]> => {
    const response = await apiClient.get<Theme[]>('/themes');
    return response.data;
  },

  getTheme: async (id: string): Promise<Theme> => {
    const response = await apiClient.get<Theme>(`/themes/${id}`);
    return response.data;
  },
};
