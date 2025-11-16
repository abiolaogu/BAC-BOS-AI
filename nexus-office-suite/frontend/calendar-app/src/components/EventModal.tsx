'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { X, Calendar, Clock, MapPin, Users, Video, Bell } from 'lucide-react';
import { useCalendarStore } from '@/store/calendarStore';
import { CreateEventRequest, UpdateEventRequest } from '@/types';
import { format } from 'date-fns';

interface EventFormData {
  calendar_id: string;
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  recurrence_rule: string;
  category: string;
  color: string;
  meeting_url: string;
  attendees: string; // Comma-separated emails
  reminder_minutes: number;
  reminder_method: 'email' | 'notification' | 'popup';
}

export default function EventModal() {
  const {
    isEventModalOpen,
    closeEventModal,
    selectedEvent,
    calendars,
    createEvent,
    updateEvent,
    deleteEvent,
  } = useCalendarStore();

  const { register, handleSubmit, reset, watch } = useForm<EventFormData>({
    defaultValues: {
      is_all_day: false,
      reminder_minutes: 15,
      reminder_method: 'notification',
    },
  });

  const isAllDay = watch('is_all_day');

  useEffect(() => {
    if (selectedEvent) {
      const event = selectedEvent.event;
      reset({
        calendar_id: event.calendar_id,
        title: event.title,
        description: event.description,
        location: event.location,
        start_time: format(new Date(event.start_time), "yyyy-MM-dd'T'HH:mm"),
        end_time: format(new Date(event.end_time), "yyyy-MM-dd'T'HH:mm"),
        is_all_day: event.is_all_day,
        recurrence_rule: event.recurrence_rule || '',
        category: event.category,
        color: event.color,
        meeting_url: event.meeting_url || '',
        attendees: selectedEvent.attendees
          .filter((a) => !a.is_organizer)
          .map((a) => a.email)
          .join(', '),
        reminder_minutes: selectedEvent.reminders[0]?.minutes || 15,
        reminder_method: selectedEvent.reminders[0]?.method || 'notification',
      });
    } else {
      reset({
        calendar_id: calendars.find((c) => c.is_default)?.id || calendars[0]?.id,
        is_all_day: false,
        reminder_minutes: 15,
        reminder_method: 'notification',
      });
    }
  }, [selectedEvent, calendars, reset]);

  const onSubmit = async (data: EventFormData) => {
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const attendeesArray = data.attendees
        ? data.attendees.split(',').map((email) => ({
            email: email.trim(),
            name: email.trim().split('@')[0],
          }))
        : [];

      const reminders = data.reminder_minutes
        ? [
            {
              minutes: data.reminder_minutes,
              method: data.reminder_method,
            },
          ]
        : [];

      if (selectedEvent) {
        const updateData: UpdateEventRequest = {
          title: data.title,
          description: data.description,
          location: data.location,
          start_time: new Date(data.start_time).toISOString(),
          end_time: new Date(data.end_time).toISOString(),
          is_all_day: data.is_all_day,
          time_zone: timeZone,
          recurrence_rule: data.recurrence_rule || undefined,
          category: data.category,
          color: data.color,
          meeting_url: data.meeting_url || undefined,
          attendees: attendeesArray,
        };
        await updateEvent(selectedEvent.event.id, updateData);
      } else {
        const createData: CreateEventRequest = {
          calendar_id: data.calendar_id,
          title: data.title,
          description: data.description,
          location: data.location,
          start_time: new Date(data.start_time).toISOString(),
          end_time: new Date(data.end_time).toISOString(),
          is_all_day: data.is_all_day,
          time_zone: timeZone,
          recurrence_rule: data.recurrence_rule || undefined,
          category: data.category,
          color: data.color,
          meeting_url: data.meeting_url || undefined,
          attendees: attendeesArray,
          reminders,
        };
        await createEvent(createData);
      }
      closeEventModal();
    } catch (error) {
      console.error('Failed to save event:', error);
    }
  };

  const handleDelete = async () => {
    if (selectedEvent && confirm('Are you sure you want to delete this event?')) {
      await deleteEvent(selectedEvent.event.id);
    }
  };

  if (!isEventModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">
            {selectedEvent ? 'Edit Event' : 'Create Event'}
          </h2>
          <button
            onClick={closeEventModal}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Calendar Selection */}
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              {...register('calendar_id', { required: true })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {calendars.map((cal) => (
                <option key={cal.id} value={cal.id}>
                  {cal.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <input
            {...register('title', { required: true })}
            placeholder="Event title"
            className="w-full px-3 py-2 text-lg border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <div className="flex-1 grid grid-cols-2 gap-3">
                <input
                  {...register('start_time', { required: true })}
                  type={isAllDay ? 'date' : 'datetime-local'}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  {...register('end_time', { required: true })}
                  type={isAllDay ? 'date' : 'datetime-local'}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 ml-8">
              <input {...register('is_all_day')} type="checkbox" className="rounded" />
              <span className="text-sm text-gray-600">All-day event</span>
            </label>
          </div>

          {/* Location */}
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-500" />
            <input
              {...register('location')}
              placeholder="Add location"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Meeting URL */}
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-gray-500" />
            <input
              {...register('meeting_url')}
              placeholder="Add meeting URL (e.g., NEXUS Meet link)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <textarea
            {...register('description')}
            placeholder="Add description"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />

          {/* Attendees */}
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-gray-500 mt-2" />
            <textarea
              {...register('attendees')}
              placeholder="Add guests (comma-separated emails)"
              rows={2}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Reminder */}
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-500" />
            <div className="flex-1 grid grid-cols-2 gap-3">
              <input
                {...register('reminder_minutes')}
                type="number"
                placeholder="Minutes before"
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                {...register('reminder_method')}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="notification">Notification</option>
                <option value="email">Email</option>
                <option value="popup">Popup</option>
              </select>
            </div>
          </div>

          {/* Recurrence */}
          <input
            {...register('recurrence_rule')}
            placeholder="Recurrence rule (RRULE format, e.g., FREQ=WEEKLY;BYDAY=MO)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />

          {/* Color & Category */}
          <div className="grid grid-cols-2 gap-3">
            <input
              {...register('color')}
              type="color"
              placeholder="Event color"
              className="h-10 w-full border border-gray-300 rounded-md"
            />
            <input
              {...register('category')}
              placeholder="Category"
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            {selectedEvent && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-md transition"
              >
                Delete Event
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                type="button"
                onClick={closeEventModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
              >
                {selectedEvent ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
