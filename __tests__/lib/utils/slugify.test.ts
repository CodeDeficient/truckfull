import { describe, it, expect } from '@jest/globals';
import {
  slugify,
  generateTruckSlug,
  extractShortIdFromSlug,
  RESERVED_SLUGS,
  isAllowedTruckSlug,
  isCitySlugPattern,
  citySlugMatchesName,
} from '@/lib/utils/slugify';

describe('slugify', () => {
  it('converts basic string to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('removes diacritics', () => {
    expect(slugify('Crème Brulée')).toBe('creme-brulee');
  });

  it('removes special characters', () => {
    expect(slugify('Taco & Burrito!')).toBe('taco-burrito');
  });

  it('collapses multiple spaces and hyphens', () => {
    expect(slugify('Multiple   Spaces --- Hyphens')).toBe('multiple-spaces-hyphens');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('-trim-me-')).toBe('trim-me');
  });

  it('handles alphanumeric characters', () => {
    expect(slugify('Truck 123')).toBe('truck-123');
  });
});

describe('generateTruckSlug', () => {
  const truckId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

  it('returns base slug when no duplicates', () => {
    const result = generateTruckSlug('My Truck', truckId);
    expect(result).toBe('my-truck');
  });

  it('returns base slug when not in existing slugs set', () => {
    const existing = new Set(['other-truck']);
    const result = generateTruckSlug('My Truck', truckId, existing);
    expect(result).toBe('my-truck');
  });

  it('adds short ID suffix when collision occurs', () => {
    const existing = new Set(['my-truck']);
    const result = generateTruckSlug('My Truck', truckId, existing);
    expect(result).toBe('my-truck-a1b2');
  });

  it('strips hyphens from ID for suffix', () => {
    const existing = new Set(['my-truck']);
    // ID with hyphen in first 4 chars
    const result = generateTruckSlug('My Truck', 'a-b-c-d-e', existing);
    expect(result).toBe('my-truck-abcd');
  });
});

describe('extractShortIdFromSlug', () => {
  it('extracts valid 4-character alphanumeric short ID', () => {
    expect(extractShortIdFromSlug('my-truck-abcd')).toBe('abcd');
    expect(extractShortIdFromSlug('my-truck-1234')).toBe('1234');
    expect(extractShortIdFromSlug('my-truck-a1b2')).toBe('a1b2');
  });

  it('returns null when no short ID is present', () => {
    expect(extractShortIdFromSlug('my-truck')).toBeNull();
  });

  it('returns null for invalid short ID length', () => {
    expect(extractShortIdFromSlug('my-truck-abc')).toBeNull();
    expect(extractShortIdFromSlug('my-truck-abcde')).toBeNull();
  });

  it('returns null for non-alphanumeric short ID', () => {
    expect(extractShortIdFromSlug('my-truck-ab!!')).toBeNull();
  });
});

describe('RESERVED_SLUGS', () => {
  it('contains common route paths', () => {
    expect(RESERVED_SLUGS).toContain('admin');
    expect(RESERVED_SLUGS).toContain('api');
    expect(RESERVED_SLUGS).toContain('auth');
    expect(RESERVED_SLUGS).toContain('blog');
    expect(RESERVED_SLUGS).toContain('privacy');
    expect(RESERVED_SLUGS).toContain('terms');
  });

  it('is a read-only set', () => {
    expect(RESERVED_SLUGS).toBeInstanceOf(Set);
  });
});

describe('isAllowedTruckSlug', () => {
  it('rejects reserved slugs', () => {
    expect(isAllowedTruckSlug('admin')).toBe(false);
    expect(isAllowedTruckSlug('api')).toBe(false);
    expect(isAllowedTruckSlug('auth')).toBe(false);
    expect(isAllowedTruckSlug('favicon.ico')).toBe(false);
    expect(isAllowedTruckSlug('robots.txt')).toBe(false);
  });

  it('rejects static page slugs that conflict with app routes', () => {
    expect(isAllowedTruckSlug('about')).toBe(false);
    expect(isAllowedTruckSlug('blog')).toBe(false);
    expect(isAllowedTruckSlug('features')).toBe(false);
    expect(isAllowedTruckSlug('for-owners')).toBe(false);
    expect(isAllowedTruckSlug('for-organizers')).toBe(false);
    expect(isAllowedTruckSlug('contact')).toBe(false);
    expect(isAllowedTruckSlug('claim-your-truck')).toBe(false);
    expect(isAllowedTruckSlug('food-truck-event-research')).toBe(false);
    expect(isAllowedTruckSlug('food-truck-live-location')).toBe(false);
    expect(isAllowedTruckSlug('food-truck-traffic-data')).toBe(false);
    expect(isAllowedTruckSlug('owner-dashboard')).toBe(false);
    expect(isAllowedTruckSlug('login')).toBe(false);
    expect(isAllowedTruckSlug('signup')).toBe(false);
    expect(isAllowedTruckSlug('profile')).toBe(false);
    expect(isAllowedTruckSlug('settings')).toBe(false);
    expect(isAllowedTruckSlug('offline')).toBe(false);
    expect(isAllowedTruckSlug('maintenance')).toBe(false);
    expect(isAllowedTruckSlug('unauthorized')).toBe(false);
    expect(isAllowedTruckSlug('account-deleted')).toBe(false);
    expect(isAllowedTruckSlug('city')).toBe(false);
    expect(isAllowedTruckSlug('cuisine')).toBe(false);
    expect(isAllowedTruckSlug('best')).toBe(false);
    expect(isAllowedTruckSlug('discover')).toBe(false);
    expect(isAllowedTruckSlug('discover_food_trucks')).toBe(false);
    expect(isAllowedTruckSlug('organizer')).toBe(false);
    expect(isAllowedTruckSlug('trucks')).toBe(false);
    expect(isAllowedTruckSlug('sitemap.xml')).toBe(false);
    expect(isAllowedTruckSlug('takedown')).toBe(false);
    expect(isAllowedTruckSlug('terms')).toBe(false);
    expect(isAllowedTruckSlug('privacy')).toBe(false);
    expect(isAllowedTruckSlug('favorites')).toBe(false);
    expect(isAllowedTruckSlug('user-dashboard')).toBe(false);
    expect(isAllowedTruckSlug('event-research')).toBe(false);
    expect(isAllowedTruckSlug('live-location')).toBe(false);
    expect(isAllowedTruckSlug('traffic-data')).toBe(false);
  });

  it('rejects invalid slug format', () => {
    expect(isAllowedTruckSlug('')).toBe(false);
    expect(isAllowedTruckSlug('a')).toBe(false);
    expect(isAllowedTruckSlug('UPPERCASE')).toBe(false);
    expect(isAllowedTruckSlug('has spaces')).toBe(false);
  });

  it('accepts valid truck slugs', () => {
    expect(isAllowedTruckSlug('taco-bell')).toBe(true);
    expect(isAllowedTruckSlug('joes-truck')).toBe(true);
    expect(isAllowedTruckSlug('r7-industries-llc')).toBe(true);
    expect(isAllowedTruckSlug('meadows-of-grovetown')).toBe(true);
  });
});

describe('isCitySlugPattern', () => {
  it('rejects slugs that do not end with a state abbreviation', () => {
    expect(isCitySlugPattern('taco-butts')).toBe(false);
    expect(isCitySlugPattern('mac-daddy')).toBe(false);
    expect(isCitySlugPattern('mustard-seed-eatery-llc')).toBe(false);
    // 2 segments but non-state suffix
    expect(isCitySlugPattern('something-xx')).toBe(false);
    expect(isCitySlugPattern('something-ab')).toBe(false);
  });

  it('identifies 2-segment city-shaped slugs with state abbreviation suffixes', () => {
    expect(isCitySlugPattern('augusta-ga')).toBe(true);
    expect(isCitySlugPattern('charleston-sc')).toBe(true);
    expect(isCitySlugPattern('greenville-sc')).toBe(true);
    // 3+ segment slugs pass through even if ending with a state abbreviation
    expect(isCitySlugPattern('north-augusta-sc')).toBe(false);
    expect(isCitySlugPattern('winston-salem-nc')).toBe(false);
  });

  it('does not flag two-letter suffixes that are not US states', () => {
    expect(isCitySlugPattern('r7-industries-llc')).toBe(false);
    expect(isCitySlugPattern('joes-hi-fi')).toBe(false);
    expect(isCitySlugPattern('taco-dj')).toBe(false);
    expect(isCitySlugPattern('my-cj')).toBe(false);
  });

  it('does not flag truck slugs with state abbreviations in longer names', () => {
    expect(isCitySlugPattern('sunset-slush-of-greenville-sc')).toBe(false);
    expect(isCitySlugPattern('shelias-baking-co')).toBe(false);
    expect(isCitySlugPattern('kb-deli-and-bread-co')).toBe(false);
    expect(isCitySlugPattern('geaux-cajun-ga')).toBe(false);
    expect(isCitySlugPattern('vibrant-alkaline-vegan-me')).toBe(false);
  });

  it('does not flag slugs with no hyphen before the suffix', () => {
    expect(isCitySlugPattern('bbq')).toBe(false);
  });
});

describe('citySlugMatchesName', () => {
  it('matches punctuation-stripped parsed names to the stored city name', () => {
    expect(citySlugMatchesName("O'Fallon", 'MO', 'Ofallon')).toBe(true);
  });

  it('keeps state as part of city identity', () => {
    expect(citySlugMatchesName('Springfield', 'IL', 'Springfield', 'MO')).toBe(false);
  });
});
