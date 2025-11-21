'use client';

import React, { useEffect, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useCalendarStore } from '@/store/calendarStore';
import { EventResponse } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: EventResponse;
}

export default function CalendarGrid() {
  const {
    currentView,
    currentDate,
    setDate,
    getVisibleEvents,
    openEventModal,
    fetchEvents,
    calendars,
  } = useCalendarStore();

  // Fetch events when date range changes
  useEffect(() => {
    const start = new Date(currentDate);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const end = new Date(currentDate);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);

    fetchEvents(start, end);
  }, [currentDate, fetchEvents]);

  // Convert events to calendar format
  const events: CalendarEvent[] = useMemo(() => {
    const visibleEvents = getVisibleEvents();
    return visibleEvents.map((evt) => ({
      id: evt.event.id,
      title: evt.event.title,
      start: new Date(evt.event.start_time),
      end: new Date(evt.event.end_time),
      resource: evt,
    }));
  }, [getVisibleEvents]);

  // Event style getter
  const eventStyleGetter = useCallback(
    (event: CalendarEvent) => {
      const calendar = calendars.find((cal) => cal.id === event.resource.event.calendar_id);
      const color = event.resource.event.color || calendar?.color || '#3b82f6';

      return {
        style: {
          backgroundColor: color,
          borderRadius: '4px',
          opacity: 0.9,
          color: 'white',
          border: 'none',
          display: 'block',
        },
      };
    },
    [calendars]
  );

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      openEventModal(event.resource);
    },
    [openEventModal]
  );

  // Handle slot selection (creating new event)
  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date }) => {
      openEventModal();
    },
    [openEventModal]
  );

  // Handle navigation
  const handleNavigate = useCallback(
    (newDate: Date) => {
      setDate(newDate);
    },
    [setDate]
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full bg-white rounded-lg shadow-sm p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={currentView === 'agenda' ? 'month' : currentView}
          date={currentDate}
          onNavigate={handleNavigate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          style={{ height: 'calc(100vh - 200px)' }}
          views={['month', 'week', 'day']}
          popup
          tooltipAccessor={(event: CalendarEvent) => event.resource.event.description}
        />
      </div>
    </DndProvider>
  );
}
