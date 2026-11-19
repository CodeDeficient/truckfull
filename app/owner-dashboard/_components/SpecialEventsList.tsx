import { SpecialEvent } from '@/lib/types';
import { SpecialEventsList as SharedSpecialEventsList } from '@/components/ui/schedule/ScheduleEventLists';

interface SpecialEventsListProps {
  readonly specialEvents: readonly SpecialEvent[];
  readonly timezone: string;
  readonly handleDeleteSpecialEvent: (id: string) => void;
}

export function SpecialEventsList({
  specialEvents,
  timezone,
  handleDeleteSpecialEvent,
}: SpecialEventsListProps) {
  return (
    <SharedSpecialEventsList
      events={specialEvents}
      timezone={timezone}
      onDelete={handleDeleteSpecialEvent}
    />
  );
}
