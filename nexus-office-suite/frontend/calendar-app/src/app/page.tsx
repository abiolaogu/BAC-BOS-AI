'use client';

import { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import ViewSelector from '@/components/ViewSelector';
import CalendarGrid from '@/components/CalendarGrid';
import EventModal from '@/components/EventModal';
import CalendarModal from '@/components/CalendarModal';
import SearchBar from '@/components/SearchBar';
import { useCalendarStore } from '@/store/calendarStore';
import { Calendar } from 'lucide-react';

export default function CalendarPage() {
  const { fetchCalendars, error, clearError } = useCalendarStore();

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">NEXUS Calendar</h1>
          </div>
          <SearchBar />
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <ViewSelector />
          <div className="flex-1 overflow-auto p-4">
            <CalendarGrid />
          </div>
        </div>
      </div>

      {/* Modals */}
      <EventModal />
      <CalendarModal />
    </div>
  );
}
