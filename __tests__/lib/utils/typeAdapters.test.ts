import { describe, it, expect } from '@jest/globals';
import {
  adaptFoodTruckForComponents,
  nullToUndefined,
  type ComponentTruck,
} from '@/lib/utils/typeAdapters';
import type { FoodTruck } from '@/lib/types';

describe('typeAdapters', () => {
  describe('adaptFoodTruckForComponents', () => {
    it('converts basic fields', () => {
      const truck = {
        id: 't1',
        name: 'Test Truck',
        description: 'Description',
        cuisine_type: ['Vegan'],
        price_range: '$$',
        specialties: ['Burgers'],
        data_quality_score: 0.8,
        verification_status: 'verified' as const,
        created_at: '2024-01-01',
        updated_at: '2024-01-02',
        current_location: { lat: 40.0, lng: -70.0, address: 'NYC' },
      } as FoodTruck;

      const result = adaptFoodTruckForComponents(truck);
      expect(result.id).toBe('t1');
      expect(result.name).toBe('Test Truck');
      expect(result.description).toBe('Description');
      expect(result.cuisine_type).toEqual(['Vegan']);
    });

    it('converts null description to undefined', () => {
      const truck = { id: 't1', name: 'Truck', description: null } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.description).toBeUndefined();
    });

    it('converts null cuisine_type to undefined', () => {
      const truck = { id: 't1', name: 'Truck', cuisine_type: null } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.cuisine_type).toBeUndefined();
    });

    it('converts null data_quality_score to undefined', () => {
      const truck = { id: 't1', name: 'Truck', data_quality_score: null } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.data_quality_score).toBeUndefined();
    });

    it('converts null verification_status to undefined', () => {
      const truck = { id: 't1', name: 'Truck', verification_status: null } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.verification_status).toBeUndefined();
    });

    it('converts null created_at to undefined', () => {
      const truck = { id: 't1', name: 'Truck', created_at: null } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.created_at).toBeUndefined();
    });

    it('converts null updated_at to undefined', () => {
      const truck = { id: 't1', name: 'Truck', updated_at: null } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.updated_at).toBeUndefined();
    });

    it('parses current_location correctly', () => {
      const truck = {
        id: 't1',
        name: 'Truck',
        current_location: { address: '123 Main', lat: 40.0, lng: -70.0, timestamp: '2024-01-01' },
      } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.current_location?.address).toBe('123 Main');
      expect(result.current_location?.lat).toBe(40.0);
      expect(result.current_location?.lng).toBe(-70.0);
      expect(result.current_location?.timestamp).toBe('2024-01-01');
    });

    it('returns undefined for empty current_location', () => {
      const truck = { id: 't1', name: 'Truck', current_location: {} } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.current_location).toBeUndefined();
    });

    it('returns undefined for null current_location', () => {
      const truck = { id: 't1', name: 'Truck', current_location: null } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.current_location).toBeUndefined();
    });

    it('always sets price_range to undefined', () => {
      const truck = { id: 't1', name: 'Truck', price_range: '$$' } as unknown as FoodTruck;
      const result = adaptFoodTruckForComponents(truck);
      expect(result.price_range).toBeUndefined();
    });
  });

  describe('nullToUndefined', () => {
    it('converts null to undefined', () => {
      expect(nullToUndefined(null)).toBeUndefined();
    });

    it('passes through undefined', () => {
      expect(nullToUndefined(undefined)).toBeUndefined();
    });

    it('passes through value', () => {
      expect(nullToUndefined('value')).toBe('value');
    });

    it('works with numbers', () => {
      expect(nullToUndefined(0)).toBe(0);
      expect(nullToUndefined(42)).toBe(42);
    });

    it('works with objects', () => {
      expect(nullToUndefined({ a: 1 })).toEqual({ a: 1 });
    });

    it('works with arrays', () => {
      expect(nullToUndefined([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('ComponentTruck type', () => {
    it('accepts valid component truck', () => {
      const truck: ComponentTruck = {
        id: 't1',
        name: 'Test',
        cuisine_type: ['Vegan'],
        data_quality_score: 0.8,
      };
      expect(truck.id).toBe('t1');
    });

    it('allows optional fields to be undefined', () => {
      const truck: ComponentTruck = {
        id: 't1',
        name: 'Test',
      };
      expect(truck.description).toBeUndefined();
      expect(truck.cuisine_type).toBeUndefined();
    });
  });
});