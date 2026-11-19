import { describe, it, expect } from '@jest/globals';
import { convertToFoodTruck } from '@/lib/utils/truckUtils';
import type { FoodTruckDomain } from '@/lib/types';

function createMockDomain(overrides: Partial<FoodTruckDomain> = {}): FoodTruckDomain {
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
    subscription_tier: 'pro',
    ...overrides,
  } as unknown as FoodTruckDomain;
}

describe('convertToFoodTruck', () => {
  it('converts a complete domain object to FoodTruck', () => {
    const domain = createMockDomain();
    const result = convertToFoodTruck(domain, false);

    expect(result.id).toBe(domain.id);
    expect(result.name).toBe(domain.name);
    expect(result.description).toBe(domain.description);
    expect(result.cuisine_type).toEqual(domain.cuisine_type);
    expect(result.price_range).toBe(domain.price_range);
    expect(result.average_rating).toBe(domain.average_rating);
    expect(result.review_count).toBe(domain.review_count);
  });

  it('preserves contact_info in converted object', () => {
    const domain = createMockDomain();
    const result = convertToFoodTruck(domain, false);

    expect(result.contact_info).toEqual(domain.contact_info);
    expect(result.phone_number).toBe(domain.contact_info.phone);
    expect(result.email).toBe(domain.contact_info.email);
    expect(result.website).toBe(domain.contact_info.website);
  });

  it('preserves social_media in converted object', () => {
    const domain = createMockDomain();
    const result = convertToFoodTruck(domain, false);

    expect(result.social_media).toEqual(domain.social_media);
    expect(result.instagram_handle).toBe(domain.social_media.instagram);
    expect(result.facebook_handle).toBe(domain.social_media.facebook);
    expect(result.twitter_handle).toBe(domain.social_media.twitter);
  });

  it('preserves current_location in converted object', () => {
    const domain = createMockDomain();
    const result = convertToFoodTruck(domain, false);

    expect(result.current_location).toEqual(domain.current_location);
  });

  it('preserves date-aware schedule fields in converted object', () => {
    const currentDayLocation = { lat: 33.4735, lng: -82.0105, address: '8th and Reynolds St' };
    const upcomingOverrides = [
      { service_date: '2026-09-05', is_closed: false, start_time: '11:00', end_time: '19:00' },
    ];
    const domain = createMockDomain({
      timezone: 'America/New_York',
      current_day_hours: { open: '11:00', close: '19:00', closed: false },
      current_day_service_date: '2026-09-01',
      current_day_location: currentDayLocation,
      upcoming_overrides: upcomingOverrides,
    });
    const result = convertToFoodTruck(domain, false);

    expect(result.timezone).toBe('America/New_York');
    expect(result.current_day_hours).toEqual(domain.current_day_hours);
    expect(result.current_day_service_date).toBe('2026-09-01');
    expect(result.current_day_location).toEqual(currentDayLocation);
    expect(result.upcoming_overrides).toEqual(upcomingOverrides);
  });

  it('defaults date-aware schedule fields to null when absent', () => {
    const domain = createMockDomain();
    const result = convertToFoodTruck(domain, false);

    expect(result.timezone).toBeNull();
    expect(result.current_day_hours).toBeNull();
    expect(result.current_day_service_date).toBeNull();
    expect(result.current_day_location).toBeNull();
    expect(result.upcoming_overrides).toBeNull();
  });

  it('sets schedule to undefined (placeholder)', () => {
    const domain = createMockDomain();
    const result = convertToFoodTruck(domain, false);

    expect(result.schedule).toBeUndefined();
  });

  it('converts cuisine_type array properly', () => {
    const domain = createMockDomain({ cuisine_type: ['Italian', 'Pizza'] });
    const result = convertToFoodTruck(domain, false);

    expect(result.cuisine_type).toEqual(['Italian', 'Pizza']);
  });

  it('handles missing cuisine_type as empty array', () => {
    const domain = createMockDomain({ cuisine_type: undefined as unknown as never });
    const result = convertToFoodTruck(domain, false);

    expect(result.cuisine_type).toEqual([]);
  });

  it('handles non-array cuisine_type as empty array', () => {
    const domain = createMockDomain({ cuisine_type: 'Not an array' as unknown as never });
    const result = convertToFoodTruck(domain, false);

    expect(result.cuisine_type).toEqual([]);
  });

  it('throws error for null/undefined domain', () => {
    expect(() => convertToFoodTruck(null as unknown as FoodTruckDomain, false)).toThrow(
      'Domain object is required for conversion',
    );
    expect(() => convertToFoodTruck(undefined as unknown as FoodTruckDomain, false)).toThrow(
      'Domain object is required for conversion',
    );
  });

  it('uses default values for missing fields', () => {
    const minimalDomain: FoodTruckDomain = {
      id: 'test-id',
      name: 'Minimal Truck',
    } as unknown as FoodTruckDomain;

    const result = convertToFoodTruck(minimalDomain, false);

    expect(result.name).toBe('Minimal Truck');
    expect(result.description).toBe('');
    expect(result.cuisine_type).toEqual([]);
    expect(result.price_range).toBe('');
    expect(result.current_location).toBeNull();
    expect(result.is_active).toBe(false);
  });

  it('generates slug from name', () => {
    const domain = createMockDomain({ name: 'My Food Truck' });
    const result = convertToFoodTruck(domain, false);

    expect(result.slug).toBe('my-food-truck');
  });

  it('generates slug for unknown truck when name is missing', () => {
    const domain = createMockDomain({ name: '' });
    const result = convertToFoodTruck(domain, false);

    expect(result.slug).toBe('unknown-truck');
  });

  it('preserves city, state, zip from domain', () => {
    const domain = createMockDomain({
      city: 'Los Angeles',
      state: 'CA',
      zip: '90001',
    });
    const result = convertToFoodTruck(domain, false);

    expect(result.city).toBe('Los Angeles');
    expect(result.state).toBe('CA');
    expect(result.zip).toBe('90001');
  });

  it('preserves GPS coordinates from domain', () => {
    const domain = createMockDomain({
      live_gps_lat: 34.0522,
      live_gps_lng: -118.2437,
      live_gps_accuracy: 10,
      live_gps_timestamp: '2024-01-01T00:00:00Z',
    });
    const result = convertToFoodTruck(domain, false);

    expect(result.live_gps_lat).toBe(34.0522);
    expect(result.live_gps_lng).toBe(-118.2437);
    expect(result.live_gps_accuracy).toBe(10);
  });

  it('handles missing contact_info gracefully', () => {
    const domain = createMockDomain({ contact_info: undefined as unknown as never });
    const result = convertToFoodTruck(domain, false);

    expect(result.contact_info).toEqual({});
    expect(result.phone_number).toBeUndefined();
    expect(result.email).toBeUndefined();
    expect(result.website).toBeUndefined();
  });

  it('handles missing social_media gracefully', () => {
    const domain = createMockDomain({ social_media: undefined as unknown as never });
    const result = convertToFoodTruck(domain, false);

    expect(result.social_media).toEqual({});
    expect(result.instagram_handle).toBeUndefined();
    expect(result.facebook_handle).toBeUndefined();
    expect(result.twitter_handle).toBeUndefined();
  });

  it('preserves subscription_tier', () => {
    const domain = createMockDomain({ subscription_tier: 'enterprise' });
    const result = convertToFoodTruck(domain, false);

    expect(result.subscription_tier).toBe('enterprise');
  });

  it('maps menu_items to menu property', () => {
    const domain = createMockDomain({
      menu_items: [{ name: 'Burger', price: 15 }],
    });
    const result = convertToFoodTruck(domain, false);

    expect(result.menu).toEqual(domain.menu_items);
  });

  it('handles false is_claimed correctly', () => {
    const domain = createMockDomain({ is_claimed: false });
    const result = convertToFoodTruck(domain, false);

    expect(result.is_claimed).toBe(false);
  });

  it('handles null claimed_at and claimed_by', () => {
    const domain = createMockDomain({
      claimed_at: null,
      claimed_by: null,
    });
    const result = convertToFoodTruck(domain, false);

    expect(result.claimed_at).toBeNull();
    expect(result.claimed_by).toBeNull();
  });

  it('preserves verification status', () => {
    const domain = createMockDomain({ verification_status: 'pending' });
    const result = convertToFoodTruck(domain, false);

    expect(result.verification_status).toBe('pending');
  });

  it('defaults status to offline when not provided', () => {
    const domain = createMockDomain({ status: undefined as unknown as never });
    const result = convertToFoodTruck(domain, false);

    expect(result.status).toBe('offline');
  });

  it('preserves data_quality_score', () => {
    const domain = createMockDomain({ data_quality_score: 0.95 });
    const result = convertToFoodTruck(domain, false);

    expect(result.data_quality_score).toBe(0.95);
  });

  it('handles string source_url correctly', () => {
    const domain = createMockDomain({ source_url: 'https://test.com' });
    const result = convertToFoodTruck(domain, false);

    expect(result.source_url).toBe('https://test.com');
  });

  it('handles non-string source_url as empty string', () => {
    const domain = createMockDomain({ source_url: 123 as unknown as string });
    const result = convertToFoodTruck(domain, false);

    expect(result.source_url).toBe('');
  });

  it('defaults view_count to 0', () => {
    const domain = createMockDomain({ view_count: undefined as unknown as never });
    const result = convertToFoodTruck(domain, false);

    expect(result.view_count).toBe(0);
  });
});
