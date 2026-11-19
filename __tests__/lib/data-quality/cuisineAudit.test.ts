import { describe, expect, it } from '@jest/globals';
import {
  auditTruckCuisines,
  cuisinesChanged,
  type CuisineAuditInput,
} from '@/lib/data-quality/cuisineAudit';

function truck(overrides: Partial<CuisineAuditInput>): CuisineAuditInput {
  return {
    id: 'truck-1',
    name: 'Test Truck',
    city: 'Augusta',
    description: null,
    cuisine_type: [],
    ...overrides,
  };
}

describe('auditTruckCuisines', () => {
  it('drops Indian from Caribbean trucks', () => {
    const result = auditTruckCuisines(
      truck({ name: 'Family Jerk', cuisine_type: ['Caribbean', 'Jamaican', 'Indian'] }),
    );
    expect(result.after).toEqual(['Caribbean', 'Jamaican']);
    expect(cuisinesChanged(result)).toBe(true);
  });

  it('drops a cuisine that only comes from the city name', () => {
    const result = auditTruckCuisines(
      truck({
        name: 'Sumo Doughnuts',
        city: 'Indian Land',
        description: 'Fresh doughnuts in Indian Land, SC.',
        cuisine_type: ['Japanese', 'Indian', 'Bakery'],
      }),
    );
    expect(result.after).toEqual(['Japanese', 'Bakery']);
  });

  it('keeps Indian for a real Indian truck in Indian Land', () => {
    const result = auditTruckCuisines(
      truck({ name: 'Nizam Bistro', city: 'Indian Land', cuisine_type: ['Indian'] }),
    );
    expect(result.after).toEqual(['Indian']);
    expect(result.needsReview).toEqual([]);
    expect(cuisinesChanged(result)).toBe(false);
  });

  it('replaces menu items with their cuisine and dedupes', () => {
    const result = auditTruckCuisines(
      truck({ cuisine_type: ['Indian', 'German', 'Hot Dogs', 'American'] }),
    );
    expect(result.after).toEqual(['Indian', 'German', 'American']);
    expect(result.needsReview).toHaveLength(1);
  });

  it('flags unsupported Indian for review without removing it', () => {
    const result = auditTruckCuisines(
      truck({ name: 'Bowl N Burrito', cuisine_type: ['Mexican', 'Indian'] }),
    );
    expect(result.after).toEqual(['Mexican', 'Indian']);
    expect(result.needsReview).toHaveLength(1);
  });

  it('accepts Indian evidence from the description', () => {
    const result = auditTruckCuisines(
      truck({
        name: 'Say2Kiran',
        description: 'Chicken biryani and samosas',
        cuisine_type: ['Indian'],
      }),
    );
    expect(result.needsReview).toEqual([]);
  });

  it('does not treat West Indian text as Indian evidence', () => {
    const result = auditTruckCuisines(
      truck({ name: 'Island Spice', description: 'West Indian roti', cuisine_type: ['Indian'] }),
    );
    expect(result.needsReview).toHaveLength(1);
  });

  it('handles trucks with no cuisine', () => {
    const result = auditTruckCuisines(truck({ cuisine_type: null }));
    expect(result.after).toEqual([]);
    expect(cuisinesChanged(result)).toBe(false);
  });
});
