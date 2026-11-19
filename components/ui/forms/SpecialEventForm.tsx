import { BaseScheduleForm } from './BaseScheduleForm';
import { Star } from 'lucide-react';
import { SpecialEventFormData } from './FormDataTypes';
import { logError } from '@/lib/logging';

// Type guard for the unknown data
const isFormDataLike = (
  d: unknown,
): d is {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
  isRecurring?: boolean;
} => {
  return typeof d === 'object' && d !== null;
};

interface SpecialEventFormProps {
  readonly formData: SpecialEventFormData;
  readonly onFormChange: (data: SpecialEventFormData) => void;
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly disabled?: boolean;
}

export function SpecialEventForm({
  formData,
  onFormChange,
  onSubmit,
  submitLabel = 'Add Event',
  disabled = false,
}: SpecialEventFormProps) {
  // Map the formData to match the base form structure
  const mappedFormData = {
    ...formData,
    title: formData.name,
    date: formData.date,
    startTime: formData.startTime,
    endTime: formData.endTime,
    location: formData.location,
    isRecurring: formData.isRecurring,
  };

  const handleFormChange = (data: unknown) => {
    if (!isFormDataLike(data)) {
      logError('Invalid form data received:', data);
      return;
    }

    const updatedData: SpecialEventFormData = {
      ...formData,
      name: data.title ?? '',
      date: data.date ?? '',
      startTime: data.startTime ?? '',
      endTime: data.endTime ?? '',
      location: data.location ?? '',
      description: data.description ?? '',
      isRecurring: data.isRecurring ?? false,
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
      title="Add Special Event"
      description="Schedule special events like festivals, markets, or private catering"
      icon={<Star className="h-4 w-4" />}
      showRecurringToggle={true}
      showDateField={true}
      showRecurrencePattern={false}
    />
  );
}
