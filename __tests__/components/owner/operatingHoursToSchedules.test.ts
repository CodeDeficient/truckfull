import { describe, it, expect } from '@jest/globals';
import type { FoodTruckOperatingHours } from '@/lib/types';
import { operatingHoursToSchedules } from '@/lib/mappers/operatingHoursToSchedules';

describe('operatingHoursToSchedules', () => {
  it('maps Wednesday 08:00-13:00 to a single card titled "Wednesday Hours"', () => {
    const hours: FoodTruckOperatingHours = {
      wednesday: { open: '08:00', close: '13:00' },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      title: 'Wednesday Hours',
      dayOfWeek: 'wednesday',
      startTime: '08:00',
      endTime: '13:00',
      location: '',
      isActive: true,
    });
  });

  it('maps multiple persisted days to independent cards', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
      wednesday: { open: '08:00', close: '13:00' },
      saturday: { open: '10:00', close: '18:00' },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.title).sort()).toEqual([
      'Monday Hours',
      'Saturday Hours',
      'Wednesday Hours',
    ]);
  });

  it('skips days marked as closed', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { closed: true },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result).toHaveLength(1);
    expect(result[0].dayOfWeek).toBe('monday');
  });

  it('skips days with missing open or close', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '08:00' },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result).toHaveLength(1);
  });

  it('returns empty array for null input', () => {
    expect(operatingHoursToSchedules(null)).toEqual([]);
  });

  it('returns empty array for undefined input', () => {
    expect(operatingHoursToSchedules(undefined)).toEqual([]);
  });

  it('returns empty array for empty object', () => {
    expect(operatingHoursToSchedules({})).toEqual([]);
  });

  it('never produces demo titles like "Regular Week Schedule"', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result[0].title).not.toMatch(/Regular Week Schedule|Waterfront Location|Weekend Market/);
  });

  it('sets location to empty string (no schedule-specific location)', () => {
    const hours: FoodTruckOperatingHours = {
      wednesday: { open: '08:00', close: '13:00' },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result[0].location).toBe('');
    expect(result[0].baseLocation).toBe('');
  });

  it('preserves source time values without formatting', () => {
    const hours: FoodTruckOperatingHours = {
      friday: { open: '11:00', close: '22:00' },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result[0].startTime).toBe('11:00');
    expect(result[0].endTime).toBe('22:00');
  });

  it('generates unique string IDs for each card', () => {
    const hours: FoodTruckOperatingHours = {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '10:00', close: '18:00' },
    };

    const result = operatingHoursToSchedules(hours);

    expect(result[0].id).toBeTruthy();
    expect(result[1].id).toBeTruthy();
    expect(result[0].id).not.toBe(result[1].id);
  });
});
