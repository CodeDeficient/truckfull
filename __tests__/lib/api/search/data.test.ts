import { describe, it, expect } from '@jest/globals';
import { toPublicSearchTrucks } from '@/lib/api/search/data';
import { INTERNAL_TRUCK_FIELDS } from '@/lib/types';
import type { FoodTruckDomain } from '@/lib/types';

const createTruck = (overrides: Record<string, unknown> = {}): FoodTruckDomain =>
  ({
    id: 'truck-1',
    name: 'Test Truck',
    slug: 'test-truck',
    data_quality_score: 0.8,
    verification_status: 'verified',
    owner_id: 'owner-123',
    facebook_page_id: 'page-1',
    verification_notes: 'internal',
    ...overrides,
  }) as unknown as FoodTruckDomain;

describe('toPublicSearchTrucks', () => {
  it('strips every internal field from search results', () => {
    const [truck] = toPublicSearchTrucks([createTruck()]);
    for (const field of INTERNAL_TRUCK_FIELDS) {
      expect(truck).not.toHaveProperty(field);
    }
    expect(truck).toMatchObject({ id: 'truck-1', name: 'Test Truck', slug: 'test-truck' });
  });

  it('drops trucks that are not publicly listable', () => {
    const result = toPublicSearchTrucks([
      createTruck({ id: 'listed' }),
      createTruck({ id: 'shadowbanned', verification_status: 'shadowbanned' }),
      createTruck({ id: 'rejected', verification_status: 'rejected' }),
      createTruck({ id: 'negative', data_quality_score: -1 }),
      createTruck({ id: 'unscored', data_quality_score: null }),
    ]);
    expect(result.map((truck) => truck.id)).toEqual(['listed']);
  });

  it('keeps the incoming order', () => {
    const result = toPublicSearchTrucks([createTruck({ id: 'b' }), createTruck({ id: 'a' })]);
    expect(result.map((truck) => truck.id)).toEqual(['b', 'a']);
  });
});
