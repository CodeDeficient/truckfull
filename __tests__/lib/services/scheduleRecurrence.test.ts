import { describe, expect, it } from '@jest/globals';
import {
  describeMonthlyChoice,
  describeMonthlySkipNote,
  expandRecurrence,
  monthContainsDay,
  type RecurrenceSeries,
} from '@/lib/services/scheduleRecurrence';
import { effectiveHoursForDate, type OverrideRow } from '@/lib/services/scheduleOverride';

function series(overrides: Partial<RecurrenceSeries> = {}): RecurrenceSeries {
  return {
    id: 'series-1',
    foodTruckId: 'truck-1',
    frequency: 'daily',
    monthlyMode: null,
    startDate: '2026-09-02',
    occurrences: null,
    startTime: '09:00',
    endTime: '17:00',
    endsNextDay: false,
    location: { address: 'Series stop' },
    ...overrides,
  };
}

function override(overrides: Partial<OverrideRow> = {}): OverrideRow {
  return {
    serviceDate: '2026-09-09',
    isClosed: false,
    isAllDay: false,
    startTime: '10:00',
    endTime: '14:00',
    endsNextDay: false,
    timezone: 'America/New_York',
    location: { address: 'Override stop' },
    ...overrides,
  };
}

describe('scheduleRecurrence expansion', () => {
  it('repeat-off semantics stay with the dated override contract (no generated rows)', () => {
    // A one-off schedule is not a recurrence series at all; the override table
    // is the only writer. Expanding a series never emits anything before its start.
    const late = expandRecurrence(
      series({ startDate: '2026-09-10', occurrences: 2 }),
      '2026-09-01',
      '2026-09-30',
    );
    expect(late.map((occurrence) => occurrence.serviceDate)).toEqual(['2026-09-10', '2026-09-11']);
  });

  it('daily / after 2 counts the start date as occurrence #1', () => {
    const occurrences = expandRecurrence(
      series({ frequency: 'daily', startDate: '2026-09-02', occurrences: 2 }),
      '2026-09-01',
      '2026-09-30',
    );
    expect(occurrences.map((occurrence) => occurrence.serviceDate)).toEqual(['2026-09-02', '2026-09-03']);
    // Sept 4 stays empty unless another schedule applies.
    expect(occurrences.some((occurrence) => occurrence.serviceDate === '2026-09-04')).toBe(false);
  });

  it('weekly / after 5 covers the start date plus the next four weeks', () => {
    const occurrences = expandRecurrence(
      series({ frequency: 'weekly', startDate: '2026-09-02', occurrences: 5 }),
      '2026-09-01',
      '2026-11-30',
    );
    expect(occurrences.map((occurrence) => occurrence.serviceDate)).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-16',
      '2026-09-23',
      '2026-09-30',
    ]);
    // Sixth Wednesday is empty.
    expect(occurrences.some((occurrence) => occurrence.serviceDate === '2026-10-07')).toBe(false);
  });

  it('weekly / never keeps generating across the whole window', () => {
    const occurrences = expandRecurrence(
      series({ frequency: 'weekly', startDate: '2026-09-02', occurrences: null }),
      '2026-11-01',
      '2026-11-30',
    );
    expect(occurrences.map((occurrence) => occurrence.serviceDate)).toEqual([
      '2026-11-04',
      '2026-11-11',
      '2026-11-18',
      '2026-11-25',
    ]);
  });

  it('monthly same-date skips months without the numeric day entirely', () => {
    expect(monthContainsDay(2026, 1, 31)).toBe(false); // February
    expect(monthContainsDay(2026, 3, 31)).toBe(false); // April
    const occurrences = expandRecurrence(
      series({ frequency: 'monthly', monthlyMode: 'same_date', startDate: '2026-01-31' }),
      '2026-01-01',
      '2026-05-31',
    );
    // Jan 31 → Mar 31 → May 31; February and April are skipped, never clamped or shifted.
    expect(occurrences.map((occurrence) => occurrence.serviceDate)).toEqual([
      '2026-01-31',
      '2026-03-31',
      '2026-05-31',
    ]);
  });

  it('monthly ordinal-weekday regenerates the same ordinal weekday each month', () => {
    const occurrences = expandRecurrence(
      series({ frequency: 'monthly', monthlyMode: 'ordinal_weekday', startDate: '2026-09-02', occurrences: 3 }),
      '2026-09-01',
      '2026-12-31',
    );
    expect(occurrences.map((occurrence) => occurrence.serviceDate)).toEqual([
      '2026-09-02',
      '2026-10-07',
      '2026-11-04',
    ]);
  });

  it('never materializes occurrences beyond the finite cap even over a long window', () => {
    const occurrences = expandRecurrence(
      series({ frequency: 'daily', occurrences: 2 }),
      '2026-09-01',
      '2027-09-01',
    );
    expect(occurrences).toHaveLength(2);
    expect(occurrences.at(-1)?.serviceDate).toBe('2026-09-03');
  });

  it('describes monthly choices and the short-month skip note', () => {
    expect(describeMonthlyChoice('2026-01-31', 'same_date')).toBe('31st of each month');
    expect(describeMonthlyChoice('2026-09-02', 'ordinal_weekday')).toBe('First Wednesday');
    expect(describeMonthlySkipNote('2026-01-31', 'same_date')).toContain('31');
    expect(describeMonthlySkipNote('2026-09-02', 'same_date')).toBeNull();
    expect(describeMonthlySkipNote('2026-01-31', 'ordinal_weekday')).toBeNull();
  });
});

describe('schedule read-model precedence', () => {
  const weekly = {
    wednesday: { open: '11:00', close: '19:00', location: 'Weekly stop' },
  };

  it('a dated override wins over a generated recurrence occurrence', () => {
    const overrideRow = override({ serviceDate: '2026-09-09' });
    const effective = effectiveHoursForDate('2026-09-09', 'America/New_York', weekly, overrideRow);
    expect(effective.source).toBe('override');
    expect(effective.open).toBe('10:00');
  });

  it('a generated recurrence occurrence fills a date with no override', () => {
    const occurrenceRow: OverrideRow = {
      serviceDate: '2026-09-09',
      isClosed: false,
      isAllDay: false,
      startTime: '09:00',
      endTime: '17:00',
      endsNextDay: false,
      timezone: 'America/New_York',
      location: { address: 'Series stop' },
    };
    const effective = effectiveHoursForDate('2026-09-09', 'America/New_York', weekly, occurrenceRow);
    expect(effective.open).toBe('09:00');
    expect(effective.location).toEqual({ address: 'Series stop' });
  });

  it('indefinite weekly operating hours still answer when no override or occurrence exists', () => {
    const effective = effectiveHoursForDate('2026-09-09', 'America/New_York', weekly, null);
    expect(effective.source).toBe('recurring');
    expect(effective.open).toBe('11:00');
    expect(effective.close).toBe('19:00');
  });
});