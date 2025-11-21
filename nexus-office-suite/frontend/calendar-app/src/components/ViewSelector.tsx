'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useCalendarStore } from '@/store/calendarStore';
import { CalendarView } from '@/types';
import { format } from 'date-fns';

export default function ViewSelector() {
  const { currentView, currentDate, setView, goToPrevious, goToNext, goToToday } =
    useCalendarStore();

  const views: { value: CalendarView; label: string }[] = [
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
    { value: 'day', label: 'Day' },
    { value: 'agenda', label: 'Agenda' },
  ];

  const getDateDisplay = () => {
    switch (currentView) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        return format(currentDate, 'MMMM yyyy');
      case 'day':
        return format(currentDate, 'MMMM d, yyyy');
      default:
        return format(currentDate, 'MMMM yyyy');
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Date Navigation */}
        <div className="flex items-center gap-4">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
          >
            Today
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevious}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xl font-semibold text-gray-800">{getDateDisplay()}</h2>
        </div>

        {/* Right: View Selector */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          {views.map((view) => (
            <button
              key={view.value}
              onClick={() => setView(view.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                currentView === view.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
