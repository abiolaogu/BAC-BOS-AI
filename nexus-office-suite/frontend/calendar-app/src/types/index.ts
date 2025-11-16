export interface Calendar {
  id: string;
  user_id: string;
  name: string;
  description: string;
  color: string;
  time_zone: string;
  is_default: boolean;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  calendar_id: string;
  user_id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  time_zone: string;
  recurrence_rule?: string;
  recurrence_id?: string;
  status: EventStatus;
  busy_status: BusyStatus;
  category: string;
  color: string;
  meeting_url?: string;
  visibility: EventVisibility;
  created_at: string;
  updated_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id?: string;
  email: string;
  name: string;
  response_status: ResponseStatus;
  is_organizer: boolean;
  is_optional: boolean;
  notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  id: string;
  event_id: string;
  user_id: string;
  minutes: number;
  method: ReminderMethod;
  sent: boolean;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EventResponse {
  event: Event;
  attendees: EventAttendee[];
  reminders: Reminder[];
}

export interface CreateCalendarRequest {
  name: string;
  description?: string;
  color: string;
  time_zone: string;
  is_default?: boolean;
}

export interface UpdateCalendarRequest {
  name?: string;
  description?: string;
  color?: string;
  time_zone?: string;
  is_visible?: boolean;
}

export interface CreateEventRequest {
  calendar_id: string;
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  time_zone: string;
  recurrence_rule?: string;
  status?: EventStatus;
  busy_status?: BusyStatus;
  category?: string;
  color?: string;
  meeting_url?: string;
  visibility?: EventVisibility;
  attendees?: CreateAttendeeInput[];
  reminders?: CreateReminderInput[];
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  is_all_day?: boolean;
  time_zone?: string;
  recurrence_rule?: string;
  status?: EventStatus;
  busy_status?: BusyStatus;
  category?: string;
  color?: string;
  meeting_url?: string;
  visibility?: EventVisibility;
  attendees?: CreateAttendeeInput[];
}

export interface CreateAttendeeInput {
  user_id?: string;
  email: string;
  name: string;
  is_optional?: boolean;
}

export interface CreateReminderInput {
  minutes: number;
  method: ReminderMethod;
}

export interface ShareCalendarRequest {
  shared_with: string;
  permission: Permission;
}

export interface RSVPRequest {
  response_status: ResponseStatus;
}

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type BusyStatus = 'busy' | 'free' | 'tentative' | 'out-of-office';
export type ResponseStatus = 'accepted' | 'declined' | 'tentative' | 'needs-action';
export type ReminderMethod = 'email' | 'notification' | 'popup';
export type Permission = 'read' | 'write' | 'admin';
export type EventVisibility = 'public' | 'private';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarViewOptions {
  view: CalendarView;
  date: Date;
}

export interface DraggedEvent {
  event: EventResponse;
  start: Date;
  end: Date;
}
