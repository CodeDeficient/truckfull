import type { Event, FoodTruckSchedule } from '@/lib/types';
import type { Database } from '@/lib/database.remote.types';
import {
  mapRowToEvent,
  mapRowToSchedule,
  groupEventsByTruck,
  groupSchedulesByTruck,
} from '@/lib/supabase/services/scheduleService';

type EventRow = Database['public']['Tables']['events']['Row'];
type ScheduleRow = Database['public']['Tables']['food_truck_schedules']['Row'];

describe('scheduleService - Pure Functions', () => {
  describe('mapRowToEvent', () => {
    it('should map full event row to Event', () => {
      const row = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        location: 'Test Location',
        description: 'Test description',
        date: '2024-12-01',
        time: '10:00',
        created_at: '2024-01-01',
      } as EventRow;

      const result = mapRowToEvent(row);

      expect(result.id).toBe('event-1');
      expect(result.food_truck_id).toBe('truck-1');
      expect(result.title).toBe('Test Location');
      expect(result.description).toBe('Test description');
      expect(result.date).toBe('2024-12-01');
      expect(result.time).toBe('10:00');
      expect(result.location.address).toBe('Test Location');
    });

    it('should handle null description', () => {
      const row = {
        id: 'e1',
        food_truck_id: 't1',
        location: 'Loc',
        description: null,
        date: '2024-12-01',
        time: '10:00',
      } as EventRow;

      const result = mapRowToEvent(row);

      expect(result.description).toBe('');
    });

    it('should use location as title', () => {
      const row = {
        id: 'e1',
        food_truck_id: 't1',
        location: 'Main St',
        description: 'Desc',
        date: '2024-12-01',
        time: '10:00',
      } as EventRow;

      const result = mapRowToEvent(row);

      expect(result.title).toBe('Main St');
      expect(result.location.address).toBe('Main St');
      expect(result.location.location_name).toBe('Main St');
    });

    it('should extract coordinates from row when present', () => {
      const row = {
        id: 'e1',
        food_truck_id: 't1',
        location: 'Loc',
        description: '',
        date: '2024-12-01',
        time: '10:00',
        lat: 40.7128,
        lng: -74.006,
      } as EventRow & { lat: number; lng: number };

      const result = mapRowToEvent(row);

      expect(result.location.lat).toBe(40.7128);
      expect(result.location.lng).toBe(-74.006);
    });

    it('should leave lat/lng undefined when not numbers', () => {
      const row = {
        id: 'e1',
        food_truck_id: 't1',
        location: 'Loc',
        description: '',
        date: '2024-12-01',
        time: '10:00',
      } as EventRow;

      const result = mapRowToEvent(row);

      expect(result.location.lat).toBeUndefined();
      expect(result.location.lng).toBeUndefined();
    });

    it('should set created_at when present', () => {
      const row = {
        id: 'e1',
        food_truck_id: 't1',
        location: 'Loc',
        description: '',
        date: '2024-12-01',
        time: '10:00',
        created_at: '2024-01-01',
      } as EventRow;

      const result = mapRowToEvent(row);

      expect(result.created_at).toBe('2024-01-01');
    });
  });

  describe('mapRowToSchedule', () => {
    it('should map schedule row to FoodTruckSchedule', () => {
      const row = {
        id: 'schedule-1',
        food_truck_id: 'truck-1',
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        location: '123 Main St',
        created_at: '2024-01-01',
      } as ScheduleRow;

      const result = mapRowToSchedule(row);

      expect(result.id).toBe('schedule-1');
      expect(result.food_truck_id).toBe('truck-1');
      expect(result.day_of_week).toBe('monday');
      expect(result.start_time).toBe('09:00');
      expect(result.end_time).toBe('17:00');
      expect(result.location_address).toBe('123 Main St');
      expect(result.location_lat).toBe(0);
      expect(result.location_lng).toBe(0);
    });

    it('should handle null location', () => {
      const row = {
        id: 's1',
        food_truck_id: 't1',
        day_of_week: 'tuesday',
        start_time: '08:00',
        end_time: '16:00',
        location: null,
        created_at: '2024-01-01',
      } as ScheduleRow;

      const result = mapRowToSchedule(row);

      expect(result.location_address).toBe('');
    });

    it('should use created_at for updated_at', () => {
      const row = {
        id: 's1',
        food_truck_id: 't1',
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        location: 'Loc',
        created_at: '2024-01-01',
      } as ScheduleRow;

      const result = mapRowToSchedule(row);

      expect(result.updated_at).toBe('2024-01-01');
    });
  });

  describe('groupEventsByTruck', () => {
    it('should group events by truck ID', () => {
      const events: Event[] = [
        { id: 'e1', food_truck_id: 't1', title: 'Event 1', description: '', date: '2024-12-01', time: '10:00', location: { address: '', lat: 0, lng: 0, location_name: '' } },
        { id: 'e2', food_truck_id: 't2', title: 'Event 2', description: '', date: '2024-12-01', time: '12:00', location: { address: '', lat: 0, lng: 0, location_name: '' } },
        { id: 'e3', food_truck_id: 't1', title: 'Event 3', description: '', date: '2024-12-01', time: '14:00', location: { address: '', lat: 0, lng: 0, location_name: '' } },
      ];

      const result = groupEventsByTruck(events, ['t1', 't2']);

      expect(result.t1).toHaveLength(2);
      expect(result.t2).toHaveLength(1);
    });

    it('should return empty arrays for truck IDs with no events', () => {
      const events: Event[] = [];

      const result = groupEventsByTruck(events, ['t1', 't2']);

      expect(result.t1).toEqual([]);
      expect(result.t2).toEqual([]);
    });

    it('should handle event for truck not in initial list', () => {
      const events: Event[] = [
        { id: 'e1', food_truck_id: 'unknown', title: 'Event 1', description: '', date: '2024-12-01', time: '10:00', location: { address: '', lat: 0, lng: 0, location_name: '' } },
      ];

      const result = groupEventsByTruck(events, ['t1']);

      expect((result as Record<string, Event[]>).unknown).toHaveLength(1);
    });

    it('should create entries for all provided truck IDs', () => {
      const events: Event[] = [];

      const result = groupEventsByTruck(events, ['t1', 't2', 't3']);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.t1).toEqual([]);
      expect(result.t2).toEqual([]);
      expect(result.t3).toEqual([]);
    });
  });

  describe('groupSchedulesByTruck', () => {
    it('should group schedules by truck ID', () => {
      const schedules: FoodTruckSchedule[] = [
        { id: 's1', food_truck_id: 't1', day_of_week: 'monday', start_time: '09:00', end_time: '17:00', location_address: '', location_lat: 0, location_lng: 0 },
        { id: 's2', food_truck_id: 't2', day_of_week: 'tuesday', start_time: '08:00', end_time: '16:00', location_address: '', location_lat: 0, location_lng: 0 },
      ];

      const result = groupSchedulesByTruck(schedules, ['t1', 't2']);

      expect(result.t1).toHaveLength(1);
      expect(result.t2).toHaveLength(1);
    });

    it('should handle empty schedules array', () => {
      const schedules: FoodTruckSchedule[] = [];

      const result = groupSchedulesByTruck(schedules, ['t1', 't2']);

      expect(result.t1).toEqual([]);
      expect(result.t2).toEqual([]);
    });

    it('should handle schedule for truck not in initial list', () => {
      const schedules: FoodTruckSchedule[] = [
        { id: 's1', food_truck_id: 'unknown', day_of_week: 'monday', start_time: '09:00', end_time: '17:00', location_address: '', location_lat: 0, location_lng: 0 },
      ];

      const result = groupSchedulesByTruck(schedules, ['t1']);

      expect((result as Record<string, FoodTruckSchedule[]>).unknown).toHaveLength(1);
    });

    it('should preserve schedule order', () => {
      const schedules: FoodTruckSchedule[] = [
        { id: 's1', food_truck_id: 't1', day_of_week: 'monday', start_time: '09:00', end_time: '17:00', location_address: '', location_lat: 0, location_lng: 0 },
        { id: 's2', food_truck_id: 't1', day_of_week: 'tuesday', start_time: '10:00', end_time: '18:00', location_address: '', location_lat: 0, location_lng: 0 },
      ];

      const result = groupSchedulesByTruck(schedules, ['t1']);

      expect(result.t1).toHaveLength(2);
      expect(result.t1[0].id).toBe('s1');
      expect(result.t1[1].id).toBe('s2');
    });
  });
});
