import { RecurringSchedule } from '@/lib/types';
import { RecurringSchedulesList as SharedRecurringSchedulesList } from '@/components/ui/schedule/ScheduleEventLists';

interface RecurringSchedulesListProps {
  readonly recurringSchedules: readonly RecurringSchedule[];
  readonly timezone: string;
  readonly handleDeleteRecurringSchedule: (id: string) => void;
  readonly handleToggleScheduleActive: (id: string) => void;
}

export function RecurringSchedulesList({
  recurringSchedules,
  timezone,
  handleDeleteRecurringSchedule,
  handleToggleScheduleActive,
}: RecurringSchedulesListProps) {
  return (
    <SharedRecurringSchedulesList
      schedules={recurringSchedules}
      timezone={timezone}
      onDelete={handleDeleteRecurringSchedule}
      onToggleActive={handleToggleScheduleActive}
    />
  );
}
