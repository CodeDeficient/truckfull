import { describe, expect, it } from '@jest/globals';
import {
  buildUpcomingSchedule,
  type UpcomingScheduleEntry,
} from '@/lib/services/upcomingSchedule';
import type { UpcomingScheduleOverride } from '@/lib/types';

const timezone = 'America/New_York';
// 2026-08-31 is a Monday in America/New_York.
const now = new Date('2026-08-31T12:00:00.000Z');

const recurring = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' },
  thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '17:00' },
  saturday: { open: '10:00', close: '16:00' },
  sunday: { open: '10:00', close: '16:00' },
};

function override(partial: Partial<UpcomingScheduleOverride>): UpcomingScheduleOverride {
  return {
    service_date: '2026-09-01',
    is_closed: false,
    is_all_day: false,
    start_time: '08:00',
    end_time: '14:00',
    ends_next_day: false,
    timezone,
    location_data: { address: '8th and Reynolds St, Augusta, GA' },
    ...partial,
  };
}

function hoursOf(entries: UpcomingScheduleEntry[]): string[] {
  return entries.map((entry) => entry.hours);
}

describe('buildUpcomingSchedule', () => {
  it('shows a future one-off override in the upcoming list with its location', () => {
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: recurring, overrides: [override({})] },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1).toBeDefined();
    expect(sep1?.day).toBe('Tue');
    expect(sep1?.hours).toBe('8a - 2p');
    expect(sep1?.dateKey).toBe('2026-09-01');
    expect(sep1?.dayOfMonth).toBe(1);
    expect(sep1?.monthShort).toBe('Sep');
    expect(sep1?.location).toBe('8th and Reynolds St, Augusta, GA');
  });

  it('omits city/state parts already present in the address text', () => {
    const entries = buildUpcomingSchedule(
      {
        timezone,
        operating_hours: recurring,
        overrides: [
          override({ location_data: { address: '1102 Broad St, Augusta, GA', fuzzy: false } }),
        ],
      },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1?.location).toBe('1102 Broad St, Augusta, GA');
  });

  it('falls back to city, state when there is no street address', () => {
    const entries = buildUpcomingSchedule(
      {
        timezone,
        operating_hours: recurring,
        overrides: [override({ location_data: { city: 'Evans', state: 'GA', fuzzy: false } })],
      },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1?.location).toBe('Evans, GA');
  });

  it('preserves coordinates when an upcoming stop has no location label', () => {
    const entries = buildUpcomingSchedule(
      {
        timezone,
        operating_hours: recurring,
        overrides: [override({ location_data: { lat: 33.47, lng: -82.01, fuzzy: false } })],
      },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1).toMatchObject({ lat: 33.47, lng: -82.01 });
  });

  it('uses an open override instead of closed recurring hours for the same date', () => {
    const closedTuesday = { ...recurring, tuesday: { closed: true } };
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: closedTuesday, overrides: [override({})] },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1?.hours).toBe('8a - 2p');
  });

  it('shows minutes only when they are 01-59', () => {
    const entries = buildUpcomingSchedule(
      {
        timezone,
        operating_hours: recurring,
        overrides: [override({ start_time: '08:07', end_time: '14:31' })],
      },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1?.hours).toBe('8:07a - 2:31p');
  });

  it('handles midnight and 12-hour boundaries', () => {
    const entries = buildUpcomingSchedule(
      {
        timezone,
        operating_hours: recurring,
        overrides: [override({ start_time: '00:00', end_time: '12:30' })],
      },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1?.hours).toBe('12a - 12:30p');
  });

  it('derives the calendar date and month from the service date', () => {
    const entries = buildUpcomingSchedule(
      {
        timezone,
        operating_hours: recurring,
        overrides: [override({ service_date: '2026-09-02' })],
      },
      now,
    );
    const sep2 = entries.find((entry) => entry.dateKey === '2026-09-02');
    expect(sep2?.dayOfMonth).toBe(2);
    expect(sep2?.monthShort).toBe('Sep');
  });

  it('suppresses open recurring hours when a closed override exists for that date', () => {
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: recurring, overrides: [override({ is_closed: true })] },
      now,
    );
    expect(entries.some((entry) => entry.dateKey === '2026-09-01')).toBe(false);
  });

  it('keeps recurring hours for future dates without an override', () => {
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: recurring, overrides: [] },
      now,
    );
    const wednesday = entries.find((entry) => entry.dateKey === '2026-09-02');
    expect(wednesday?.hours).toBe('9a - 5p');
  });

  it('fails safely on an invalid open override without hiding recurring hours', () => {
    const invalid = override({ start_time: null, end_time: null });
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: recurring, overrides: [invalid] },
      now,
    );
    const sep1 = entries.find((entry) => entry.dateKey === '2026-09-01');
    expect(sep1?.hours).toBe('9a - 5p');
  });

  it('returns results in chronological order regardless of input order', () => {
    const entries = buildUpcomingSchedule(
      {
        timezone,
        operating_hours: recurring,
        overrides: [
          override({ service_date: '2026-09-03', start_time: '11:00', end_time: '15:00' }),
          override({ service_date: '2026-09-01' }),
        ],
      },
      now,
    );
    const dateKeys = entries.map((entry) => entry.dateKey);
    expect(dateKeys).toEqual([...dateKeys].sort());
  });

  it('caps the list at three open entries within the seven-day window', () => {
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: recurring, overrides: [] },
      now,
    );
    expect(entries.length).toBeLessThanOrEqual(3);
  });

  it('returns an empty list when there are no open days in the window', () => {
    const allClosed = Object.fromEntries(
      Object.keys(recurring).map((day) => [day, { closed: true }]),
    );
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: allClosed, overrides: [] },
      now,
    );
    expect(entries).toEqual([]);
  });

  it('starts from tomorrow when startOffset is 1, excluding today', () => {
    const entries = buildUpcomingSchedule(
      { timezone, operating_hours: recurring, overrides: [], startOffset: 1 },
      now,
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].dateKey).toBe('2026-09-01');
    expect(entries.some((entry) => entry.dateKey === '2026-08-31')).toBe(false);
  });
});
