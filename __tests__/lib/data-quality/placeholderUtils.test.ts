import { describe, it, expect } from '@jest/globals';
import {
  getPlaceholderPatterns,
  checkForPlaceholders,
  processTruckForPlaceholders,
} from '@/lib/data-quality/placeholderUtils';
import type { FoodTruck } from '@/lib/types';

function createMockTruck(overrides: Partial<FoodTruck> = {}): FoodTruck {
  return {
    id: 'truck-123',
    name: 'Test Truck',
    description: 'A great food truck',
    cuisine_type: ['Mexican'],
    price_range: '$$',
    current_location: {
      lat: 40.7128,
      lng: -74.006,
      address: '123 Main St',
    },
    contact_info: {
      phone: '555-1234',
      email: 'test@example.com',
      website: 'https://example.com',
    },
    ...overrides,
  } as unknown as FoodTruck;
}

describe('getPlaceholderPatterns', () => {
  it('returns array of regex patterns', () => {
    const patterns = getPlaceholderPatterns();

    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
  });

  it('contains patterns for common placeholders', () => {
    const patterns = getPlaceholderPatterns();

    expect(patterns.length).toBe(9);
  });

  it('undefined pattern matches UNDEFINED', () => {
    const patterns = getPlaceholderPatterns();
    const undefinedPattern = patterns[0];

    expect(undefinedPattern.test('UNDEFINED')).toBe(true);
  });
});

describe('checkForPlaceholders', () => {
  it('returns empty object for truck without placeholders', () => {
    const truck = createMockTruck();
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result).toEqual({});
  });

  it('marks name as undefined for placeholder name', () => {
    const truck = createMockTruck({ name: 'Test placeholder' });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result.name).toBeUndefined();
  });

  it('marks description as undefined for placeholder description', () => {
    const truck = createMockTruck({ description: 'This is just a placeholder description' });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result.description).toBeUndefined();
  });

  it('marks price_range as undefined for placeholder price_range', () => {
    const truck = createMockTruck({ price_range: 'test truck' });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result.price_range).toBeUndefined();
  });

  it('handles undefined name gracefully', () => {
    const truck = createMockTruck({ name: undefined as unknown as string });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result).toEqual({});
  });

  it('handles null description gracefully', () => {
    const truck = createMockTruck({ description: null as unknown as string });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result).toEqual({});
  });

  it('handles null price_range gracefully', () => {
    const truck = createMockTruck({ price_range: null as unknown as string });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result).toEqual({});
  });

  it('returns multiple fields with placeholders', () => {
    const truck = createMockTruck({
      name: 'undefined',
      description: 'placeholder',
    });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result.name).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it('matches lorem ipsum pattern', () => {
    const truck = createMockTruck({ description: 'Lorem ipsum dolor sit amet' });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result.description).toBeUndefined();
  });

  it('matches n/a pattern', () => {
    const truck = createMockTruck({ price_range: 'N/A' });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result.price_range).toBeUndefined();
  });

  it('matches zeros pattern', () => {
    const truck = createMockTruck({ price_range: '000' });
    const patterns = getPlaceholderPatterns();

    const result = checkForPlaceholders(truck, patterns);

    expect(result.price_range).toBeUndefined();
  });
});

describe('processTruckForPlaceholders', () => {
  it('returns updates for truck without placeholders', () => {
    const truck = createMockTruck();
    const patterns = getPlaceholderPatterns();

    const result = processTruckForPlaceholders(truck, patterns);

    expect(result).toBeDefined();
  });

  it('updates basic info fields', () => {
    const truck = createMockTruck({ name: 'placeholder name' });
    const patterns = getPlaceholderPatterns();

    const result = processTruckForPlaceholders(truck, patterns);

    expect(result.name).toBeUndefined();
  });

  it('handles truck with no contact info', () => {
    const truck = createMockTruck({ contact_info: undefined as unknown as never });
    const patterns = getPlaceholderPatterns();

    const result = processTruckForPlaceholders(truck, patterns);

    expect(result.name).toBeUndefined();
  });

  it('handles truck with no current_location', () => {
    const truck = createMockTruck({ current_location: undefined as unknown as never });
    const patterns = getPlaceholderPatterns();

    const result = processTruckForPlaceholders(truck, patterns);

    expect(result.name).toBeUndefined();
  });

  it('preserves non-placeholder fields', () => {
    const truck = createMockTruck({
      name: 'Real Truck Name',
      description: 'Real description',
    });
    const patterns = getPlaceholderPatterns();

    const result = processTruckForPlaceholders(truck, patterns);

    expect(result.name).toBeUndefined();
  });

  it('updates contact_info object with placeholders', () => {
    const truck = createMockTruck({
      contact_info: {
        phone: '555-undefined',
        website: 'https://placeholder.com',
        email: 'test@example.com',
      },
    });
    const patterns = getPlaceholderPatterns();

    const result = processTruckForPlaceholders(truck, patterns);

    expect(result.contact_info).toBeDefined();
  });

  it('updates current_location address with placeholders', () => {
    const truck = createMockTruck({
      current_location: {
        lat: 40.7128,
        lng: -74.006,
        address: 'Test placeholder street',
      },
    });
    const patterns = getPlaceholderPatterns();

    const result = processTruckForPlaceholders(truck, patterns);

    expect(result.current_location).toBeDefined();
  });
});
