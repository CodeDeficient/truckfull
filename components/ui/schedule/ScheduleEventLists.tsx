import { Recycle, Star } from 'lucide-react';
import { ScheduleEventCard } from './EventCard';
import { adaptRecurringSchedule, adaptSpecialEvent } from './TypeAdapters';
import React from 'react';

interface SchedulesListProps<T = unknown> {
  readonly schedules: readonly T[];
  readonly timezone: string;
  readonly onDelete?: (id: string) => void;
  readonly onToggleActive?: (id: string) => void;
  readonly emptyMessage?: string;
}

export function RecurringSchedulesList<T extends { id: string }>({
  schedules,
  timezone,
  onDelete,
  onToggleActive,
  emptyMessage = 'No recurring schedules set up yet',
}: SchedulesListProps<T>) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Recycle className="h-5 w-5 text-primary" />
        Recurring Schedules
      </h3>

      {schedules.length === 0 ? (
        <div className="bg-card rounded-lg py-8 text-center text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div
          role="list"
          aria-label="Recurring schedules list"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {schedules.map((schedule) => {
            const adaptedSchedule = adaptRecurringSchedule(schedule);
            return (
              <ScheduleEventCard
                key={adaptedSchedule.id}
                id={adaptedSchedule.id}
                title={adaptedSchedule.name}
                description={adaptedSchedule.description}
                startTime={adaptedSchedule.start_time}
                endTime={adaptedSchedule.end_time}
                location={adaptedSchedule.location_address}
                isActive={adaptedSchedule.is_active}
                recurrencePattern={adaptedSchedule.recurrence_pattern}
                timezone={timezone}
                onDelete={onDelete}
                onToggleActive={onToggleActive}
                cardType="schedule"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface EventsListProps<T = unknown> {
  readonly events: readonly T[];
  readonly timezone: string;
  readonly onDelete?: (id: string) => void;
  readonly emptyMessage?: string;
}

export function SpecialEventsList<T extends { id: string }>({
  events,
  timezone,
  onDelete,
  emptyMessage = 'No special events scheduled yet',
}: EventsListProps<T>) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Star className="h-5 w-5 text-primary" />
        Special Events
      </h3>

      {events.length === 0 ? (
        <div className="bg-card rounded-lg py-8 text-center text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div
          role="list"
          aria-label="Special events list"
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {events.map((event) => {
            const adaptedEvent = adaptSpecialEvent(event);
            return (
              <ScheduleEventCard
                key={adaptedEvent.id}
                id={adaptedEvent.id}
                title={adaptedEvent.title}
                description={adaptedEvent.description}
                startTime={adaptedEvent.start_time}
                endTime={adaptedEvent.end_time}
                date={adaptedEvent.event_date}
                location={adaptedEvent.location_address}
                timezone={timezone}
                onDelete={onDelete}
                cardType="event"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
