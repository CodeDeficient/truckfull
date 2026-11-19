import {
  calculateNearbyTrucks,
  extractOwnerIds,
  buildTierMap,
  applySubscriptionTiers,
} from '@/lib/supabase/services/foodTruckService.helpers';
import type { FoodTruck } from '@/lib/types';

describe('foodTruckService.helpers - Pure Functions', () => {
  describe('calculateNearbyTrucks', () => {
    it('should filter trucks within radius and sort by distance', () => {
      const trucks: FoodTruck[] = [
        { id: '1', name: 'Truck 1', current_location: { lat: 32.7, lng: -79.9 } } as FoodTruck,
        { id: '2', name: 'Truck 2', current_location: { lat: 33.0, lng: -80.0 } } as FoodTruck,
        { id: '3', name: 'Truck 3', current_location: { lat: 32.71, lng: -79.91 } } as FoodTruck,
      ];

      const result = calculateNearbyTrucks(32.7, -79.9, 50, trucks, (lat1, lon1, lat2, lon2) => {
        const dLat = lat2 - lat1;
        const dLon = lon2 - lon1;
        return Math.sqrt(dLat * dLat + dLon * dLon) * 69;
      });

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('2');
    });

    it('should skip trucks with missing location data', () => {
      const trucks: FoodTruck[] = [
        { id: '1', name: 'No Location', current_location: null } as FoodTruck,
        { id: '2', name: 'Truck 2', current_location: { lat: 32.7, lng: -79.9 } } as FoodTruck,
      ];

      const result = calculateNearbyTrucks(32.7, -79.9, 50, trucks, () => 1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should skip trucks with invalid coordinates', () => {
      const trucks: FoodTruck[] = [
        { id: '1', name: 'Invalid', current_location: { lat: 'invalid' as unknown as number, lng: -79.9 } } as FoodTruck,
        { id: '2', name: 'Valid', current_location: { lat: 32.7, lng: -79.9 } } as FoodTruck,
      ];

      const result = calculateNearbyTrucks(32.7, -79.9, 50, trucks, () => 1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('should return empty array when no trucks match', () => {
      const trucks: FoodTruck[] = [
        { id: '1', name: 'Far Away', current_location: { lat: 40.7, lng: -89.9 } } as FoodTruck,
      ];

      const result = calculateNearbyTrucks(32.7, -79.9, 5, trucks, () => 500);

      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty trucks array', () => {
      const result = calculateNearbyTrucks(32.7, -79.9, 5, [], () => 10);
      expect(result).toHaveLength(0);
    });

    it('should include distance_meters and distance_miles in result', () => {
      const trucks: FoodTruck[] = [
        { id: '1', name: 'Truck 1', current_location: { lat: 32.7, lng: -79.9 } } as FoodTruck,
      ];

      const result = calculateNearbyTrucks(32.7, -79.9, 5, trucks, () => 2);

      expect(result[0].distance_miles).toBe(2);
      expect(result[0].distance_meters).toBe(2 * 1609.34);
    });

    it('should sort by distance ascending', () => {
      const trucks: FoodTruck[] = [
        { id: '1', name: 'Far', current_location: { lat: 32.9, lng: -79.9 } } as FoodTruck,
        { id: '2', name: 'Close', current_location: { lat: 32.7, lng: -79.9 } } as FoodTruck,
        { id: '3', name: 'Medium', current_location: { lat: 32.8, lng: -79.9 } } as FoodTruck,
      ];

      const result = calculateNearbyTrucks(32.7, -79.9, 50, trucks, (lat1, _lon1, lat2, _lon2) => {
        return Math.abs(lat2 - lat1) * 69;
      });

      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
    });
  });

  describe('extractOwnerIds', () => {
    it('should extract unique owner IDs from trucks', () => {
      const trucks: FoodTruck[] = [
        { id: 't1', owner_id: 'o1' } as FoodTruck,
        { id: 't2', owner_id: 'o2' } as FoodTruck,
        { id: 't3', owner_id: 'o1' } as FoodTruck,
      ];

      const result = extractOwnerIds(trucks);

      expect(result).toHaveLength(2);
      expect(result).toContain('o1');
      expect(result).toContain('o2');
    });

    it('should return empty array when no trucks', () => {
      const result = extractOwnerIds([]);
      expect(result).toHaveLength(0);
    });

    it('should skip trucks without owner_id', () => {
      const trucks: FoodTruck[] = [
        { id: 't1', owner_id: 'o1' } as FoodTruck,
        { id: 't2' } as FoodTruck,
        { id: 't3', owner_id: 'o2' } as FoodTruck,
      ];

      const result = extractOwnerIds(trucks);

      expect(result).toHaveLength(2);
      expect(result).not.toContain(undefined);
    });

    it('should return empty array when all trucks lack owner_id', () => {
      const trucks: FoodTruck[] = [
        { id: 't1' } as FoodTruck,
        { id: 't2' } as FoodTruck,
      ];

      const result = extractOwnerIds(trucks);
      expect(result).toHaveLength(0);
    });
  });

  describe('buildTierMap', () => {
    it('should create map from profiles array', () => {
      const profiles = [
        { id: 'o1', subscription_tier: 'pro' },
        { id: 'o2', subscription_tier: 'free' },
      ];

      const result = buildTierMap(profiles);

      expect(result.get('o1')).toBe('pro');
      expect(result.get('o2')).toBe('free');
    });

    it('should handle null subscription_tier', () => {
      const profiles = [{ id: 'o1', subscription_tier: null }];

      const result = buildTierMap(profiles);

      expect(result.get('o1')).toBeNull();
    });

    it('should return empty map for empty array', () => {
      const result = buildTierMap([]);
      expect(result.size).toBe(0);
    });
  });

  describe('applySubscriptionTiers', () => {
    it('should apply tier map to trucks', () => {
      const trucks: FoodTruck[] = [
        { id: 't1', owner_id: 'o1' } as FoodTruck,
        { id: 't2', owner_id: 'o2' } as FoodTruck,
      ];
      const tierMap = new Map<string, string | null>([
        ['o1', 'pro'],
        ['o2', 'free'],
      ]);

      const result = applySubscriptionTiers(trucks, tierMap);

      expect(result[0].subscription_tier).toBe('pro');
      expect(result[1].subscription_tier).toBe('free');
    });

    it('should leave tier undefined if owner not in map', () => {
      const trucks: FoodTruck[] = [
        { id: 't1', owner_id: 'o1' } as FoodTruck,
      ];
      const tierMap = new Map<string, string | null>();

      const result = applySubscriptionTiers(trucks, tierMap);

      expect(result[0].subscription_tier).toBeUndefined();
    });

    it('should handle trucks without owner_id', () => {
      const trucks: FoodTruck[] = [
        { id: 't1' } as FoodTruck,
      ];
      const tierMap = new Map<string, string | null>([['o1', 'pro']]);

      const result = applySubscriptionTiers(trucks, tierMap);

      expect(result[0].subscription_tier).toBeUndefined();
    });

    it('should not mutate original trucks array', () => {
      const trucks: FoodTruck[] = [
        { id: 't1', owner_id: 'o1' } as FoodTruck,
      ];
      const tierMap = new Map<string, string | null>([['o1', 'pro']]);

      const result = applySubscriptionTiers(trucks, tierMap);

      expect(result).not.toBe(trucks);
      expect(trucks[0].subscription_tier).toBeUndefined();
    });
  });
});
