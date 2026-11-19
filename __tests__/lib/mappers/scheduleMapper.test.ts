import { describe, it, expect } from '@jest/globals';
import {
  mapSchedulesToInfoTruckCardFormat,
  mapEventsToInfoTruckCardFormat,
} from '@/lib/mappers/scheduleMapper';

describe('scheduleMapper', () => {
  describe('mapSchedulesToInfoTruckCardFormat', () => {
    it('maps basic schedule fields', () => {
      const schedules = [{ id: 's1', food_truck_id: 't1', day_of_week: 'Monday', is_active: true }];
      const result = mapSchedulesToInfoTruckCardFormat(schedules);
      expect(result[0].id).toBe('s1');
      expect(result[0].food_truck_id).toBe('t1');
      expect(result[0].day_of_week).toBe(1);
      expect(result[0].is_active).toBe(true);
    });

    it('handles Sunday', () => {
      const schedules = [{ id: 's1', food_truck_id: 't1', day_of_week: 'Sunday', is_active: true }];
      const result = mapSchedulesToInfoTruckCardFormat(schedules);
      expect(result[0].day_of_week).toBe(0);
    });

    it('handles short day names', () => {
      const schedules = [{ id: 's1', food_truck_id: 't1', day_of_week: 'Mon', is_active: true }];
      const result = mapSchedulesToInfoTruckCardFormat(schedules);
      expect(result[0].day_of_week).toBe(1);
    });

    it('handles case insensitive matching', () => {
      const schedules = [{ id: 's1', food_truck_id: 't1', day_of_week: 'MONDAY', is_active: true }];
      const result = mapSchedulesToInfoTruckCardFormat(schedules);
      expect(result[0].day_of_week).toBe(1);
    });

    it('defaults to 0 for unrecognized day string', () => {
      const schedules = [{ id: 's1', food_truck_id: 't1', day_of_week: '3', is_active: true }];
      const result = mapSchedulesToInfoTruckCardFormat(schedules);
      expect(result[0].day_of_week).toBe(0);
    });

    it('returns empty array for empty input', () => {
      const result = mapSchedulesToInfoTruckCardFormat([]);
      expect(result).toEqual([]);
    });

    it('maps multiple schedules', () => {
      const schedules = [
        { id: 's1', food_truck_id: 't1', day_of_week: 'Monday', is_active: true },
        { id: 's2', food_truck_id: 't1', day_of_week: 'Wednesday', is_active: true },
      ];
      const result = mapSchedulesToInfoTruckCardFormat(schedules);
      expect(result.length).toBe(2);
      expect(result[0].day_of_week).toBe(1);
      expect(result[1].day_of_week).toBe(3);
    });
  });

  describe('mapEventsToInfoTruckCardFormat', () => {
    it('maps basic event fields', () => {
      const events = [{ id: 'e1', title: 'Food Truck Fest', date: '2024-05-01' }];
      const result = mapEventsToInfoTruckCardFormat(events);
      expect(result[0].id).toBe('e1');
      expect(result[0].title).toBe('Food Truck Fest');
      expect(result[0].event_date).toBe('2024-05-01');
    });

    it('uses location address when available', () => {
      const events = [{
        id: 'e1',
        title: 'Event',
        date: '2024-05-01',
        location: { address: '123 Main St' },
      }];
      const result = mapEventsToInfoTruckCardFormat(events);
      expect(result[0].location_address).toBe('123 Main St');
    });

    it('falls back to location_name', () => {
      const events = [{
        id: 'e1',
        title: 'Event',
        date: '2024-05-01',
        location: { location_name: 'Central Park' },
      }];
      const result = mapEventsToInfoTruckCardFormat(events);
      expect(result[0].location_address).toBe('Central Park');
    });

    it('falls back to title when no location', () => {
      const events = [{ id: 'e1', title: 'My Event', date: '2024-05-01' }];
      const result = mapEventsToInfoTruckCardFormat(events);
      expect(result[0].title).toBe('My Event');
    });

    it('uses current date when date is undefined', () => {
      const events = [{ id: 'e1', title: 'Event' }];
      const result = mapEventsToInfoTruckCardFormat(events);
      expect(result[0].event_date).toBe(new Date().toISOString().split('T')[0]);
    });

    it('returns empty array for empty input', () => {
      const result = mapEventsToInfoTruckCardFormat([]);
      expect(result).toEqual([]);
    });

    it('maps multiple events', () => {
      const events = [
        { id: 'e1', title: 'Event 1', date: '2024-05-01' },
        { id: 'e2', title: 'Event 2', date: '2024-05-02' },
      ];
      const result = mapEventsToInfoTruckCardFormat(events);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('e1');
      expect(result[1].id).toBe('e2');
    });
  });
});