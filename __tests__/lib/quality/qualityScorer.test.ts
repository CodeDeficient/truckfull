import { describe, it, expect } from '@jest/globals';
import {
  validateEntity,
  calculateQualityScore,
  assessQuality,
} from '@/lib/quality/qualityScorer';
import type { FoodTruck } from '@/lib/supabase/types';

function createMockTruck(overrides: Partial<FoodTruck> = {}): FoodTruck {
  return {
    id: 'truck-123',
    name: 'Valid Truck',
    description: 'A valid food truck',
    cuisine_type: ['Mexican'],
    price_range: '$$',
    average_rating: 4.5,
    review_count: 100,
    website: 'https://example.com',
    phone_number: '555-1234',
    email: 'test@example.com',
    instagram_handle: '@testtruck',
    facebook_handle: 'testtruck',
    twitter_handle: '@testtruck',
    current_location: {
      lat: 40.7128,
      lng: -74.006,
      address: '123 Main St',
    },
    operating_hours: { Monday: '9-5' },
    menu: [{ name: 'Tacos', price: 10 }],
    ...overrides,
  } as unknown as FoodTruck;
}

describe('validateEntity', () => {
  it('returns no issues for valid truck', () => {
    const truck = createMockTruck();
    const result = validateEntity(truck);

    expect(result.critical).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('returns critical issue for missing name', () => {
    const truck = createMockTruck({ name: '' });
    const result = validateEntity(truck);

    expect(result.critical).toContain('Food truck name is required');
  });

  it('returns critical issue for whitespace-only name', () => {
    const truck = createMockTruck({ name: '   ' });
    const result = validateEntity(truck);

    expect(result.critical).toContain('Food truck name is required');
  });

  it('returns critical issue for missing truck ID', () => {
    const truck = createMockTruck({ id: '' });
    const result = validateEntity(truck);

    expect(result.critical).toContain('Valid truck ID is required');
  });

  it('returns critical issue for invalid name format', () => {
    const truck = createMockTruck({ name: 'Truck@#$%' });
    const result = validateEntity(truck);

    expect(result.critical).toContain('Food truck name must be valid format and under 100 characters');
  });

  it('returns critical issue for name over 100 characters', () => {
    const truck = createMockTruck({ name: 'A'.repeat(101) });
    const result = validateEntity(truck);

    expect(result.critical).toContain('Food truck name must be valid format and under 100 characters');
  });

  it('accepts valid name with special characters', () => {
    const truck = createMockTruck({ name: "Joe's Truck & More's" });
    const result = validateEntity(truck);

    const formatIssues = result.critical.filter(
      (i) => i === 'Food truck name must be valid format and under 100 characters',
    );
    expect(formatIssues).toHaveLength(0);
  });

  it('returns warning for invalid price range', () => {
    const truck = createMockTruck({ price_range: '$$$$$' });
    const result = validateEntity(truck);

    expect(result.warnings).toContain('Price range should be provided ($, $$, $$$, or $$$$)');
  });

  it('returns warning for missing price range', () => {
    const truck = createMockTruck({ price_range: '' });
    const result = validateEntity(truck);

    expect(result.warnings).toContain('Price range should be provided ($, $$, $$$, or $$$$)');
  });

  it('accepts valid price ranges', () => {
    const validRanges = ['$', '$$', '$$$', '$$$$'];
    for (const range of validRanges) {
      const truck = createMockTruck({ price_range: range });
      const result = validateEntity(truck);

      expect(result.warnings).not.toContain('Price range should be provided ($, $$, $$$, or $$$$)');
    }
  });

  it('returns warning when location has coords but no address', () => {
    const truck = createMockTruck({
      current_location: { lat: 40.7128, lng: -74.006 },
    });
    const result = validateEntity(truck);

    expect(result.warnings).toContain('If coordinates are provided, address should also be provided');
  });

  it('returns warning for missing contact info', () => {
    const truck = createMockTruck({
      phone_number: '',
      email: '',
      website: '',
    });
    const result = validateEntity(truck);

    expect(result.warnings).toContain('At least one contact method should be provided');
  });

  it('returns warning for missing cuisine type', () => {
    const truck = createMockTruck({ cuisine_type: [] });
    const result = validateEntity(truck);

    expect(result.warnings).toContain('Cuisine type should be specified');
  });

  it('returns warning for non-array cuisine type', () => {
    const truck = createMockTruck({ cuisine_type: null as unknown as never });
    const result = validateEntity(truck);

    expect(result.warnings).toContain('Cuisine type should be specified');
  });

  it('returns info for missing description', () => {
    const truck = createMockTruck({ description: '' });
    const result = validateEntity(truck);

    expect(result.info).toContain('Description improves truck discoverability');
  });

  it('returns info for missing operating hours', () => {
    const truck = createMockTruck({ operating_hours: {} });
    const result = validateEntity(truck);

    expect(result.info).toContain('Operating hours help customers find you');
  });

  it('returns info for missing social media', () => {
    const truck = createMockTruck({
      instagram_handle: '',
      facebook_handle: '',
      twitter_handle: '',
    });
    const result = validateEntity(truck);

    expect(result.info).toContain('Social media handles increase customer engagement');
  });

  it('returns info for missing menu', () => {
    const truck = createMockTruck({ menu: [] });
    const result = validateEntity(truck);

    expect(result.info).toContain('Menu information helps customers make decisions');
  });

  it('returns info for non-array menu', () => {
    const truck = createMockTruck({ menu: null as unknown as never });
    const result = validateEntity(truck);

    expect(result.info).toContain('Menu information helps customers make decisions');
  });

  it('returns multiple issues when applicable', () => {
    const truck = createMockTruck({
      name: '',
      description: '',
      price_range: '',
      cuisine_type: [],
    });
    const result = validateEntity(truck);

    expect(result.critical.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.info.length).toBeGreaterThan(0);
  });
});

describe('calculateQualityScore', () => {
  it('returns perfect score for valid truck', () => {
    const truck = createMockTruck();
    const result = calculateQualityScore(truck);

    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
  });

  it('returns breakdown of validation results', () => {
    const truck = createMockTruck();
    const result = calculateQualityScore(truck);

    expect(result.breakdown).toBeDefined();
    expect(result.breakdown.criticalPassed).toBeGreaterThan(0);
    expect(result.breakdown.totalPossiblePoints).toBeGreaterThan(0);
  });

  it('returns lower score for invalid truck', () => {
    const truck = createMockTruck({ name: '' });
    const result = calculateQualityScore(truck);

    expect(result.score).toBeLessThan(100);
  });

  it('returns F grade for very low score', () => {
    const truck = createMockTruck({
      name: '',
      id: '',
    });
    const result = calculateQualityScore(truck);

    expect(result.grade).toBe('F');
  });

  it('returns D grade for score below 70', () => {
    const truck = createMockTruck({
      name: '',
      id: '',
    });
    const result = calculateQualityScore(truck);

    expect(['D', 'F'].includes(result.grade)).toBe(true);
  });

  it('returns C grade or lower for truck with multiple issues', () => {
    const truck = createMockTruck({
      name: '',
      id: '',
      price_range: '',
      description: '',
    });
    const result = calculateQualityScore(truck);

    expect(['C', 'D', 'F'].includes(result.grade)).toBe(true);
  });

  it('returns B grade or higher for truck with fewer issues', () => {
    const truck = createMockTruck({
      description: '',
      cuisine_type: [],
    });
    const result = calculateQualityScore(truck);

    expect(['A', 'B'].includes(result.grade)).toBe(true);
  });

  it('accepts pre-computed validation result', () => {
    const truck = createMockTruck({ name: '' });
    const validation = validateEntity(truck);

    const result = calculateQualityScore(truck, validation);

    expect(result.score).toBeLessThan(100);
  });

  it('handles truck with multiple critical issues', () => {
    const truck = createMockTruck({
      name: '',
      id: '',
    });
    const result = calculateQualityScore(truck);

    expect(result.breakdown.criticalPassed).toBeLessThan(3);
  });

  it('rounds score to 2 decimal places', () => {
    const truck = createMockTruck({ name: '' });
    const result = calculateQualityScore(truck);

    const decimalPart = result.score.toString().split('.')[1];
    expect(decimalPart?.length || 0).toBeLessThanOrEqual(2);
  });
});

describe('assessQuality', () => {
  it('returns both validation and score', () => {
    const truck = createMockTruck();
    const result = assessQuality(truck);

    expect(result.validation).toBeDefined();
    expect(result.score).toBeDefined();
    expect(result.validation.critical).toBeDefined();
    expect(result.score.grade).toBeDefined();
  });

  it('returns perfect assessment for valid truck', () => {
    const truck = createMockTruck();
    const result = assessQuality(truck);

    expect(result.validation.critical).toHaveLength(0);
    expect(result.score.grade).toBe('A');
  });

  it('returns issues for invalid truck', () => {
    const truck = createMockTruck({ name: '' });
    const result = assessQuality(truck);

    expect(result.validation.critical.length).toBeGreaterThan(0);
    expect(result.score.score).toBeLessThan(100);
  });
});
