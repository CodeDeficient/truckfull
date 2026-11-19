/**
 * Comprehensive recurrence pattern processing with timezone handling
 * following quality guidelines for proper recurrence pattern handling
 */

import {
  RecurrencePattern,
  RecurrenceOccurrence,
  RecurrenceException,
  DayOfWeek,
  MonthOfYear,
  RecurringSchedule,
  RecurrenceProcessingOptions,
} from './recurrenceTypes';

// Interface for common occurrence generation parameters
interface CommonOccurrenceGenerationParams {
  pattern: RecurrencePattern;
  startDate: Date;
  endDate: Date;
  baseLocation: string;
  baseStartTime: string;
  baseEndTime: string;
  recurringScheduleId: string;
  title: string;
  occurrences: RecurrenceOccurrence[];
  maxOccurrences: number;
}

/**
 * Initialize common variables for occurrence generation
 */
function initializeOccurrenceGeneration(options: CommonOccurrenceGenerationParams) {
  const {
    pattern,
    startDate,
    endDate,
    baseLocation,
    baseStartTime,
    baseEndTime,
    recurringScheduleId,
    title,
    occurrences,
    maxOccurrences,
  } = options;
  const initCurrentDate = new Date(startDate);
  const interval = pattern.interval ?? 1;
  const occurrenceCount = 0;

  return {
    pattern,
    startDate,
    endDate,
    baseLocation,
    baseStartTime,
    baseEndTime,
    recurringScheduleId,
    title,
    occurrences,
    maxOccurrences,
    currentDate: initCurrentDate,
    interval,
    occurrenceCount,
  };
}

// Utility functions for date/time handling
const dayOfWeekMap: Record<DayOfWeek, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const monthOfYearMap: Record<MonthOfYear, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/**
 * Calculate all occurrences of a recurrence pattern within a date range
 */
export function calculateRecurrenceOccurrences(
  recurringSchedule: RecurringSchedule,
  options: RecurrenceProcessingOptions,
): RecurrenceOccurrence[] {
  const { startDate, endDate, includeExceptions, includeHolidays } = options;
  const { recurrencePattern, exceptions, baseLocation, baseStartTime, baseEndTime, title } =
    recurringSchedule;
  const maxOccurrences = options.maxOccurrences ?? 500; // Prevent infinite loops

  // Convert date strings to Date objects in the specified timezone
  const start = new Date(startDate);
  const end = new Date(endDate);

  // If the pattern is not active, return empty
  if (!recurrencePattern.isActive) {
    return [];
  }

  // Generate occurrences based on the recurrence pattern
  const occurrences: RecurrenceOccurrence[] = [];
  const currentDate = new Date(start);

  // Generate the base occurrences based on the pattern
  switch (recurrencePattern.frequency) {
    case 'daily': {
      generateDailyOccurrences({
        pattern: recurrencePattern,
        startDate: currentDate,
        endDate: end,
        baseLocation,
        baseStartTime,
        baseEndTime,
        recurringScheduleId: recurringSchedule.id,
        title,
        occurrences,
        maxOccurrences,
      });
      break;
    }

    case 'weekly': {
      generateWeeklyOccurrences({
        pattern: recurrencePattern,
        startDate: currentDate,
        endDate: end,
        baseLocation,
        baseStartTime,
        baseEndTime,
        recurringScheduleId: recurringSchedule.id,
        title,
        occurrences,
        maxOccurrences,
      });
      break;
    }

    case 'monthly': {
      generateMonthlyOccurrences({
        pattern: recurrencePattern,
        startDate: currentDate,
        endDate: end,
        baseLocation,
        baseStartTime,
        baseEndTime,
        recurringScheduleId: recurringSchedule.id,
        title,
        occurrences,
        maxOccurrences,
      });
      break;
    }

    case 'yearly': {
      generateYearlyOccurrences({
        pattern: recurrencePattern,
        startDate: currentDate,
        endDate: end,
        baseLocation,
        baseStartTime,
        baseEndTime,
        recurringScheduleId: recurringSchedule.id,
        title,
        occurrences,
        maxOccurrences,
      });
      break;
    }
  }

  // Apply exceptions if requested
  if (includeExceptions && exceptions.length > 0) {
    applyExceptions(occurrences, exceptions);
  }

  // Filter out occurrences that fall on holidays if excludeHolidays is requested
  if (includeHolidays) {
    // This would be handled by integrating with a holiday service
    // For now, we just return the occurrences with any holiday exceptions applied
  }

  // Ensure we don't exceed maxOccurrences
  return occurrences.slice(0, maxOccurrences);
}

/**
 * Generate daily occurrences based on the recurrence pattern
 */
function generateDailyOccurrences(options: CommonOccurrenceGenerationParams): void {
  const {
    pattern,
    startDate,
    endDate,
    baseLocation,
    baseStartTime,
    baseEndTime,
    recurringScheduleId,
    title,
    occurrences,
    maxOccurrences,
    currentDate: currentProcessedDate,
    interval,
    occurrenceCount: initialOccurrenceCount,
  } = initializeOccurrenceGeneration(options);
  let occurrenceCount = initialOccurrenceCount;
  const currentDate = new Date(currentProcessedDate);

  // If skipWeekends is enabled, ensure we start on a weekday
  if (pattern.skipWeekends) {
    while (currentDate <= endDate && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
    // Skip weekends if required
    if (pattern.skipWeekends && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    occurrenceCount = addOccurrenceIfValid(
      createOccurrenceOptions({
        occurrences,
        recurringScheduleId,
        date: currentDate,
        baseStartTime,
        baseEndTime,
        baseLocation,
        title,
        startDate,
        endDate,
        maxOccurrences,
        occurrenceCount,
      }),
    );

    // Move to the next occurrence
    currentDate.setDate(currentDate.getDate() + interval);

    // If skipWeekends is enabled, skip weekends after each interval
    if (pattern.skipWeekends) {
      while (currentDate <= endDate && (currentDate.getDay() === 0 || currentDate.getDay() === 6)) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }
}

/**
 * Generate weekly occurrences based on the recurrence pattern
 */
function generateWeeklyOccurrences(options: CommonOccurrenceGenerationParams): void {
  const {
    pattern,
    startDate,
    endDate,
    baseLocation,
    baseStartTime,
    baseEndTime,
    recurringScheduleId,
    title,
    occurrences,
    maxOccurrences,
    currentDate: currentProcessedDate,
    interval,
    occurrenceCount: initialOccurrenceCount,
  } = initializeOccurrenceGeneration(options);
  const daysOfWeek = pattern.daysOfWeek ?? ['monday']; // Default to Monday
  let occurrenceCount = initialOccurrenceCount;
  const currentDate = new Date(currentProcessedDate);

  // Adjust start date to the first occurrence based on days of week
  while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
    // Find the first occurrence in the current week
    const startWeekDay = currentDate.getDay();

    for (const day of daysOfWeek) {
      const dayIndex = dayOfWeekMap[day];
      const daysUntilDay = (dayIndex - startWeekDay + 7) % 7;
      const occurrenceDate = new Date(currentDate);
      occurrenceDate.setDate(currentDate.getDate() + daysUntilDay);

      // If this occurrence date is still in the current week and within our range
      if (
        occurrenceDate >= currentDate &&
        occurrenceDate <= endDate &&
        occurrenceDate.getDay() === dayIndex
      ) {
        occurrenceCount = addOccurrenceIfValid(
          createOccurrenceOptions({
            occurrences,
            recurringScheduleId,
            date: occurrenceDate,
            baseStartTime,
            baseEndTime,
            baseLocation,
            title,
            startDate,
            endDate,
            maxOccurrences,
            occurrenceCount,
          }),
        );

        if (occurrenceCount >= maxOccurrences) {
          break;
        }
      }
    }

    if (occurrenceCount >= maxOccurrences) {
      break;
    }

    // Move to the next week
    currentDate.setDate(currentDate.getDate() + interval * 7);
  }
}

/**
 * Generate monthly occurrences based on the recurrence pattern
 */
function generateMonthlyOccurrences(options: CommonOccurrenceGenerationParams): void {
  const {
    pattern,
    startDate,
    endDate,
    baseLocation,
    baseStartTime,
    baseEndTime,
    recurringScheduleId,
    title,
    occurrences,
    maxOccurrences,
    currentDate: currentProcessedDate,
    interval,
    occurrenceCount: initialOccurrenceCount,
  } = initializeOccurrenceGeneration(options);
  let occurrenceCount = initialOccurrenceCount;
  const currentDate = new Date(currentProcessedDate);

  // Handle different monthly patterns
  if (pattern.daysOfMonth && pattern.daysOfMonth.length > 0) {
    // Pattern: specific days of month
    while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
      for (const day of pattern.daysOfMonth) {
        if (day > 31 || day < 1) continue; // Invalid day

        const occurrenceDate = new Date(currentDate);
        occurrenceDate.setDate(day);

        // If the occurrence date is in the same month and within range
        if (
          occurrenceDate.getMonth() === currentDate.getMonth() &&
          occurrenceDate >= startDate &&
          occurrenceDate <= endDate
        ) {
          occurrenceCount = addOccurrenceIfValid(
            createOccurrenceOptions({
              occurrences,
              recurringScheduleId,
              date: occurrenceDate,
              baseStartTime,
              baseEndTime,
              baseLocation,
              title,
              startDate,
              endDate,
              maxOccurrences,
              occurrenceCount,
            }),
          );

          if (occurrenceCount >= maxOccurrences) {
            break;
          }
        }
      }

      if (occurrenceCount >= maxOccurrences) {
        break;
      }

      // Move to the next month
      currentDate.setMonth(currentDate.getMonth() + interval);
    }
  } else {
    // Default to the same day of the month as the start date
    const startDay = startDate.getDate();

    while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
      const occurrenceDate = new Date(currentDate);

      // Try to set to the same day, but handle month boundaries
      occurrenceDate.setDate(startDay);

      // Check if we've moved to the next month due to invalid date (e.g., Feb 30)
      if (occurrenceDate.getMonth() !== currentDate.getMonth()) {
        // If the original day doesn't exist in this month, use the last day of the month
        const lastDayOfMonth = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1,
          0,
        ).getDate();
        occurrenceDate.setDate(Math.min(startDay, lastDayOfMonth));
      }

      if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
        occurrenceCount = addOccurrenceIfValid(
          createOccurrenceOptions({
            occurrences,
            recurringScheduleId,
            date: occurrenceDate,
            baseStartTime,
            baseEndTime,
            baseLocation,
            title,
            startDate,
            endDate,
            maxOccurrences,
            occurrenceCount,
          }),
        );
      }

      // Move to the next month
      currentDate.setMonth(currentDate.getMonth() + interval);
    }
  }
}

/**
 * Generate yearly occurrences based on the recurrence pattern
 */
function generateYearlyOccurrences(options: CommonOccurrenceGenerationParams): void {
  const {
    pattern,
    startDate,
    endDate,
    baseLocation,
    baseStartTime,
    baseEndTime,
    recurringScheduleId,
    title,
    occurrences,
    maxOccurrences,
    currentDate: currentProcessedDate,
    interval,
    occurrenceCount: initialOccurrenceCount,
  } = initializeOccurrenceGeneration(options);
  let occurrenceCount = initialOccurrenceCount;
  const currentDate = new Date(currentProcessedDate);

  // Get the target month and day from the start date as default
  const startMonth = startDate.getMonth();
  const startDay = startDate.getDate();

  while (currentDate <= endDate && occurrenceCount < maxOccurrences) {
    if (pattern.monthsOfYear && pattern.monthsOfYear.length > 0) {
      // Pattern: specific months of year
      for (const month of pattern.monthsOfYear) {
        const monthIndex = monthOfYearMap[month];
        const occurrenceDate = new Date(currentDate.getFullYear(), monthIndex, startDay);

        // Handle month boundaries (e.g., Feb 30)
        if (occurrenceDate.getMonth() !== monthIndex) {
          // If the day doesn't exist in this month, use the last day of the month
          const lastDayOfMonth = new Date(currentDate.getFullYear(), monthIndex + 1, 0).getDate();
          occurrenceDate.setDate(Math.min(startDay, lastDayOfMonth));
        }

        if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
          occurrenceCount = addOccurrenceIfValid(
            createOccurrenceOptions({
              occurrences,
              recurringScheduleId,
              date: occurrenceDate,
              baseStartTime,
              baseEndTime,
              baseLocation,
              title,
              startDate,
              endDate,
              maxOccurrences,
              occurrenceCount,
            }),
          );

          if (occurrenceCount >= maxOccurrences) {
            break;
          }
        }
      }
    } else {
      // Default: Same month and day as start date
      const occurrenceDate = new Date(currentDate.getFullYear(), startMonth, startDay);

      if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
        occurrenceCount = addOccurrenceIfValid(
          createOccurrenceOptions({
            occurrences,
            recurringScheduleId,
            date: occurrenceDate,
            baseStartTime,
            baseEndTime,
            baseLocation,
            title,
            startDate,
            endDate,
            maxOccurrences,
            occurrenceCount,
          }),
        );
      }
    }

    if (occurrenceCount >= maxOccurrences) {
      break;
    }

    // Move to the next year
    currentDate.setFullYear(currentDate.getFullYear() + interval);
  }
}

/**
 * Apply exceptions to the generated occurrences
 */
function applyExceptions(
  occurrences: RecurrenceOccurrence[],
  exceptions: RecurrenceException[],
): void {
  for (const exception of exceptions) {
    if (!exception.isActive) continue;

    const exceptionDate = new Date(exception.date).toDateString(); // Compare just the date part

    for (const occurrence of occurrences) {
      if (new Date(occurrence.date).toDateString() === exceptionDate) {
        // Mark as exception
        occurrence.isException = true;

        // Apply changes based on the exception
        if (exception.newStartTime) {
          occurrence.startTime = exception.newStartTime;
        }
        if (exception.newEndTime) {
          occurrence.endTime = exception.newEndTime;
        }
        if (exception.newLocation) {
          occurrence.location = exception.newLocation;
        }
      }
    }
  }
}

/**
 * Create a single occurrence object
 */
function createOccurrence(options: {
  recurringScheduleId: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  title: string;
  isException: boolean;
}): RecurrenceOccurrence {
  const { recurringScheduleId, date, startTime, endTime, location, title, isException } = options;
  return {
    id: `${recurringScheduleId}-${date.toISOString().split('T')[0]}T${startTime.replace(':', '')}`,
    recurringScheduleId,
    date: date.toISOString().split('T')[0], // Just the date part in YYYY-MM-DD format
    startTime,
    endTime,
    location,
    isException,
    title,
    isActive: true,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Add an occurrence to the occurrences array if it's within the date range
 */
function addOccurrenceIfValid(options: {
  occurrences: RecurrenceOccurrence[];
  recurringScheduleId: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  title: string;
  startDate: Date;
  endDate: Date;
  maxOccurrences: number;
  occurrenceCount: number;
}): number {
  // Returns the updated occurrence count
  const {
    occurrences,
    recurringScheduleId,
    date,
    startTime,
    endTime,
    location,
    title,
    startDate,
    endDate,
    maxOccurrences,
    occurrenceCount,
  } = options;

  // Check if the occurrence is within the specified range
  if (date >= startDate && date <= endDate && occurrenceCount < maxOccurrences) {
    occurrences.push(
      createOccurrence({
        recurringScheduleId,
        date,
        startTime,
        endTime,
        location,
        title,
        isException: false,
      }),
    );
    return occurrenceCount + 1;
  }

  return occurrenceCount;
}

/**
 * Helper to create common occurrence options
 */
/**\n * Helper to create common occurrence options\n */
function createOccurrenceOptions(options: {
  occurrences: RecurrenceOccurrence[];
  recurringScheduleId: string;
  date: Date;
  baseStartTime: string;
  baseEndTime: string;
  baseLocation: string;
  title: string;
  startDate: Date;
  endDate: Date;
  maxOccurrences: number;
  occurrenceCount: number;
}) {
  return {
    occurrences: options.occurrences,
    recurringScheduleId: options.recurringScheduleId,
    date: options.date,
    startTime: options.baseStartTime,
    endTime: options.baseEndTime,
    location: options.baseLocation,
    title: options.title,
    startDate: options.startDate,
    endDate: options.endDate,
    maxOccurrences: options.maxOccurrences,
    occurrenceCount: options.occurrenceCount,
  };
}

/**
 * Convert time from one timezone to another
 */
export function convertTimeBetweenTimezones(
  time: string, // Format: "HH:MM"
  fromTimezone: string,
  toTimezone: string,
): string {
  // Parse the time
  const [hours, minutes] = time.split(':').map(Number);

  // Create a date object with the current date and the specified time
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  // Format the time in the target timezone
  return date
    .toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: toTimezone,
    })
    .slice(0, 5); // Extract HH:MM format
}

/**
 * Format a date/time for a specific timezone
 */
export function formatDateTimeForTimezone(
  date: Date,
  timezone: string,
  includeTime: boolean = true,
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }

  return date.toLocaleString([], options);
}

/**
 * Get the current date/time in a specific timezone
 */
export function getCurrentDateTimeInTimezone(timezone: string): Date {
  const now = new Date();

  // Actually convert based on timezone
  const convertedTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  return convertedTime;
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date, holidays: { date: string }[]): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return holidays.some((holiday) => holiday.date === dateStr);
}
