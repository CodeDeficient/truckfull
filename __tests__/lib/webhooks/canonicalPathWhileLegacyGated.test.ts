/**
 * Proves the canonical Meta webhook processing path is unaffected by the
 * legacy-processing gate: with the legacy flag absent (Production default),
 * queuePostForProcessing → processFacebookPost still runs end to end.
 *
 * Mock-free: uses the FakeSupabaseClient against the real queue and
 * processor modules. Regression anchor: createdTimePropagation.test.ts.
 */

import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import { queuePostForProcessing, type QueueProcessingDependencies } from '@/lib/webhooks/queueProcessor';
import {
  processFacebookPost,
  type PostData,
  type PostProcessorDependencies,
} from '@/lib/services/postProcessor';
import { isLegacyProcessingEnabled } from '@/lib/webhooks/legacyProcessingGate';

const TRUCK_ID = 'truck-gate-canonical';
const POST_ID = 'canonical-path-while-legacy-gated';
const CANONICAL_CREATED_TIME = '2026-08-25T21:13:47.000Z';

describe('canonical webhook path with legacy processing disabled', () => {
  it('still processes a webhook post end-to-end while the legacy gate is off', async () => {
    delete process.env.ENABLE_LEGACY_POST_PROCESSING;
    expect(isLegacyProcessingEnabled()).toBe(false);

    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      {
        id: TRUCK_ID,
        facebook_page_id: 'facebook-page-gate-canonical',
        timezone: 'America/New_York',
        slug: 'gate-canonical',
      },
    ]);

    let registeredProcessing: Promise<unknown> | undefined;
    const queueDependencies: QueueProcessingDependencies = {
      supabase: fake.client as unknown as QueueProcessingDependencies['supabase'],
      register: (promise) => {
        registeredProcessing = promise;
      },
      processPost: (truckId, postId, postData) =>
        processFacebookPost(truckId, postId, postData, {
          supabase: fake.client as unknown as PostProcessorDependencies['supabase'],
        }),
    };

    const webhookPost = {
      item: 'post',
      post_id: POST_ID,
      message:
        "Tuesday service update: We'll be at 1201 Knox Ave, North Augusta, SC 29841 today, August 25, 2026, from 5:30 PM until 8:30 PM.",
      created_time: '2026-08-25T17:13:47-04:00',
    } as unknown as PostData;

    const result = await queuePostForProcessing(
      'facebook-page-gate-canonical',
      webhookPost,
      undefined,
      queueDependencies,
    );

    expect(result).toMatchObject({ success: true, postId: POST_ID });
    await registeredProcessing;

    const { data: persistedPosts } = await fake.client
      .from('facebook_posts')
      .select('facebook_post_id, status, created_time')
      .eq('facebook_post_id', POST_ID);
    expect(persistedPosts).toContainEqual(
      expect.objectContaining({
        facebook_post_id: POST_ID,
        status: 'processed',
        created_time: CANONICAL_CREATED_TIME,
      }),
    );
  });
});
