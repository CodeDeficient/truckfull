/**
 * Test utilities for MapboxMapComponent tests
 * Provides factory functions for creating consistent, maintainable test data
 */

import React from 'react';
import { jest } from '@jest/globals';
import { render } from '@testing-library/react';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import type { ClusterFeature, SuperClusterFeature } from '../useMapClustering';
import type { MapRef } from 'react-map-gl/mapbox';
import { AuthProvider } from '@/app/auth/AuthProvider';

// Re-export AuthProvider for tests that need direct access
export { AuthProvider };

/**
 * Helper to render components with AuthProvider wrapper.
 * This is needed because MapboxMapComponent uses auth context internally.
 */
export const renderWithAuth = (ui: React.ReactElement) => {
  return render(<AuthProvider>{ui}</AuthProvider>);
};

// Create a mock AuthContext that matches the shape used by useFavorites
export const MockAuthContext = React.createContext({
  user: { id: 'test-user-id', email: 'test@example.com' },
  loading: false,
  signOut: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
});

/**
 * Creates a realistic mock FoodTruck object with all required fields
 * @param overrides - Optional partial truck data to override defaults
 * @returns A complete FoodTruck object
 */
export const createMockTruck = (overrides?: Partial<FoodTruck>): FoodTruck => {
  const baseTruck: FoodTruck = {
    id: 'truck-1',
    name: 'Test Truck',
    slug: 'test-truck',
    description: 'A test food truck',
    current_location: {
      lat: 33.4735,
      lng: -82.0105,
      address: '123 Test St',
      timestamp: new Date().toISOString(),
    },
    operating_hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '18:00' },
      sunday: { open: '10:00', close: '18:00' },
    },
    menu_items: [
      {
        id: 'menu-1',
        name: 'Tacos',
        description: 'Delicious tacos',
        price: 5,
        category: 'Main',
      },
    ],
    cuisine_type: ['Mexican'],
    price_range: '$$',
    specialties: ['Tacos', 'Burritos'],
    contact_info: {
      phone: '555-1234',
      email: 'test@truck.com',
      website: 'https://testtruck.com',
    },
    social_media: {
      facebook: 'https://facebook.com/testtruck',
      instagram: 'https://instagram.com/testtruck',
      twitter: 'https://twitter.com/testtruck',
      photo_url: 'https://example.com/truck.jpg',
    },
    data_quality_score: 100,
    verification_status: 'verified',
    source_url: 'https://example.com/source',
    source_urls: ['https://example.com/source'],
    image_url: 'https://example.com/truck.jpg',
    last_synced_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    average_rating: 4.5,
    review_count: 10,
    is_open: true,
    is_active: true,
    is_claimed: true,
    claimed_at: new Date().toISOString(),
    claimed_by: 'user-1',
    claim_verification_method: 'email',
    status: 'live',
    default_lat: 33.4735,
    default_lng: -82.0105,
    exact_location: {
      lat: 33.4735,
      lng: -82.0105,
      address: '123 Exact St',
    },
    live_gps_lat: 33.4735,
    live_gps_lng: -82.0105,
    live_gps_accuracy: 10,
    live_gps_timestamp: new Date().toISOString(),
    scheduled_locations: [],
    city_location: {
      lat: 33.4735,
      lng: -82.0105,
    },
    city: 'Augusta',
    state: 'GA',
    street_address: '123 Test St',
    zip: '30901',
    owner_id: 'owner-1',
    user_id: 'user-1',
    view_count: 100,
    review_status: 'approved',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { ...baseTruck, ...overrides };
};

/**
 * Creates a realistic mock FoodTruckDomain object with all required fields
 * @param overrides - Optional partial truck data to override defaults
 * @returns A complete FoodTruckDomain object
 */
export const createMockTruckDomain = (overrides?: Partial<FoodTruckDomain>): FoodTruckDomain => {
  const baseTruck: FoodTruckDomain = {
    id: 'truck-1',
    name: 'Test Truck',
    slug: 'test-truck',
    description: 'A test food truck',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    current_location: {
      lat: 33.4735,
      lng: -82.0105,
      address: '123 Test St',
      timestamp: new Date().toISOString(),
    },
    operating_hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '10:00', close: '18:00' },
      sunday: { open: '10:00', close: '18:00' },
    },
    menu_items: [
      {
        id: 'menu-1',
        name: 'Tacos',
        description: 'Delicious tacos',
        price: 5,
        category: 'Main',
      },
    ],
    cuisine_type: ['Mexican'],
    price_range: '$$',
    specialties: ['Tacos', 'Burritos'],
    data_quality_score: 100,
    verification_status: 'verified',
    source_url: 'https://example.com/source',
    image_url: 'https://example.com/truck.jpg',
    last_synced_at: new Date().toISOString(),
    average_rating: 4.5,
    review_count: 10,
    contact_info: {
      phone: '555-1234',
      email: 'test@truck.com',
      website: 'https://testtruck.com',
    },
    social_media: {
      facebook: 'https://facebook.com/testtruck',
      instagram: 'https://instagram.com/testtruck',
      twitter: 'https://twitter.com/testtruck',
      photo_url: 'https://example.com/truck.jpg',
    },
    is_active: true,
    is_open: true,
    events: [],
    street_address: '123 Test St',
    city: 'Augusta',
    state: 'GA',
    zip: '30901',
    default_lat: 33.4735,
    default_lng: -82.0105,
    live_gps_lat: 33.4735,
    live_gps_lng: -82.0105,
    live_gps_accuracy: 10,
    live_gps_timestamp: new Date().toISOString(),
    status: 'live',
    is_claimed: true,
    claimed_at: new Date().toISOString(),
    claimed_by: 'user-1',
    claim_verification_method: 'email',
    owner_id: 'owner-1',
    subscription_tier: 'premium',
    view_count: 100,
    _type: 'domain',
  };

  return { ...baseTruck, ...overrides };
};

/**
 * Creates a valid cluster GeoJSON feature
 * @param pointCount - Number of points in the cluster
 * @param coordinates - Optional [longitude, latitude] coordinates
 * @returns A ClusterFeature object
 */
export const createMockCluster = (
  pointCount: number,
  coordinates?: [number, number],
): ClusterFeature => {
  const [lng, lat] = coordinates ?? [-82.0105, 33.4735];

  return {
    type: 'Feature',
    id: 1,
    properties: {
      cluster: true,
      cluster_id: 1,
      point_count: pointCount,
      point_count_abbreviated: `${pointCount}`,
    },
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  };
};

/**
 * Creates a valid point feature GeoJSON object
 * @param truck - The truck to include in the feature
 * @param coordinates - Optional [longitude, latitude] coordinates
 * @returns A SuperClusterFeature object for an individual truck
 */
export const createMockPointFeature = (
  truck: FoodTruck,
  coordinates?: [number, number],
): SuperClusterFeature => {
  const [lng, lat] = coordinates ?? [
    truck.current_location?.lng ?? -82.0105,
    truck.current_location?.lat ?? 33.4735,
  ];

  return {
    type: 'Feature',
    id: truck.id,
    properties: {
      truckId: truck.id,
      truck: truck,
      cluster: false,
    },
    geometry: {
      type: 'Point',
      coordinates: [lng, lat],
    },
  };
};

/**
 * Creates a mock MapRef with all methods used by MapboxMapComponent
 * @returns A MapRef mock with jest.fn() for all methods
 */
export const createMockMapRef = (): MapRef => {
  const mockMapInstance = {
    flyTo: jest.fn(),
    getZoom: jest.fn(() => 12),
    getCenter: jest.fn(() => ({ lng: -82.0105, lat: 33.4728 })),
    getBearing: jest.fn(() => 0),
    getPitch: jest.fn(() => 0),
    setRenderWorldCopies: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getLayer: jest.fn(),
    setLayoutProperty: jest.fn(),
    setFilter: jest.fn(),
    getStyle: jest.fn(),
    setTerrain: jest.fn(),
    setPitch: jest.fn(),
    setBearing: jest.fn(),
    setPaintProperty: jest.fn(),
    setProjection: jest.fn(),
  };

  return {
    getMap: jest.fn(() => mockMapInstance),
  } as unknown as MapRef;
};

/**
 * Creates an array of mock trucks with unique IDs and locations
 * @param count - Number of trucks to create
 * @param centerLat - Center latitude for truck locations
 * @param centerLng - Center longitude for truck locations
 * @returns Array of FoodTruck objects
 */
export const createMockTruckArray = (
  count: number,
  centerLat: number = 33.4735,
  centerLng: number = -82.0105,
): FoodTruck[] => {
  const trucks: FoodTruck[] = [];

  for (let i = 0; i < count; i++) {
    const offsetLat = (i * 0.001) % 0.01;
    const offsetLng = (i * 0.001) % 0.01;

    trucks.push(
      createMockTruck({
        id: `truck-${i}`,
        slug: `test-truck-${i}`,
        name: `Test Truck ${i}`,
        current_location: {
          lat: centerLat + offsetLat,
          lng: centerLng + offsetLng,
          address: `${i + 123} Test St`,
          timestamp: new Date().toISOString(),
        },
      }),
    );
  }

  return trucks;
};

/**
 * Test helper to wrap components in an AuthProvider with mocked context
 * This is needed because useFavorites requires an AuthProvider context
 */
export function renderWithAuthProvider(
  ui: React.ReactElement,
  options?: {
    user?: { id: string; email: string } | null;
    loading?: boolean;
  },
) {
  const mockUser = options?.user ?? { id: 'test-user-id', email: 'test@example.com' };
  const mockLoading = options?.loading ?? false;

  const AuthContextMock = React.createContext({
    user: mockUser,
    loading: mockLoading,
    signOut: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  });

  const AuthProviderWrapper = ({ children }: { children: React.ReactNode }) => {
    return React.createElement(
      AuthContextMock.Provider,
      { value: { user: mockUser, loading: mockLoading, signOut: jest.fn<() => Promise<void>>() } },
      children,
    );
  };

  return {
    ...render(ui, { wrapper: AuthProviderWrapper }),
  };
}
