'use client';

import { useEffect, useState } from 'react';
import { TruckEventsService } from '@/lib/services/truckEventsService';
import { formatToLocalTime } from '@/lib/utils/timezoneUtils';
import { logError } from '@/lib/logging';

interface TruckEventsProps {
  truckId: string;
  userTimezone?: string;
}

interface EventDisplay {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  localTime?: string;
}

const TruckEventsComponent = ({ truckId, userTimezone }: TruckEventsProps) => {
  const [events, setEvents] = useState<EventDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);

        const eventsData = await TruckEventsService.getEventsByTruckId(truckId, {
          timezone: userTimezone,
          includePastEvents: false,
        });

        // Transform events for display
        const formattedEvents = eventsData.map((event) => ({
          id: event.id,
          title: event.title ?? 'Event',
          description: event.description ?? '',
          date: event.date ?? new Date().toISOString().split('T')[0],
          time: event.time ?? '00:00',
          location: event.location?.address ?? 'TBD',
          localTime:
            event.local_start_time && event.date && event.time
              ? formatToLocalTime(event.date, event.time, userTimezone)
              : undefined,
        }));

        setEvents(formattedEvents);
      } catch (error_) {
        logError('Error fetching events:', error_);
        setError('Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (truckId) {
      void fetchEvents();
    }
  }, [truckId, userTimezone]);

  if (loading) {
    return (
      <div className="p-4">
        <p>Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
      {events.length === 0 ? (
        <p>No upcoming events found.</p>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div
              key={event.id}
              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
            >
              <h3 className="font-semibold text-lg">{event.title}</h3>
              <p className="text-gray-600 mt-1">{event.description}</p>
              <div className="mt-2 text-sm text-gray-500">
                <p>Date: {event.date}</p>
                <p>
                  Time: {event.localTime ?? `${event.time}`}
                  {event.localTime && ` (${event.time} UTC)`}
                </p>
                <p>Location: {event.location}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TruckEventsComponent;
