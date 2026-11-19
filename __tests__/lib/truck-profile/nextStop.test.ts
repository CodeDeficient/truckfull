import { describe, expect, it } from '@jest/globals';
import { describeStopPlace, isNextStopOver, pickNextStop } from '@/lib/truck-profile/nextStop';
import type {
  CurrentDayScheduleOverride,
  CurrentDayScheduleRecurrence,
} from '@/lib/services/currentDaySchedule';

function override(partial: Partial<CurrentDayScheduleOverride>): CurrentDayScheduleOverride {
  return {
    food_truck_id: 'truck-1',
    service_date: '2026-10-12',
    is_closed: false,
    is_all_day: false,
    start_time: '11:00:00',
    end_time: '14:00:00',
    ends_next_day: false,
    timezone: 'America/New_York',
    location_data: { address: '123 Broad St, Augusta, GA' },
    ...partial,
  };
}

function recurrence(partial: Partial<CurrentDayScheduleRecurrence>): CurrentDayScheduleRecurrence {
  return {
    food_truck_id: 'truck-1',
    service_date: '2026-10-12',
    start_time: '17:00:00',
    end_time: '20:00:00',
    ends_next_day: false,
    location_data: { city: 'Augusta', state: 'GA' },
    ...partial,
  };
}

const base = { today: '2026-10-10', nowMinutes: 9 * 60 };

describe('pickNextStop', () => {
  it('returns the earliest upcoming stop across overrides and recurrences', () => {
    const stop = pickNextStop({
      ...base,
      overrides: [override({ service_date: '2026-10-14' })],
      recurrences: [recurrence({ service_date: '2026-10-12' })],
    });
    expect(stop).toEqual({
      serviceDate: '2026-10-12',
      startTime: '17:00:00',
      endTime: '20:00:00',
      isAllDay: false,
      place: 'Augusta, GA',
    });
  });

  it('lets an override replace the recurrence on the same date', () => {
    const stop = pickNextStop({
      ...base,
      overrides: [override({})],
      recurrences: [recurrence({})],
    });
    expect(stop?.startTime).toBe('11:00:00');
    expect(stop?.place).toBe('123 Broad St, Augusta, GA');
  });

  it('skips a date the truck marked closed, even when it normally serves', () => {
    const stop = pickNextStop({
      ...base,
      overrides: [override({ is_closed: true })],
      recurrences: [recurrence({}), recurrence({ service_date: '2026-10-13' })],
    });
    expect(stop?.serviceDate).toBe('2026-10-13');
  });

  it('skips a stop today that has already ended', () => {
    const stop = pickNextStop({
      ...base,
      nowMinutes: 15 * 60,
      overrides: [override({ service_date: '2026-10-10' })],
      recurrences: [recurrence({ service_date: '2026-10-11' })],
    });
    expect(stop?.serviceDate).toBe('2026-10-11');
  });

  it('keeps a stop today that is still running or runs past midnight', () => {
    expect(
      pickNextStop({
        ...base,
        nowMinutes: 13 * 60,
        overrides: [override({ service_date: '2026-10-10' })],
        recurrences: [],
      })?.serviceDate,
    ).toBe('2026-10-10');
    expect(
      pickNextStop({
        ...base,
        nowMinutes: 23 * 60,
        overrides: [],
        recurrences: [
          recurrence({
            service_date: '2026-10-10',
            start_time: '21:00:00',
            end_time: '02:00:00',
            ends_next_day: true,
          }),
        ],
      })?.serviceDate,
    ).toBe('2026-10-10');
  });

  it('ignores past dates and overrides without a usable time', () => {
    expect(
      pickNextStop({
        ...base,
        overrides: [
          override({ service_date: '2026-10-09' }),
          override({ service_date: '2026-10-12', start_time: null }),
        ],
        recurrences: [],
      }),
    ).toBeNull();
  });

  it('reports all-day stops without clock times', () => {
    const stop = pickNextStop({
      ...base,
      overrides: [override({ is_all_day: true })],
      recurrences: [],
    });
    expect(stop).toMatchObject({ isAllDay: true, startTime: null, endTime: null });
  });
});

describe('describeStopPlace', () => {
  it('prefers the street address unless the location is fuzzy', () => {
    expect(describeStopPlace({ address: ' 1 Main St ', city: 'Macon', state: 'GA' })).toBe(
      '1 Main St',
    );
    expect(
      describeStopPlace({ address: '1 Main St', city: 'Macon', state: 'GA', fuzzy: true }),
    ).toBe('Macon, GA');
  });

  it('returns null when there is nothing to name', () => {
    expect(describeStopPlace(null)).toBeNull();
    expect(describeStopPlace({})).toBeNull();
  });
});

describe('isNextStopOver', () => {
  const stop = {
    serviceDate: '2026-10-10',
    startTime: '11:00:00',
    endTime: '14:00:00',
    isAllDay: false,
    place: null,
  };
  const zone = 'America/New_York';
  const at = (iso: string): Date => new Date(iso);

  it('keeps a stop that has not ended yet', () => {
    expect(isNextStopOver(stop, zone, at('2026-10-10T17:59:00Z'))).toBe(false);
  });

  it('drops a stop once its end time has passed today', () => {
    expect(isNextStopOver(stop, zone, at('2026-10-10T18:00:00Z'))).toBe(true);
  });

  it('drops a stop dated before today', () => {
    expect(isNextStopOver(stop, zone, at('2026-10-11T13:00:00Z'))).toBe(true);
  });

  it('keeps a future stop', () => {
    expect(
      isNextStopOver({ ...stop, serviceDate: '2026-10-12' }, zone, at('2026-10-10T23:00:00Z')),
    ).toBe(false);
  });

  it('keeps all-day and overnight stops on their own date', () => {
    const late = at('2026-10-10T23:30:00Z');
    expect(
      isNextStopOver({ ...stop, isAllDay: true, startTime: null, endTime: null }, zone, late),
    ).toBe(false);
    expect(
      isNextStopOver({ ...stop, startTime: '18:00:00', endTime: '02:00:00' }, zone, late),
    ).toBe(false);
  });

  it('keeps the stop when the timezone is missing or invalid', () => {
    const late = at('2026-10-11T13:00:00Z');
    expect(isNextStopOver(stop, null, late)).toBe(false);
    expect(isNextStopOver(stop, 'Not/AZone', late)).toBe(false);
  });
});
