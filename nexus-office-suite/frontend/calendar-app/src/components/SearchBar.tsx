'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useCalendarStore } from '@/store/calendarStore';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { searchEvents, openEventModal } = useCalendarStore();

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      setIsSearching(true);
      const events = await searchEvents(value);
      setResults(events);
      setIsSearching(false);
    } else {
      setResults([]);
    }
  };

  const handleSelectEvent = (event: any) => {
    openEventModal(event);
    setQuery('');
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search events..."
          className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          {results.map((event) => (
            <button
              key={event.event.id}
              onClick={() => handleSelectEvent(event)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{event.event.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(event.event.start_time).toLocaleDateString()} at{' '}
                {new Date(event.event.start_time).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {event.event.location && (
                <div className="text-sm text-gray-400">{event.event.location}</div>
              )}
            </button>
          ))}
        </div>
      )}

      {isSearching && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          Searching...
        </div>
      )}
    </div>
  );
}
