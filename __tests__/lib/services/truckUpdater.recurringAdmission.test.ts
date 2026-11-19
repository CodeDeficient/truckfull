import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import { PostType } from '@/lib/services/postClassifier';
import { updateTruckData } from '@/lib/services/truckUpdater';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

const CLASSIFICATION = {
  type: PostType.SCHEDULE,
  confidence: 0.9,
  reason: 'Recurring schedule',
};

const VALIDATION = { shouldUpdate: true, requiresConfirmation: false };

function recurringPost(days: string[] | undefined): ParsedPost {
  return {
    food_items: [],
    confidence: 0.9,
    times: {
      start: '11:00',
      end: '14:00',
      days,
      scope: 'recurring_weekly',
    },
  };
}

describe('updateTruckData recurring admission', () => {
  it('fails explicitly before writing when recurring hours have no canonical weekday set', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{ id: 'truck-1', operating_hours: {} }]);

    const result = await updateTruckData(
      'truck-1',
      CLASSIFICATION,
      recurringPost(undefined),
      VALIDATION,
      undefined,
      { supabase: fake.client as unknown as AdminClient },
    );

    expect(result).toMatchObject({
      success: false,
      updatedFields: [],
      error: 'NONCANONICAL_DAYSET_REJECTED',
    });
    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours')
      .eq('id', 'truck-1')
      .single();
    expect((truck as Record<string, unknown>).operating_hours).toEqual({});
  });

  it('does not apply the recurring-only error to an unresolved non-recurring schedule shape', async () => {
    const fake = createFakeSupabaseClient();

    const result = await updateTruckData(
      'truck-1',
      CLASSIFICATION,
      {
        ...recurringPost(undefined),
        times: { start: '11:00', end: '14:00', scope: 'scope_missing' },
      },
      VALIDATION,
      undefined,
      { supabase: fake.client as unknown as AdminClient },
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('writes a valid recurring schedule normally', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{ id: 'truck-1', operating_hours: {} }]);

    const result = await updateTruckData(
      'truck-1',
      CLASSIFICATION,
      recurringPost(['Mon']),
      VALIDATION,
      undefined,
      { supabase: fake.client as unknown as AdminClient, fbActionAt: '2026-08-26T18:00:00.000Z' },
    );

    expect(result).toMatchObject({ success: true, updatedFields: ['schedule'] });
    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours')
      .eq('id', 'truck-1')
      .single();
    expect((truck as Record<string, unknown>).operating_hours).toEqual({
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'facebook', last_action_at: '2026-08-26T18:00:00.000Z' } },
      },
    });
  });
});
