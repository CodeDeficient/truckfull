import { BaseScheduleForm } from './BaseScheduleForm';
import { RecurrencePattern } from '@/lib/recurrence/recurrenceTypes';
import { RecurringScheduleFormData } from './FormDataTypes';
import { logError } from '@/lib/logging';

// Type guard for the unknown data
const isFormDataLike = (
  d: unknown,
): d is {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  recurrencePattern?: RecurrencePattern;
} => {
  return typeof d === 'object' && d !== null;
};

interface RecurringScheduleFormProps {
  readonly formData: RecurringScheduleFormData;
  readonly onFormChange: (data: RecurringScheduleFormData) => void;
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly disabled?: boolean;
}

export function RecurringScheduleForm({
  formData,
  onFormChange,
  onSubmit,
  submitLabel = 'Add Schedule',
  disabled = false,
}: RecurringScheduleFormProps) {
  // Map the formData to match the base form structure
  const mappedFormData = {
    ...formData,
    isRecurring: true,
    title: formData.title,
    description: formData.description,
    startTime: formData.baseStartTime,
    endTime: formData.baseEndTime,
    location: formData.baseLocation,
    recurrencePattern: formData.recurrencePattern || {
      frequency: 'weekly',
      interval: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      isActive: true,
    }, // Provide default recurrence pattern if undefined
  };

  const handleFormChange = (data: unknown) => {
    if (!isFormDataLike(data)) {
      logError('Invalid form data received:', data);
      return;
    }

    const updatedData: RecurringScheduleFormData = {
      ...formData,
      title: data.title ?? '',
      description: data.description ?? '',
      baseStartTime: data.startTime ?? '',
      baseEndTime: data.endTime ?? '',
      baseLocation: data.location ?? '',
      recurrencePattern: data.recurrencePattern ?? {
        frequency: 'weekly',
        interval: 1,
        timezone: 'UTC',
        isActive: true,
      },
      exceptions: formData.exceptions, // Keep original exceptions
    };
    onFormChange(updatedData);
  };

  return (
    <BaseScheduleForm
      formData={mappedFormData}
      onFormChange={handleFormChange}
      onSubmit={onSubmit}
      submitLabel={submitLabel}
      disabled={disabled}
      showRecurringToggle={false}
      showDateField={false}
      showRecurrencePattern={true}
      showTimeFields={true}
    />
  );
}
