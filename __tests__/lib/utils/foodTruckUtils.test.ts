import { describe, it, expect } from '@jest/globals';
import {
  convertToDomain,
  convertToDomainWithEvents,
  ensureTruckWithEvents,
  mapTrucksWithEvents,
} from '@/lib/utils/foodTruckUtils';
import type { FoodTruck, PublicFoodTruck, FoodTruckDomainWithEvents } from '@/lib/types';

function createMockTruck(overrides: Partial<FoodTruck> = {}): FoodTruck {
  return {
    id: 'truck-123',
    name: 'Test Truck',
    description: 'A great food truck',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    current_location: {
      lat: 40.7128,
      lng: -74.006,
      address: '123 Main St',
    },
    operating_hours: { Monday: '9-5' },
    menu_items: [{ name: 'Tacos', price: 10 }],
    cuisine_type: ['Mexican', 'Tacos'],
    data_quality_score: 0.85,
    verification_status: 'verified',
    source_url: 'https://example.com',
    last_synced_at: '2024-01-03T00:00:00Z',
    average_rating: 4.5,
    review_count: 100,
    contact_info: {
      phone: '555-1234',
      email: 'test@example.com',
      website: 'https://example.com',
    },
    social_media: {
      instagram: '@testtruck',
      facebook: 'testtruck',
      twitter: '@testtruck',
    },
    is_active: true,
    price_range: '$$',
    specialties: ['Tacos', 'Burritos'],
    location_geog: null,
    owner_id: 'owner-123',
    subscription_tier: 'pro',
    verification_documents: null,
    verification_notes: null,
    verification_requested_at: null,
    verified_at: null,
    verified_by: null,
    menu: [{ name: 'Tacos', price: 10 }],
    scheduled_locations: [],
    source_urls: [],
    exact_location: null,
    city_location: null,
    phone_number: '555-1234',
    email: 'test@example.com',
    website: 'https://example.com',
    instagram_handle: '@testtruck',
    facebook_handle: 'testtruck',
    twitter_handle: '@testtruck',
    schedule: { Monday: '9-5' },
    city: 'New York',
    street_address: '123 Main St',
    zip: '10001',
    state: 'NY',
    default_lat: 40.7128,
    default_lng: -74.006,
    live_gps_lat: null,
    live_gps_lng: null,
    live_gps_accuracy: null,
    live_gps_timestamp: null,
    status: 'active',
    live_location: null,
    is_claimed: true,
    claimed_at: '2024-01-01T00:00:00Z',
    claimed_by: 'user-123',
    claim_verification_method: 'email',
    last_updated_at: null,
    user_id: null,
    review_status: 'approved',
    slug: 'test-truck',
    view_count: 1000,
    events: [{ id: 'event-1', name: 'Food Festival', date: '2024-06-01' }],
    ...overrides,
  } as unknown as FoodTruck;
}

function createMockPublicTruck(overrides: Partial<PublicFoodTruck> = {}): PublicFoodTruck {
  return {
    id: 'public-truck-123',
    name: 'Public Truck',
    description: 'A public food truck',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    current_location: {
      lat: 40.7128,
      lng: -74.006,
      address: '456 Public St',
    },
    operating_hours: { Tuesday: '10-6' },
    menu_items: [{ name: 'Burgers', price: 12 }],
    cuisine_type: ['American', 'Burgers'],
    data_quality_score: 0.75,
    verification_status: 'verified',
    source_url: 'https://public.example.com',
    last_synced_at: '2024-01-03T00:00:00Z',
    average_rating: 4.2,
    review_count: 50,
    contact_info: {
      phone: '555-5678',
      email: 'public@example.com',
      website: 'https://public.example.com',
    },
    social_media: {
      instagram: '@publictruck',
    },
    is_active: true,
    price_range: '$$$',
    specialties: ['Burgers', 'Fries'],
    location_geog: null,
    city: 'Los Angeles',
    street_address: '456 Public St',
    zip: '90001',
    state: 'CA',
    default_lat: 34.0522,
    default_lng: -118.2437,
    live_gps_lat: null,
    live_gps_lng: null,
    live_gps_accuracy: null,
    live_gps_timestamp: null,
    status: 'active',
    live_location: null,
    is_claimed: false,
    claimed_at: null,
    claimed_by: null,
    claim_verification_method: null,
    last_updated_at: null,
    user_id: null,
    review_status: 'approved',
    slug: 'public-truck',
    view_count: 500,
    subscription_tier: 'free',
    ...overrides,
  } as unknown as PublicFoodTruck;
}

describe('convertToDomain', () => {
  it('converts FoodTruck to FoodTruckDomain', () => {
    const truck = createMockTruck();
    const result = convertToDomain(truck);

    expect(result.id).toBe(truck.id);
    expect(result.name).toBe(truck.name);
    expect(result.description).toBe(truck.description);
    expect(result.cuisine_type).toEqual(truck.cuisine_type);
    expect(result._type).toBe('domain');
  });

  it('converts PublicFoodTruck to FoodTruckDomain', () => {
    const truck = createMockPublicTruck();
    const result = convertToDomain(truck);

    expect(result.id).toBe(truck.id);
    expect(result.name).toBe(truck.name);
    expect(result._type).toBe('domain');
  });

  it('handles missing description with default empty string', () => {
    const truck = createMockTruck({ description: undefined as unknown as never });
    const result = convertToDomain(truck);

    expect(result.description).toBe('');
  });

  it('handles null created_at as undefined', () => {
    const truck = createMockTruck({ created_at: null });
    const result = convertToDomain(truck);

    expect(result.created_at).toBeUndefined();
  });

  it('handles null updated_at as undefined', () => {
    const truck = createMockTruck({ updated_at: null });
    const result = convertToDomain(truck);

    expect(result.updated_at).toBeUndefined();
  });

  it('handles non-array cuisine_type as empty array', () => {
    const truck = createMockTruck({ cuisine_type: 'not-array' as unknown as never });
    const result = convertToDomain(truck);

    expect(result.cuisine_type).toEqual([]);
  });

  it('handles null current_location', () => {
    const truck = createMockTruck({ current_location: null });
    const result = convertToDomain(truck);

    expect(result.current_location).toBeNull();
  });

  it('handles null operating_hours', () => {
    const truck = createMockTruck({ operating_hours: null });
    const result = convertToDomain(truck);

    expect(result.operating_hours).toBeNull();
  });

  it('handles empty menu_items array', () => {
    const truck = createMockTruck({ menu_items: [] });
    const result = convertToDomain(truck);

    expect(result.menu_items).toEqual([]);
  });

  it('handles undefined data_quality_score', () => {
    const truck = createMockTruck({ data_quality_score: undefined });
    const result = convertToDomain(truck);

    expect(result.data_quality_score).toBeUndefined();
  });

  it('handles undefined verification_status', () => {
    const truck = createMockTruck({ verification_status: undefined });
    const result = convertToDomain(truck);

    expect(result.verification_status).toBeUndefined();
  });

  it('handles undefined last_synced_at', () => {
    const truck = createMockTruck({ last_synced_at: undefined });
    const result = convertToDomain(truck);

    expect(result.last_synced_at).toBeUndefined();
  });

  it('defaults average_rating to 0 when missing', () => {
    const truck = createMockTruck({ average_rating: undefined });
    const result = convertToDomain(truck);

    expect(result.average_rating).toBe(0);
  });

  it('handles undefined review_count', () => {
    const truck = createMockTruck({ review_count: undefined });
    const result = convertToDomain(truck);

    expect(result.review_count).toBeUndefined();
  });

  it('handles empty contact_info', () => {
    const truck = createMockTruck({ contact_info: {} });
    const result = convertToDomain(truck);

    expect(result.contact_info).toEqual({});
  });

  it('handles empty social_media', () => {
    const truck = createMockTruck({ social_media: {} });
    const result = convertToDomain(truck);

    expect(result.social_media).toEqual({});
  });

  it('preserves owner_id from truck', () => {
    const truck = createMockTruck({ owner_id: 'owner-456' });
    const result = convertToDomain(truck);

    expect(result.owner_id).toBe('owner-456');
  });

  it('handles undefined owner_id', () => {
    const truck = createMockTruck({ owner_id: undefined as unknown as never });
    const result = convertToDomain(truck);

    expect(result.owner_id).toBeUndefined();
  });

  it('preserves subscription_tier', () => {
    const truck = createMockTruck({ subscription_tier: 'enterprise' });
    const result = convertToDomain(truck);

    expect(result.subscription_tier).toBe('enterprise');
  });

  it('converts PublicFoodTruck without owner_id', () => {
    const truck = createMockPublicTruck();
    const result = convertToDomain(truck);

    expect(result.owner_id).toBeUndefined();
    expect(result._type).toBe('domain');
  });
});

describe('convertToDomainWithEvents', () => {
  it('converts FoodTruck to FoodTruckDomainWithEvents', () => {
    const truck = createMockTruck();
    const result = convertToDomainWithEvents(truck);

    expect(result.id).toBe(truck.id);
    expect(result.name).toBe(truck.name);
    expect(result.events).toEqual(truck.events);
    expect(result._type).toBe('domain');
  });

  it('includes events array in result', () => {
    const truck = createMockTruck({
      events: [{ id: 'event-1', name: 'Test Event' }],
    });
    const result = convertToDomainWithEvents(truck);

    expect(result.events).toHaveLength(1);
    expect(result.events[0].name).toBe('Test Event');
  });

  it('defaults events to empty array when not provided', () => {
    const truck = createMockTruck({ events: undefined });
    const result = convertToDomainWithEvents(truck);

    expect(result.events).toEqual([]);
  });

  it('handles null events', () => {
    const truck = createMockTruck({ events: null });
    const result = convertToDomainWithEvents(truck);

    expect(result.events).toEqual([]);
  });
});

describe('ensureTruckWithEvents', () => {
  it('ensures truck has events array', () => {
    const truck = { id: 'test', name: 'Test' };
    const result = ensureTruckWithEvents(truck);

    expect(result.events).toEqual([]);
  });

  it('preserves existing events', () => {
    const truck = { id: 'test', name: 'Test', events: [{ id: '1', name: 'Event' }] };
    const result = ensureTruckWithEvents(truck);

    expect(result.events).toHaveLength(1);
  });

  it('handles missing description with default', () => {
    const truck = { id: 'test', name: 'Test' };
    const result = ensureTruckWithEvents(truck);

    expect(result.description).toBe('');
  });

  it('handles null created_at as empty string', () => {
    const truck = { id: 'test', name: 'Test', created_at: null };
    const result = ensureTruckWithEvents(truck);

    expect(result.created_at).toBe('');
  });

  it('handles null updated_at as empty string', () => {
    const truck = { id: 'test', name: 'Test', updated_at: null };
    const result = ensureTruckWithEvents(truck);

    expect(result.updated_at).toBe('');
  });

  it('handles missing cuisine_type as empty array', () => {
    const truck = { id: 'test', name: 'Test' };
    const result = ensureTruckWithEvents(truck);

    expect(result.cuisine_type).toEqual([]);
  });

  it('adds _type domain discriminant', () => {
    const truck = { id: 'test', name: 'Test' };
    const result = ensureTruckWithEvents(truck);

    expect(result._type).toBe('domain');
  });
});

describe('mapTrucksWithEvents', () => {
  it('maps array of trucks ensuring events', () => {
    const trucks = [
      { id: '1', name: 'Truck 1' },
      { id: '2', name: 'Truck 2' },
    ];
    const result = mapTrucksWithEvents(trucks);

    expect(result).toHaveLength(2);
    expect(result[0].events).toEqual([]);
    expect(result[1].events).toEqual([]);
  });

  it('preserves existing events in mapped trucks', () => {
    const trucks = [
      { id: '1', name: 'Truck 1', events: [{ id: 'e1' }] },
      { id: '2', name: 'Truck 2', events: [{ id: 'e2' }, { id: 'e3' }] },
    ];
    const result = mapTrucksWithEvents(trucks);

    expect(result[0].events).toHaveLength(1);
    expect(result[1].events).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    const result = mapTrucksWithEvents([]);

    expect(result).toEqual([]);
  });
});
