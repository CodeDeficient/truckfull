import { describe, it, expect } from '@jest/globals';
import { isBadDate, isWithinScGaBounds, isValidUsBounds } from '@/lib/events/dateValidation';

describe('isBadDate', () => {
  describe('null dates', () => {
    it('rejects both null dates', () => {
      const result = isBadDate(null, null, 'Test Event');
      expect(result.bad).toBe(true);
      expect(result.reason).toBe('no_dates');
    });

    it('accepts only start date provided', () => {
      const result = isBadDate('01-15-2025', null, 'Test Event');
      expect(result.bad).toBe(false);
    });

    it('accepts only end date provided', () => {
      const result = isBadDate(null, '01-15-2025', 'Test Event');
      expect(result.bad).toBe(false);
    });
  });

  describe('invalid date strings', () => {
    it('rejects invalid start date', () => {
      const result = isBadDate('not-a-date', '01-15-2025', 'Test Event');
      expect(result.bad).toBe(true);
      expect(result.reason).toBe('invalid_start');
    });

    it('rejects invalid end date', () => {
      const result = isBadDate('01-15-2025', 'not-a-date', 'Test Event');
      expect(result.bad).toBe(true);
      expect(result.reason).toBe('invalid_end');
    });

    it('rejects wrong format (YYYY-MM-DD)', () => {
      const result = isBadDate('2025-01-15', '2025-01-16', 'Test Event');
      expect(result.bad).toBe(true);
      expect(result.reason).toBe('invalid_start');
    });
  });

  describe('start after end', () => {
    it('rejects start after end', () => {
      const result = isBadDate('01-20-2025', '01-15-2025', 'Test Event');
      expect(result.bad).toBe(true);
      expect(result.reason).toBe('start_after_end');
    });

    it('accepts start before end', () => {
      const result = isBadDate('01-15-2025', '01-20-2025', 'Test Event');
      expect(result.bad).toBe(false);
    });
  });

  describe('dates older than 2 years', () => {
    it('rejects dates older than 2 years', () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 3);
      const month = String(twoYearsAgo.getMonth() + 1).padStart(2, '0');
      const day = String(twoYearsAgo.getDate()).padStart(2, '0');
      const year = twoYearsAgo.getFullYear();
      const pastDate = `${month}-${day}-${year}`;
      const result = isBadDate(pastDate, null, 'Test Event');
      expect(result.bad).toBe(true);
      expect(result.reason).toBe('too_old');
    });

    it('accepts date from 1 year ago', () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const month = String(oneYearAgo.getMonth() + 1).padStart(2, '0');
      const day = String(oneYearAgo.getDate()).padStart(2, '0');
      const year = oneYearAgo.getFullYear();
      const pastDate = `${month}-${day}-${year}`;
      const result = isBadDate(pastDate, null, 'Test Event');
      expect(result.bad).toBe(false);
    });
  });

  describe('dates more than 3 years in future', () => {
    it('rejects dates more than 3 years in future', () => {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 4);
      const month = String(farFuture.getMonth() + 1).padStart(2, '0');
      const day = String(farFuture.getDate()).padStart(2, '0');
      const year = farFuture.getFullYear();
      const futureDate = `${month}-${day}-${year}`;
      const result = isBadDate(futureDate, null, 'Test Event');
      expect(result.bad).toBe(true);
      expect(result.reason).toBe('too_far_future');
    });

    it('accepts date 2 years in future', () => {
      const twoYearsFromNow = new Date();
      twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
      const month = String(twoYearsFromNow.getMonth() + 1).padStart(2, '0');
      const day = String(twoYearsFromNow.getDate()).padStart(2, '0');
      const year = twoYearsFromNow.getFullYear();
      const futureDate = `${month}-${day}-${year}`;
      const result = isBadDate(futureDate, null, 'Test Event');
      expect(result.bad).toBe(false);
    });
  });

  describe('valid dates', () => {
    it('accepts today', () => {
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const year = today.getFullYear();
      const result = isBadDate(`${month}-${day}-${year}`, null, 'Test Event');
      expect(result.bad).toBe(false);
    });

    it('accepts tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const day = String(tomorrow.getDate()).padStart(2, '0');
      const year = tomorrow.getFullYear();
      const result = isBadDate(`${month}-${day}-${year}`, null, 'Test Event');
      expect(result.bad).toBe(false);
    });

    it('accepts valid start and end date', () => {
      const result = isBadDate('01-15-2025', '01-20-2025', 'Test Event');
      expect(result.bad).toBe(false);
    });
  });
});

describe('isWithinScGaBounds', () => {
  it('returns true for Savannah, GA coordinates', () => {
    expect(isWithinScGaBounds(32.0809, -81.0912)).toBe(true);
  });

  it('returns true for Charleston, SC coordinates', () => {
    expect(isWithinScGaBounds(32.7765, -79.9311)).toBe(true);
  });

  it('returns false for Miami, FL coordinates', () => {
    expect(isWithinScGaBounds(25.7617, -80.1918)).toBe(false);
  });

  it('returns false for null lat', () => {
    expect(isWithinScGaBounds(null, -81.0)).toBe(false);
  });
});

describe('isValidUsBounds', () => {
  it('returns true for continental US coordinates', () => {
    expect(isValidUsBounds(40.7128, -74.006)).toBe(true);
    expect(isValidUsBounds(34.0522, -118.2437)).toBe(true);
  });

  it('returns false for Mexico coordinates', () => {
    expect(isValidUsBounds(19.4326, -99.1332)).toBe(false);
  });

  it('returns false for overseas US territories', () => {
    expect(isValidUsBounds(21.3069, -157.8583)).toBe(false);
  });
});