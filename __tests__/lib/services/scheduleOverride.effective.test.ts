import { describe, expect, it } from '@jest/globals';
import {
  effectiveHoursForDate,
  type OverrideRow,
  type RecurringHours,
} from '@/lib/services/scheduleOverride';

const recurring: RecurringHours = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { closed: true },
};

function makeOverride(overrides?: Partial<OverrideRow>): OverrideRow {
  return {
    serviceDate: '2026-08-03',
    isClosed: false,
    isAllDay: false,
    startTime: '22:00',
    endTime: '02:00',
    endsNextDay: true,
    timezone: 'America/New_York',
    ...overrides,
  };
}

describe('effectiveHoursForDate', () => {
  it('returns an overnight override without discarding endsNextDay', () => {
    expect(
      effectiveHoursForDate('2026-08-03', 'America/New_York', recurring, makeOverride()),
    ).toEqual({
      open: '22:00',
      close: '02:00',
      isClosed: false,
      isAllDay: false,
      endsNextDay: true,
      source: 'override',
      location: null,
      closedReason: null,
    });
  });

  it('returns closed for a closed recurring day', () => {
    expect(effectiveHoursForDate('2026-08-04', 'America/New_York', recurring, null)).toEqual({
      open: null,
      close: null,
      isClosed: true,
      isAllDay: false,
      endsNextDay: false,
      source: 'recurring',
      location: null,
      closedReason: 'closed',
    });
  });

  it('falls back to recurring hours when no override exists', () => {
    expect(effectiveHoursForDate('2026-08-03', 'America/New_York', recurring, null)).toEqual({
      open: '09:00',
      close: '17:00',
      isClosed: false,
      isAllDay: false,
      endsNextDay: false,
      source: 'recurring',
      location: null,
      closedReason: null,
    });
  });

  it('uses the dated location when an override replaces recurring hours', () => {
    expect(
      effectiveHoursForDate(
        '2026-08-03',
        'America/New_York',
        { monday: { open: '09:00', close: '17:00', location: 'Weekly stop' } },
        makeOverride({ location: { address: 'Marion Square' } }),
      ),
    ).toMatchObject({
      open: '22:00',
      close: '02:00',
      source: 'override',
      location: { address: 'Marion Square' },
    });
  });
});
