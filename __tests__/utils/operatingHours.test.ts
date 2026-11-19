import { jest } from '@jest/globals';
import { parseTimeString, isOpenNow } from '@/lib/utils/operatingHours';
import type { FoodTruck } from '@/lib/types';

describe('parseTimeString', () => {
  it('should parse valid time strings correctly', () => {
    expect(parseTimeString('09:30')).toBe(930);
    expect(parseTimeString('14:00')).toBe(1400);
    expect(parseTimeString('00:00')).toBe(0);
    expect(parseTimeString('23:59')).toBe(2359);
    expect(parseTimeString('12:15')).toBe(1215);
  });

  it('should handle undefined or empty strings', () => {
    expect(parseTimeString('')).toBe(0);
    expect(parseTimeString(undefined as unknown as string)).toBe(0);
  });

  it('should handle single digit hours or minutes gracefully if encountered', () => {
    expect(parseTimeString('9:3')).toBe(903);
    expect(parseTimeString('0:0')).toBe(0);
    expect(parseTimeString('0:10')).toBe(10);
  });
});

describe('isOpenNow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockTruckBase: Partial<FoodTruck> = {
    operating_hours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '10:00', close: '22:00', closed: false },
      wednesday: { closed: true },
    },
  };

  it('should return true if truck is open at current time', () => {
    // Mock date to a Monday at 12:00 (Noon)
    // 2023-10-02 is a Monday
    jest.setSystemTime(new Date(2023, 9, 2, 12, 0, 0));
    expect(isOpenNow(mockTruckBase as FoodTruck)).toBe(true);

    // Mock date to a Tuesday at 21:59
    // 2023-10-03 is a Tuesday
    jest.setSystemTime(new Date(2023, 9, 3, 21, 59, 0));
    expect(isOpenNow(mockTruckBase as FoodTruck)).toBe(true);
  });

  it('should return false if truck is not open at current time (before open)', () => {
    // Mock date to a Monday at 08:59
    jest.setSystemTime(new Date(2023, 9, 2, 8, 59, 0));
    expect(isOpenNow(mockTruckBase as FoodTruck)).toBe(false);
  });

  it('should return false if truck is not open at current time (after close)', () => {
    // Mock date to a Monday at 17:01
    jest.setSystemTime(new Date(2023, 9, 2, 17, 1, 0));
    expect(isOpenNow(mockTruckBase as FoodTruck)).toBe(false);
  });

  it('should return false if truck is closed on the current day', () => {
    // Mock date to a Wednesday at 12:00 (Noon)
    // 2023-10-04 is a Wednesday
    jest.setSystemTime(new Date(2023, 9, 4, 12, 0, 0));
    expect(isOpenNow(mockTruckBase as FoodTruck)).toBe(false);
  });

  it('should return false if truck has no operating hours defined for the current day', () => {
    // Mock date to a Thursday at 12:00 (Noon)
    // 2023-10-05 is a Thursday
    jest.setSystemTime(new Date(2023, 9, 5, 12, 0, 0));
    expect(isOpenNow(mockTruckBase as FoodTruck)).toBe(false);
  });

  it('should return false if operating_hours is undefined or null', () => {
    jest.setSystemTime(new Date(2023, 9, 2, 12, 0, 0)); // Monday

    expect(isOpenNow({} as FoodTruck)).toBe(false);
    expect(isOpenNow({ operating_hours: null } as unknown as FoodTruck)).toBe(false);
  });
});
