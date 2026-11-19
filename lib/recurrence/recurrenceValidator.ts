/**
 * Validation functions for recurrence patterns
 * following quality guidelines for form validation
 */

import {
  RecurrencePattern,
  RecurrenceValidationResult,
  DayOfWeek,
  MonthOfYear,
} from './recurrenceTypes';

// Constants
const MAX_OCCURRENCES = 1000;
const MIN_DATE = new Date('1900-01-01');
const MAX_DATE = new Date('2100-12-31');

// Valid time format (HH:MM)
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Valid date format (YYYY-MM-DD)
const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validate a recurrence pattern
 */
export function validateRecurrencePattern(pattern: RecurrencePattern): RecurrenceValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate frequency
  if (!pattern.frequency || !['daily', 'weekly', 'monthly', 'yearly'].includes(pattern.frequency)) {
    errors.push('Invalid frequency. Must be one of: daily, weekly, monthly, yearly');
  }

  // Validate interval
  if (!pattern.interval || pattern.interval < 1) {
    errors.push('Interval must be a positive number');
  }

  // Validate occurrence count
  if (
    pattern.occurrenceCount !== undefined &&
    pattern.occurrenceCount !== -1 &&
    pattern.occurrenceCount < 1
  ) {
    errors.push('Occurrence count must be a positive number or -1 for infinite');
  } else if (pattern.occurrenceCount && pattern.occurrenceCount > MAX_OCCURRENCES) {
    errors.push(`Occurrence count cannot exceed ${MAX_OCCURRENCES}`);
  }

  // Validate end date if provided
  if (pattern.endDate) {
    if (DATE_FORMAT_REGEX.test(pattern.endDate)) {
      const date = new Date(pattern.endDate);
      if (Number.isNaN(date.getTime())) {
        errors.push('End date must be a valid date');
      } else if (date < MIN_DATE || date > MAX_DATE) {
        errors.push('End date must be between 1900-01-01 and 2100-12-31');
      }
    } else {
      errors.push('End date must be in YYYY-MM-DD format');
    }
  }

  // Validate days of week for weekly patterns
  if (pattern.frequency === 'weekly') {
    if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
      errors.push('Weekly patterns must specify at least one day of week');
    } else {
      for (const day of pattern.daysOfWeek) {
        if (!isValidDayOfWeek(day)) {
          errors.push(`Invalid day of week: ${day as string}`);
        }
      }
    }
  }

  // Validate days of month for monthly patterns
  if (pattern.frequency === 'monthly' && pattern.daysOfMonth && pattern.daysOfMonth.length > 0) {
    for (const day of pattern.daysOfMonth) {
      if (day < 1 || day > 31) {
        errors.push(`Day of month must be between 1 and 31: ${day}`);
      }
    }
  }

  // Validate months of year for yearly patterns
  if (pattern.frequency === 'yearly' && pattern.monthsOfYear && pattern.monthsOfYear.length > 0) {
    for (const month of pattern.monthsOfYear) {
      if (!isValidMonthOfYear(month)) {
        errors.push(`Invalid month of year: ${month as string}`);
      }
    }
  }

  // Validate timezone
  if (!pattern.timezone) {
    errors.push('Timezone is required');
  } else if (!isValidTimezone(pattern.timezone)) {
    errors.push(`Invalid timezone: ${pattern.timezone}`);
  }

  // Check if pattern is logically possible
  if (pattern.frequency === 'monthly' && pattern.daysOfMonth && pattern.daysOfMonth.length > 0) {
    // Check if any day of month is greater than 29, warn about months with fewer days
    const problematicDays = pattern.daysOfMonth.filter((day) => day > 28);
    if (problematicDays.length > 0) {
      warnings.push(
        `Days of month ${problematicDays.join(', ')} may not exist in all months and will be adjusted`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a complete recurring schedule
 */
export function validateRecurringSchedule(
  baseStartTime: string,
  baseEndTime: string,
  location: string,
  pattern: RecurrencePattern,
): RecurrenceValidationResult {
  const patternValidation = validateRecurrencePattern(pattern);

  const errors: string[] = [...patternValidation.errors];
  const warnings: string[] = patternValidation.warnings ? [...patternValidation.warnings] : [];

  // Validate base start time
  if (!baseStartTime) {
    errors.push('Start time is required');
  } else if (TIME_FORMAT_REGEX.test(baseStartTime)) {
    const [hours, minutes] = baseStartTime.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      errors.push('Start time must be a valid time in 24-hour format');
    }
  } else {
    errors.push('Start time must be in HH:MM format');
  }

  // Validate base end time
  if (!baseEndTime) {
    errors.push('End time is required');
  } else if (TIME_FORMAT_REGEX.test(baseEndTime)) {
    const [hours, minutes] = baseEndTime.split(':').map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      errors.push('End time must be a valid time in 24-hour format');
    }
  } else {
    errors.push('End time must be in HH:MM format');
  }

  // Validate that end time is after start time
  if (
    baseStartTime &&
    baseEndTime &&
    TIME_FORMAT_REGEX.test(baseStartTime) &&
    TIME_FORMAT_REGEX.test(baseEndTime)
  ) {
    const startMinutes = timeToMinutes(baseStartTime);
    const endMinutes = timeToMinutes(baseEndTime);

    if (startMinutes >= endMinutes) {
      errors.push('End time must be after start time');
    }
  }

  // Validate location
  if (!location || location.trim().length === 0) {
    errors.push('Location is required');
  } else if (location.trim().length > 255) {
    errors.push('Location must be 255 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a recurrence exception
 */
export function validateRecurrenceException(
  exceptionDate: string,
  newStartTime?: string,
  newEndTime?: string,
  newLocation?: string,
): RecurrenceValidationResult {
  const errors: string[] = [];

  // Validate exception date
  if (!exceptionDate) {
    errors.push('Exception date is required');
  } else if (DATE_FORMAT_REGEX.test(exceptionDate)) {
    const date = new Date(exceptionDate);
    if (Number.isNaN(date.getTime())) {
      errors.push('Exception date must be a valid date');
    }
  } else {
    errors.push('Exception date must be in YYYY-MM-DD format');
  }

  // Validate new start time if provided
  if (newStartTime && !TIME_FORMAT_REGEX.test(newStartTime)) {
    errors.push('New start time must be in HH:MM format');
  }

  // Validate new end time if provided
  if (newEndTime && !TIME_FORMAT_REGEX.test(newEndTime)) {
    errors.push('New end time must be in HH:MM format');
  }

  // Validate that new end time is after new start time, if both are provided
  if (
    newStartTime &&
    newEndTime &&
    TIME_FORMAT_REGEX.test(newStartTime) &&
    TIME_FORMAT_REGEX.test(newEndTime)
  ) {
    const startMinutes = timeToMinutes(newStartTime);
    const endMinutes = timeToMinutes(newEndTime);

    if (startMinutes >= endMinutes) {
      errors.push('New end time must be after new start time');
    }
  }

  // Validate new location if provided
  if (newLocation && newLocation.trim().length > 255) {
    errors.push('New location must be 255 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Helper function to convert time string to minutes
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Helper function to check if a day of week is valid
 */
function isValidDayOfWeek(day: string): day is DayOfWeek {
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].includes(
    day,
  );
}

/**
 * Helper function to check if a month of year is valid
 */
function isValidMonthOfYear(month: string): month is MonthOfYear {
  return [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ].includes(month);
}

/**
 * Validate an entire recurring schedule object
 */
export function validateCompleteRecurringSchedule(
  title: string,
  description: string | undefined,
  baseStartTime: string,
  baseEndTime: string,
  baseLocation: string,
  pattern: RecurrencePattern,
): RecurrenceValidationResult {
  // Validate title
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!title || title.trim().length === 0) {
    errors.push('Title is required');
  } else if (title.trim().length > 100) {
    errors.push('Title must be 100 characters or less');
  }

  // Validate description if provided
  if (description && description.length > 500) {
    warnings.push('Description should be 500 characters or less');
  }

  // Validate the base schedule
  const scheduleValidation = validateRecurringSchedule(
    baseStartTime,
    baseEndTime,
    baseLocation,
    pattern,
  );

  // Combine all errors
  errors.push(...scheduleValidation.errors);

  // Combine all warnings
  if (scheduleValidation.warnings) {
    warnings.push(...scheduleValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Validate a timezone
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}
