import { describe, expect, it } from '@jest/globals';
import {
  currentDayRecurrenceKey,
  expandPublicScheduleRecurrences,
  isBoundedPublicOverrideDateRange,
  isBoundedPublicScheduleDateRange,
  type PublicRecurrenceRow,
} from '@/lib/services/publicScheduleRecurrence';

function recurrenceRow(overrides: Partial<PublicRecurrenceRow> = {}): PublicRecurrenceRow {
  return {
    id: 'series-1',
    food_truck_id: 'truck-1',
    frequency: 'daily',
    monthly_mode: null,
    start_date: '2026-09-02',
    occurrences: 2,
    start_time: '09:00:00',
    end_time: '17:00:00',
    ends_next_day: false,
    location_data: null,
    ...overrides,
  };
}

describe('expandPublicScheduleRecurrences', () => {
  it('indexes expanded occurrences by truck and service date', () => {
    const result = expandPublicScheduleRecurrences([recurrenceRow()], '2026-09-01', '2026-09-03');
    expect(result[currentDayRecurrenceKey('truck-1', '2026-09-02')]).toMatchObject({
      start_time: '09:00:00',
      end_time: '17:00:00',
    });
    expect(result[currentDayRecurrenceKey('truck-1', '2026-09-03')]).toBeDefined();
  });

  it('does not expose occurrences after a finite series cap', () => {
    const result = expandPublicScheduleRecurrences(
      [recurrenceRow({ occurrences: 1 })],
      '2026-09-01',
      '2026-09-03',
    );
    expect(result[currentDayRecurrenceKey('truck-1', '2026-09-03')]).toBeUndefined();
  });

  it('lets the later deterministically ordered series win when series overlap', () => {
    const result = expandPublicScheduleRecurrences(
      [
        recurrenceRow(),
        recurrenceRow({ id: 'series-2', start_time: '12:00:00', end_time: '20:00:00' }),
      ],
      '2026-09-02',
      '2026-09-02',
    );
    expect(result[currentDayRecurrenceKey('truck-1', '2026-09-02')]).toMatchObject({
      start_time: '12:00:00',
      end_time: '20:00:00',
    });
  });
});

describe('isBoundedPublicScheduleDateRange', () => {
  it('accepts the four-date window needed across extreme truck timezones', () => {
    expect(isBoundedPublicScheduleDateRange('2026-09-01', '2026-09-04')).toBe(true);
  });

  it('rejects reversed and over-wide ranges', () => {
    expect(isBoundedPublicScheduleDateRange('2026-09-03', '2026-09-01')).toBe(false);
    expect(isBoundedPublicScheduleDateRange('2026-09-01', '2026-09-05')).toBe(false);
  });
});

describe('isBoundedPublicOverrideDateRange', () => {
  it('accepts the previous day through a week ahead across extreme truck timezones', () => {
    expect(isBoundedPublicOverrideDateRange('2026-09-01', '2026-09-04', '2026-09-10')).toBe(true);
  });

  it('rejects an override end before the schedule end or beyond ten days', () => {
    expect(isBoundedPublicOverrideDateRange('2026-09-01', '2026-09-04', '2026-09-03')).toBe(false);
    expect(isBoundedPublicOverrideDateRange('2026-09-01', '2026-09-04', '2026-09-12')).toBe(false);
  });
});
