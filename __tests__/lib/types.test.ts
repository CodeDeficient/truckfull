/**
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import {
  FoodTruck,
  MenuItem,
  FoodTruckEvent,
  Event,
  Special,
  FoodTruckSchedule,
  isContactInfo,
  isCurrentLocation,
  isSocialMedia,
} from '@/lib/types';

describe('types', () => {
  describe('FoodTruck type', () => {
    it('should have required string slug', () => {
      const truck: Partial<FoodTruck> = {
        slug: 'test-truck',
      };
      expect(truck.slug).toBe('test-truck');
    });

    it('should accept optional properties', () => {
      const truck: Partial<FoodTruck> = {
        slug: 'test-truck',
        name: 'Test Truck',
        cuisine_type: 'Mexican',
        price_range: '$$',
        is_claimed: true,
        average_rating: 4.5,
      };
      expect(truck.name).toBe('Test Truck');
      expect(truck.cuisine_type).toBe('Mexican');
    });
  });

  describe('MenuItem type', () => {
    it('should require name property', () => {
      const item: MenuItem = {
        name: 'Tacos',
        price: 10.99,
      };
      expect(item.name).toBe('Tacos');
      expect(item.price).toBe(10.99);
    });

    it('should accept optional properties', () => {
      const item: MenuItem = {
        name: 'Tacos',
        description: 'Delicious tacos',
        category: 'Main',
        price: 10.99,
        dietary_info: ['vegetarian', 'gluten-free'],
        is_popular: true,
      };
      expect(item.description).toBe('Delicious tacos');
      expect(item.is_popular).toBe(true);
    });
  });

  describe('FoodTruckEvent type', () => {
    it('should require id and food_truck_id', () => {
      const event: FoodTruckEvent = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        title: 'Test Event',
      };
      expect(event.id).toBe('event-1');
      expect(event.food_truck_id).toBe('truck-1');
    });

    it('should accept optional date fields', () => {
      const event: FoodTruckEvent = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        title: 'Test Event',
        date: '2024-01-15',
        event_date: '2024-01-15',
        start_time: '10:00',
        end_time: '14:00',
      };
      expect(event.date).toBe('2024-01-15');
      expect(event.start_time).toBe('10:00');
    });
  });

  describe('Event alias', () => {
    it('should be same as FoodTruckEvent', () => {
      const event: Event = {
        id: 'event-1',
        food_truck_id: 'truck-1',
        title: 'Test Event',
      };
      expect(event.id).toBe('event-1');
    });
  });

  describe('Special type', () => {
    it('should require id, food_truck_id, name, description, and valid_until', () => {
      const special: Special = {
        id: 'special-1',
        food_truck_id: 'truck-1',
        name: 'Daily Special',
        description: '50% off',
        valid_until: '2024-12-31',
      };
      expect(special.name).toBe('Daily Special');
    });
  });

  describe('FoodTruckSchedule type', () => {
    it('should require schedule fields', () => {
      const schedule: FoodTruckSchedule = {
        id: 'schedule-1',
        food_truck_id: 'truck-1',
        day_of_week: 'monday',
        start_time: '09:00',
        end_time: '17:00',
        location_address: '123 Main St',
        location_lat: 34.0522,
        location_lng: -118.2437,
      };
      expect(schedule.day_of_week).toBe('monday');
      expect(schedule.location_lat).toBe(34.0522);
    });
  });

  describe('type guards', () => {
    describe('isContactInfo', () => {
      it('should return true for valid contact info with phone', () => {
        expect(isContactInfo({ phone: '555-1234' })).toBe(true);
      });

      it('should return true for valid contact info with email', () => {
        expect(isContactInfo({ email: 'test@example.com' })).toBe(true);
      });

      it('should return true for valid contact info with website', () => {
        expect(isContactInfo({ website: 'https://example.com' })).toBe(true);
      });

      it('should return false for invalid contact info', () => {
        expect(isContactInfo({})).toBe(false);
        expect(isContactInfo(null)).toBe(false);
        expect(isContactInfo(undefined)).toBe(false);
        expect(isContactInfo({ name: 'Test' })).toBe(false);
      });
    });

    describe('isCurrentLocation', () => {
      it('should return true for valid location with lat', () => {
        expect(isCurrentLocation({ lat: 34.0522 })).toBe(true);
      });

      it('should return true for valid location with lng', () => {
        expect(isCurrentLocation({ lng: -118.2437 })).toBe(true);
      });

      it('should return true for valid location with address', () => {
        expect(isCurrentLocation({ address: '123 Main St' })).toBe(true);
      });

      it('should return false for invalid location', () => {
        expect(isCurrentLocation({})).toBe(false);
        expect(isCurrentLocation(null)).toBe(false);
        expect(isCurrentLocation({ name: 'Test' })).toBe(false);
      });
    });

    describe('isSocialMedia', () => {
      it('should return true for valid social media with facebook', () => {
        expect(isSocialMedia({ facebook: 'https://facebook.com/test' })).toBe(true);
      });

      it('should return true for valid social media with instagram', () => {
        expect(isSocialMedia({ instagram: 'https://instagram.com/test' })).toBe(true);
      });

      it('should return true for valid social media with twitter', () => {
        expect(isSocialMedia({ twitter: 'https://twitter.com/test' })).toBe(true);
      });

      it('should return false for invalid social media', () => {
        expect(isSocialMedia({})).toBe(false);
        expect(isSocialMedia(null)).toBe(false);
        expect(isSocialMedia({ name: 'Test' })).toBe(false);
      });
    });
  });
});