import { describe, expect, it } from '@jest/globals';
import {
  getCurrentDayName,
  getCurrentTimeInTimezone,
  getTruckStatusFromHours,
} from '@/lib/utils/foodTruckHelpers';
import type { FoodTruckOperatingHours } from '@/lib/types';

function countFormatterConstructions(run: () => void): number {
  const original = Intl.DateTimeFormat;
  let count = 0;
  Intl.DateTimeFormat = new Proxy(original, {
    construct(target, args) {
      count += 1;
      return Reflect.construct(target, args);
    },
  });
  try {
    run();
    return count;
  } finally {
    Intl.DateTimeFormat = original;
  }
}

const operatingHours: FoodTruckOperatingHours = {
  monday: { open: '09:00', close: '17:00' },
  tuesday: { open: '09:00', close: '17:00' },
  wednesday: { open: '09:00', close: '17:00' },
  thursday: { open: '09:00', close: '17:00' },
  friday: { open: '09:00', close: '17:00' },
  saturday: { open: '09:00', close: '17:00' },
  sunday: { open: '09:00', close: '17:00' },
};

describe('per-truck timezone formatting reuses formatters', () => {
  it('does not rebuild a formatter for every truck on the status path', () => {
    const count = countFormatterConstructions(() => {
      for (let index = 0; index < 200; index += 1) {
        getTruckStatusFromHours(operatingHours, true, 'America/New_York');
      }
    });
    expect(count).toBeLessThanOrEqual(2);
  });

  it('does not rebuild a formatter for every truck when resolving the day name', () => {
    const count = countFormatterConstructions(() => {
      for (let index = 0; index < 200; index += 1) {
        getCurrentDayName(new Date('2026-08-03T15:00:00.000Z'), 'America/New_York');
      }
    });
    expect(count).toBeLessThanOrEqual(1);
  });

  it('keeps reported local time correct with reused formatters', () => {
    expect(getCurrentTimeInTimezone(new Date('2026-08-03T15:30:00.000Z'), 'America/New_York')).toBe(
      '11:30',
    );
    expect(getCurrentDayName(new Date('2026-08-03T15:00:00.000Z'), 'America/New_York')).toBe('monday');
  });
});
