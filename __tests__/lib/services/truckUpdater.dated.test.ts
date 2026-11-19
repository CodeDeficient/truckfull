import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import { PostType } from '@/lib/services/postClassifier';
import { updateTruckData } from '@/lib/services/truckUpdater';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import type { ValidationResult } from '@/lib/services/postValidator';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

describe('updateTruckData dated updates', () => {
  it('writes the dated override and excludes menu mutation for a MIXED update', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        slug: 'truck-one',
        timezone: 'America/New_York',
        menu: [],
      },
    ]);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-1',
        facebook_post_id: 'facebook-post-1',
        truck_id: 'truck-1',
      },
    ]);

    const parsedPost: ParsedPost = {
      food_items: ['Jerk Chicken'],
      location: {
        address: '1201 Knox Ave, North Augusta, SC 29841',
        fuzzy: false,
      },
      times: {
        start: '17:30',
        end: '20:30',
        scope: 'one_off_date',
        dateReference: 'today',
      },
      confidence: 0.9,
    };
    const validation: ValidationResult = {
      shouldUpdate: true,
      requiresConfirmation: false,
      resolvedServiceDate: '2026-08-25',
    };

    const result = await updateTruckData(
      'truck-1',
      { type: PostType.MIXED, confidence: 0.9, reason: 'Mixed update' },
      parsedPost,
      validation,
      {
        facebookPostId: 'facebook-post-1',
        sourcePostCreatedAt: '2026-08-25T21:13:47.000Z',
      },
      { supabase: fake.client as unknown as AdminClient },
    );

    expect(result).toMatchObject({ success: true, updatedFields: ['schedule'] });

    // Pre-Meta: menu automation is disabled — food_items stay off the
    // customer-visible menu even when the override write succeeds.
    const { data: trucks } = await fake.client
      .from('food_trucks')
      .select('menu, menu_updated_by')
      .eq('id', 'truck-1');
    expect(trucks?.[0]?.menu).toEqual([]);
    expect(trucks?.[0]?.menu_updated_by).toBeUndefined();

    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('service_date, start_time, end_time')
      .eq('food_truck_id', 'truck-1');
    expect(overrides).toContainEqual(
      expect.objectContaining({
        service_date: '2026-08-25',
        start_time: '17:30',
        end_time: '20:30',
      }),
    );
  });

  it('applies the dated override without mutating the menu when menu is not eligible', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      {
        id: 'truck-1',
        slug: 'truck-one',
        timezone: 'America/New_York',
        menu: [{ name: 'Existing Item', price: '$8' }],
      },
    ]);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-1',
        facebook_post_id: 'facebook-post-1',
        truck_id: 'truck-1',
      },
    ]);

    const parsedPost: ParsedPost = {
      food_items: ['Jerk Chicken'],
      location: {
        address: '1201 Knox Ave, North Augusta, SC 29841',
        fuzzy: false,
      },
      times: {
        start: '17:30',
        end: '20:30',
        scope: 'one_off_date',
        dateReference: 'today',
      },
      confidence: 0.9,
    };
    const validation: ValidationResult = {
      shouldUpdate: true,
      requiresConfirmation: false,
      resolvedServiceDate: '2026-08-25',
    };

    const result = await updateTruckData(
      'truck-1',
      { type: PostType.MIXED, confidence: 0.9, reason: 'Mixed update' },
      parsedPost,
      validation,
      {
        facebookPostId: 'facebook-post-1',
        sourcePostCreatedAt: '2026-08-25T21:13:47.000Z',
        menuUpdateAllowed: false,
      },
      { supabase: fake.client as unknown as AdminClient },
    );

    expect(result).toEqual({
      success: true,
      updatedFields: ['schedule'],
      queued: false,
    });

    const { data: trucks } = await fake.client
      .from('food_trucks')
      .select('menu')
      .eq('id', 'truck-1');
    expect(trucks?.[0]?.menu).toEqual([{ name: 'Existing Item', price: '$8' }]);

    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('service_date, start_time, end_time')
      .eq('food_truck_id', 'truck-1');
    expect(overrides).toContainEqual(
      expect.objectContaining({
        service_date: '2026-08-25',
        start_time: '17:30',
        end_time: '20:30',
      }),
    );
  });
});
