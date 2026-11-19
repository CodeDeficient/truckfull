import { describe, it, expect } from '@jest/globals';
import {
  resolveEventDate,
  isPlausibleYear,
  todayISO,
  todayFormatted,
} from '@/lib/research/dateResolution';

describe('resolveEventDate', () => {
  describe('with plausible years', () => {
    it('passes through a date with a valid year', () => {
      const result = resolveEventDate('2026-06-15', null);
      expect(result.date).toBe('2026-06-15');
      expect(result.endDate).toBeNull();
      expect(result.yearWasInferred).toBe(false);
    });

    it('passes through both start and end date with valid years', () => {
      const result = resolveEventDate('2026-06-15', '2026-06-17');
      expect(result.date).toBe('2026-06-15');
      expect(result.endDate).toBe('2026-06-17');
      expect(result.yearWasInferred).toBe(false);
    });

    it('handles end date in next year for multi-day events crossing Jan 1', () => {
      const result = resolveEventDate('2026-12-30', '2027-01-02');
      expect(result.date).toBe('2026-12-30');
      expect(result.endDate).toBe('2027-01-02');
      expect(result.yearWasInferred).toBe(false);
    });
  });

  describe('with year-less dates (1970 sentinel)', () => {
    it('returns null when year is the 1970 sentinel', () => {
      const result = resolveEventDate('1970-05-01', '1970-05-03');
      expect(result.date).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.yearWasInferred).toBe(true);
    });

    it('returns null for past month-day with 1970 sentinel', () => {
      const result = resolveEventDate('1970-04-01', null);
      expect(result.date).toBeNull();
      expect(result.yearWasInferred).toBe(true);
    });

    it('returns null for today-equivalent with 1970 sentinel', () => {
      const result = resolveEventDate('1970-05-01', null);
      expect(result.date).toBeNull();
      expect(result.yearWasInferred).toBe(true);
    });

    it('returns null for year-less end date that wraps with 1970 sentinel', () => {
      const result = resolveEventDate('1970-12-28', '1970-01-03');
      expect(result.date).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.yearWasInferred).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('returns nulls for null date', () => {
      const result = resolveEventDate(null, null);
      expect(result.date).toBeNull();
      expect(result.endDate).toBeNull();
      expect(result.yearWasInferred).toBe(false);
    });

    it('returns nulls for unparseable date', () => {
      const result = resolveEventDate('not-a-date', null);
      expect(result.date).toBeNull();
      expect(result.endDate).toBeNull();
    });

    it('handles invalid month/day gracefully', () => {
      const result = resolveEventDate('1970-13-45', null);
      expect(result.date).toBeNull();
    });
  });
});

describe('isPlausibleYear', () => {
  it('accepts years between 2020 and 2035', () => {
    expect(isPlausibleYear(2020)).toBe(true);
    expect(isPlausibleYear(2026)).toBe(true);
    expect(isPlausibleYear(2035)).toBe(true);
  });

  it('rejects years outside range', () => {
    expect(isPlausibleYear(1970)).toBe(false);
    expect(isPlausibleYear(2019)).toBe(false);
    expect(isPlausibleYear(2036)).toBe(false);
  });
});

describe('todayISO', () => {
  it('returns a YYYY-MM-DD formatted string', () => {
    const result = todayISO();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('todayFormatted', () => {
  it('returns a human-readable date string', () => {
    const result = todayFormatted();
    expect(result.length).toBeGreaterThan(0);
  });
});