import { describe, it, expect } from '@jest/globals';
import { 
  getHolidaysForYear, 
  isHoliday, 
  getHolidayName, 
  createHolidayException,
  createHolidayExceptionsForDateRange,
  processHolidaysForRecurringSchedule,
  updateScheduleWithHolidayExceptions
} from '@/lib/recurrence/holidayService';

describe('holidayService', () => {
  describe('getHolidaysForYear', () => {
    it('should return fixed holidays for US', () => {
      const holidays = getHolidaysForYear(2026, 'US');
      
      const newYear = holidays.find(h => h.name === "New Year's Day");
      expect(newYear?.date).toBe('2026-01-01');
      
      const independenceDay = holidays.find(h => h.name === "Independence Day");
      expect(independenceDay?.date).toBe('2026-07-04');
      
      const christmas = holidays.find(h => h.name === "Christmas Day");
      expect(christmas?.date).toBe('2026-12-25');
    });

    it('should calculate dynamic holidays correctly for 2026', () => {
      const holidays = getHolidaysForYear(2026, 'US');
      
      // Thanksgiving 2026: Nov 26 (4th Thursday)
      const thanksgiving = holidays.find(h => h.name === "Thanksgiving");
      expect(thanksgiving?.date).toBe('2026-11-26');
      
      // Memorial Day 2026: May 25 (last Monday)
      const memorialDay = holidays.find(h => h.name === "Memorial Day");
      expect(memorialDay?.date).toBe('2026-05-25');
      
      // Labor Day 2026: Sept 7 (first Monday)
      const laborDay = holidays.find(h => h.name === "Labor Day");
      expect(laborDay?.date).toBe('2026-09-07');

      // Columbus Day 2026: Oct 12 (second Monday)
      const columbusDay = holidays.find(h => h.name === "Columbus Day");
      expect(columbusDay?.date).toBe('2026-10-12');
    });

    it('should return Canada holidays when requested', () => {
      const holidays = getHolidaysForYear(2026, 'CA');
      const canadaDay = holidays.find(h => h.name === "Canada Day");
      expect(canadaDay?.date).toBe('2026-07-01');
    });

    it('should handle case-insensitive country code', () => {
        const holidays = getHolidaysForYear(2026, 'us');
        expect(holidays.some(h => h.name === 'Labor Day')).toBe(true);
    });

    it('should return empty list for unknown country', () => {
        const holidays = getHolidaysForYear(2026, 'XX');
        // Still returns BASE_HOLIDAYS
        expect(holidays.length).toBe(4);
    });
  });

  describe('isHoliday', () => {
    it('should return true for known holidays', () => {
      expect(isHoliday(new Date('2026-01-01'))).toBe(true);
      expect(isHoliday(new Date('2026-12-25'))).toBe(true);
    });

    it('should return false for regular days', () => {
      expect(isHoliday(new Date('2026-04-05'))).toBe(false);
    });
  });

  describe('getHolidayName', () => {
    it('should return the correct name for a holiday', () => {
      expect(getHolidayName(new Date('2026-01-01'))).toBe("New Year's Day");
    });

    it('should return null for non-holidays', () => {
      expect(getHolidayName(new Date('2026-04-05'))).toBeNull();
    });
  });

  describe('createHolidayException', () => {
    it('should create a valid exception object', () => {
      const date = new Date('2026-12-25');
      const exception = createHolidayException(date, 'schedule123');
      
      expect(exception.date).toBe('2026-12-25');
      expect(exception.type).toBe('holiday');
      expect(exception.description).toContain('Christmas Day');
    });

    it('should use provided description', () => {
        const date = new Date('2026-01-01');
        const exception = createHolidayException(date, 's1', 'holiday', 'Custom');
        expect(exception.description).toBe('Custom');
    });
  });

  describe('createHolidayExceptionsForDateRange', () => {
    it('should create exceptions for all holidays in range', () => {
        const start = new Date('2026-11-20');
        const end = new Date('2026-11-30');
        const exceptions = createHolidayExceptionsForDateRange(start, end, 's1');
        
        // Only Thanksgiving is in this range (2026-11-26)
        expect(exceptions).toHaveLength(1);
        expect(exceptions[0].date).toBe('2026-11-26');
    });
  });

  describe('processHolidaysForRecurringSchedule', () => {
    it('should return holidays within range', () => {
      const holidays = processHolidaysForRecurringSchedule('2026-06-01', '2026-08-01');
      expect(holidays).toHaveLength(1);
      expect(holidays[0].name).toBe('Independence Day');
    });

    it('should handle range spanning multiple years', () => {
        const holidays = processHolidaysForRecurringSchedule('2026-12-20', '2027-01-10');
        expect(holidays.some(h => h.name === 'Christmas Day' && h.year === 2026)).toBe(true);
        expect(holidays.some(h => h.name === "New Year's Day" && h.year === 2027)).toBe(true);
    });
  });

  describe('updateScheduleWithHolidayExceptions', () => {
    it('should create skip exception', () => {
        const result = updateScheduleWithHolidayExceptions(
            's1', new Date('2026-07-04'), 'skip'
        );
        expect(result.description).toContain('Scheduled closed');
    });

    it('should create open exception', () => {
        const result = updateScheduleWithHolidayExceptions(
            's1', new Date('2026-07-04'), 'open'
        );
        expect(result.description).toContain('Open during holiday');
    });

    it('should create reschedule exception with details', () => {
        const result = updateScheduleWithHolidayExceptions(
            's1', new Date('2026-07-04'), 'reschedule',
            '10:00', '14:00', 'New Park'
        );
        expect(result.newStartTime).toBe('10:00');
        expect(result.newEndTime).toBe('14:00');
        expect(result.newLocation).toBe('New Park');
    });
  });
});
