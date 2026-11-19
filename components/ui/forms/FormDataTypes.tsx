import { BaseScheduleFormData } from './BaseScheduleForm';
import { RecurrencePattern, RecurrenceException } from '@/lib/recurrence/recurrenceTypes';

// Specific form data interfaces extending the base interface
export interface SpecialEventFormData extends BaseScheduleFormData {
  readonly name: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly location: string;
  readonly description?: string;
  readonly isRecurring: boolean;
}

export interface RecurringScheduleFormData extends BaseScheduleFormData {
  readonly title: string;
  readonly description: string;
  readonly baseStartTime: string;
  readonly baseEndTime: string;
  readonly baseLocation: string;
  readonly recurrencePattern: RecurrencePattern;
  readonly exceptions: RecurrenceException[];
}

export interface AddRecurringScheduleFormData extends BaseScheduleFormData {
  readonly title: string;
  readonly description: string;
  readonly baseStartTime: string;
  readonly baseEndTime: string;
  readonly baseLocation: string;
  readonly recurrencePattern: RecurrencePattern;
  readonly exceptions: RecurrenceException[];
}

export interface AddSpecialEventFormData extends BaseScheduleFormData {
  readonly title: string;
  readonly description: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly location: string;
}
