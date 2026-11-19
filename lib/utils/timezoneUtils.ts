import { logWarning } from '@/lib/logging';
/**
 * Utility functions for handling timezone conversions and date formatting
 */

/**
 * Format a date string to local timezone
 */
export function formatToLocalTime(
  dateString: string,
  timeString?: string,
  timezone?: string,
): string {
  try {
    // If only date is provided, use midnight as default time
    const dateTimeStr = timeString ? `${dateString}T${timeString}` : `${dateString}T00:00:00`;
    const date = new Date(dateTimeStr);

    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`Invalid date: ${dateString}`);
    }

    // Format options for time
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(timezone && { timeZone: timezone }),
    };

    return date.toLocaleString(timezone ?? undefined, options);
  } catch (error) {
    logWarning('Error formatting date to local time:', error);
    // Fallback to original string if formatting fails
    return dateString + (timeString ? ` ${timeString}` : '');
  }
}

/**
 * Convert a date from one timezone to another
 */
export function convertTimezone(
  dateString: string,
  timeString: string,
  fromTimezone: string,
  toTimezone: string,
): string {
  try {
    // Create a date object with the original date and time
    const dateTimeStr = `${dateString}T${timeString}`;
    const date = new Date(dateTimeStr);

    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`Invalid date: ${dateString}`);
    }

    // Format the date in the target timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: toTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    };

    // Get the formatted string in the target timezone
    const formatted = date.toLocaleString('en-US', options);

    // Extract date and time parts from the formatted string
    const [datePart, timePart] = formatted.split(', ');
    return `${datePart}T${timePart}`;
  } catch (error) {
    logWarning('Error converting timezone:', error);
    // Fallback to original values if conversion fails
    return `${dateString}T${timeString}`;
  }
}

/**
 * Get the current time in a specific timezone
 */
export function getCurrentTimeInTimezone(timezone: string): Date {
  try {
    const now = new Date();

    // Format the current date/time in the specified timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };

    const formatted = now.toLocaleString('en-US', options);

    // Parse the formatted string back to a Date object
    // Note: This is approximate, as we're converting back to local time
    return new Date(formatted);
  } catch (error) {
    logWarning('Error getting current time in timezone:', error);
    return new Date(); // fallback to local time
  }
}

/**
 * Format time in 12-hour format with AM/PM
 */
export function formatTime12Hour(timeString: string, timezone?: string): string {
  try {
    // Handle ISO time string or time only (HH:mm:ss format)
    let date: Date;

    if (timeString.includes('T')) {
      // It's already in ISO format
      date = new Date(timeString);
    } else if (timeString.includes('-') || timeString.includes('/')) {
      // It's in date format
      date = new Date(timeString);
    } else {
      // It's time only (HH:mm or HH:mm:ss format)
      const now = new Date();
      const [hours, minutes, seconds = '00'] = timeString.split(':');
      const timeOnly = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T${hours}:${minutes}:${seconds}`;
      date = new Date(timeOnly);
    }

    if (Number.isNaN(date.getTime())) {
      throw new TypeError(`Invalid time: ${timeString}`);
    }

    // Format options for 12-hour time
    const options: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      ...(timezone && { timeZone: timezone }),
    };

    return date.toLocaleTimeString(timezone ?? undefined, options);
  } catch (error) {
    logWarning('Error formatting time to 12-hour:', error);
    // Fallback to original time string if formatting fails
    return timeString;
  }
}

/**
 * Calculate time difference between two dates in the same timezone
 */
export function getTimeDifference(
  startDate: Date,
  endDate: Date,
  timezone?: string,
): { days: number; hours: number; minutes: number; seconds: number } {
  try {
    // Ensure both dates are in the same timezone by converting to the same timezone representation
    const start = timezone
      ? new Date(startDate.toLocaleString('en-US', { timeZone: timezone }))
      : startDate;
    const end = timezone
      ? new Date(endDate.toLocaleString('en-US', { timeZone: timezone }))
      : endDate;

    const diffMs = end.getTime() - start.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    return {
      days: days,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60,
    };
  } catch (error) {
    logWarning('Error calculating time difference:', error);
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
}

/**
 * Get the timezone offset for a specific timezone
 */
export function getTimezoneOffset(timezone: string): number {
  try {
    const date = new Date();

    // Get the timezone offset in minutes
    const utc = date.getTime() + date.getTimezoneOffset() * 60_000;
    const targetTime = new Date(utc + getTimezoneOffsetFromIANA(timezone) * 1000);

    // Calculate the difference in hours
    return (targetTime.getTime() - date.getTime()) / (1000 * 60 * 60);
  } catch (error) {
    logWarning('Error getting timezone offset:', error);
    return 0;
  }
}

// Helper function to get timezone offset from IANA timezone
function getTimezoneOffsetFromIANA(timezone: string): number {
  try {
    const date = new Date();
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));

    return (targetDate.getTime() - utcDate.getTime()) / 1000;
  } catch (error) {
    logWarning('Error getting IANA timezone offset:', error);
    return 0;
  }
}
