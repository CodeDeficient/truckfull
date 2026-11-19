import { BaseScheduleForm } from '@/components/ui/forms/BaseScheduleForm';
import { Plus } from 'lucide-react';
import { RecurrencePattern } from '@/lib/recurrence/recurrenceTypes';
import { logError } from '@/lib/logging';

// Type guard function for form data
function isFormDataLike(d: unknown): d is {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  recurrencePattern?: unknown;
} {
  return typeof d === 'object' && d !== null;
}

interface AddRecurringScheduleFormProps {
  readonly newRecurringSchedule: {
    readonly title: string;
    readonly description: string;
    readonly baseStartTime: string;
    readonly baseEndTime: string;
    readonly baseLocation: string;
    readonly recurrencePattern: RecurrencePattern | undefined;
    readonly exceptions: unknown[];
  };
  readonly handleAddRecurringSchedule: () => void;
  readonly setNewRecurringSchedule: React.Dispatch<
    React.SetStateAction<{
      readonly title: string;
      readonly description: string;
      readonly baseStartTime: string;
      readonly baseEndTime: string;
      readonly baseLocation: string;
      readonly recurrencePattern: RecurrencePattern | undefined;
      readonly exceptions: unknown[];
    }>
  >;
}

export function AddRecurringScheduleForm({
  newRecurringSchedule,
  handleAddRecurringSchedule,
  setNewRecurringSchedule,
}: AddRecurringScheduleFormProps) {
  // Map the formData to match the base form structure
  const mappedFormData = {
    ...newRecurringSchedule,
    title: newRecurringSchedule.title,
    description: newRecurringSchedule.description,
    startTime: newRecurringSchedule.baseStartTime,
    endTime: newRecurringSchedule.baseEndTime,
    location: newRecurringSchedule.baseLocation,
    recurrencePattern: newRecurringSchedule.recurrencePattern,
  };

  const handleFormChange = (data: unknown) => {
    if (!isFormDataLike(data)) {
      logError('Invalid form data received:', data);
      return;
    }

    setNewRecurringSchedule({
      ...newRecurringSchedule,
      title: data.title ?? '',
      description: data.description ?? '',
      baseStartTime: data.startTime ?? '',
      baseEndTime: data.endTime ?? '',
      baseLocation: data.location ?? '',
      recurrencePattern: data.recurrencePattern as RecurrencePattern | undefined,
    });
  };

  return (
    <BaseScheduleForm
      formData={mappedFormData}
      onFormChange={handleFormChange}
      onSubmit={handleAddRecurringSchedule}
      submitLabel="Add Schedule"
      title="Add Recurring Schedule"
      description="Set up your recurring operating hours with advanced scheduling options"
      icon={<Plus className="h-4 w-4" />}
      showRecurringToggle={false}
      showDateField={false}
      showRecurrencePattern={true}
      showTimeFields={true}
    />
  );
}
