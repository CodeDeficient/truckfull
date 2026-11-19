/**
 * Unit tests for lib/events/vettingLocationFallback.ts
 *
 * Tests the city center fallback logic for events without precise geocodes.
 * Events with high relevance but no exact location can use city center
 * coordinates as a fallback for vetting.
 */

import { jest, describe, it, expect, beforeEach, afterAll, beforeAll } from '@jest/globals';

let shouldUseCityFallback: (event: Record<string, unknown>) => boolean;
let getCityCenter: (city: string, state: string) => { lat: number; lng: number } | null;

beforeAll(async () => {
  const mod = await import('@/lib/events/vettingLocationFallback');
  shouldUseCityFallback = mod.shouldUseCityFallback;
  getCityCenter = mod.getCityCenter;
});

afterAll(() => {
  jest.resetModules();
});

describe('shouldUseCityFallback', () => {
  it('returns true for long title + high vetting_score + description', () => {
    const event = {
      title: 'Savannah Annual Food Truck Festival and BBQ Cookoff',
      vetting_score: 4,
      description: 'A great food truck event with vendors from across the region.',
    };

    expect(shouldUseCityFallback(event)).toBe(true);
  });

  it('returns false for short title', () => {
    const event = {
      title: 'BBQ Fest',
      vetting_score: 5,
      description: 'Great food trucks.',
    };

    expect(shouldUseCityFallback(event)).toBe(false);
  });

  it('returns false for low vetting_score', () => {
    const event = {
      title: 'Savannah Annual Food Truck Festival and BBQ Cookoff',
      vetting_score: 2,
      description: 'A great event.',
    };

    expect(shouldUseCityFallback(event)).toBe(false);
  });

  it('returns false when no description', () => {
    const event = {
      title: 'Savannah Annual Food Truck Festival and BBQ Cookoff',
      vetting_score: 4,
    };

    expect(shouldUseCityFallback(event)).toBe(false);
  });

  it('returns false for empty description', () => {
    const event = {
      title: 'Savannah Annual Food Truck Festival and BBQ Cookoff',
      vetting_score: 4,
      description: '',
    };

    expect(shouldUseCityFallback(event)).toBe(false);
  });

  it('returns false for null fields', () => {
    const event = {
      title: null,
      vetting_score: null,
      description: null,
    };

    expect(shouldUseCityFallback(event)).toBe(false);
  });

  it('returns false for undefined fields', () => {
    const event = {};

    expect(shouldUseCityFallback(event)).toBe(false);
  });

  it('returns false for title below 10 chars', () => {
    const event = {
      title: 'BBQ Fest',
      vetting_score: 4,
      description: 'Some description here.',
    };

    expect(shouldUseCityFallback(event)).toBe(false);
  });

  it('returns true for title at 10 chars', () => {
    const event = {
      title: 'A Festival',
      vetting_score: 3,
      description: 'Some description here.',
    };

    expect(shouldUseCityFallback(event)).toBe(true);
  });
});

describe('getCityCenter', () => {
  it('returns valid coordinates for Savannah, GA', () => {
    const result = getCityCenter('Savannah', 'GA');

    expect(result).not.toBeNull();
    expect(typeof (result as Record<string, number>).lat).toBe('number');
    expect(typeof (result as Record<string, number>).lng).toBe('number');
    expect((result as Record<string, number>).lat).toBeGreaterThan(30);
    expect((result as Record<string, number>).lat).toBeLessThan(35);
    expect((result as Record<string, number>).lng).toBeGreaterThan(-85);
    expect((result as Record<string, number>).lng).toBeLessThan(-80);
  });

  it('returns valid coordinates for Augusta, GA', () => {
    const result = getCityCenter('Augusta', 'GA');

    expect(result).not.toBeNull();
    expect(typeof (result as Record<string, number>).lat).toBe('number');
    expect(typeof (result as Record<string, number>).lng).toBe('number');
  });

  it('returns null for nonexistent city', () => {
    const result = getCityCenter('Nonexistent', 'XX');

    expect(result).toBeNull();
  });

  it('is case-insensitive for city name', () => {
    const upper = getCityCenter('SAVANNAH', 'GA');
    const lower = getCityCenter('savannah', 'ga');
    const title = getCityCenter('Savannah', 'GA');

    expect(upper).toEqual(title);
    expect(lower).toEqual(title);
  });

  it('is case-insensitive for state', () => {
    const upper = getCityCenter('Savannah', 'GA');
    const lower = getCityCenter('Savannah', 'ga');

    expect(upper).toEqual(lower);
  });

  it('returns null for empty strings', () => {
    const result = getCityCenter('', '');

    expect(result).toBeNull();
  });
});
