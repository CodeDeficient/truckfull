import { describe, expect, it } from '@jest/globals';

import {
  CLAIM_SEARCH_DEFAULT_LIMIT,
  CLAIM_SEARCH_MAX_LIMIT,
  CLAIM_SEARCH_MIN_QUERY_LENGTH,
  buildClaimSearchPattern,
  getClaimSearchLimit,
  mapClaimSearchRow,
  normalizeClaimSearchQuery,
} from '@/lib/claim/publicClaimSearch';

describe('publicClaimSearch', () => {
  it('normalizes user input before searching', () => {
    expect(normalizeClaimSearchQuery('  taco   bus  ')).toBe('taco bus');
  });

  it('escapes wildcard characters in ilike patterns', () => {
    expect(buildClaimSearchPattern('100% taco_truck')).toBe('%100\\% taco\\_truck%');
  });

  it('bounds the public result limit', () => {
    expect(getClaimSearchLimit(null)).toBe(CLAIM_SEARCH_DEFAULT_LIMIT);
    expect(getClaimSearchLimit('999')).toBe(CLAIM_SEARCH_MAX_LIMIT);
    expect(getClaimSearchLimit('0')).toBe(1);
  });

  it('maps database rows to safe public search results', () => {
    expect(
      mapClaimSearchRow({
        id: 'truck-1',
        name: 'Taco Bus',
        cuisine_type: ['Mexican'],
        city: 'Savannah',
        state: 'GA',
        description: 'Street tacos',
        slug: 'taco-bus',
        price_range: '$$',
        social_media: { photo_url: 'https://example.com/photo.jpg' },
      }),
    ).toEqual({
      id: 'truck-1',
      name: 'Taco Bus',
      cuisineTypes: ['Mexican'],
      city: 'Savannah',
      state: 'GA',
      description: 'Street tacos',
      slug: 'taco-bus',
      priceRange: '$$',
      photoUrl: 'https://example.com/photo.jpg',
      locationLabel: 'Savannah, GA',
    });
  });

  it('falls back when no location data is available', () => {
    expect(
      mapClaimSearchRow({
        id: 'truck-2',
        name: null,
        cuisine_type: null,
        city: null,
        state: null,
        description: null,
        slug: null,
        price_range: null,
        social_media: null,
      }),
    ).toEqual({
      id: 'truck-2',
      name: 'Unknown Truck',
      cuisineTypes: [],
      city: null,
      state: null,
      description: null,
      slug: null,
      priceRange: null,
      photoUrl: null,
      locationLabel: 'Location unavailable',
    });
  });

  it('exposes the minimum query length used by the public flow', () => {
    expect(CLAIM_SEARCH_MIN_QUERY_LENGTH).toBe(2);
  });
});
