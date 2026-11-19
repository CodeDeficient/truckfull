import { describe, it, expect } from '@jest/globals';
import {
  horizonDate,
  todayDate,
  floorDate,
  isPastEvent,
  SEO_HORIZON_DAYS,
  SEO_FLOOR_DAYS,
} from '@/lib/events/eventHorizon';

describe('eventHorizon', () => {
  it('todayDate returns the ISO date of the supplied today in UTC', () => {
    const fixed = new Date('2026-06-25T23:30:00Z');
    expect(todayDate(fixed)).toBe('2026-06-25');
  });

  it('horizonDate is today + exactly 365 days, in UTC', () => {
    const fixed = new Date('2026-06-25T12:00:00Z');
    expect(horizonDate(fixed)).toBe('2027-06-25');
    expect(SEO_HORIZON_DAYS).toBe(365);
  });

  it('horizonDate is robust to month boundary crossings', () => {
    const fixed = new Date('2026-12-15T00:00:00Z');
    expect(horizonDate(fixed)).toBe('2027-12-15');
  });

  it('horizonDate rolls back the year when today is late in the year', () => {
    const fixed = new Date('2026-06-25T00:00:00Z');
    expect(horizonDate(fixed)).toBe('2027-06-25');
  });

  it('does not mutate the input Date', () => {
    const fixed = new Date('2026-06-25T00:00:00Z');
    const before = fixed.toISOString();
    horizonDate(fixed);
    expect(fixed.toISOString()).toBe(before);
  });

  describe('floorDate', () => {
    it('returns ISO date of today - 730 days, in UTC', () => {
      const fixed = new Date('2026-06-25T12:00:00Z');
      expect(floorDate(fixed)).toBe('2024-06-25');
      expect(SEO_FLOOR_DAYS).toBe(730);
    });

    it('handles month boundary crossing going backwards', () => {
      const fixed = new Date('2026-03-01T00:00:00Z');
      expect(floorDate(fixed)).toBe('2024-03-01');
    });

    it('does not mutate the input Date', () => {
      const fixed = new Date('2026-06-25T00:00:00Z');
      const before = fixed.toISOString();
      floorDate(fixed);
      expect(fixed.toISOString()).toBe(before);
    });
  });

  describe('isPastEvent', () => {
    it('returns false for null start date', () => {
      expect(isPastEvent(null)).toBe(false);
    });

    it('returns false for future events', () => {
      expect(isPastEvent('2099-07-04')).toBe(false);
    });

    it('returns true for past same-day events (start=end)', () => {
      const past = new Date(Date.now() - 10 * 86400_000).toISOString().split('T')[0];
      expect(isPastEvent(past, past)).toBe(true);
    });

    it('returns false for ongoing multi-day events', () => {
      const start = new Date(Date.now() - 5 * 86400_000).toISOString().split('T')[0];
      const end = new Date(Date.now() + 1 * 86400_000).toISOString().split('T')[0];
      expect(isPastEvent(start, end)).toBe(false);
    });

    it('returns true for ended multi-day events', () => {
      const start = new Date(Date.now() - 10 * 86400_000).toISOString().split('T')[0];
      const end = new Date(Date.now() - 5 * 86400_000).toISOString().split('T')[0];
      expect(isPastEvent(start, end)).toBe(true);
    });

    it('returns false when start is today (event in progress today)', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isPastEvent(today)).toBe(false);
    });
  });
});