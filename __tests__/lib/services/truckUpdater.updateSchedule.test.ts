/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory } from '@/__tests__/fakes/fakeSupabase';

const fake: FakeSupabaseFactory = createFakeSupabaseClient();

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: jest.fn(() => fake.client),
}));

jest.unstable_mockModule('@/lib/utils/geocoding', () => ({
  geocodeAddress: jest.fn(),
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logMessage: jest.fn(),
  logError: jest.fn(),
}));

describe('updateSchedule (recurring-hours write safety)', () => {
  let updateSchedule: typeof import('@/lib/services/truckUpdater').updateSchedule;

  const ACTION_AT = '2026-07-29T12:00:00Z';
  // A newly created day is stamped with the canonical Facebook action time.
  const fbDayMeta = { _meta: { schedule: { source: 'facebook', last_action_at: ACTION_AT } } };

  beforeEach(async () => {
    fake.clearAll();
    const mod = await import('@/lib/services/truckUpdater');
    updateSchedule = mod.updateSchedule;
  });

  it('merges new weekday entries into existing operating_hours', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: {
          tuesday: { open: '10:00', close: '16:00' },
          friday: { open: '12:00', close: '20:00' },
        },
      },
    ]);

    const result = await updateSchedule({
      supabase: fake.client,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      now: ACTION_AT,
      fbActionAt: ACTION_AT,
    });

    expect(result.success).toBe(true);

    const { data } = await fake.client.from('food_trucks').select('operating_hours').eq('id', 'truck-1').single();
    const hours = (data as Record<string, unknown>).operating_hours as Record<string, { open: string; close: string }>;
    expect(hours).toEqual({
      tuesday: { open: '10:00', close: '16:00' },
      friday: { open: '12:00', close: '20:00' },
      monday: { open: '11:00', close: '14:00', ...fbDayMeta },
    });
  });

  it('updates multiple intended weekdays correctly', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: {
          sunday: { open: '09:00', close: '17:00' },
        },
      },
    ]);

    const result = await updateSchedule({
      supabase: fake.client,
      truckId: 'truck-1',
      start: '08:00',
      end: '22:00',
      days: ['monday', 'wednesday', 'friday'],
      now: ACTION_AT,
      fbActionAt: ACTION_AT,
    });

    expect(result.success).toBe(true);

    const { data } = await fake.client.from('food_trucks').select('operating_hours').eq('id', 'truck-1').single();
    const hours = (data as Record<string, unknown>).operating_hours as Record<string, { open: string; close: string }>;
    expect(hours).toMatchObject({
      sunday: { open: '09:00', close: '17:00' },
      monday: { open: '08:00', close: '22:00', ...fbDayMeta },
      wednesday: { open: '08:00', close: '22:00', ...fbDayMeta },
      friday: { open: '08:00', close: '22:00', ...fbDayMeta },
    });
  });

  it('handles operating_hours: null by using empty merge base', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: null,
      },
    ]);

    const result = await updateSchedule({
      supabase: fake.client,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday'],
      now: ACTION_AT,
      fbActionAt: ACTION_AT,
    });

    expect(result.success).toBe(true);

    const { data } = await fake.client.from('food_trucks').select('operating_hours').eq('id', 'truck-1').single();
    const hours = (data as Record<string, unknown>).operating_hours as Record<string, { open: string; close: string }>;
    expect(hours).toEqual({
      monday: { open: '11:00', close: '14:00', ...fbDayMeta },
    });
  });

  it('returns failure when no canonical weekday is provided', async () => {
    fake.seedTable('food_trucks', [
      { id: 'truck-1', operating_hours: {} },
    ]);

    const result = await updateSchedule({
      supabase: fake.client,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['today', 'tomorrow'],
      now: '2026-07-29T12:00:00Z',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No canonical weekdays');
  });

  it('returns failure when days is undefined', async () => {
    fake.seedTable('food_trucks', [
      { id: 'truck-1', operating_hours: {} },
    ]);

    const result = await updateSchedule({
      supabase: fake.client,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: undefined,
      now: '2026-07-29T12:00:00Z',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No canonical weekdays');
  });

  it('returns failure when days is empty', async () => {
    fake.seedTable('food_trucks', [
      { id: 'truck-1', operating_hours: {} },
    ]);

    const result = await updateSchedule({
      supabase: fake.client,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: [],
      now: '2026-07-29T12:00:00Z',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('No canonical weekdays');
  });

  it('preserves unrelated existing weekdays when updating', async () => {
    const ownerMeta = { _meta: { schedule: { source: 'manual', last_action_at: '2026-07-01T00:00:00Z' } } };
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: {
          monday: { open: '09:00', close: '17:00', ...ownerMeta },
          tuesday: { open: '09:00', close: '17:00' },
          wednesday: { open: '09:00', close: '17:00', ...ownerMeta },
          thursday: { open: '09:00', close: '17:00' },
          friday: { open: '09:00', close: '17:00', ...ownerMeta },
          saturday: { open: '10:00', close: '15:00' },
          sunday: { open: '10:00', close: '15:00' },
        },
      },
    ]);

    const result = await updateSchedule({
      supabase: fake.client,
      truckId: 'truck-1',
      start: '11:00',
      end: '14:00',
      days: ['monday', 'wednesday', 'friday'],
      now: ACTION_AT,
      fbActionAt: ACTION_AT,
    });

    expect(result.success).toBe(true);

    const { data } = await fake.client.from('food_trucks').select('operating_hours').eq('id', 'truck-1').single();
    const hours = (data as Record<string, unknown>).operating_hours as Record<string, { open: string; close: string }>;
    expect(hours).toEqual({
      monday: { open: '11:00', close: '14:00', ...fbDayMeta },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '11:00', close: '14:00', ...fbDayMeta },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '11:00', close: '14:00', ...fbDayMeta },
      saturday: { open: '10:00', close: '15:00' },
      sunday: { open: '10:00', close: '15:00' },
    });
  });
});
