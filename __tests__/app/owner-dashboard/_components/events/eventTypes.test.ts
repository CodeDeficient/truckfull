import { getVettingBadgeColor, getVettingBadgeLabel, isExternalEvent, isPlatformEvent, type PlatformEvent, type ExternalEvent } from '@/app/owner-dashboard/_components/events/eventTypes';

describe('eventTypes', () => {
  describe('getVettingBadgeColor', () => {
    it('returns green for high scores (>=70)', () => {
      expect(getVettingBadgeColor(75)).toBe('green');
    });

    it('returns yellow for moderate scores (40-69)', () => {
      expect(getVettingBadgeColor(55)).toBe('yellow');
    });

    it('returns gray for low scores (<40)', () => {
      expect(getVettingBadgeColor(20)).toBe('gray');
    });

    it('returns gray for null score', () => {
      expect(getVettingBadgeColor(null)).toBe('gray');
    });
  });

  describe('getVettingBadgeLabel', () => {
    it('returns "High confidence" for high scores (>=70)', () => {
      expect(getVettingBadgeLabel(75)).toBe('High confidence');
    });

    it('returns "Low confidence" for null score', () => {
      expect(getVettingBadgeLabel(null)).toBe('Low confidence');
    });

    it('returns "Low confidence" for low scores (<40)', () => {
      expect(getVettingBadgeLabel(20)).toBe('Low confidence');
    });
  });

  describe('isExternalEvent', () => {
    it('returns true for external event', () => {
      const event = { event_source: 'external' } as ExternalEvent;
      expect(isExternalEvent(event)).toBe(true);
    });

    it('returns false for platform event', () => {
      const event = { event_source: 'platform' } as PlatformEvent;
      expect(isExternalEvent(event)).toBe(false);
    });
  });

  describe('isPlatformEvent', () => {
    it('returns true for platform event', () => {
      const event = { event_source: 'platform' } as PlatformEvent;
      expect(isPlatformEvent(event)).toBe(true);
    });

    it('returns false for external event', () => {
      const event = { event_source: 'external' } as ExternalEvent;
      expect(isPlatformEvent(event)).toBe(false);
    });
  });
});