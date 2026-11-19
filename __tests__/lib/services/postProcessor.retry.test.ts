import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import {
  processFacebookPost,
  requeueFailedPost,
  type PostProcessorDependencies,
} from '@/lib/services/postProcessor';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

const TRUCK_ID = 'truck-sunset-tacos';
const CANONICAL_CREATED_TIME = '2026-08-25T21:13:47.000Z';
const LIVE_TEXT =
  "Tuesday service update: We'll be at 1201 Knox Ave, North Augusta, SC 29841 today, August 25, 2026, from 5:30 PM until 8:30 PM.";

function seedTruck(fake: ReturnType<typeof createFakeSupabaseClient>): void {
  fake.seedTable('food_trucks', [
    {
      id: TRUCK_ID,
      facebook_page_id: 'facebook-page-sunset-tacos',
      timezone: 'America/New_York',
      slug: 'sunset-tacos',
      facebook_auto_updates_enabled: true,
    },
  ]);
}

function seedPost(fake: ReturnType<typeof createFakeSupabaseClient>, status: string): void {
  fake.seedTable('facebook_posts', [
    {
      id: 'post-row-1',
      truck_id: TRUCK_ID,
      facebook_post_id: 'retry-post-1',
      status,
      created_time: CANONICAL_CREATED_TIME,
    },
  ]);
}

function deps(fake: ReturnType<typeof createFakeSupabaseClient>): PostProcessorDependencies {
  return { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] };
}

describe('requeueFailedPost', () => {
  it('transitions a failed post to pending so the canonical processor can claim it', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    fake.seedTable('facebook_posts', [{
      id: 'post-row-1',
      truck_id: TRUCK_ID,
      facebook_post_id: 'retry-post-1',
      status: 'failed',
      created_time: CANONICAL_CREATED_TIME,
      processing_started_at: '2026-08-25T21:14:00.000Z',
      processed_reason: 'Failed to apply dated schedule override',
    }]);

    const requeue = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      TRUCK_ID,
      'retry-post-1',
    );
    expect(requeue).toEqual({ success: true });

    const { data: requeued } = await fake.client
      .from('facebook_posts')
      .select('status, processing_started_at, processed_reason')
      .eq('facebook_post_id', 'retry-post-1')
      .single();
    expect(requeued?.status).toBe('pending');
    expect(requeued?.processing_started_at).toBeNull();
    expect(requeued?.processed_reason).toBeNull();

    const result = await processFacebookPost(
      TRUCK_ID,
      'retry-post-1',
      { post_id: 'retry-post-1', message: LIVE_TEXT, created_time: CANONICAL_CREATED_TIME },
      deps(fake),
    );
    expect(result.success).toBe(true);

    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('facebook_post_id', 'retry-post-1')
      .single();
    expect(post?.status).toBe('processed');

    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('service_date')
      .eq('food_truck_id', TRUCK_ID);
    expect(overrides).toHaveLength(1);
  });

  it('refuses to requeue a post awaiting owner confirmation and leaves the row untouched', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake, 'pending_confirmation');
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'confirmation-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'retry-post-1',
        status: 'pending',
        update_type: 'schedule',
        proposed_data: {},
        reason: 'needs confirmation',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);

    const requeue = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      TRUCK_ID,
      'retry-post-1',
    );
    expect(requeue).toEqual({ success: false, reason: 'Post is not retryable' });

    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('facebook_post_id', 'retry-post-1')
      .single();
    expect(post?.status).toBe('pending_confirmation');

    const { data: confirmations } = await fake.client
      .from('facebook_post_confirmations')
      .select('id, status')
      .eq('facebook_post_id', 'retry-post-1');
    expect(confirmations).toEqual([
      expect.objectContaining({ id: 'confirmation-1', status: 'pending' }),
    ]);
  });

  it('refuses to requeue a post awaiting owner review', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake, 'pending_review');

    const requeue = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      TRUCK_ID,
      'retry-post-1',
    );
    expect(requeue).toEqual({ success: false, reason: 'Post is not retryable' });

    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('facebook_post_id', 'retry-post-1')
      .single();
    expect(post?.status).toBe('pending_review');
  });

  it('refuses to requeue processed and rejected posts', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-processed',
        truck_id: TRUCK_ID,
        facebook_post_id: 'retry-processed',
        status: 'processed',
      },
      {
        id: 'post-rejected',
        truck_id: TRUCK_ID,
        facebook_post_id: 'retry-rejected',
        status: 'rejected',
      },
    ]);

    const requeueProcessed = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      TRUCK_ID,
      'retry-processed',
    );
    const requeueRejected = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      TRUCK_ID,
      'retry-rejected',
    );

    expect(requeueProcessed).toEqual({ success: false, reason: 'Post is not retryable' });
    expect(requeueRejected).toEqual({ success: false, reason: 'Post is not retryable' });

    const { data: posts } = await fake.client
      .from('facebook_posts')
      .select('facebook_post_id, status')
      .in('facebook_post_id', ['retry-processed', 'retry-rejected']);
    expect(posts).toEqual([
      expect.objectContaining({ facebook_post_id: 'retry-processed', status: 'processed' }),
      expect.objectContaining({ facebook_post_id: 'retry-rejected', status: 'rejected' }),
    ]);
  });

  it('yields exactly one successful requeue when two retries race', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake, 'failed');

    const [first, second] = await Promise.all([
      requeueFailedPost(fake.client as unknown as AdminClient, TRUCK_ID, 'retry-post-1'),
      requeueFailedPost(fake.client as unknown as AdminClient, TRUCK_ID, 'retry-post-1'),
    ]);

    const outcomes = [first, second].map((r) => r.success);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
    expect(outcomes.filter((s) => !s)).toHaveLength(1);

    const { data: posts } = await fake.client
      .from('facebook_posts')
      .select('id')
      .eq('facebook_post_id', 'retry-post-1');
    expect(posts).toHaveLength(1);
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('facebook_post_id', 'retry-post-1')
      .single();
    expect(post?.status).toBe('pending');
  });

  it('scopes the requeue to the owning truck', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [
      { id: 'truck-a', facebook_page_id: 'page-a', timezone: 'America/New_York' },
      { id: 'truck-b', facebook_page_id: 'page-b', timezone: 'America/New_York' },
    ]);
    fake.seedTable('facebook_posts', [
      { id: 'post-a', truck_id: 'truck-a', facebook_post_id: 'shared-post', status: 'failed' },
      { id: 'post-b', truck_id: 'truck-b', facebook_post_id: 'shared-post', status: 'pending' },
    ]);

    const requeue = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      'truck-a',
      'shared-post',
    );
    expect(requeue).toEqual({ success: true });

    const { data: posts } = await fake.client
      .from('facebook_posts')
      .select('id, status')
      .eq('facebook_post_id', 'shared-post');
    expect(posts).toEqual([
      expect.objectContaining({ id: 'post-a', status: 'pending' }),
      expect.objectContaining({ id: 'post-b', status: 'pending' }),
    ]);
  });

  it('returns failure when the post does not exist for the truck', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);

    const requeue = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      TRUCK_ID,
      'missing-post',
    );
    expect(requeue).toEqual({ success: false, reason: 'Post not found' });
  });
});
