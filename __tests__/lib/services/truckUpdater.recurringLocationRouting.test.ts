/**
 * @jest-environment node
 *
 * Recurring-location routing parity in updateTruckData: the per-day
 * location write happens ONLY when the recurring schedule write will
 * actually run and absorb the location. A proposal with a day set but no
 * applicable schedule (incomplete times or no canonical weekday names)
 * fails closed with LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA — the
 * permanent-location path no longer exists.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory } from '@/__tests__/fakes/fakeSupabase';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

const MIXED_CLASSIFICATION = { type: 'mixed', confidence: 0.9, reason: 'Mixed update' };

const geocodeAddressMock = jest.fn<
  (address: string) => Promise<{
    success: boolean;
    lat: number;
    lng: number;
    formatted_address: string;
  }>
>();

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: jest.fn(),
}));

jest.unstable_mockModule('@/lib/utils/geocoding', () => ({
  geocodeAddress: geocodeAddressMock,
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logMessage: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
  logDebug: jest.fn(),
}));

function seedTruck(fake: FakeSupabaseFactory): void {
  fake.seedTable('food_trucks', [
    {
      id: 'truck-1',
      slug: 'truck-one',
      timezone: 'America/New_York',
      street_address: '1 Old Address',
      menu: [],
    },
  ]);
}

function mixedPost(
  times: Record<string, unknown>,
  address = '1201 Knox Ave, North Augusta, SC 29841',
): never {
  return {
    food_items: [],
    location: { address, fuzzy: false },
    times,
    confidence: 0.9,
  } as never;
}

const ALLOW = { shouldUpdate: true, requiresConfirmation: false };

describe('updateTruckData — recurring location routing parity', () => {
  let updateTruckData: typeof import('@/lib/services/truckUpdater').updateTruckData;

  const ACTION_AT = '2026-08-26T18:00:00.000Z';
  const fbDayMeta = { _meta: { schedule: { source: 'facebook', last_action_at: ACTION_AT }, location: { source: 'facebook', last_action_at: ACTION_AT } } };

  beforeEach(async () => {
    geocodeAddressMock.mockReset();
    geocodeAddressMock.mockImplementation(async (address: string) => ({
      success: true,
      lat: 33.5,
      lng: -81.9,
      formatted_address: address,
    }));
    const mod = await import('@/lib/services/truckUpdater');
    updateTruckData = mod.updateTruckData;
  });

  it('writes the location per-day when a canonical recurring schedule applies', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);

    const result = await updateTruckData(
      'truck-1',
      MIXED_CLASSIFICATION,
      mixedPost({ start: '11:00', end: '14:00', scope: 'recurring_weekly', days: ['monday'] }),
      ALLOW,
      undefined,
      { supabase: fake.client as unknown as AdminClient, fbActionAt: ACTION_AT },
    );

    expect(result).toMatchObject({ success: true, updatedFields: ['schedule'] });
    const { data } = await fake.client
      .from('food_trucks')
      .select('operating_hours, street_address, current_location')
      .eq('id', 'truck-1')
      .single();
    const row = data as Record<string, unknown>;
    expect(row.operating_hours).toEqual({
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave, North Augusta, SC 29841',
        ...fbDayMeta,
      },
    });
    expect(row.street_address).toBe('1 Old Address');
  });

  it('fails closed when a day set has incomplete times (no permanent-location fallback)', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);

    const result = await updateTruckData(
      'truck-1',
      MIXED_CLASSIFICATION,
      mixedPost({ days: ['monday'] }),
      ALLOW,
      undefined,
      { supabase: fake.client as unknown as AdminClient },
    );

    // Pre-Meta: a location without an applicable schedule can never reach
    // the permanent-location writer.
    expect(result).toMatchObject({
      success: false,
      error: 'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA',
    });
    const { data } = await fake.client
      .from('food_trucks')
      .select('street_address, operating_hours')
      .eq('id', 'truck-1')
      .single();
    const row = data as Record<string, unknown>;
    expect(row.street_address).toBe('1 Old Address');
    expect(row.operating_hours).toBeUndefined();
  });

  it('fails closed when a day set has no canonical weekday (no permanent-location fallback)', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);

    const result = await updateTruckData(
      'truck-1',
      MIXED_CLASSIFICATION,
      mixedPost({ start: '11:00', end: '14:00', days: ['someday'] }),
      ALLOW,
      undefined,
      { supabase: fake.client as unknown as AdminClient },
    );

    // Pre-Meta: a location without an applicable schedule can never reach
    // the permanent-location writer.
    expect(result).toMatchObject({
      success: false,
      error: 'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA',
    });
    const { data } = await fake.client
      .from('food_trucks')
      .select('street_address, operating_hours')
      .eq('id', 'truck-1')
      .single();
    const row = data as Record<string, unknown>;
    expect(row.street_address).toBe('1 Old Address');
    expect(row.operating_hours).toBeUndefined();
  });

  it('absorbs an abbreviated day set (alias-aware) into the per-day schedule write', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);

    const result = await updateTruckData(
      'truck-1',
      MIXED_CLASSIFICATION,
      mixedPost({ start: '11:00', end: '14:00', scope: 'recurring_weekly', days: ['Mon'] }),
      ALLOW,
      undefined,
      { supabase: fake.client as unknown as AdminClient, fbActionAt: ACTION_AT },
    );

    expect(result).toMatchObject({ success: true, updatedFields: ['schedule'] });
    const { data } = await fake.client
      .from('food_trucks')
      .select('operating_hours, street_address')
      .eq('id', 'truck-1')
      .single();
    const row = data as Record<string, unknown>;
    expect(row.operating_hours).toEqual({
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave, North Augusta, SC 29841',
        ...fbDayMeta,
      },
    });
    expect(row.street_address).toBe('1 Old Address');
  });

  it('absorbs a whitespace-padded canonical day set into the per-day schedule write', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);

    const result = await updateTruckData(
      'truck-1',
      MIXED_CLASSIFICATION,
      mixedPost({ start: '11:00', end: '14:00', scope: 'recurring_weekly', days: [' monday'] }),
      ALLOW,
      undefined,
      { supabase: fake.client as unknown as AdminClient, fbActionAt: ACTION_AT },
    );

    expect(result).toMatchObject({ success: true, updatedFields: ['schedule'] });
    const { data } = await fake.client
      .from('food_trucks')
      .select('operating_hours, street_address')
      .eq('id', 'truck-1')
      .single();
    const row = data as Record<string, unknown>;
    expect(row.operating_hours).toEqual({
      monday: {
        open: '11:00',
        close: '14:00',
        location: '1201 Knox Ave, North Augusta, SC 29841',
        ...fbDayMeta,
      },
    });
    expect(row.street_address).toBe('1 Old Address');
  });

  it('fails closed when days is a non-array JSON value (no permanent-location fallback)', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);

    const result = await updateTruckData(
      'truck-1',
      MIXED_CLASSIFICATION,
      mixedPost({ start: '11:00', end: '14:00', days: 'monday' }),
      ALLOW,
      undefined,
      { supabase: fake.client as unknown as AdminClient },
    );

    expect(result).toMatchObject({
      success: false,
      error: 'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA',
    });
  });
});
