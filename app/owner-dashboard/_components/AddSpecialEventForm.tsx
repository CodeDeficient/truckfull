import { BaseScheduleForm } from '@/components/ui/forms/BaseScheduleForm';
import { Star } from 'lucide-react';
import { logError } from '@/lib/logging';

// Type guard function for form data
function isFormDataLike(d: unknown): d is {
  title?: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
} {
  return typeof d === 'object' && d !== null;
}

interface AddSpecialEventFormProps {
  readonly newSpecialEvent: {
    title: string;
    description: string;
    event_date: string;
    start_time: string;
    end_time: string;
    location_address: string;
  };
  readonly handleAddSpecialEvent: () => void;
  readonly setNewSpecialEvent: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      event_date: string;
      start_time: string;
      end_time: string;
      location_address: string;
    }>
  >;
}

export function AddSpecialEventForm({
  newSpecialEvent,
  handleAddSpecialEvent,
  setNewSpecialEvent,
}: AddSpecialEventFormProps) {
  // Map the formData to match the base form structure
  const mappedFormData = {
    title: newSpecialEvent.title,
    description: newSpecialEvent.description,
    date: newSpecialEvent.event_date,
    startTime: newSpecialEvent.start_time,
    endTime: newSpecialEvent.end_time,
    location: newSpecialEvent.location_address,
    isRecurring: false, // Default for special events
  };

  const handleFormChange = (data: unknown) => {
    if (!isFormDataLike(data)) {
      logError('Invalid form data received:', data);
      return;
    }

    setNewSpecialEvent({
      ...newSpecialEvent,
      title: data.title ?? '',
      description: data.description ?? '',
      event_date: data.date ?? '',
      start_time: data.startTime ?? '',
      end_time: data.endTime ?? '',
      location_address: data.location ?? '',
    });
  };

  return (
    <BaseScheduleForm
      formData={mappedFormData}
      onFormChange={handleFormChange}
      onSubmit={handleAddSpecialEvent}
      submitLabel="Add Event"
      title="Add Special Event"
      description="Schedule special events like festivals, markets, or private catering"
      icon={<Star className="h-4 w-4" />}
      showRecurringToggle={false} // Setting to false since isRecurring is not controlled by the form
      showDateField={true}
      showRecurrencePattern={false}
      showTimeFields={true}
    />
  );
}
