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

jest.unstable_mockModule('@/lib/logging', () => ({
  logMessage: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

describe('webhook buildOperatingHours (recurring-safe)', () => {
  let buildOperatingHours: typeof import('@/lib/webhooks/postProcessingPipeline').buildOperatingHours;

  beforeEach(async () => {
    fake.clearAll();
    const mod = await import('@/lib/webhooks/postProcessingPipeline');
    buildOperatingHours = mod.buildOperatingHours;
  });

  it('maps canonical weekdays into open/close records', () => {
    const result = buildOperatingHours('11:00', '14:00', ['monday', 'tuesday']);

    expect(result).toEqual({
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '11:00', close: '14:00' },
    });
  });

  it('returns empty object when days is undefined', () => {
    const result = buildOperatingHours('09:00', '17:00');

    expect(result).toEqual({});
  });

  it('returns empty object when days is empty array', () => {
    const result = buildOperatingHours('09:00', '17:00', []);

    expect(result).toEqual({});
  });

  it('returns empty object when no canonical weekday remains', () => {
    const result = buildOperatingHours('09:00', '17:00', ['today', 'tomorrow']);

    expect(result).toEqual({});
  });

  it('rejects calendar-date strings', () => {
    const result = buildOperatingHours('09:00', '17:00', ['2026-07-29', '07/29/2026']);

    expect(result).toEqual({});
  });

  it('normalizes weekday abbreviations', () => {
    const result = buildOperatingHours('10:00', '20:00', ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']);

    expect(result).toEqual({
      monday: { open: '10:00', close: '20:00' },
      tuesday: { open: '10:00', close: '20:00' },
      wednesday: { open: '10:00', close: '20:00' },
      thursday: { open: '10:00', close: '20:00' },
      friday: { open: '10:00', close: '20:00' },
      saturday: { open: '10:00', close: '20:00' },
      sunday: { open: '10:00', close: '20:00' },
    });
  });

  it('filters out non-canonical days while keeping canonical ones', () => {
    const result = buildOperatingHours('11:00', '15:00', ['monday', 'today', 'friday', 'tomorrow']);

    expect(result).toEqual({
      monday: { open: '11:00', close: '15:00' },
      friday: { open: '11:00', close: '15:00' },
    });
  });
});

describe('webhook applyPostUpdate (recurring-hours write safety)', () => {
  let applyPostUpdate: typeof import('@/lib/webhooks/postProcessingPipeline').applyPostUpdate;

  beforeEach(async () => {
    fake.clearAll();
    const mod = await import('@/lib/webhooks/postProcessingPipeline');
    applyPostUpdate = mod.applyPostUpdate;
  });

  const makePost = (overrides?: Record<string, unknown>) => ({
    id: 'post-1',
    truck_id: 'truck-1',
    facebook_post_id: 'fb-1',
    message: 'We are open today!',
    raw_text: null,
    attachments: null,
    created_time: '2026-07-29T12:00:00Z',
    status: 'pending',
    confidence: 0.9,
    source: 'facebook',
    ...overrides,
  });

  it('preserves unrelated existing days when updating schedule', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: {
          tuesday: { open: '10:00', close: '16:00' },
          friday: { open: '12:00', close: '20:00' },
        },
      },
    ]);

    await applyPostUpdate(fake.client, makePost(), {
      food_items: [],
      times: { start: '11:00', end: '14:00', days: ['monday'] },
      confidence: 0.9,
    });

    const { data } = await fake.client.from('food_trucks').select('operating_hours').eq('id', 'truck-1').single();
    const hours = (data as Record<string, unknown>).operating_hours as Record<string, { open: string; close: string }>;
    expect(hours).toEqual({
      tuesday: { open: '10:00', close: '16:00' },
      friday: { open: '12:00', close: '20:00' },
      monday: { open: '11:00', close: '14:00' },
    });
  });

  it('does not mutate truck when no canonical weekday is provided', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: {
          monday: { open: '09:00', close: '17:00' },
        },
      },
    ]);

    await applyPostUpdate(fake.client, makePost(), {
      food_items: [],
      times: { start: '11:00', end: '14:00', days: ['today', 'tomorrow'] },
      confidence: 0.9,
    });

    const { data } = await fake.client.from('food_trucks').select('operating_hours').eq('id', 'truck-1').single();
    const hours = (data as Record<string, unknown>).operating_hours as Record<string, { open: string; close: string }>;
    expect(hours).toEqual({
      monday: { open: '09:00', close: '17:00' },
    });
  });

  it('does not update facebook_last_sync when schedule write is skipped', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: {},
        facebook_last_sync: null,
      },
    ]);

    await applyPostUpdate(fake.client, makePost(), {
      food_items: [],
      times: { start: '11:00', end: '14:00', days: ['today'] },
      confidence: 0.9,
    });

    const { data } = await fake.client.from('food_trucks').select('facebook_last_sync').eq('id', 'truck-1').single();
    expect((data as Record<string, unknown>).facebook_last_sync).toBeNull();
  });

  it('handles operating_hours: null by using empty merge base', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: null,
      },
    ]);

    await applyPostUpdate(fake.client, makePost(), {
      food_items: [],
      times: { start: '11:00', end: '14:00', days: ['monday'] },
      confidence: 0.9,
    });

    const { data } = await fake.client.from('food_trucks').select('operating_hours').eq('id', 'truck-1').single();
    const hours = (data as Record<string, unknown>).operating_hours as Record<string, { open: string; close: string }>;
    expect(hours).toEqual({
      monday: { open: '11:00', close: '14:00' },
    });
  });

  it('updates facebook_last_sync on successful recurring schedule write', async () => {
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        operating_hours: {},
        facebook_last_sync: null,
      },
    ]);

    await applyPostUpdate(fake.client, makePost(), {
      food_items: [],
      times: { start: '11:00', end: '14:00', days: ['monday'] },
      confidence: 0.9,
    });

    const { data } = await fake.client.from('food_trucks').select('facebook_last_sync').eq('id', 'truck-1').single();
    expect((data as Record<string, unknown>).facebook_last_sync).toEqual(expect.any(String));
  });
});
