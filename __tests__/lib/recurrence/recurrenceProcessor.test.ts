import { describe, it, expect } from '@jest/globals';
import {
  convertTimeBetweenTimezones,
  formatDateTimeForTimezone,
  getCurrentDateTimeInTimezone,
  isWeekend,
  isHoliday,
  calculateRecurrenceOccurrences,
  type RecurringSchedule,
  type RecurrenceProcessingOptions,
} from '@/lib/recurrence/recurrenceProcessor';

describe('recurrenceProcessor', () => {
  describe('convertTimeBetweenTimezones', () => {
    it('converts time between timezones', () => {
      const result = convertTimeBetweenTimezones('12:00', 'America/New_York', 'America/Los_Angeles');
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{2}:\d{2}$/);
    });

    it('handles invalid time gracefully', () => {
      const result = convertTimeBetweenTimezones('invalid', 'America/New_York', 'America/Los_Angeles');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatDateTimeForTimezone', () => {
    it('formats date for timezone', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDateTimeForTimezone(date, 'America/New_York');
      expect(typeof result).toBe('string');
    });

    it('formats date without time when includeTime is false', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDateTimeForTimezone(date, 'America/New_York', false);
      expect(typeof result).toBe('string');
    });
  });

  describe('getCurrentDateTimeInTimezone', () => {
    it('returns a Date object', () => {
      const result = getCurrentDateTimeInTimezone('America/New_York');
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('isWeekend', () => {
    it('returns true for Saturday', () => {
      const saturday = new Date('2024-01-13');
      expect(isWeekend(saturday)).toBe(true);
    });

    it('returns true for Sunday', () => {
      const sunday = new Date('2024-01-14');
      expect(isWeekend(sunday)).toBe(true);
    });

    it('returns false for weekday', () => {
      const monday = new Date('2024-01-15');
      expect(isWeekend(monday)).toBe(false);
    });
  });

  describe('isHoliday', () => {
    it('returns true when date matches holiday', () => {
      const christmas = new Date('2024-12-25');
      const holidays = [{ date: '2024-12-25' }];
      expect(isHoliday(christmas, holidays)).toBe(true);
    });

    it('returns false when date does not match holiday', () => {
      const january = new Date('2024-01-15');
      const holidays = [{ date: '2024-12-25' }];
      expect(isHoliday(january, holidays)).toBe(false);
    });

    it('handles empty holidays array', () => {
      const date = new Date('2024-01-15');
      expect(isHoliday(date, [])).toBe(false);
    });
  });

  describe('calculateRecurrenceOccurrences', () => {
    const createSchedule = (overrides: Partial<RecurringSchedule> = {}): RecurringSchedule => ({
      id: 'schedule-1',
      truckId: 'truck-1',
      title: 'Test Event',
      recurrencePattern: {
        frequency: 'daily',
        interval: 1,
        isActive: true,
      },
      baseLocation: '123 Main St',
      baseStartTime: '09:00',
      baseEndTime: '17:00',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      exceptions: [],
      ...overrides,
    });

    it('returns empty array when pattern is not active', () => {
      const schedule = createSchedule({
        recurrencePattern: {
          frequency: 'daily',
          interval: 1,
          isActive: false,
        },
      });

      const result = calculateRecurrenceOccurrences(schedule, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeExceptions: false,
        includeHolidays: false,
      });

      expect(result).toEqual([]);
    });

    it('generates daily occurrences', () => {
      const schedule = createSchedule({
        recurrencePattern: {
          frequency: 'daily',
          interval: 1,
          isActive: true,
        },
        startDate: '2024-01-01',
        endDate: '2024-01-05',
      });

      const result = calculateRecurrenceOccurrences(schedule, {
        startDate: '2024-01-01',
        endDate: '2024-01-05',
        includeExceptions: false,
        includeHolidays: false,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('respects maxOccurrences limit', () => {
      const schedule = createSchedule({
        recurrencePattern: {
          frequency: 'daily',
          interval: 1,
          isActive: true,
        },
      });

      const result = calculateRecurrenceOccurrences(schedule, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        includeExceptions: false,
        includeHolidays: false,
        maxOccurrences: 10,
      });

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('generates weekly occurrences', () => {
      const schedule = createSchedule({
        recurrencePattern: {
          frequency: 'weekly',
          interval: 1,
          isActive: true,
          daysOfWeek: ['monday', 'wednesday', 'friday'],
        },
      });

      const result = calculateRecurrenceOccurrences(schedule, {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        includeExceptions: false,
        includeHolidays: false,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('generates monthly occurrences', () => {
      const schedule = createSchedule({
        recurrencePattern: {
          frequency: 'monthly',
          interval: 1,
          isActive: true,
        },
      });

      const result = calculateRecurrenceOccurrences(schedule, {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        includeExceptions: false,
        includeHolidays: false,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('generates yearly occurrences', () => {
      const schedule = createSchedule({
        recurrencePattern: {
          frequency: 'yearly',
          interval: 1,
          isActive: true,
        },
      });

      const result = calculateRecurrenceOccurrences(schedule, {
        startDate: '2024-01-01',
        endDate: '2026-12-31',
        includeExceptions: false,
        includeHolidays: false,
      });

      expect(result.length).toBeGreaterThan(0);
    });

    it('skips weekends when skipWeekends is true', () => {
      const schedule = createSchedule({
        recurrencePattern: {
          frequency: 'daily',
          interval: 1,
          isActive: true,
          skipWeekends: true,
        },
      });

      const result = calculateRecurrenceOccurrences(schedule, {
        startDate: '2024-01-05', // Friday
        endDate: '2024-01-08',   // Monday
        includeExceptions: false,
        includeHolidays: false,
      });

      // Should only include Friday (Jan 5) and Monday (Jan 8), skipping weekend
      const dates = result.map(r => r.date);
      expect(dates).not.toContain('2024-01-06'); // Saturday
      expect(dates).not.toContain('2024-01-07'); // Sunday
    });
  });
});
