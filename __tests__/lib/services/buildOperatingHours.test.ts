import { describe, it, expect } from '@jest/globals';
import { buildOperatingHours } from '@/lib/services/truckUpdater';

describe('buildOperatingHours (recurring-safe)', () => {
  it('maps canonical weekdays into open/close records', () => {
    const result = buildOperatingHours('11:00', '14:00', ['monday', 'tuesday']);

    expect(result).toEqual({
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '11:00', close: '14:00' },
    });
  });

  it('returns empty object when days is undefined', () => {
    const result = buildOperatingHours('09:00', '17:00');

    expect(result).toEqual({});
  });

  it('returns empty object when days is empty array', () => {
    const result = buildOperatingHours('09:00', '17:00', []);

    expect(result).toEqual({});
  });

  it('returns empty object when no canonical weekday remains', () => {
    const result = buildOperatingHours('09:00', '17:00', ['today', 'tomorrow']);

    expect(result).toEqual({});
  });

  it('rejects calendar-date strings', () => {
    const result = buildOperatingHours('09:00', '17:00', ['2026-07-29', '07/29/2026']);

    expect(result).toEqual({});
  });

  it('rejects unknown tokens', () => {
    const result = buildOperatingHours('09:00', '17:00', ['next week', 'weekend']);

    expect(result).toEqual({});
  });

  it('normalizes canonical weekday abbreviations', () => {
    const result = buildOperatingHours('10:00', '20:00', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

    expect(result).toEqual({
      monday: { open: '10:00', close: '20:00' },
      tuesday: { open: '10:00', close: '20:00' },
      wednesday: { open: '10:00', close: '20:00' },
      thursday: { open: '10:00', close: '20:00' },
      friday: { open: '10:00', close: '20:00' },
      saturday: { open: '10:00', close: '20:00' },
      sunday: { open: '10:00', close: '20:00' },
    });
  });

  it('lowercases the day keys', () => {
    const result = buildOperatingHours('10:00', '20:00', ['MONDAY', 'Tuesday']);

    expect(result).toEqual({
      monday: { open: '10:00', close: '20:00' },
      tuesday: { open: '10:00', close: '20:00' },
    });
  });

  it('fails closed when any day is non-canonical', () => {
    const result = buildOperatingHours('11:00', '15:00', ['monday', 'today', 'friday', 'tomorrow']);

    expect(result).toEqual({});
  });

  it('handles a single canonical day', () => {
    const result = buildOperatingHours('08:00', '12:00', ['friday']);

    expect(result).toEqual({
      friday: { open: '08:00', close: '12:00' },
    });
  });

  it('fails closed for equal recurring times', () => {
    expect(buildOperatingHours('11:00', '11:00', ['monday'])).toEqual({});
  });

  it('persists supported AI time formats as canonical HH:MM values', () => {
    expect(buildOperatingHours('11am', '3pm', ['monday'])).toEqual({
      monday: { open: '11:00', close: '15:00' },
    });
  });
});
