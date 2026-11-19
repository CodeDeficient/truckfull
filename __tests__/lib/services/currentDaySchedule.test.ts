import { describe, expect, it } from '@jest/globals';
import {
  buildCurrentDaySchedule,
  chunkTruckIds,
  previousDateKey,
  type CurrentDayScheduleOverride,
  type CurrentDayScheduleRecurrence,
} from '@/lib/services/currentDaySchedule';
import { formatDateInTimezone } from '@/lib/utils/foodTruckHelpers';

const recurring = {
  sunday: { open: '09:00', close: '17:00' },
  monday: { open: '09:00', close: '17:00' },
};

const openOverride: CurrentDayScheduleOverride = {
  food_truck_id: 'truck-1',
  service_date: '2026-08-03',
  is_closed: false,
  is_all_day: false,
  start_time: '12:00',
  end_time: '20:00',
  ends_next_day: false,
  timezone: 'America/New_York',
  location_data: { address: '123 Main St' },
};

const recurrence: CurrentDayScheduleRecurrence = {
  food_truck_id: 'truck-1',
  service_date: '2026-08-03',
  start_time: '11:00',
  end_time: '19:00',
  ends_next_day: false,
};

describe('buildCurrentDaySchedule', () => {
  it('uses an open dated override instead of recurring hours', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        openOverride,
      ),
    ).toMatchObject({
      serviceDate: '2026-08-03',
      hours: { open: '12:00', close: '20:00', closed: false },
    });
  });

  it('uses a dated closed override instead of recurring hours', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        { ...openOverride, is_closed: true, start_time: null, end_time: null, location_data: null },
      ),
    ).toMatchObject({
      hours: { open: undefined, close: undefined, closed: true },
    });
  });

  it('uses a recurrence occurrence instead of weekly hours', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        null,
        null,
        recurrence,
      ),
    ).toMatchObject({
      hours: { open: '11:00', close: '19:00', closed: false },
    });
  });

  it('uses a dated override instead of a recurrence occurrence', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        openOverride,
        null,
        recurrence,
      ),
    ).toMatchObject({
      hours: { open: '12:00', close: '20:00', closed: false },
    });
  });

  it('falls back to recurring hours when no matching override exists', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        { ...openOverride, service_date: '2026-08-04' },
      ),
    ).toMatchObject({
      serviceDate: '2026-08-03',
      hours: { open: '09:00', close: '17:00', closed: false },
    });
  });

  it('uses the truck timezone when the browser/server date differs', () => {
    expect(
      buildCurrentDaySchedule(
        {
          timezone: 'Pacific/Auckland',
          operating_hours: { monday: { open: '09:00', close: '17:00' } },
        },
        new Date('2026-08-02T12:30:00.000Z'),
        null,
      ),
    ).toMatchObject({ serviceDate: '2026-08-03' });
  });

  it('continues a previous-day overnight override after local midnight', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-04T05:00:00.000Z'),
        null,
        {
          ...openOverride,
          service_date: '2026-08-03',
          start_time: '22:00',
          end_time: '02:00',
          ends_next_day: true,
        },
      ),
    ).toMatchObject({
      serviceDate: '2026-08-04',
      hoursServiceDate: '2026-08-03',
      hours: { open: '22:00', close: '02:00', endsNextDay: true },
    });
  });

  it('continues a recurring overnight schedule after local midnight', () => {
    expect(
      buildCurrentDaySchedule(
        {
          timezone: 'America/New_York',
          operating_hours: { monday: { open: '22:00', close: '02:00', endsNextDay: true } },
        },
        new Date('2026-08-04T05:00:00.000Z'),
        null,
      ),
    ).toMatchObject({
      serviceDate: '2026-08-04',
      hoursServiceDate: '2026-08-03',
      hours: { open: '22:00', close: '02:00', endsNextDay: true },
    });
  });
});

describe('current-day location resolution', () => {
  const locatedOverride: CurrentDayScheduleOverride = {
    ...openOverride,
    location_data: { address: '8th and Reynolds St', city: 'Augusta', state: 'GA' },
  };

  it("returns the override location when today's override governs", () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        locatedOverride,
      ),
    ).toMatchObject({
      serviceDate: '2026-08-03',
      location: { address: '8th and Reynolds St', city: 'Augusta', state: 'GA' },
    });
  });

  it('keeps the previous-day override location while its overnight schedule is still active', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-04T05:00:00.000Z'),
        null,
        {
          ...locatedOverride,
          service_date: '2026-08-03',
          start_time: '22:00',
          end_time: '02:00',
          ends_next_day: true,
        },
      ),
    ).toMatchObject({
      serviceDate: '2026-08-04',
      hoursServiceDate: '2026-08-03',
      location: { address: '8th and Reynolds St' },
    });
  });

  it('returns the recurrence location when a recurrence governs today', () => {
    const recurrenceWithLocation: CurrentDayScheduleRecurrence = {
      ...recurrence,
      location_data: { address: 'Forsyth Park', city: 'Savannah', state: 'GA' },
    };
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        null,
        null,
        recurrenceWithLocation,
      ),
    ).toMatchObject({ location: { address: 'Forsyth Park' } });
  });

  it('returns no location when a closed override governs today', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        { ...locatedOverride, is_closed: true, start_time: null, end_time: null },
      ),
    ).toMatchObject({ hours: { closed: true }, location: null });
  });

  it('never relocates the truck for plain weekly hours', () => {
    const weeklyWithLocation = { ...recurring, monday: { open: '09:00', close: '17:00', location: 'Some Venue' } };
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: weeklyWithLocation },
        new Date('2026-08-03T15:00:00.000Z'),
        null,
      ),
    ).toMatchObject({ location: null });
  });

  it('returns no location when an override has no location data', () => {
    expect(
      buildCurrentDaySchedule(
        { timezone: 'America/New_York', operating_hours: recurring },
        new Date('2026-08-03T15:00:00.000Z'),
        { ...locatedOverride, location_data: null },
      ),
    ).toMatchObject({ hours: { open: '12:00' }, location: null });
  });
});

describe('chunkTruckIds', () => {
  it('keeps a collection lookup batched instead of creating one query per truck', () => {
    expect(chunkTruckIds(['truck-1', 'truck-2', 'truck-3'], 500)).toEqual([
      ['truck-1', 'truck-2', 'truck-3'],
    ]);
  });

  it('bounds larger collection lookups by chunk size', () => {
    const ids = Array.from({ length: 501 }, (_, index) => `truck-${index}`);
    const chunks = chunkTruckIds(ids, 500);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(1);
  });
});

describe('timezone date labels', () => {
  it('advances local calendar dates across daylight-saving transitions', () => {
    expect(formatDateInTimezone(new Date('2024-11-03T04:30:00.000Z'), 'America/New_York', 1)).toBe(
      'Nov 4',
    );
    expect(previousDateKey('2024-11-04')).toBe('2024-11-03');
  });
});
