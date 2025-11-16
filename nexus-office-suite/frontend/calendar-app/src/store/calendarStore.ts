import { create } from 'zustand';
import {
  Calendar,
  EventResponse,
  CalendarView,
  CreateCalendarRequest,
  UpdateCalendarRequest,
  CreateEventRequest,
  UpdateEventRequest,
  RSVPRequest,
} from '@/types';
import calendarAPI from '@/lib/api';
import { format } from 'date-fns';

interface CalendarStore {
  // State
  calendars: Calendar[];
  events: EventResponse[];
  selectedCalendarIds: string[];
  currentView: CalendarView;
  currentDate: Date;
  selectedEvent: EventResponse | null;
  isEventModalOpen: boolean;
  isCalendarModalOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Calendar actions
  fetchCalendars: () => Promise<void>;
  createCalendar: (data: CreateCalendarRequest) => Promise<void>;
  updateCalendar: (id: string, data: UpdateCalendarRequest) => Promise<void>;
  deleteCalendar: (id: string) => Promise<void>;
  toggleCalendarVisibility: (id: string) => void;
  selectCalendars: (ids: string[]) => void;

  // Event actions
  fetchEvents: (startTime: Date, endTime: Date) => Promise<void>;
  createEvent: (data: CreateEventRequest) => Promise<void>;
  updateEvent: (id: string, data: UpdateEventRequest) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  respondToEvent: (id: string, data: RSVPRequest, email?: string) => Promise<void>;
  searchEvents: (query: string) => Promise<EventResponse[]>;

  // View actions
  setView: (view: CalendarView) => void;
  setDate: (date: Date) => void;
  goToToday: () => void;
  goToPrevious: () => void;
  goToNext: () => void;

  // Modal actions
  openEventModal: (event?: EventResponse) => void;
  closeEventModal: () => void;
  openCalendarModal: () => void;
  closeCalendarModal: () => void;

  // Utility
  getVisibleEvents: () => EventResponse[];
  clearError: () => void;
}

export const useCalendarStore = create<CalendarStore>((set, get) => ({
  // Initial state
  calendars: [],
  events: [],
  selectedCalendarIds: [],
  currentView: 'month',
  currentDate: new Date(),
  selectedEvent: null,
  isEventModalOpen: false,
  isCalendarModalOpen: false,
  isLoading: false,
  error: null,

  // Calendar actions
  fetchCalendars: async () => {
    set({ isLoading: true, error: null });
    try {
      const calendars = await calendarAPI.getCalendars();
      const selectedCalendarIds = calendars
        .filter((cal) => cal.is_visible)
        .map((cal) => cal.id);
      set({ calendars, selectedCalendarIds, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch calendars', isLoading: false });
    }
  },

  createCalendar: async (data: CreateCalendarRequest) => {
    set({ isLoading: true, error: null });
    try {
      const calendar = await calendarAPI.createCalendar(data);
      set((state) => ({
        calendars: [...state.calendars, calendar],
        selectedCalendarIds: [...state.selectedCalendarIds, calendar.id],
        isLoading: false,
        isCalendarModalOpen: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to create calendar', isLoading: false });
      throw error;
    }
  },

  updateCalendar: async (id: string, data: UpdateCalendarRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCalendar = await calendarAPI.updateCalendar(id, data);
      set((state) => ({
        calendars: state.calendars.map((cal) => (cal.id === id ? updatedCalendar : cal)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update calendar', isLoading: false });
      throw error;
    }
  },

  deleteCalendar: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await calendarAPI.deleteCalendar(id);
      set((state) => ({
        calendars: state.calendars.filter((cal) => cal.id !== id),
        selectedCalendarIds: state.selectedCalendarIds.filter((calId) => calId !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete calendar', isLoading: false });
      throw error;
    }
  },

  toggleCalendarVisibility: (id: string) => {
    set((state) => {
      const isSelected = state.selectedCalendarIds.includes(id);
      return {
        selectedCalendarIds: isSelected
          ? state.selectedCalendarIds.filter((calId) => calId !== id)
          : [...state.selectedCalendarIds, id],
      };
    });
  },

  selectCalendars: (ids: string[]) => {
    set({ selectedCalendarIds: ids });
  },

  // Event actions
  fetchEvents: async (startTime: Date, endTime: Date) => {
    set({ isLoading: true, error: null });
    try {
      const events = await calendarAPI.getEvents(
        startTime.toISOString(),
        endTime.toISOString()
      );
      set({ events, isLoading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch events', isLoading: false });
    }
  },

  createEvent: async (data: CreateEventRequest) => {
    set({ isLoading: true, error: null });
    try {
      const event = await calendarAPI.createEvent(data);
      set((state) => ({
        events: [...state.events, event],
        isLoading: false,
        isEventModalOpen: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to create event', isLoading: false });
      throw error;
    }
  },

  updateEvent: async (id: string, data: UpdateEventRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedEvent = await calendarAPI.updateEvent(id, data);
      set((state) => ({
        events: state.events.map((evt) => (evt.event.id === id ? updatedEvent : evt)),
        isLoading: false,
        isEventModalOpen: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to update event', isLoading: false });
      throw error;
    }
  },

  deleteEvent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await calendarAPI.deleteEvent(id);
      set((state) => ({
        events: state.events.filter((evt) => evt.event.id !== id),
        isLoading: false,
        isEventModalOpen: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete event', isLoading: false });
      throw error;
    }
  },

  respondToEvent: async (id: string, data: RSVPRequest, email?: string) => {
    set({ isLoading: true, error: null });
    try {
      await calendarAPI.respondToEvent(id, data, email);
      // Refresh the event
      const updatedEvent = await calendarAPI.getEvent(id);
      set((state) => ({
        events: state.events.map((evt) => (evt.event.id === id ? updatedEvent : evt)),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to respond to event', isLoading: false });
      throw error;
    }
  },

  searchEvents: async (query: string) => {
    try {
      const events = await calendarAPI.searchEvents(query);
      return events;
    } catch (error: any) {
      set({ error: error.message || 'Failed to search events' });
      return [];
    }
  },

  // View actions
  setView: (view: CalendarView) => {
    set({ currentView: view });
  },

  setDate: (date: Date) => {
    set({ currentDate: date });
  },

  goToToday: () => {
    set({ currentDate: new Date() });
  },

  goToPrevious: () => {
    const { currentView, currentDate } = get();
    let newDate = new Date(currentDate);

    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
    }

    set({ currentDate: newDate });
  },

  goToNext: () => {
    const { currentView, currentDate } = get();
    let newDate = new Date(currentDate);

    switch (currentView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
    }

    set({ currentDate: newDate });
  },

  // Modal actions
  openEventModal: (event?: EventResponse) => {
    set({ selectedEvent: event || null, isEventModalOpen: true });
  },

  closeEventModal: () => {
    set({ selectedEvent: null, isEventModalOpen: false });
  },

  openCalendarModal: () => {
    set({ isCalendarModalOpen: true });
  },

  closeCalendarModal: () => {
    set({ isCalendarModalOpen: false });
  },

  // Utility
  getVisibleEvents: () => {
    const { events, selectedCalendarIds } = get();
    return events.filter((evt) => selectedCalendarIds.includes(evt.event.calendar_id));
  },

  clearError: () => {
    set({ error: null });
  },
}));

export default useCalendarStore;
