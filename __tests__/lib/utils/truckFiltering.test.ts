import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import type { FoodTruck } from '@/lib/types';
import {
  filterByViability,
  filterByDistance,
  filterByPrice,
  filterByOpenNow,
  filterBySearch,
  isWithinRadius,
} from '@/lib/utils/truckFiltering';

const createTruck = (overrides: Partial<FoodTruck> = {}): FoodTruck =>
  ({
    id: 'truck-1',
    name: 'Taco Truck',
    description: 'Best tacos in town',
    slug: 'taco-truck',
    cuisine_type: ['Mexican'],
    contact_info: { phone: '555-0100', email: 'info@taco.truck', website: 'https://taco.truck' },
    social_media: { facebook: 'tacotruckfb', instagram: 'tacotruckig' },
    current_location: { lat: 40.7128, lng: -74.006, address: '123 Main St' },
    operating_hours: null,
    menu_items: [],
    price_range: '$$',
    average_rating: 4.5,
    image_url: null,
    is_claimed: true,
    subscription_tier: 'free',
    ...overrides,
  }) as FoodTruck;

describe('filterByViability', () => {
  it('keeps trucks with name and id', () => {
    const trucks = [createTruck({ id: 't1', name: 'Taco Truck' })];
    expect(filterByViability(trucks)).toHaveLength(1);
  });

  it('removes trucks with empty name', () => {
    const trucks = [createTruck({ id: 't1', name: '' })];
    expect(filterByViability(trucks)).toHaveLength(0);
  });

  it('removes trucks with no id', () => {
    const trucks = [createTruck({ id: '', name: 'Valid Name' })];
    expect(filterByViability(trucks)).toHaveLength(0);
  });

  it('filters a mixed list correctly', () => {
    const trucks = [
      createTruck({ id: 't1', name: 'Taco Truck' }),
      createTruck({ id: 't2', name: '' }),
      createTruck({ id: '', name: 'No ID Truck' }),
      createTruck({ id: 't4', name: 'Burger Truck' }),
    ];
    const result = filterByViability(trucks);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['t1', 't4']);
  });
});

describe('filterByDistance', () => {
  const userLocation = { lat: 40.7128, lng: -74.006 };

  it('passes all trucks when no user location', () => {
    const trucks = [createTruck(), createTruck()];
    expect(filterByDistance(trucks)).toHaveLength(2);
  });

  it('passes all trucks when no radius', () => {
    const trucks = [createTruck(), createTruck()];
    expect(filterByDistance(trucks, userLocation)).toHaveLength(2);
  });

  it('uses server distance_miles when available', () => {
    const trucks = [
      createTruck({ id: 'close', distance_miles: 3 }),
      createTruck({ id: 'far', distance_miles: 20 }),
    ];
    const result = filterByDistance(trucks, userLocation, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('close');
  });

  it('uses client-side calculation when distance_miles is not a number', () => {
    const trucks = [
      createTruck({
        id: 'nearby',
        distance_miles: undefined as unknown as number,
        current_location: { lat: 40.714, lng: -74.008, address: 'Nearby' },
      }),
      createTruck({
        id: 'remote',
        distance_miles: undefined as unknown as number,
        current_location: { lat: 41.0, lng: -75.0, address: 'Remote' },
      }),
    ];
    const result = filterByDistance(trucks, userLocation, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('nearby');
  });

  it('excludes trucks with no location data when distance filtering is active', () => {
    const trucks = [
      createTruck({ id: 'has-loc', current_location: { lat: 40.713, lng: -74.007 } }),
      createTruck({ id: 'no-loc', current_location: null }),
    ];
    const result = filterByDistance(trucks, userLocation, 10);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('has-loc');
  });

  it('excludes trucks with partial coordinates (missing lat or lng)', () => {
    const trucks = [
      createTruck({ id: 'partial', current_location: { lat: 40.71 } as FoodTruck['current_location'] }),
    ];
    const result = filterByDistance(trucks, userLocation, 10);
    expect(result).toHaveLength(0);
  });
});

describe('isWithinRadius', () => {
  const userLocation = { lat: 33.4728, lng: -82.0105 };

  it('uses server distance_miles without an explicit current_location', () => {
    const truck = createTruck({
      id: 'server-distance',
      distance_miles: 12,
      current_location: null,
    });
    expect(isWithinRadius(truck, userLocation, 300)).toBe(true);
    expect(isWithinRadius(truck, userLocation, 10)).toBe(false);
  });

  it('keeps an address-only truck with a saved default location (mobile regression)', () => {
    const truck = createTruck({
      id: 'default-only',
      distance_miles: undefined as unknown as number,
      current_location: null,
      default_lat: 33.4709714,
      default_lng: -81.9748429,
    });
    expect(isWithinRadius(truck, userLocation, 300)).toBe(true);
  });

  it('keeps a default-only truck on the server-distance path used by nearby loads', () => {
    const truck = createTruck({
      id: 'default-with-distance',
      distance_miles: 14.23,
      current_location: null,
      default_lat: 33.5886699,
      default_lng: -81.7734359,
    });
    expect(isWithinRadius(truck, userLocation, 300)).toBe(true);
  });

  it('prefers live GPS when the truck is live', () => {
    const truck = createTruck({
      id: 'live-truck',
      distance_miles: undefined as unknown as number,
      status: 'live',
      live_gps_lat: 33.4728,
      live_gps_lng: -82.0105,
      current_location: { lat: 40.7128, lng: -74.006 },
    });
    expect(isWithinRadius(truck, userLocation, 1)).toBe(true);
  });

  it('excludes a truck with no resolvable location', () => {
    const truck = createTruck({
      id: 'nowhere',
      distance_miles: undefined as unknown as number,
      current_location: null,
      default_lat: null,
      default_lng: null,
    });
    expect(isWithinRadius(truck, userLocation, 300)).toBe(false);
  });

  it('excludes a default-only truck outside the radius', () => {
    const truck = createTruck({
      id: 'far-default',
      distance_miles: undefined as unknown as number,
      current_location: null,
      default_lat: 40.7128,
      default_lng: -74.006,
    });
    expect(isWithinRadius(truck, userLocation, 50)).toBe(false);
  });
});

describe('filterByPrice', () => {
  it('passes all trucks when priceRange is undefined', () => {
    const trucks = [createTruck(), createTruck()];
    expect(filterByPrice(trucks)).toHaveLength(2);
  });

  it('passes all trucks when priceRange is 0', () => {
    const trucks = [createTruck(), createTruck()];
    expect(filterByPrice(trucks, 0)).toHaveLength(2);
  });

  it('passes all trucks when priceRange is negative', () => {
    const trucks = [createTruck(), createTruck()];
    expect(filterByPrice(trucks, -1)).toHaveLength(2);
  });

  it('keeps trucks with price_range length <= priceRange', () => {
    const trucks = [
      createTruck({ id: 'cheap', price_range: '$' }),
      createTruck({ id: 'mid', price_range: '$$' }),
      createTruck({ id: 'pricey', price_range: '$$$' }),
    ];
    const result = filterByPrice(trucks, 2);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(['cheap', 'mid']);
  });

  it('excludes trucks with no price_range when filtering by price', () => {
    const trucks = [
      createTruck({ id: 'with-price', price_range: '$$' }),
      createTruck({ id: 'no-price', price_range: undefined }),
    ];
    const result = filterByPrice(trucks, 2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('with-price');
  });
});

describe('filterByOpenNow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('passes all trucks when openNow is false', () => {
    const trucks = [createTruck()];
    expect(filterByOpenNow(trucks, false)).toHaveLength(1);
  });

  it('passes all trucks when openNow is undefined', () => {
    const trucks = [createTruck()];
    expect(filterByOpenNow(trucks)).toHaveLength(1);
  });

  it('filters by actual operating hours when openNow is true', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));

    const trucks = [
      createTruck({
        id: 'open',
        operating_hours: { monday: { open: '09:00', close: '17:00' } },
      }),
      createTruck({
        id: 'closed',
        operating_hours: { monday: { open: '18:00', close: '22:00' } },
      }),
    ];
    const result = filterByOpenNow(trucks, true);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('open');
  });

  it('excludes trucks with no operating_hours when openNow is true', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));

    const trucks = [
      createTruck({ id: 'no-hours', operating_hours: null }),
    ];
    expect(filterByOpenNow(trucks, true)).toHaveLength(0);
  });

  it('excludes trucks marked as closed for today', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));

    const trucks = [
      createTruck({
        id: 'closed-today',
        operating_hours: { monday: { closed: true } },
      }),
    ];
    expect(filterByOpenNow(trucks, true)).toHaveLength(0);
  });

  it('uses current-day effective hours when filtering open trucks', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T12:00:00'));

    const trucks = [
      createTruck({
        id: 'dated-open',
        operating_hours: { monday: { open: '18:00', close: '22:00' } },
        current_day_hours: { open: '09:00', close: '17:00', closed: false },
      }),
      createTruck({
        id: 'dated-closed',
        operating_hours: { monday: { open: '09:00', close: '17:00' } },
        current_day_hours: { closed: true },
      }),
    ];

    expect(filterByOpenNow(trucks, true).map((truck) => truck.id)).toEqual(['dated-open']);
  });

  it('uses truck timezone when selecting recurring current-day hours', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T00:30:00Z'));

    const trucks = [
      createTruck({
        id: 'pacific-truck',
        timezone: 'America/Los_Angeles',
        operating_hours: { sunday: { open: '16:00', close: '17:00' } },
      }),
    ];

    expect(filterByOpenNow(trucks, true).map((truck) => truck.id)).toEqual(['pacific-truck']);
  });

  it('keeps overnight effective hours open before midnight', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T23:00:00'));

    const trucks = [
      createTruck({
        id: 'overnight-truck',
        operating_hours: { monday: { open: '09:00', close: '17:00' } },
        current_day_hours: { open: '22:00', close: '02:00', closed: false, endsNextDay: true },
      }),
    ];

    expect(filterByOpenNow(trucks, true).map((truck) => truck.id)).toEqual(['overnight-truck']);
  });

  it('does not reuse an overnight snapshot beyond the following local date', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-16T23:00:00'));

    const trucks = [
      createTruck({
        id: 'stale-overnight-truck',
        timezone: 'UTC',
        operating_hours: { tuesday: { closed: true } },
        current_day_hours: { open: '22:00', close: '02:00', closed: false, endsNextDay: true },
        current_day_service_date: '2024-01-15',
      }),
    ];

    expect(filterByOpenNow(trucks, true).map((truck) => truck.id)).toEqual([]);
  });
});

describe('filterBySearch', () => {
  it('passes all trucks when query is empty', () => {
    const trucks = [createTruck()];
    expect(filterBySearch(trucks, '')).toHaveLength(1);
  });

  it('passes all trucks when query is whitespace only', () => {
    const trucks = [createTruck()];
    expect(filterBySearch(trucks, '   ')).toHaveLength(1);
  });

  it('matches by name (case-insensitive)', () => {
    const trucks = [createTruck({ name: 'Taco Truck' }), createTruck({ id: 't2', name: 'Burger Joint', description: 'Juicy burgers', contact_info: { phone: '555-BURG' }, social_media: {}, current_location: { lat: 1, lng: 2, address: '456 Oak Ave' } })];
    const result = filterBySearch(trucks, 'taco');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Taco Truck');
  });

  it('matches by description', () => {
    const trucks = [createTruck({ description: 'Authentic Mexican food' }), createTruck({ id: 't2', name: 'Sushi Spot', description: 'Italian pasta', cuisine_type: ['Japanese'], contact_info: { phone: '555-SUSH' }, social_media: {}, current_location: { lat: 1, lng: 2, address: '789 Elm St' } })];
    const result = filterBySearch(trucks, 'mexican');
    expect(result).toHaveLength(1);
  });

  it('matches by cuisine_type', () => {
    const trucks = [createTruck({ cuisine_type: ['Mexican', 'Latin'] }), createTruck({ id: 't2', cuisine_type: ['Japanese'] })];
    const result = filterBySearch(trucks, 'mexican');
    expect(result).toHaveLength(1);
  });

  it('matches by menu_keywords', () => {
    const trucks = [
      createTruck({ id: 't1', menu_keywords: ['burrito', 'taco', 'quesadilla'] } as unknown as FoodTruck),
      createTruck({ id: 't2', menu_keywords: ['sushi', 'ramen'] } as unknown as FoodTruck),
    ];
    const result = filterBySearch(trucks, 'burrito');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('t1');
  });

  it('matches by contact phone', () => {
    const trucks = [createTruck({ contact_info: { phone: '555-TACO' } }), createTruck({ id: 't2', name: 'Burger Joint', description: 'Juicy burgers', contact_info: { phone: '555-BURG' }, social_media: {}, current_location: { lat: 1, lng: 2, address: '456 Oak Ave' } })];
    const result = filterBySearch(trucks, 'taco');
    expect(result).toHaveLength(1);
  });

  it('matches by contact email', () => {
    const trucks = [createTruck({ contact_info: { email: 'hello@tacotown.com' } }), createTruck({ id: 't2', contact_info: { email: 'info@burgerville.com' } })];
    const result = filterBySearch(trucks, 'tacotown');
    expect(result).toHaveLength(1);
  });

  it('matches by contact email when email is an array', () => {
    const trucks = [createTruck({ contact_info: { email: ['orders@taco.truck', 'info@taco.truck'] } })];
    const result = filterBySearch(trucks, 'orders');
    expect(result).toHaveLength(1);
  });

  it('matches by contact website', () => {
    const trucks = [createTruck({ contact_info: { website: 'https://taco-truck.example.com' } }), createTruck({ id: 't2', contact_info: { website: 'https://burger.example.com' } })];
    const result = filterBySearch(trucks, 'taco-truck');
    expect(result).toHaveLength(1);
  });

  it('matches by social media facebook', () => {
    const trucks = [createTruck({ social_media: { facebook: 'facebook.com/tacotruck' } }), createTruck({ id: 't2', social_media: { facebook: 'facebook.com/burgerjoint' } })];
    const result = filterBySearch(trucks, 'tacotruck');
    expect(result).toHaveLength(1);
  });

  it('matches by social media instagram', () => {
    const trucks = [createTruck({ social_media: { instagram: '@tacogram' } }), createTruck({ id: 't2', social_media: { instagram: '@burgergram' } })];
    const result = filterBySearch(trucks, 'tacogram');
    expect(result).toHaveLength(1);
  });

  it('matches by address in current_location', () => {
    const trucks = [createTruck({ current_location: { lat: 40.71, lng: -74.0, address: '123 Main St' } }), createTruck({ id: 't2', current_location: { lat: 40.72, lng: -74.1, address: '456 Oak Ave' } })];
    const result = filterBySearch(trucks, 'main st');
    expect(result).toHaveLength(1);
  });

  it('returns empty when nothing matches', () => {
    const trucks = [createTruck()];
    expect(filterBySearch(trucks, 'xyznonexistent')).toHaveLength(0);
  });
});
