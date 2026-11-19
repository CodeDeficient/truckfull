/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory } from '@/__tests__/fakes/fakeSupabase';

const fake: FakeSupabaseFactory = createFakeSupabaseClient();

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: jest.fn(() => fake.client),
}));

let updateTruckData: typeof import('@/lib/supabase/utils/menuUtils').updateTruckData;

beforeAll(async () => {
  const mod = await import('@/lib/supabase/utils/menuUtils');
  updateTruckData = mod.updateTruckData;
});

describe('menuUtils.updateTruckData conditional operating_hours write', () => {
  beforeEach(() => {
    fake.clearAll();
  });

  const baseRow = {
    id: 'truck-1',
    slug: 'taco-truck',
    name: 'Taco Truck',
    phone: '555-0100',
  };

  it('resolves the mocked admin client to the fake', async () => {
    const adminMod = await import('@/lib/supabase/admin');
    const resolved = (adminMod as { getSupabaseAdmin: () => unknown }).getSupabaseAdmin();
    expect(resolved).toBe(fake.client);
  });

  it('writes when the stored hours still match the expected snapshot', async () => {
    const hours = { monday: { open: '11:00', close: '14:00' } };
    fake.seedTable('food_trucks', [{ ...baseRow, operating_hours: hours }]);

    const result = await updateTruckData('truck-1', { phone: '555-0111' }, {
      expectedOperatingHours: hours,
    });

    expect(result).toMatchObject({ id: 'truck-1', phone: '555-0111' });
  });

  it('returns OPERATING_HOURS_CONFLICT and writes nothing when a concurrent write changes hours first', async () => {
    const hours = { monday: { open: '11:00', close: '14:00' } };
    fake.seedTable('food_trucks', [{ ...baseRow, operating_hours: hours }]);

    // Simulate Facebook winning the race between the owner snapshot and the
    // save: the stored hours differ from the expected snapshot at write time.
    fake.beforeNextUpdate('food_trucks', (rows) =>
      rows.map((row) => ({
        ...row,
        operating_hours: { monday: { open: '09:00', close: '17:00' } },
      })),
    );

    const result = await updateTruckData('truck-1', { phone: '555-0111' }, {
      expectedOperatingHours: hours,
    });

    expect(result).toEqual({ error: 'OPERATING_HOURS_CONFLICT' });
  });

  it('matches byte-differing but structurally equal JSON snapshots', async () => {
    const hours = { monday: { open: '11:00', close: '14:00' }, tuesday: { closed: true } };
    fake.seedTable('food_trucks', [{ ...baseRow, operating_hours: hours }]);

    const result = await updateTruckData('truck-1', { phone: '555-0111' }, {
      // Same days/fields in a different key order — structural equality holds.
      expectedOperatingHours: { tuesday: { closed: true }, monday: { open: '11:00', close: '14:00' } },
    });

    expect(result).toMatchObject({ id: 'truck-1' });
  });

  it('writes unconditionally when no expected snapshot is supplied', async () => {
    const hours = { monday: { open: '11:00', close: '14:00' } };
    fake.seedTable('food_trucks', [{ ...baseRow, operating_hours: hours }]);

    const result = await updateTruckData('truck-1', { phone: '555-0111' });

    expect(result).toMatchObject({ id: 'truck-1', phone: '555-0111' });
  });

  it('succeeds when the expected snapshot is null and the stored column is null', async () => {
    fake.seedTable('food_trucks', [{ ...baseRow, operating_hours: null }]);

    const result = await updateTruckData('truck-1', { phone: '555-0111' }, {
      expectedOperatingHours: null,
    });

    expect(result).toMatchObject({ id: 'truck-1', phone: '555-0111' });
  });

  it('reports a conflict when the expected snapshot is null but the column has data', async () => {
    const hours = { monday: { open: '11:00', close: '14:00' } };
    fake.seedTable('food_trucks', [{ ...baseRow, operating_hours: hours }]);

    const result = await updateTruckData('truck-1', { phone: '555-0111' }, {
      expectedOperatingHours: null,
    });

    expect(result).toEqual({ error: 'OPERATING_HOURS_CONFLICT' });
  });
});