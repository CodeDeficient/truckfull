import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import { shouldAllowUpdate, isFacebookAutoUpdateEnabled } from '@/lib/services/sourceTracker';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

describe('shouldAllowUpdate', () => {
  it('blocks Facebook updates when automatic updates are disabled', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      { id: 'truck-1', facebook_auto_updates_enabled: false },
    ]);

    const result = await shouldAllowUpdate(
      'truck-1',
      'schedule',
      fake.client as unknown as AdminClient,
    );

    expect(result).toEqual({
      allowUpdate: false,
      reason: 'Facebook auto-updates disabled for this truck',
    });
  });

  it('allows a schedule update even when a manual stamp exists (no truck-wide freshness window)', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        facebook_auto_updates_enabled: true,
        schedule_updated_by: 'manual',
        schedule_updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    const result = await shouldAllowUpdate(
      'truck-1',
      'schedule',
      fake.client as unknown as AdminClient,
    );

    expect(result).toEqual({ allowUpdate: true });
  });
});

describe('isFacebookAutoUpdateEnabled', () => {
  it('allows updates when the global toggle is enabled', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        facebook_auto_updates_enabled: true,
        schedule_updated_by: 'manual',
        schedule_updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]);

    const result = await isFacebookAutoUpdateEnabled(
      'truck-1',
      fake.client as unknown as AdminClient,
    );

    expect(result).toEqual({ allowUpdate: true });
  });

  it('blocks updates when the global toggle is disabled', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      { id: 'truck-1', facebook_auto_updates_enabled: false },
    ]);

    const result = await isFacebookAutoUpdateEnabled(
      'truck-1',
      fake.client as unknown as AdminClient,
    );

    expect(result).toEqual({
      allowUpdate: false,
      reason: 'Facebook auto-updates disabled for this truck',
    });
  });

  it('blocks updates when the truck cannot be fetched', async () => {
    const fake = createFakeSupabaseClient();

    const result = await isFacebookAutoUpdateEnabled(
      'missing-truck',
      fake.client as unknown as AdminClient,
    );

    expect(result.allowUpdate).toBe(false);
  });
});