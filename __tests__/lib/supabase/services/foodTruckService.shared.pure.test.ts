import type { TimezoneAwareEvent, FoodTruckDomain, FoodTruck } from '@/lib/types';
import type { RawMenuItemFromDB } from '@/lib/types';
import {
  initializeEventsByTruckMap,
  transformEventRowToTimezoneAwareEvent,
  groupEventsByTruckId,
  buildTrucksWithMenu,
  buildTrucksWithMenuForFoodTruck,
  combineTrucksWithEvents,
  buildTrucksWithMenuFromPostgis,
} from '@/lib/supabase/services/foodTruckService.shared';

describe('foodTruckService.shared - Pure Functions', () => {
  describe('initializeEventsByTruckMap', () => {
    it('should create map with empty arrays for each truck ID', () => {
      const result = initializeEventsByTruckMap(['truck-1', 'truck-2', 'truck-3']);

      expect(result).toEqual({
        'truck-1': [],
        'truck-2': [],
        'truck-3': [],
      });
    });

    it('should return empty object for empty array', () => {
      const result = initializeEventsByTruckMap([]);
      expect(result).toEqual({});
    });

    it('should handle single truck ID', () => {
      const result = initializeEventsByTruckMap(['truck-1']);
      expect(result).toEqual({ 'truck-1': [] });
    });
  });

  describe('transformEventRowToTimezoneAwareEvent', () => {
    it('should transform full row correctly', () => {
      const row: Record<string, unknown> = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        title: 'Event Title',
        location: 'Location',
        description: 'Description',
        time: '10:00',
        end_time: '12:00',
        location_lat: 40.7128,
        location_lng: -74.006,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
      };

      const result = transformEventRowToTimezoneAwareEvent(row);

      expect(result.id).toBe('event-1');
      expect(result.food_truck_id).toBe('truck-1');
      expect(result.title).toBe('Event Title');
      expect(result.description).toBe('Description');
      expect(result.start_time).toBe('10:00');
      expect(result.end_time).toBe('12:00');
      expect(result.location.address).toBe('Location');
      expect(result.location.lat).toBe(40.7128);
      expect(result.location.lng).toBe(-74.006);
      expect(result.timezone).toBe('America/New_York');
      expect(result.is_recurring).toBe(false);
      expect(result.recurrence_pattern).toBe('');
    });

    it('should use location as title when title is null', () => {
      const row: Record<string, unknown> = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        title: null,
        location: 'Fallback Location',
        description: null,
        time: null,
        end_time: null,
        location_lat: null,
        location_lng: null,
        created_at: null,
        updated_at: null,
      };

      const result = transformEventRowToTimezoneAwareEvent(row);

      expect(result.title).toBe('Fallback Location');
      expect(result.description).toBe('');
      expect(result.start_time).toBe('');
      expect(result.end_time).toBe('');
      expect(result.location.lat).toBe(0);
    });

    it('should use location as title when title is undefined', () => {
      const row: Record<string, unknown> = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        title: undefined,
        location: 'Another Location',
      };

      const result = transformEventRowToTimezoneAwareEvent(row);

      expect(result.title).toBe('Another Location');
    });

    it('should handle row with missing fields', () => {
      const row: Record<string, unknown> = {
        id: 'event-1',
      };

      const result = transformEventRowToTimezoneAwareEvent(row);

      expect(result.id).toBe('event-1');
      expect(result.food_truck_id).toBeUndefined();
      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });
  });

  describe('groupEventsByTruckId', () => {
    it('should group events by truck ID', () => {
      const events: TimezoneAwareEvent[] = [
        { id: 'e1', food_truck_id: 't1', title: 'Event 1', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined },
        { id: 'e2', food_truck_id: 't2', title: 'Event 2', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined },
        { id: 'e3', food_truck_id: 't1', title: 'Event 3', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined },
      ];
      const initialMap = { t1: [], t2: [], t3: [] };

      const result = groupEventsByTruckId(events, initialMap);

      expect(result.t1).toHaveLength(2);
      expect(result.t2).toHaveLength(1);
      expect(result.t3).toHaveLength(0);
    });

    it('should handle event with unknown truck ID', () => {
      const events: TimezoneAwareEvent[] = [
        { id: 'e1', food_truck_id: 'unknown', title: 'Event 1', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined },
      ];
      const initialMap = { t1: [] };

      const result = groupEventsByTruckId(events, initialMap);

      expect((result as Record<string, TimezoneAwareEvent[]>).unknown).toHaveLength(1);
      expect(result.t1).toHaveLength(0);
    });

    it('should not mutate original map', () => {
      const events: TimezoneAwareEvent[] = [
        { id: 'e1', food_truck_id: 't1', title: 'Event 1', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined },
      ];
      const initialMap = { t1: [], t2: [] };

      const result = groupEventsByTruckId(events, initialMap);

      expect(result).not.toBe(initialMap);
      expect(result.t1).toHaveLength(1);
    });

    it('should return copy of initial map even with no events', () => {
      const events: TimezoneAwareEvent[] = [];
      const initialMap = { t1: [] };

      const result = groupEventsByTruckId(events, initialMap);

      expect(result).not.toBe(initialMap);
      expect(result.t1).toHaveLength(0);
    });
  });

  describe('buildTrucksWithMenu', () => {
    it('should add menu to trucks', () => {
      const trucks: FoodTruckDomain[] = [
        { id: 'truck-1', name: 'Truck 1' } as FoodTruckDomain,
        { id: 'truck-2', name: 'Truck 2' } as FoodTruckDomain,
      ];
      const menuItems: RawMenuItemFromDB[] = [
        { food_truck_id: 'truck-1', name: 'Item 1' } as RawMenuItemFromDB,
        { food_truck_id: 'truck-2', name: 'Item 2' } as RawMenuItemFromDB,
      ];

      const result = buildTrucksWithMenu(trucks, menuItems);

      expect(result[0]).toHaveProperty('menu');
      expect(result[1]).toHaveProperty('menu');
    });

    it('should handle truck with no menu items', () => {
      const trucks: FoodTruckDomain[] = [
        { id: 'truck-1', name: 'Truck 1' } as FoodTruckDomain,
      ];
      const menuItems: RawMenuItemFromDB[] = [];

      const result = buildTrucksWithMenu(trucks, menuItems);

      expect(result[0].menu).toEqual([]);
    });

    it('should handle empty trucks array', () => {
      const trucks: FoodTruckDomain[] = [];
      const menuItems: RawMenuItemFromDB[] = [
        { food_truck_id: 'truck-1', name: 'Item 1' } as RawMenuItemFromDB,
      ];

      const result = buildTrucksWithMenu(trucks, menuItems);

      expect(result).toEqual([]);
    });
  });

  describe('buildTrucksWithMenuForFoodTruck', () => {
    it('should add menu to FoodTruck array', () => {
      const trucks: FoodTruck[] = [
        { id: 'truck-1', name: 'Truck 1' } as FoodTruck,
        { id: 'truck-2', name: 'Truck 2' } as FoodTruck,
      ];
      const menuItems: RawMenuItemFromDB[] = [
        { food_truck_id: 'truck-1', name: 'Item 1' } as RawMenuItemFromDB,
      ];

      const result = buildTrucksWithMenuForFoodTruck(trucks, menuItems);

      expect(result[0]).toHaveProperty('menu');
      expect(result[0].menu).toHaveLength(1);
    });

    it('should handle empty trucks array', () => {
      const trucks: FoodTruck[] = [];
      const menuItems: RawMenuItemFromDB[] = [
        { food_truck_id: 'truck-1', name: 'Item 1' } as RawMenuItemFromDB,
      ];

      const result = buildTrucksWithMenuForFoodTruck(trucks, menuItems);

      expect(result).toEqual([]);
    });

    it('should assign empty menu to truck with no items', () => {
      const trucks: FoodTruck[] = [
        { id: 'truck-1', name: 'Truck 1' } as FoodTruck,
      ];
      const menuItems: RawMenuItemFromDB[] = [
        { food_truck_id: 'truck-2', name: 'Item 1' } as RawMenuItemFromDB,
      ];

      const result = buildTrucksWithMenuForFoodTruck(trucks, menuItems);

      expect(result[0].menu).toEqual([]);
    });
  });

  describe('combineTrucksWithEvents', () => {
    it('should combine trucks with their events', () => {
      const trucks: FoodTruckDomain[] = [
        { id: 'truck-1', name: 'Truck 1' } as FoodTruckDomain,
        { id: 'truck-2', name: 'Truck 2' } as FoodTruckDomain,
      ];
      const eventsByTruck: Record<string, TimezoneAwareEvent[]> = {
        'truck-1': [{ id: 'event-1', food_truck_id: 'truck-1', title: 'Event 1', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined }],
        'truck-2': [{ id: 'event-2', food_truck_id: 'truck-2', title: 'Event 2', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined }],
      };

      const result = combineTrucksWithEvents(trucks, eventsByTruck);

      expect(result[0]).toHaveProperty('events');
      expect(result[0].events).toHaveLength(1);
      expect(result[1].events).toHaveLength(1);
    });

    it('should handle truck with no events', () => {
      const trucks: FoodTruckDomain[] = [
        { id: 'truck-1', name: 'Truck 1' } as FoodTruckDomain,
      ];
      const eventsByTruck: Record<string, TimezoneAwareEvent[]> = { 'truck-1': [] };

      const result = combineTrucksWithEvents(trucks, eventsByTruck);

      expect(result[0].events).toEqual([]);
    });

    it('should handle empty trucks array', () => {
      const trucks: FoodTruckDomain[] = [];
      const eventsByTruck: Record<string, TimezoneAwareEvent[]> = { 'truck-1': [{ id: 'event-1', food_truck_id: 'truck-1', title: 'Event 1', description: '', start_time: '', end_time: '', timezone: '', location: { address: '', lat: 0, lng: 0 }, is_recurring: false, recurrence_pattern: '', created_at: undefined, updated_at: undefined }] };

      const result = combineTrucksWithEvents(trucks, eventsByTruck);

      expect(result).toEqual([]);
    });
  });

  describe('buildTrucksWithMenuFromPostgis', () => {
    it('should build trucks with menu from PostGIS data', () => {
      const postgisData = [
        { id: 'truck-1', name: 'Truck 1' },
        { id: 'truck-2', name: 'Truck 2' },
      ];
      const menuItems: RawMenuItemFromDB[] = [
        { food_truck_id: 'truck-1', name: 'Item 1' } as RawMenuItemFromDB,
      ];

      const result = buildTrucksWithMenuFromPostgis(postgisData, menuItems);

      expect(result[0]).toHaveProperty('menu');
      expect(result[0].menu).toHaveLength(1);
    });

    it('should handle empty postgisData array', () => {
      const postgisData: Array<{ id: string }> = [];
      const menuItems: RawMenuItemFromDB[] = [
        { food_truck_id: 'truck-1', name: 'Item 1' } as RawMenuItemFromDB,
      ];

      const result = buildTrucksWithMenuFromPostgis(postgisData, menuItems);

      expect(result).toEqual([]);
    });

    it('should handle truck with no menu items', () => {
      const postgisData = [{ id: 'truck-1', name: 'Truck 1' }];
      const menuItems: RawMenuItemFromDB[] = [];

      const result = buildTrucksWithMenuFromPostgis(postgisData, menuItems);

      expect(result[0].menu).toEqual([]);
    });
  });
});
