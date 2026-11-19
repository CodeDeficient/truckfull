'use client';

/**
 * Event Calendar Component
 * WBS: 6.2.6
 *
 * Visual calendar display of accepted events.
 * Uses a simple grid-based calendar for now.
 */

import { CreateEventModal } from './CreateEventModal';
import { EventDetailModal, type Event } from './EventDetailModal';
import type { EventData } from './CreateEventModal';
import { Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { logError } from '@/lib/logging';

interface CalendarEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string | null;
  end_date: string | null;
  location_data: {
    lat?: number;
    lng?: number;
    address?: string;
    city?: string;
    state?: string;
  };
  vendor_fee: number | null;
  max_vendors: number | null;
  organizer: {
    business_name: string;
    rating_avg?: number | null;
    rating_count?: number;
    verification_status?: string;
    user_id?: string;
  };
  source?: 'saved';
}

interface EventCalendarProps {
  readonly truckId?: string;
  readonly userId?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function EventCalendar({ truckId, userId }: EventCalendarProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventData | null>(null);

  const fetchAcceptedEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ status: 'accepted', include_owned: 'true' });
      if (truckId) params.set('truck_id', truckId);

      const url = new URL('/api/events/applications', globalThis.location.origin);
      url.search = params.toString();
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error('Failed to fetch events');

      const data = await response.json();

      const acceptedEvents = (data.applications ?? []).map(
        (app: { event: CalendarEvent }) => app.event,
      );
      const ownedEvents = data.owned_events ?? [];

      const allEvents = [...acceptedEvents, ...ownedEvents].filter(
        (event, index, self) => index === self.findIndex((t) => t.id === event.id),
      );

      setEvents(allEvents);
    } catch (error) {
      logError('Failed to fetch calendar events', error);
    } finally {
      setLoading(false);
    }
  }, [truckId]);

  const fetchSavedLeads = useCallback(async () => {
    if (!truckId) return;
    try {
      const response = await fetch(`/api/events/saved-leads?truck_id=${truckId}`);
      if (!response.ok) return;
      const data = await response.json();
      const savedLeadEvents: CalendarEvent[] = (data.leads ?? [])
        .filter(
          (lead: {
            external_events: {
              id: string;
              title: string;
              event_start_date: string | null;
              event_end_date: string | null;
              city: string | null;
              state: string | null;
            } | null;
          }) => lead.external_events?.id,
        )
        .map(
          (lead: {
            id: string;
            external_events: {
              id: string;
              title: string;
              event_start_date: string | null;
              event_end_date: string | null;
              city: string | null;
              state: string | null;
            } | null;
          }) => ({
            id: lead.external_events!.id,
            name: lead.external_events!.title,
            start_date: lead.external_events!.event_start_date,
            end_date: lead.external_events!.event_end_date,
            location_data: {
              city: lead.external_events!.city ?? '',
              state: lead.external_events!.state ?? '',
            },
            source: 'saved' as const,
          }),
        );

      setEvents((prev) => {
        const existing = prev.filter((e) => e.source !== 'saved');
        return [...existing, ...savedLeadEvents];
      });
    } catch (error) {
      logError('Failed to fetch saved leads', error);
    }
  }, [truckId]);

  useEffect(() => {
    fetchAcceptedEvents();
  }, [fetchAcceptedEvents]);

  useEffect(() => {
    fetchSavedLeads();
  }, [fetchSavedLeads]);

  // Helper functions for calendar navigation
  const prevMonth = (): void => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = (): void => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = (): void => {
    setCurrentDate(new Date());
  };

  const handleEditEvent = (event: CalendarEvent): void => {
    const eventData: EventData = {
      id: event.id,
      name: event.name,
      description: event.description || '',
      start_date: event.start_date ?? '',
      end_date: event.end_date ?? '',
      location_data: {
        address: event.location_data.address,
        city: event.location_data.city,
        state: event.location_data.state,
      },
      vendor_fee: event.vendor_fee,
      max_vendors: event.max_vendors,
    };
    setEventToEdit(eventData);
    setSelectedEvent(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateModalClose = (): void => {
    setIsCreateModalOpen(false);
    setEventToEdit(null);
  };

  // Helper functions for calendar grid
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Add days from previous month to fill the first week
    const startDay = firstDayOfMonth.getDay();
    for (let i = startDay; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }

    // Add days of the current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to fill the last week
    const endDay = lastDayOfMonth.getDay();
    for (let i = 1; i < 7 - endDay; i++) {
      days.push(new Date(year, month + 1, i));
    }
    return days;
  };

  const isSameDay = (d1: Date, d2: Date): boolean => {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter((event) => {
      if (!event.start_date || !event.end_date) return false;
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      if (!Number.isFinite(eventStart.getTime()) || !Number.isFinite(eventEnd.getTime())) return false;

      const checkDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const startDay = new Date(
        eventStart.getFullYear(),
        eventStart.getMonth(),
        eventStart.getDate(),
      );
      const endDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

      return checkDay >= startDay && checkDay <= endDay;
    });
  };

  const days = getDaysInMonth(currentDate);
  const today = new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <h3 className="text-xl font-bold ml-2 text-primary">
            {MONTH_NAMES[currentDate.getMonth()]}{' '}
            <span className="text-muted-foreground font-medium">{currentDate.getFullYear()}</span>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToToday}
            className="text-primary hover:bg-primary/10"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card className="overflow-hidden border-border/50 shadow-sm">
        <CardContent className="p-0">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b bg-primary/5">
            {DAY_NAMES.map((day) => (
              <div key={day} className="text-center py-3 text-sm font-semibold text-primary/80">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-l border-t border-border/50">
            {days.map((day) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, today);
              const dayEvents = getEventsForDay(day);
              const dayKey = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;

              return (
                <div
                  key={dayKey}
                  className={`min-h-[100px] p-1.5 transition-colors
                    ${isCurrentMonth ? 'bg-neutral-900 hover:bg-neutral-800' : 'bg-neutral-950/50 text-muted-foreground/30'} 
                    ${isToday ? 'bg-primary/20' : ''}
                    border-b border-r border-border/50
                  `}
                >
                  <div className="flex justify-between items-start">
                    <div
                      className={`text-sm rounded-full w-7 h-7 flex items-center justify-center
                      ${isToday ? 'bg-primary text-primary-foreground font-bold' : 'font-medium'}
                      ${isCurrentMonth ? '' : 'invisible'}
                    `}
                    >
                      {day.getDate()}
                    </div>
                  </div>

                  <div className="space-y-1 mt-2">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className={`text-xs font-medium border rounded-sm px-1.5 py-0.5 truncate cursor-pointer transition-all
                          ${
                            event.source === 'saved'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 border-dashed hover:bg-amber-100'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200'
                          }`}
                        onClick={() => setSelectedEvent(event)}
                        title={event.name}
                      >
                        {event.name}
                      </button>
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1 font-medium">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal
          event={
            {
              ...selectedEvent,
              description: selectedEvent.description || '',
              location_data: {
                ...selectedEvent.location_data,
                lat: selectedEvent.location_data.lat ?? 0,
                lng: selectedEvent.location_data.lng ?? 0,
              },
            } as Event
          }
          truckId={truckId}
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          currentUserId={userId}
          onEdit={() => handleEditEvent(selectedEvent)}
        />
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        open={isCreateModalOpen}
        onClose={handleCreateModalClose}
        onEventCreated={() => {
          fetchAcceptedEvents();
          handleCreateModalClose();
        }}
        eventToEdit={eventToEdit}
      />
    </div>
  );
}
