import { describe, expect, it } from '@jest/globals';
import {
  getScheduleValidationDiagnostic,
  hasStrictCompleteTimes,
  isCompleteRecurringSchedule,
  normalizeCompleteTimes,
} from '@/lib/services/scheduleSemantics';

describe('active schedule semantics', () => {
  it('requires valid supported times that differ after normalization', () => {
    expect(hasStrictCompleteTimes({ start: '09:00', end: '17:00' })).toBe(true);
    expect(hasStrictCompleteTimes({ start: '9:00', end: '17:00' })).toBe(true);
    expect(hasStrictCompleteTimes({ start: '09:00', end: '09:00' })).toBe(false);
    expect(hasStrictCompleteTimes({ start: '09:00' })).toBe(false);
  });

  it('normalizes supported AI time formats before comparison and persistence', () => {
    expect(normalizeCompleteTimes({ start: '11am', end: '3pm' })).toEqual({
      start: '11:00',
      end: '15:00',
    });
    expect(hasStrictCompleteTimes({ start: '11am', end: '11:00' })).toBe(false);
    expect(
      getScheduleValidationDiagnostic({ start: '11am', end: '11:00', days: ['monday'] }),
    ).toBe('DEGENERATE_TIMES_REJECTED');
  });

  it('fails closed for non-string AI time values', () => {
    const malformed = { start: 11, end: '3pm' } as unknown as {
      start: string;
      end: string;
    };

    expect(normalizeCompleteTimes(malformed)).toBeNull();
    expect(hasStrictCompleteTimes(malformed)).toBe(false);
    expect(getScheduleValidationDiagnostic(malformed)).toBeNull();
  });

  it('defines a complete recurring schedule with the canonical weekday set', () => {
    expect(
      isCompleteRecurringSchedule({ start: '09:00', end: '17:00', days: ['Tues', 'weds'] }),
    ).toBe(true);
    expect(
      isCompleteRecurringSchedule({ start: '09:00', end: '17:00', days: ['monday', 'junk'] }),
    ).toBe(false);
  });

  it('distinguishes degenerate times from a noncanonical weekday set', () => {
    expect(
      getScheduleValidationDiagnostic({ start: '09:00', end: '09:00', days: ['monday'] }),
    ).toBe('DEGENERATE_TIMES_REJECTED');
    expect(
      getScheduleValidationDiagnostic({ start: '09:00', end: '17:00', days: ['monday', 'junk'] }),
    ).toBe('NONCANONICAL_DAYSET_REJECTED');
  });
});
