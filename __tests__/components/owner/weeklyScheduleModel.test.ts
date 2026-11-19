import { describe, it, expect } from '@jest/globals';
import type { FoodTruckDomain, FoodTruckOperatingHours } from '@/lib/types';
import {
  buildScheduleUpdatePayload,
  buildWeeklySchedule,
  closeDay,
  formatTruckLocation,
  setDayHours,
  normalizeWeeklyScheduleForWrite,
  withManualScheduleSource,
  weeklyHoursChanged,
  type WeeklyDayModel,
} from '@/lib/mappers/weeklyScheduleModel';

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

describe('buildWeeklySchedule', () => {
  it('returns exactly seven days in Monday-Sunday order', () => {
    const result = buildWeeklySchedule(null);
    expect(result).toHaveLength(7);
    expect(result.map((d) => d.day)).toEqual([
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ]);
  });

  it('marks every day closed when hours are null', () => {
    const result = buildWeeklySchedule(null);
    expect(result.every((d) => d.isOpen === false)).toBe(true);
  });

  it('marks every day closed when hours are an empty object', () => {
    const result = buildWeeklySchedule({});
    expect(result.every((d) => d.isOpen === false)).toBe(true);
  });

  it('marks a day open when it has open and close times', () => {
    const hours: FoodTruckOperatingHours = {
      wednesday: { open: '10:00', close: '16:00' },
    };
    const result = buildWeeklySchedule(hours);
    const wed = result.find((d) => d.day === 'wednesday');
    expect(wed?.isOpen).toBe(true);
    expect(wed?.open).toBe('10:00');
    expect(wed?.close).toBe('16:00');
  });

  it('marks a day closed when closed=true even if times exist', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00', closed: true },
    };
    const result = buildWeeklySchedule(hours);
    const mon = result.find((d) => d.day === 'monday');
    expect(mon?.isOpen).toBe(false);
    expect(mon?.open).toBeUndefined();
    expect(mon?.close).toBeUndefined();
  });

  it('marks a day closed when only open is present (missing close)', () => {
    const hours: FoodTruckOperatingHours = {
      tuesday: { open: '09:00' },
    };
    const result = buildWeeklySchedule(hours);
    const tue = result.find((d) => d.day === 'tuesday');
    expect(tue?.isOpen).toBe(false);
  });

  it('preserves multiple open days and leaves others closed', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '18:00' },
    };
    const result = buildWeeklySchedule(hours);
    const openDays = result.filter((d) => d.isOpen).map((d) => d.day);
    expect(openDays).toEqual(['monday', 'saturday']);
  });

  it('reads a per-day location string when present', () => {
    const hours: FoodTruckOperatingHours = {
      wednesday: { open: '10:00', close: '16:00', location: 'Marion Square' },
    };
    const result = buildWeeklySchedule(hours);
    const wed = result.find((d) => d.day === 'wednesday');
    expect(wed?.location).toBe('Marion Square');
  });

  it('omits location when the day entry has no location', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
    };
    const result = buildWeeklySchedule(hours);
    const mon = result.find((d) => d.day === 'monday');
    expect(mon?.location).toBeUndefined();
  });
});

describe('setDayHours', () => {
  it('sets hours for a previously closed day and preserves other days', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
    };
    const next = setDayHours(hours, 'wednesday', '10:00', '16:00');
    expect(next.wednesday).toEqual({ open: '10:00', close: '16:00' });
    expect(next.monday).toEqual({ open: '09:00', close: '17:00' });
  });

  it('overwrites hours for an already-open day', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
    };
    const next = setDayHours(hours, 'monday', '08:00', '12:00');
    expect(next.monday).toEqual({ open: '08:00', close: '12:00' });
  });

  it('clears stale overnight state when edited to same-day hours', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '22:00', close: '02:00', endsNextDay: true },
    };
    const next = setDayHours(hours, 'monday', '09:00', '17:00');
    expect(next.monday).toEqual({ open: '09:00', close: '17:00' });
  });

  it('preserves overnight state when the edited range remains overnight', () => {
    const next = setDayHours(
      { monday: { open: '22:00', close: '02:00' } },
      'monday',
      '21:00',
      '01:00',
    );
    expect(next.monday).toEqual({ open: '21:00', close: '01:00', endsNextDay: true });
  });

  it('normalizes time formats before determining overnight state', () => {
    expect(setDayHours(null, 'monday', '9:00', '17:00').monday).toEqual({
      open: '09:00',
      close: '17:00',
    });
    expect(setDayHours(null, 'monday', '11:00 AM', '2:00 AM').monday).toEqual({
      open: '11:00',
      close: '02:00',
      endsNextDay: true,
    });
  });

  it('fails explicitly for invalid times', () => {
    const hours: FoodTruckOperatingHours = { monday: { open: '09:00', close: '17:00' } };
    expect(() => setDayHours(hours, 'monday', 'invalid', '17:00')).toThrow(
      'Schedule times must use HH:MM format',
    );
  });

  it('accepts persisted PostgreSQL times with seconds', () => {
    expect(setDayHours(null, 'monday', '09:00:00', '17:00:00').monday).toEqual({
      open: '09:00',
      close: '17:00',
    });
  });

  it('rejects equal start and end times', () => {
    expect(() => setDayHours(null, 'monday', '09:00', '09:00:00')).toThrow(
      'Start and end times must differ',
    );
  });

  it('does not mutate the original hours object', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
    };
    setDayHours(hours, 'tuesday', '10:00', '14:00');
    expect(hours.tuesday).toBeUndefined();
  });

  it('works on null hours by creating the first day', () => {
    const next = setDayHours(null, 'friday', '11:00', '19:00');
    expect(next.friday).toEqual({ open: '11:00', close: '19:00' });
  });

  it('persists a location string into the day entry', () => {
    const next = setDayHours(null, 'friday', '11:00', '19:00', 'Marion Square');
    expect(next.friday).toEqual({
      open: '11:00',
      close: '19:00',
      location: 'Marion Square',
    });
  });

  it('omits the location key when location is blank', () => {
    const next = setDayHours(null, 'friday', '11:00', '19:00', '   ');
    expect(next.friday).toEqual({ open: '11:00', close: '19:00' });
    expect((next.friday as { location?: unknown }).location).toBeUndefined();
  });
});

describe('normalizeWeeklyScheduleForWrite', () => {
  it('normalizes persisted PostgreSQL times before an owner write', () => {
    expect(
      normalizeWeeklyScheduleForWrite({
        monday: { open: '09:00:00', close: '17:00:00' },
      }),
    ).toEqual({
      value: { monday: { open: '09:00', close: '17:00' } },
      error: null,
    });
  });

  it('rejects a zero-duration weekly owner write', () => {
    expect(
      normalizeWeeklyScheduleForWrite({
        monday: { open: '09:00', close: '09:00:00' },
      }),
    ).toEqual({ value: null, error: 'Monday opening and closing times must differ' });
  });
});

describe('closeDay', () => {
  it('marks a previously open day as closed and preserves other days', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
      wednesday: { open: '10:00', close: '16:00' },
    };
    const next = closeDay(hours, 'monday');
    expect(next.monday).toEqual({ closed: true });
    expect(next.wednesday).toEqual({ open: '10:00', close: '16:00' });
  });

  it('marks an already-closed day as closed (idempotent)', () => {
    const hours: FoodTruckOperatingHours = {
      tuesday: { closed: true },
    };
    const next = closeDay(hours, 'tuesday');
    expect(next.tuesday).toEqual({ closed: true });
  });

  it('marks a missing day as closed', () => {
    const next = closeDay({}, 'thursday');
    expect(next.thursday).toEqual({ closed: true });
  });

  it('does not mutate the original hours object', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
    };
    closeDay(hours, 'monday');
    expect(hours.monday).toEqual({ open: '09:00', close: '17:00' });
  });
});

describe('WeeklyDayModel labels', () => {
  it('provides a human-readable label for each day', () => {
    const result = buildWeeklySchedule({});
    for (const day of WEEKDAYS) {
      const entry = result.find((d) => d.day === day);
      expect(entry?.label).toBeTruthy();
      expect(entry?.label.length).toBeGreaterThan(2);
    }
  });

  it('uses capitalized full day names', () => {
    const result = buildWeeklySchedule({});
    const labels = result.map((d) => d.label);
    expect(labels).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
  });
});

describe('formatTruckLocation', () => {
  it('returns undefined for undefined truck', () => {
    expect(formatTruckLocation(undefined)).toBeUndefined();
  });

  it('joins street, city, state, zip when all present', () => {
    const truck = {
      street_address: '123 Main St',
      city: 'Charleston',
      state: 'SC',
      zip: '29401',
    } as FoodTruckDomain;
    expect(formatTruckLocation(truck)).toBe('123 Main St, Charleston, SC, 29401');
  });

  it('skips blank address parts', () => {
    const truck = {
      street_address: '',
      city: 'Charleston',
      state: 'SC',
      zip: '',
    } as FoodTruckDomain;
    expect(formatTruckLocation(truck)).toBe('Charleston, SC');
  });

  it('falls back to current_location.address when structured address is empty', () => {
    const truck = {
      street_address: '',
      city: '',
      state: '',
      zip: '',
      current_location: { address: 'Marion Square, Downtown' },
    } as unknown as FoodTruckDomain;
    expect(formatTruckLocation(truck)).toBe('Marion Square, Downtown');
  });

  it('returns undefined when all address fields and current_location are empty', () => {
    const truck = {
      street_address: '',
      city: '',
      state: '',
      zip: '',
      current_location: { address: '' },
    } as unknown as FoodTruckDomain;
    expect(formatTruckLocation(truck)).toBeUndefined();
  });

  it('returns undefined when all address fields are empty and current_location is null', () => {
    const truck = {
      street_address: '',
      city: '',
      state: '',
      zip: '',
      current_location: null,
    } as unknown as FoodTruckDomain;
    expect(formatTruckLocation(truck)).toBeUndefined();
  });

  it('trims whitespace from address parts', () => {
    const truck = {
      street_address: '  456 Oak Ave  ',
      city: '  Mt Pleasant  ',
      state: 'SC',
      zip: '29464',
    } as FoodTruckDomain;
    expect(formatTruckLocation(truck)).toBe('456 Oak Ave, Mt Pleasant, SC, 29464');
  });
});

describe('buildScheduleUpdatePayload', () => {
  it('wraps hours in operating_hours key', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
    };
    expect(buildScheduleUpdatePayload(hours)).toEqual({
      operating_hours: { monday: { open: '09:00', close: '17:00' } },
    });
  });

  it('preserves closed days in the payload', () => {
    const hours: FoodTruckOperatingHours = {
      tuesday: { closed: true },
    };
    expect(buildScheduleUpdatePayload(hours)).toEqual({
      operating_hours: { tuesday: { closed: true } },
    });
  });

  it('returns the same hours reference (payload is a wrapper, not a clone)', () => {
    const hours: FoodTruckOperatingHours = {
      wednesday: { open: '10:00', close: '16:00' },
    };
    const payload = buildScheduleUpdatePayload(hours);
    expect(payload.operating_hours).toBe(hours);
  });
});

describe('withManualScheduleSource', () => {
  it('stamps canonical manual-source metadata onto an operating-hours write', () => {
    const stamped = withManualScheduleSource(
      { operating_hours: { monday: { open: '09:00', close: '17:00' } } },
      '2026-08-30T12:00:00.000Z',
    );

    expect(stamped).toMatchObject({
      operating_hours: { monday: { open: '09:00', close: '17:00' } },
      schedule_updated_by: 'manual',
      schedule_updated_at: '2026-08-30T12:00:00.000Z',
    });
  });

  it('stomps any client-supplied schedule source metadata', () => {
    const stamped = withManualScheduleSource(
      { schedule_updated_by: 'facebook', schedule_updated_at: '2020-01-01T00:00:00.000Z' },
      '2026-08-30T12:00:00.000Z',
    );

    expect(stamped.schedule_updated_by).toBe('manual');
    expect(stamped.schedule_updated_at).toBe('2026-08-30T12:00:00.000Z');
  });
});

describe('weeklyHoursChanged', () => {
  it('treats JSONB key reordering as unchanged hours', () => {
    const prior = {
      friday: { open: '11:00', close: '19:00' },
      monday: { open: '09:00', close: '17:00' },
    };
    const next = {
      monday: { open: '09:00', close: '17:00' },
      friday: { open: '11:00', close: '19:00' },
    };

    expect(JSON.stringify(prior)).not.toBe(JSON.stringify(next));
    expect(weeklyHoursChanged(prior, next)).toBe(false);
  });

  it('treats semantic equality from an edit-then-revert as unchanged', () => {
    const prior = {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '10:00', close: '18:00' },
    };
    const reverted = {
      tuesday: { open: '10:00', close: '18:00' },
      monday: { open: '09:00', close: '17:00' },
    };

    expect(weeklyHoursChanged(prior, reverted)).toBe(false);
  });

  it('detects actual time changes and added/removed days', () => {
    const prior = { monday: { open: '09:00', close: '17:00' } };
    expect(weeklyHoursChanged(prior, { monday: { open: '09:00', close: '18:00' } })).toBe(true);
    expect(
      weeklyHoursChanged(prior, {
        monday: { open: '09:00', close: '17:00' },
        friday: { open: '11:00', close: '15:00' },
      }),
    ).toBe(true);
    expect(weeklyHoursChanged(prior, {})).toBe(true);
    expect(
      weeklyHoursChanged(
        { monday: { closed: true } },
        { monday: { open: '09:00', close: '17:00' } },
      ),
    ).toBe(true);
  });

  it('detects a location-only edit as a schedule decision', () => {
    const prior = { thursday: { open: '11:00', close: '16:00', location: 'Old Stop' } };

    expect(
      weeklyHoursChanged(prior, {
        thursday: { open: '11:00', close: '16:00', location: 'New Stop' },
      }),
    ).toBe(true);
    expect(
      weeklyHoursChanged(prior, {
        thursday: { location: 'Old Stop', open: '11:00', close: '16:00' },
      }),
    ).toBe(false);
  });

  it('treats missing prior as changed and null as no hours', () => {
    expect(weeklyHoursChanged(null, { monday: { open: '09:00', close: '17:00' } })).toBe(true);
    expect(weeklyHoursChanged(undefined, undefined)).toBe(false);
  });
});
