'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useCalendarStore } from '@/store/calendarStore';
import { CreateCalendarRequest } from '@/types';

interface CalendarFormData {
  name: string;
  description: string;
  color: string;
  time_zone: string;
  is_default: boolean;
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export default function CalendarModal() {
  const { isCalendarModalOpen, closeCalendarModal, createCalendar } = useCalendarStore();

  const { register, handleSubmit, reset, watch, setValue } = useForm<CalendarFormData>({
    defaultValues: {
      color: PRESET_COLORS[3],
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      is_default: false,
    },
  });

  const selectedColor = watch('color');

  const onSubmit = async (data: CalendarFormData) => {
    try {
      const createData: CreateCalendarRequest = {
        name: data.name,
        description: data.description,
        color: data.color,
        time_zone: data.time_zone,
        is_default: data.is_default,
      };
      await createCalendar(createData);
      reset();
    } catch (error) {
      console.error('Failed to create calendar:', error);
    }
  };

  if (!isCalendarModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-semibold">Create Calendar</h2>
          <button
            onClick={closeCalendarModal}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Calendar Name
            </label>
            <input
              {...register('name', { required: true })}
              placeholder="My Calendar"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              {...register('description')}
              placeholder="Optional description"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
            <div className="flex gap-2 mb-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue('color', color)}
                  className={`w-8 h-8 rounded-full border-2 transition ${
                    selectedColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              {...register('color', { required: true })}
              type="color"
              className="h-10 w-full border border-gray-300 rounded-md"
            />
          </div>

          {/* Time Zone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Zone
            </label>
            <select
              {...register('time_zone', { required: true })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
              <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                Local Time Zone
              </option>
            </select>
          </div>

          {/* Default Calendar */}
          <label className="flex items-center gap-2">
            <input {...register('is_default')} type="checkbox" className="rounded" />
            <span className="text-sm text-gray-700">Set as default calendar</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => {
                closeCalendarModal();
                reset();
              }}
              className="flex-1 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Create Calendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
