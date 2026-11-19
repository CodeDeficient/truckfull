import { describe, it, expect } from '@jest/globals';

import {
  buildOperatingHours,
  buildMenuItems,
  stripCountrySuffix,
  parseAddressComponents,
} from '@/lib/services/truckUpdater';

describe('buildOperatingHours', () => {
  it('maps explicit days into open/close records', () => {
    const result = buildOperatingHours('11:00', '14:00', ['monday', 'tuesday']);

    expect(result).toEqual({
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '11:00', close: '14:00' },
    });
  });

  it('returns empty object when no days are provided (no fallback to today)', () => {
    const result = buildOperatingHours('09:00', '17:00');

    expect(result).toEqual({});
  });

  it('handles a single day', () => {
    const result = buildOperatingHours('08:00', '12:00', ['friday']);

    expect(result).toEqual({
      friday: { open: '08:00', close: '12:00' },
    });
  });

  it('fails closed instead of writing a canonical subset from a mixed day set', () => {
    const result = buildOperatingHours('11:00', '14:00', ['monday', 'junk']);

    expect(result).toEqual({});
  });

  it('lowercases the day keys', () => {
    const result = buildOperatingHours('10:00', '20:00', ['MONDAY', 'Tuesday']);

    expect(result).toEqual({
      monday: { open: '10:00', close: '20:00' },
      tuesday: { open: '10:00', close: '20:00' },
    });
  });
});

describe('buildMenuItems', () => {
  it('categorizes known food items', () => {
    const result = buildMenuItems(['Chicken Taco', 'Caesar Salad', 'Soda']);

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ name: 'Chicken Taco', category: 'entrees' });
    expect(result[1]).toMatchObject({ name: 'Caesar Salad', category: 'salads' });
    expect(result[2]).toMatchObject({ name: 'Soda', category: 'drinks' });
  });

  it('includes dietary_info and is_popular on every item', () => {
    const result = buildMenuItems(['Burrito']);

    expect(result[0]).toMatchObject({
      name: 'Burrito',
      dietary_info: [],
      is_popular: false,
    });
  });

  it('defaults uncategorized items to entrees', () => {
    const result = buildMenuItems(['Some Strange Dish XYZ']);

    expect(result[0].category).toBe('entrees');
  });

  it('returns empty array for empty input', () => {
    const result = buildMenuItems([]);

    expect(result).toEqual([]);
  });

  it('categories are case-insensitive', () => {
    const result = buildMenuItems(['CHICKEN TACO', 'caesar salad']);

    expect(result[0].category).toBe('entrees');
    expect(result[1].category).toBe('salads');
  });

  it('handles substrings — "chicken" triggers entrees', () => {
    const result = buildMenuItems(['Grilled Chicken Plate']);

    expect(result[0].category).toBe('entrees');
  });

  it('handles single-item array', () => {
    const result = buildMenuItems(['Fish Tacos']);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Fish Tacos');
    expect(result[0].category).toBe('entrees');
  });
});

describe('stripCountrySuffix', () => {
  it('removes ", United States of America"', () => {
    expect(stripCountrySuffix('123 Main St, Charleston, SC 29401, United States of America')).toBe(
      '123 Main St, Charleston, SC 29401',
    );
  });

  it('removes ", United States"', () => {
    expect(stripCountrySuffix('456 Oak Ave, Austin, TX 78701, United States')).toBe(
      '456 Oak Ave, Austin, TX 78701',
    );
  });

  it('removes ", USA"', () => {
    expect(stripCountrySuffix('789 Pine Rd, Denver, CO 80202, USA')).toBe(
      '789 Pine Rd, Denver, CO 80202',
    );
  });

  it('removes ", US"', () => {
    expect(stripCountrySuffix('101 Elm St, Portland, OR 97201, US')).toBe(
      '101 Elm St, Portland, OR 97201',
    );
  });

  it('returns unchanged address when no suffix matches', () => {
    expect(stripCountrySuffix('123 Main St, Charleston, SC 29401')).toBe(
      '123 Main St, Charleston, SC 29401',
    );
  });

  it('only matches at the end of the string', () => {
    expect(stripCountrySuffix('USA Blvd, Charleston, SC 29401')).toBe(
      'USA Blvd, Charleston, SC 29401',
    );
  });
});

describe('parseAddressComponents', () => {
  it('extracts city, state, zip from standard format', () => {
    const result = parseAddressComponents('123 Main St, Austin, TX 78701');

    expect(result).toEqual({ city: 'Austin', state: 'TX', zip: '78701' });
  });

  it('handles ZIP+4 format', () => {
    const result = parseAddressComponents('456 Oak Ave, Denver, CO 80202-1234');

    expect(result).toEqual({ city: 'Denver', state: 'CO', zip: '80202-1234' });
  });

  it('falls back to regex when no state-zip combo on a single comma part', () => {
    const result = parseAddressComponents('789 Pine Rd, Portland, OR, 97201');

    expect(result).toMatchObject({ state: 'OR', zip: '97201' });
  });

  it('returns empty strings when nothing matches', () => {
    const result = parseAddressComponents('Just a street name with nothing else');

    expect(result).toEqual({ city: '', state: '', zip: '' });
  });

  it('handles multi-part city names', () => {
    const result = parseAddressComponents('123 Main St, New York, NY 10001');

    expect(result).toEqual({ city: 'New York', state: 'NY', zip: '10001' });
  });

  it('handles two-part address with state-zip in second part', () => {
    const result = parseAddressComponents('101 Elm St, SC 29401');

    expect(result).toEqual({ city: '101 Elm St', state: 'SC', zip: '29401' });
  });

  it('extracts state from standalone two-letter code', () => {
    const result = parseAddressComponents('Some Road, SC 29401');

    expect(result).toMatchObject({ state: 'SC', zip: '29401' });
  });

  it('handles address with only zip code in part', () => {
    const result = parseAddressComponents('My Street, Miami, FL 33101-5678');

    expect(result).toEqual({ city: 'Miami', state: 'FL', zip: '33101-5678' });
  });
});
