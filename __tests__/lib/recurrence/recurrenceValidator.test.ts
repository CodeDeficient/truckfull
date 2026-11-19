import { describe, it, expect } from '@jest/globals';
import {
  validateRecurrencePattern,
  validateRecurringSchedule,
  validateRecurrenceException,
  validateCompleteRecurringSchedule,
  isValidTimezone
} from '@/lib/recurrence/recurrenceValidator';

describe('recurrenceValidator', () => {
  describe('validateRecurrencePattern', () => {
    it('should validate a correct daily pattern', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid frequency', () => {
      const pattern = {
        frequency: 'hourly' as any,
        interval: 1,
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid frequency. Must be one of: daily, weekly, monthly, yearly');
    });

    it('should reject negative interval', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: -1,
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Interval must be a positive number');
    });

    it('should reject zero occurrence count', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        occurrenceCount: 0,
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Occurrence count must be a positive number or -1 for infinite');
    });

    it('should reject excessive occurrence count', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        occurrenceCount: 1001,
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Occurrence count cannot exceed 1000');
    });

    it('should accept -1 for infinite occurrences', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        occurrenceCount: -1,
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid end date format', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        endDate: '05/01/2026',
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be in YYYY-MM-DD format');
    });

    it('should reject invalid end date value', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        endDate: '2026-13-45',
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be a valid date');
    });

    it('should reject end date out of range', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        endDate: '1800-01-01',
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End date must be between 1900-01-01 and 2100-12-31');
    });

    it('should validate a correct weekly pattern', () => {
      const pattern = {
        frequency: 'weekly' as const,
        interval: 1,
        daysOfWeek: ['monday' as const, 'wednesday' as const],
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(true);
    });

    it('should reject weekly pattern without days', () => {
      const pattern = {
        frequency: 'weekly' as const,
        interval: 1,
        daysOfWeek: [],
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Weekly patterns must specify at least one day of week');
    });

    it('should reject weekly pattern with invalid day', () => {
      const pattern = {
        frequency: 'weekly' as const,
        interval: 1,
        daysOfWeek: ['invalidday' as any],
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid day of week');
    });

    it('should reject monthly pattern with invalid day', () => {
      const pattern = {
        frequency: 'monthly' as const,
        interval: 1,
        daysOfMonth: [32],
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Day of month must be between 1 and 31: 32');
    });

    it('should warn about days > 28 in monthly pattern', () => {
      const pattern = {
        frequency: 'monthly' as const,
        interval: 1,
        daysOfMonth: [29, 30, 31],
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('may not exist in all months');
    });

    it('should reject yearly pattern with invalid month', () => {
      const pattern = {
        frequency: 'yearly' as const,
        interval: 1,
        monthsOfYear: ['invalidmonth' as any],
        timezone: 'America/New_York'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid month of year');
    });

    it('should reject missing timezone', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        timezone: ''
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timezone is required');
    });

    it('should reject invalid timezone', () => {
      const pattern = {
        frequency: 'daily' as const,
        interval: 1,
        timezone: 'Invalid/Timezone'
      };
      const result = validateRecurrencePattern(pattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid timezone: Invalid/Timezone');
    });
  });

  describe('validateRecurringSchedule', () => {
    const validPattern = {
      frequency: 'daily' as const,
      interval: 1,
      timezone: 'America/New_York'
    };

    it('should validate a correct schedule', () => {
      const result = validateRecurringSchedule('12:00', '14:00', 'Market St', validPattern);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing start time', () => {
      const result = validateRecurringSchedule('', '14:00', 'Market St', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start time is required');
    });

    it('should reject missing end time', () => {
      const result = validateRecurringSchedule('12:00', '', 'Market St', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End time is required');
    });

    it('should reject invalid start time format', () => {
      const result = validateRecurringSchedule('12:00 PM', '14:00', 'Market St', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start time must be in HH:MM format');
    });

    it('should reject invalid end time format', () => {
      const result = validateRecurringSchedule('12:00', '2:00 PM', 'Market St', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End time must be in HH:MM format');
    });

    it('should reject end time before start time', () => {
      const result = validateRecurringSchedule('14:00', '12:00', 'Market St', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End time must be after start time');
    });

    it('should reject equal start and end time', () => {
      const result = validateRecurringSchedule('12:00', '12:00', 'Market St', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End time must be after start time');
    });

    it('should reject empty location', () => {
      const result = validateRecurringSchedule('12:00', '14:00', '', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location is required');
    });

    it('should reject location that is too long', () => {
      const longLocation = 'A'.repeat(256);
      const result = validateRecurringSchedule('12:00', '14:00', longLocation, validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Location must be 255 characters or less');
    });

    it('should reject invalid time values', () => {
      // '23:60' matches HH:MM format but has invalid minutes (60 > 59)
      // Actually the regex [0-5]\d prevents this. Let's use a different test.
      // The regex already validates range, so we test with valid format but the regex passes
      // Actually the TIME_FORMAT_REGEX ^([01]\d|2[0-3]):([0-5]\d)$ already validates range
      // So a time like "23:59" passes. The only way to trigger the "valid time" error
      // is with a time that matches regex but fails the range check - but the regex already enforces range.
      // So this error path is essentially dead code. Let's just verify the regex catches it.
      const result = validateRecurringSchedule('25:00', '14:00', 'Market St', validPattern);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Start time must be in HH:MM format');
    });
  });

  describe('validateRecurrenceException', () => {
    it('should validate a correct exception', () => {
      const result = validateRecurrenceException('2026-05-01', '13:00', '15:00', 'New Place');
      expect(result.isValid).toBe(true);
    });

    it('should reject missing exception date', () => {
      const result = validateRecurrenceException('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Exception date is required');
    });

    it('should reject invalid date format', () => {
      const result = validateRecurrenceException('05/01/2026');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Exception date must be in YYYY-MM-DD format');
    });

    it('should reject invalid start time format', () => {
      const result = validateRecurrenceException('2026-05-01', '1:00 PM');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New start time must be in HH:MM format');
    });

    it('should reject invalid end time format', () => {
      const result = validateRecurrenceException('2026-05-01', '13:00', '3:00 PM');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New end time must be in HH:MM format');
    });

    it('should reject end time before start time', () => {
      const result = validateRecurrenceException('2026-05-01', '15:00', '13:00');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New end time must be after new start time');
    });

    it('should reject location that is too long', () => {
      const result = validateRecurrenceException('2026-05-01', '13:00', '15:00', 'A'.repeat(256));
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('New location must be 255 characters or less');
    });

    it('should accept exception with only date', () => {
      const result = validateRecurrenceException('2026-05-01');
      expect(result.isValid).toBe(true);
    });
  });

  describe('isValidTimezone', () => {
    it('should return true for valid timezones', () => {
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    });
  });

  describe('validateCompleteRecurringSchedule', () => {
    const validPattern = {
      frequency: 'daily' as const,
      interval: 1,
      timezone: 'America/New_York'
    };

    it('should validate a complete schedule', () => {
      const result = validateCompleteRecurringSchedule(
        'Test Schedule',
        'A description',
        '12:00',
        '14:00',
        'Market St',
        validPattern
      );
      expect(result.isValid).toBe(true);
    });

    it('should reject empty title', () => {
      const result = validateCompleteRecurringSchedule(
        '',
        undefined,
        '12:00',
        '14:00',
        'Market St',
        validPattern
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title is required');
    });

    it('should reject title that is too long', () => {
      const result = validateCompleteRecurringSchedule(
        'A'.repeat(101),
        undefined,
        '12:00',
        '14:00',
        'Market St',
        validPattern
      );
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title must be 100 characters or less');
    });

    it('should warn about long description', () => {
      const result = validateCompleteRecurringSchedule(
        'Test',
        'A'.repeat(501),
        '12:00',
        '14:00',
        'Market St',
        validPattern
      );
      expect(result.warnings).toBeDefined();
      expect(result.warnings![0]).toContain('Description should be 500 characters or less');
    });
  });
});
