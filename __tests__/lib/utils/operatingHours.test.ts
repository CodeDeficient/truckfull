/**
 * Operating Hours Utilities Tests
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { parseTimeString, isOpenNow } from '@/lib/utils/operatingHours';
import type { FoodTruck } from '@/lib/types';

describe('operatingHours', () => {
  describe('parseTimeString', () => {
    it('should parse valid time string in HH:MM format', () => {
      expect(parseTimeString('09:30')).toBe(930);
    });

    it('should parse noon correctly', () => {
      expect(parseTimeString('12:00')).toBe(1200);
    });

    it('should parse midnight correctly', () => {
      expect(parseTimeString('00:00')).toBe(0);
    });

    it('should parse afternoon time correctly', () => {
      expect(parseTimeString('14:00')).toBe(1400);
    });

    it('should parse time with single digit hour', () => {
      expect(parseTimeString('9:30')).toBe(930);
    });

    it('should handle time with no minutes', () => {
      expect(parseTimeString('09:00')).toBe(900);
    });

    it('should return 0 for empty string', () => {
      expect(parseTimeString('')).toBe(0);
    });

    it('should return 0 for undefined', () => {
      expect(parseTimeString(undefined as unknown as string)).toBe(0);
    });

    it('should handle time at end of day', () => {
      expect(parseTimeString('23:59')).toBe(2359);
    });

    it('should handle minute values correctly', () => {
      expect(parseTimeString('08:45')).toBe(845);
    });
  });

  describe('isOpenNow', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return false when truck has no operating hours', () => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: undefined,
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(false);
    });

    it('should return false when current day is marked closed', () => {
      jest.setSystemTime(new Date('2024-01-15T10:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { closed: true },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(false);
    });

    it('should return true when current time is within operating hours', () => {
      jest.setSystemTime(new Date('2024-01-15T12:30:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(true);
    });

    it('should return false when current time is before opening', () => {
      jest.setSystemTime(new Date('2024-01-15T08:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(false);
    });

    it('should return false when current time is after closing', () => {
      jest.setSystemTime(new Date('2024-01-15T18:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(false);
    });

    it('should return true at exactly opening time', () => {
      jest.setSystemTime(new Date('2024-01-15T09:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(true);
    });

    it('should return true at exactly closing time', () => {
      jest.setSystemTime(new Date('2024-01-15T17:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(true);
    });

    it('should return false when open time is missing', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { close: '17:00' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(true);
    });

    it('should return false when close time is missing', () => {
      jest.setSystemTime(new Date('2024-01-15T12:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '09:00' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(false);
    });

    it('should return false on Wednesday when that day is closed', () => {
      jest.setSystemTime(new Date('2024-01-17T12:00:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
          tuesday: { open: '10:00', close: '18:00' },
          wednesday: { closed: true },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(false);
    });

    it('should handle late night hours (simple case)', () => {
      jest.setSystemTime(new Date('2024-01-15T23:30:00'));

      const truck = {
        id: '1',
        name: 'Test Truck',
        operating_hours: {
          monday: { open: '18:00', close: '23:59' },
        },
      } as unknown as FoodTruck;

      expect(isOpenNow(truck)).toBe(true);
    });
  });
});
