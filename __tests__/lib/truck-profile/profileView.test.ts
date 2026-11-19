import { describe, expect, it } from '@jest/globals';
import {
  buildTruckProfileView,
  normalizeProfileDescription,
  normalizeProfileHours,
} from '@/lib/truck-profile/profileView';
import type { PublicTruckRow } from '@/lib/services/publicTruckPage';

function profileRow(overrides: Partial<Record<string, unknown>>): PublicTruckRow {
  return {
    id: 'truck-1',
    name: 'Test Truck',
    slug: 'test-truck',
    description: null,
    cuisine_type: ['Vegan'],
    city: 'Graniteville',
    state: 'SC',
    updated_at: null,
    contact_info: null,
    social_media: null,
    current_location: null,
    default_lat: null,
    default_lng: null,
    live_gps_lat: null,
    live_gps_lng: null,
    status: 'offline',
    price_range: null,
    menu: null,
    operating_hours: null,
    timezone: null,
    is_active: true,
    average_rating: null,
    review_count: null,
    is_claimed: null,
    ...overrides,
  } as unknown as PublicTruckRow;
}

it('uses the current-day schedule override for its service date', () => {
  const result = normalizeProfileHours({ monday: { open: '09:00', close: '17:00' } }, { open: '12:30', close: '16:00' }, '2026-09-28', 'America/New_York');
  expect(result.hours[0].hours).toBe('12:30 – 16:00');
});

it('omits generated name-explanation subtitles', () => {
  expect(normalizeProfileDescription('"Italian Ice and Concessions" in name')).toBeNull();
});

it('preserves genuine descriptions', () => {
  expect(normalizeProfileDescription('Fresh Italian ice served daily.')).toBe('Fresh Italian ice served daily.');
});

it('omits missing descriptions', () => {
  expect(normalizeProfileDescription(null)).toBeNull();
});

describe('buildTruckProfileView coordinate resolution', () => {
  it('falls back to default coordinates when current_location has only an address, matching the location_geog trigger', () => {
    const view = buildTruckProfileView(
      profileRow({
        current_location: { address: ', Graniteville, SC ' },
        default_lat: 33.5886699,
        default_lng: -81.7734359,
      }),
    );
    expect(view.lat).toBe(33.5886699);
    expect(view.lng).toBe(-81.7734359);
  });

  it('prefers live GPS coordinates while the truck status is live', () => {
    const view = buildTruckProfileView(
      profileRow({
        status: 'live',
        current_location: { lat: 1, lng: 2, address: 'x' },
        default_lat: 3,
        default_lng: 4,
        live_gps_lat: 33.588725,
        live_gps_lng: -81.7733545,
      }),
    );
    expect(view.lat).toBe(33.588725);
    expect(view.lng).toBe(-81.7733545);
  });

  it('prefers default coordinates over current_location while offline, matching the location_geog trigger', () => {
    const view = buildTruckProfileView(
      profileRow({
        current_location: { lat: 10, lng: 20 },
        default_lat: 3,
        default_lng: 4,
      }),
    );
    expect(view.lat).toBe(3);
    expect(view.lng).toBe(4);
  });

  it('ignores stale live GPS while offline, matching the location_geog trigger', () => {
    const view = buildTruckProfileView(
      profileRow({
        live_gps_lat: 33.588725,
        live_gps_lng: -81.7733545,
      }),
    );
    expect(view.lat).toBeNull();
    expect(view.lng).toBeNull();
  });

  it('returns null coordinates when no valid pair exists', () => {
    const view = buildTruckProfileView(
      profileRow({
        current_location: { address: ', Graniteville, SC ' },
        default_lat: 999,
        default_lng: -81.7,
      }),
    );
    expect(view.lat).toBeNull();
    expect(view.lng).toBeNull();
  });
});

it.each([
  { is_claimed: true, expected: true },
  { is_claimed: false, expected: false },
  { is_claimed: null, expected: false },
])('treats only an explicit claim as claimed (%o)', ({ is_claimed, expected }) => {
  expect(buildTruckProfileView(profileRow({ is_claimed })).isClaimed).toBe(expected);
});
