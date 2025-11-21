'use client';

import React from 'react';
import { Plus, Calendar as CalendarIcon, Check } from 'lucide-react';
import { useCalendarStore } from '@/store/calendarStore';

export default function Sidebar() {
  const {
    calendars,
    selectedCalendarIds,
    toggleCalendarVisibility,
    openCalendarModal,
    openEventModal,
  } = useCalendarStore();

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col h-full">
      {/* Create Event Button */}
      <button
        onClick={() => openEventModal()}
        className="w-full mb-6 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 font-medium"
      >
        <Plus className="w-5 h-5" />
        Create Event
      </button>

      {/* Mini Calendar */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-600 mb-2">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h3>
        {/* A simple mini calendar could be added here */}
      </div>

      {/* My Calendars */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-600">My Calendars</h3>
          <button
            onClick={openCalendarModal}
            className="p-1 hover:bg-gray-100 rounded transition"
            title="Add calendar"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        <div className="space-y-1">
          {calendars.map((calendar) => (
            <button
              key={calendar.id}
              onClick={() => toggleCalendarVisibility(calendar.id)}
              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-50 transition group"
            >
              <div
                className="w-4 h-4 rounded flex items-center justify-center border-2 transition"
                style={{
                  borderColor: calendar.color,
                  backgroundColor: selectedCalendarIds.includes(calendar.id)
                    ? calendar.color
                    : 'transparent',
                }}
              >
                {selectedCalendarIds.includes(calendar.id) && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>
              <span className="flex-1 text-left text-sm text-gray-700">
                {calendar.name}
              </span>
            </button>
          ))}
        </div>

        {calendars.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No calendars yet</p>
            <button
              onClick={openCalendarModal}
              className="text-blue-600 hover:underline mt-2"
            >
              Create your first calendar
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 text-xs text-gray-500">
        NEXUS Calendar
      </div>
    </div>
  );
}
