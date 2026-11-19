/**
 * Comprehensive types for recurring schedule functionality
 * following quality guidelines for timezone handling, holiday exceptions,
 * and recurrence patterns
 */

// Basic recurrence frequency options
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

// Days of the week for patterns
export type DayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

// Months for yearly patterns
export type MonthOfYear =
  | 'january'
  | 'february'
  | 'march'
  | 'april'
  | 'may'
  | 'june'
  | 'july'
  | 'august'
  | 'september'
  | 'october'
  | 'november'
  | 'december';

// Interface for date/time patterns
export interface DatePattern {
  /** Day of month (1-31) */
  day?: number;
  /** Day of week (0=sunday, 1=monday, etc.) */
  dayOfWeek?: number;
  /** Occurrence of day of week within month (e.g., 1st, 2nd, 3rd) */
  dayOfWeekInMonth?: number;
  /** Month (0-11 for January-December) */
  month?: number;
}

// Interface for recurrence pattern configuration
export interface RecurrencePattern {
  /** The frequency of recurrence */
  frequency: RecurrenceFrequency;

  /** Interval multiplier (e.g., every 2 weeks) */
  interval: number;

  /** How many occurrences to create (-1 for infinite) */
  occurrenceCount?: number;

  /** End date after which the recurrence stops */
  endDate?: string; // ISO string format

  /** Specific day(s) of week when frequency is weekly */
  daysOfWeek?: DayOfWeek[];

  /** Specific day(s) of month when frequency is monthly */
  daysOfMonth?: number[];

  /** Specific month(s) when frequency is yearly */
  monthsOfYear?: MonthOfYear[];

  /** Specific date patterns for complex recurrence rules */
  datePatterns?: DatePattern[];

  /** Skip weekends when creating occurrences */
  skipWeekends?: boolean;

  /** Timezone for schedule calculations */
  timezone: string;

  /** Whether this pattern is currently active */
  isActive: boolean;
}

// Interface for exceptions to the recurrence pattern
export interface RecurrenceException {
  /** Unique identifier for the exception */
  id: string;

  /** The reason for the exception */
  type: 'holiday' | 'specialEvent' | 'temporaryClosure' | 'maintenance' | 'other';

  /** Date of the exception */
  date: string; // ISO string format

  /** New start time if rescheduled, otherwise the event is cancelled */
  newStartTime?: string; // ISO string format

  /** New end time if rescheduled, otherwise the event is cancelled */
  newEndTime?: string; // ISO string format

  /** New location if rescheduled, otherwise the same location is used */
  newLocation?: string;

  /** Description of the exception */
  description?: string;

  /** Whether the exception is active */
  isActive: boolean;
}

// Interface for a recurring event with pattern and exceptions
export interface RecurringSchedule {
  /** Unique identifier for the recurring schedule */
  id: string;

  /** Food truck identifier */
  foodTruckId: string;

  /** The base recurrence pattern */
  recurrencePattern: RecurrencePattern;

  /** List of exceptions to the pattern */
  exceptions: RecurrenceException[];

  /** Base location for the schedule */
  baseLocation: string;

  /** Base start time for the schedule */
  baseStartTime: string; // Format: "HH:MM"

  /** Base end time for the schedule */
  baseEndTime: string; // Format: "HH:MM"

  /** Title for the schedule */
  title: string;

  /** Description of the recurring schedule */
  description?: string;

  /** Whether the schedule is active */
  isActive: boolean;

  /** Timestamp when the schedule was created */
  createdAt: string;

  /** Timestamp when the schedule was last updated */
  updatedAt: string;
}

// Interface for generated occurrences from a recurrence pattern
export interface RecurrenceOccurrence {
  /** Unique identifier for this occurrence */
  id: string;

  /** The parent recurring schedule ID */
  recurringScheduleId: string;

  /** The generated date for this occurrence */
  date: string; // ISO string format

  /** The start time for this occurrence */
  startTime: string; // Format: "HH:MM"

  /** The end time for this occurrence */
  endTime: string; // Format: "HH:MM"

  /** Location for this occurrence */
  location: string;

  /** Whether this occurrence has been overridden by an exception */
  isException: boolean;

  /** Title for this occurrence */
  title: string;

  /** Description of this occurrence */
  description?: string;

  /** Whether this occurrence is active */
  isActive: boolean;

  /** Timestamp when the occurrence was generated */
  generatedAt: string;
}

// Interface for holiday information
export interface Holiday {
  /** Unique identifier for the holiday */
  id: string;

  /** Name of the holiday */
  name: string;

  /** The date of the holiday */
  date: string; // ISO string format (YYYY-MM-DD)

  /** Optional: whether this holiday repeats annually */
  isAnnual: boolean;

  /** The year this holiday applies to (if not annual) */
  year?: number;

  /** Description of the holiday */
  description?: string;
}

// Interface for timezone-aware scheduling
export interface TimezoneAwareSchedule {
  /** The schedule ID */
  id: string;

  /** The date in the specified timezone */
  date: string; // Date in the specified timezone

  /** The start time in the specified timezone */
  startTime: string; // Time in the specified timezone

  /** The end time in the specified timezone */
  endTime: string; // Time in the specified timezone

  /** The location of the schedule */
  location: string;

  /** The timezone for this schedule */
  timezone: string;

  /** The title of the schedule */
  title: string;

  /** Whether the schedule is active */
  isActive: boolean;
}

// Interface for recurrence validation results
export interface RecurrenceValidationResult {
  /** Whether the pattern is valid */
  isValid: boolean;

  /** List of validation errors */
  errors: string[];

  /** List of validation warnings */
  warnings?: string[];
}

// Interface for recurrence processing options
export interface RecurrenceProcessingOptions {
  /** The start date for generating occurrences */
  startDate: string; // ISO string format

  /** The end date for generating occurrences */
  endDate: string; // ISO string format

  /** The timezone to use for calculations */
  timezone: string;

  /** Whether to include exceptions when generating occurrences */
  includeExceptions: boolean;

  /** Whether to include holidays when generating occurrences */
  includeHolidays: boolean;

  /** Maximum number of occurrences to generate (to prevent infinite loops) */
  maxOccurrences?: number;
}
