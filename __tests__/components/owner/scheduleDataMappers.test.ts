import { describe, it, expect } from '@jest/globals';
import {
  mapDbScheduleToComponent,
  mapDbEventToComponent,
  mapOperatingHoursToSchedules,
} from '@/app/owner-dashboard/_components/scheduleDataMappers';
import type { FoodTruckSchedule, Event, FoodTruckOperatingHours } from '@/lib/types';

describe('scheduleDataMappers', () => {
  describe('mapDbScheduleToComponent', () => {
    it('maps a FoodTruckSchedule to the component shape', () => {
      const dbSchedule: FoodTruckSchedule = {
        id: 'sched-1',
        food_truck_id: 'truck-1',
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        location_address: '123 Main St',
        location_lat: 0,
        location_lng: 0,
      };

      const result = mapDbScheduleToComponent(dbSchedule);

      expect(result.id).toBe('sched-1');
      expect(result.title).toBe('Monday Schedule');
      expect(result.dayOfWeek).toBe('monday');
      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('17:00');
      expect(result.location).toBe('123 Main St');
      expect(result.isActive).toBe(true);
      expect(result.baseLocation).toBe('123 Main St');
      expect(result.baseStartTime).toBe('09:00');
      expect(result.baseEndTime).toBe('17:00');
      expect(result.exceptions).toEqual([]);
    });

    it('handles empty location_address', () => {
      const dbSchedule: FoodTruckSchedule = {
        id: 's1',
        food_truck_id: 't1',
        day_of_week: 'tuesday',
        start_time: '08:00',
        end_time: '16:00',
        location_address: '',
        location_lat: 0,
        location_lng: 0,
      };

      const result = mapDbScheduleToComponent(dbSchedule);

      expect(result.location).toBe('');
      expect(result.baseLocation).toBe('');
      expect(result.title).toBe('Tuesday Schedule');
    });
  });

  describe('mapDbEventToComponent', () => {
    it('maps an Event to the component shape', () => {
      const dbEvent: Event = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        title: 'Charleston Festival',
        description: 'Annual festival',
        date: '2026-12-01',
        time: '10:00',
        location: {
          address: 'Marion Square',
          lat: 32.78,
          lng: -79.93,
          location_name: 'Marion Square',
        },
      };

      const result = mapDbEventToComponent(dbEvent);

      expect(result.id).toBe('event-1');
      expect(result.name).toBe('Charleston Festival');
      expect(result.date).toBe('2026-12-01');
      expect(result.startTime).toBe('10:00');
      expect(result.endTime).toBe('');
      expect(result.location).toBe('Marion Square');
      expect(result.description).toBe('Annual festival');
      expect(result.isRecurring).toBe(false);
    });

    it('handles missing location gracefully', () => {
      const dbEvent: Event = {
        id: 'e1',
        food_truck_id: 't1',
        title: 'Farmers Market',
        date: '2026-12-18',
        time: '08:00',
      };

      const result = mapDbEventToComponent(dbEvent);

      expect(result.location).toBe('');
    });

    it('prefers start_time/end_time over time when present', () => {
      const dbEvent: Event = {
        id: 'e1',
        food_truck_id: 't1',
        title: 'Test Event',
        date: '2026-12-01',
        start_time: '09:00',
        end_time: '17:00',
        time: '10:00',
      };

      const result = mapDbEventToComponent(dbEvent);

      expect(result.startTime).toBe('09:00');
      expect(result.endTime).toBe('17:00');
    });
  });

  describe('mapOperatingHoursToSchedules', () => {
    it('converts each day of operating_hours to a recurring schedule', () => {
      const hours: FoodTruckOperatingHours = {
        monday: { open: '09:00', close: '17:00' },
        wednesday: { open: '11:00', close: '20:00' },
        saturday: { open: '10:00', close: '18:00' },
      };

      const result = mapOperatingHoursToSchedules(hours);

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        dayOfWeek: 'monday',
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
        title: 'Monday Schedule',
      });
      expect(result[1]).toMatchObject({
        dayOfWeek: 'wednesday',
        startTime: '11:00',
        endTime: '20:00',
      });
      expect(result[2].dayOfWeek).toBe('saturday');
    });

    it('skips days marked closed', () => {
      const hours: FoodTruckOperatingHours = {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { closed: true },
      };

      const result = mapOperatingHoursToSchedules(hours);

      expect(result).toHaveLength(1);
      expect(result[0].dayOfWeek).toBe('monday');
    });

    it('skips days with missing open or close', () => {
      const hours: FoodTruckOperatingHours = {
        monday: { open: '09:00', close: '17:00' },
        tuesday: { open: '08:00' },
      };

      const result = mapOperatingHoursToSchedules(hours);

      expect(result).toHaveLength(1);
    });

    it('returns empty array for null/undefined input', () => {
      expect(mapOperatingHoursToSchedules(null)).toEqual([]);
      expect(mapOperatingHoursToSchedules(undefined)).toEqual([]);
    });
  });
});