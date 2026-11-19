import { describe, expect, it } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import { queuePostForProcessing, type QueueProcessingDependencies } from '@/lib/webhooks/queueProcessor';
import {
  claimPostForProcessing,
  processFacebookPost,
  type PostData,
  type PostProcessorDependencies,
} from '@/lib/services/postProcessor';

const TRUCK_ID = 'truck-sunset-tacos';
const POST_ID = 'sunset-tacos-created-time-regression';
const FACEBOOK_CREATED_TIME = '2026-08-25T17:13:47-04:00';
const CANONICAL_CREATED_TIME = '2026-08-25T21:13:47.000Z';
const LIVE_TEXT =
  'Tuesday service update: We\'ll be at 1201 Knox Ave, North Augusta, SC 29841 today, August 25, 2026, from 5:30 PM until 8:30 PM.';

function buildWebhookEvent(createdTime?: string): { entry: Array<{ id: string; changes: Array<{ value: Record<string, unknown> }> }> } {
  return {
    entry: [{
      id: 'facebook-page-sunset-tacos',
      changes: [{
        value: {
          item: 'post',
          post_id: POST_ID,
          message: LIVE_TEXT,
          ...(createdTime ? { created_time: createdTime } : {}),
        },
      }],
    }],
  };
}

describe('created_time propagation through post processing', () => {
  it('resolves the live dated schedule and auto-applies an override with the canonical timestamp', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{ id: TRUCK_ID, facebook_page_id: 'facebook-page-sunset-tacos', timezone: 'America/New_York', slug: 'sunset-tacos' }]);
    let receivedPostData: PostData | undefined;

    let registeredProcessing: Promise<unknown> | undefined;
    const queueDependencies: QueueProcessingDependencies = {
      supabase: fake.client as unknown as QueueProcessingDependencies['supabase'],
      register: (promise) => {
        registeredProcessing = promise;
      },
      processPost: (truckId, postId, postData) => {
        receivedPostData = postData;
        return processFacebookPost(truckId, postId, postData, {
          supabase: fake.client as unknown as PostProcessorDependencies['supabase'],
        });
      },
    };
    const webhookEvent = buildWebhookEvent(FACEBOOK_CREATED_TIME);
    const webhookEntry = webhookEvent.entry[0];
    const webhookPost = webhookEntry.changes[0].value;
    const result = await queuePostForProcessing(
      webhookEntry.id,
      webhookPost as PostData,
      undefined,
      queueDependencies,
    );

    expect(result).toMatchObject({ success: true, postId: POST_ID });
    await registeredProcessing;
    const { data: persistedPosts } = await fake.client
      .from('facebook_posts')
      .select('created_time, raw_payload, status')
      .eq('facebook_post_id', POST_ID);
    expect(persistedPosts).toContainEqual(expect.objectContaining({ created_time: CANONICAL_CREATED_TIME }));
    const persistedPost = persistedPosts?.find((post) => post.created_time === CANONICAL_CREATED_TIME);
    expect(JSON.parse(String(persistedPost?.raw_payload))).toMatchObject({
      created_time: FACEBOOK_CREATED_TIME,
    });
    expect(receivedPostData).toMatchObject({ created_time: CANONICAL_CREATED_TIME });
    expect(persistedPost?.status).toBe('processed');

    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('service_date, start_time, end_time, source_type')
      .eq('food_truck_id', TRUCK_ID);
    expect(overrides).toContainEqual(
      expect.objectContaining({
        service_date: '2026-08-25',
        start_time: '17:30',
        end_time: '20:30',
        source_type: 'facebook',
      }),
    );

    const { data: truckRows } = await fake.client
      .from('food_trucks')
      .select('current_location, operating_hours')
      .eq('id', TRUCK_ID);
    expect(truckRows?.[0]?.current_location).toBeUndefined();
    expect(truckRows?.[0]?.operating_hours).toBeUndefined();
  });

  it('routes the same dated schedule to owner review when created_time is unavailable', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{ id: TRUCK_ID, facebook_page_id: 'facebook-page-sunset-tacos', timezone: 'America/New_York' }]);
    fake.seedTable('facebook_posts', [{
      id: 'parent-uuid',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
      created_time: '2026-08-25T21:13:47.000Z',
    }]);

    let queuedReviewAction: string | undefined;
    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      { post_id: POST_ID, message: LIVE_TEXT },
      {
        supabase: fake.client as unknown as PostProcessorDependencies['supabase'],
        queueForConfirmation: async (truckId, _facebookPostId, updateType, proposedData) => {
          queuedReviewAction = proposedData.reviewAction;
          await fake.client.from('facebook_post_confirmations').insert({
            id: 'review-uuid',
            truck_id: truckId,
            facebook_post_id: 'parent-uuid',
            update_type: updateType,
            proposed_data: proposedData,
            status: 'pending',
          });
          return { success: true };
        },
      },
    );

    expect(result).toMatchObject({ status: 'pending_review' });
    expect(queuedReviewAction).toBe('unresolved_schedule');

    const queueResult = await queuePostForProcessing(
      'facebook-page-sunset-tacos',
      buildWebhookEvent().entry[0].changes[0].value as PostData,
      undefined,
      { supabase: fake.client as unknown as QueueProcessingDependencies['supabase'] },
    );
    expect(queueResult).toEqual({
      success: false,
      error: 'Missing or invalid Facebook post created_time',
    });
  });

  it('scopes post status updates to the requested truck', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('facebook_posts', [
      { id: 'post-a', facebook_post_id: POST_ID, truck_id: 'truck-a', status: 'pending' },
      { id: 'post-b', facebook_post_id: POST_ID, truck_id: 'truck-b', status: 'pending' },
    ]);

    const result = await processFacebookPost(
      'truck-a',
      POST_ID,
      { post_id: POST_ID, message: '' },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result).toMatchObject({ status: 'rejected', reason: 'No content to process' });
    const { data: posts } = await fake.client
      .from('facebook_posts')
      .select('id, status')
      .eq('facebook_post_id', POST_ID);
    expect(posts).toContainEqual(expect.objectContaining({ id: 'post-a', status: 'rejected' }));
    expect(posts).toContainEqual(expect.objectContaining({ id: 'post-b', status: 'pending' }));
  });

  it('rejects dated auto-application when Facebook auto-updates are disabled', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{
      id: TRUCK_ID,
      facebook_page_id: 'facebook-page-sunset-tacos',
      timezone: 'America/New_York',
      facebook_auto_updates_enabled: false,
    }]);
    fake.seedTable('facebook_posts', [{
      id: 'parent-uuid',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
      created_time: CANONICAL_CREATED_TIME,
    }]);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      { post_id: POST_ID, message: LIVE_TEXT, created_time: CANONICAL_CREATED_TIME },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result).toMatchObject({
      success: false,
      status: 'rejected',
      reason: 'Facebook auto-updates disabled for this truck',
    });
    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('id')
      .eq('food_truck_id', TRUCK_ID);
    expect(overrides).toEqual([]);
  });

  it('auto-applies a dated location despite a recent manual permanent-location edit', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{
      id: TRUCK_ID,
      facebook_page_id: 'facebook-page-sunset-tacos',
      timezone: 'America/New_York',
      slug: 'sunset-tacos',
      facebook_auto_updates_enabled: true,
      location_updated_by: 'manual',
      location_updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      street_address: '100 Permanent Plaza, Augusta, GA 30901',
      current_location: { lat: 33.47, lng: -81.96, address: '100 Permanent Plaza, Augusta, GA 30901' },
    }]);
    fake.seedTable('facebook_posts', [{
      id: 'parent-uuid',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
      created_time: CANONICAL_CREATED_TIME,
    }]);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      { post_id: POST_ID, message: LIVE_TEXT, created_time: CANONICAL_CREATED_TIME },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result).toMatchObject({ success: true, status: 'processed' });

    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('service_date, location_data')
      .eq('food_truck_id', TRUCK_ID);
    expect(overrides).toHaveLength(1);
    expect(overrides?.[0]).toMatchObject({
      service_date: '2026-08-25',
      location_data: expect.objectContaining({
        address: '1201 Knox Ave, North Augusta, SC 29841',
      }),
    });

    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('street_address, current_location, location_updated_by')
      .eq('id', TRUCK_ID)
      .single();
    expect(truck?.street_address).toBe('100 Permanent Plaza, Augusta, GA 30901');
    expect(truck?.current_location).toMatchObject({ address: '100 Permanent Plaza, Augusta, GA 30901' });
    expect(truck?.location_updated_by).toBe('manual');
  });

  it('does not claim a post that is already processing', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('facebook_posts', [{
      id: 'post-row-1',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'processing',
    }]);

    const result = await claimPostForProcessing(
      fake.client as unknown as PostProcessorDependencies['supabase'],
      TRUCK_ID,
      POST_ID,
    );

    expect(result).toEqual({ success: false, reason: 'Post is not claimable for processing' });
  });

  it('does not claim owner-action posts awaiting confirmation or review', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-confirm',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-awaiting-confirmation',
        status: 'pending_confirmation',
      },
      {
        id: 'post-row-review',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-awaiting-review',
        status: 'pending_review',
      },
    ]);

    const claim = async (facebookPostId: string) =>
      claimPostForProcessing(
        fake.client as unknown as PostProcessorDependencies['supabase'],
        TRUCK_ID,
        facebookPostId,
      );

    await expect(claim('post-awaiting-confirmation')).resolves.toMatchObject({ success: false });
    await expect(claim('post-awaiting-review')).resolves.toMatchObject({ success: false });

    const { data: posts } = await fake.client
      .from('facebook_posts')
      .select('facebook_post_id, status, processing_started_at')
      .in('facebook_post_id', ['post-awaiting-confirmation', 'post-awaiting-review']);
    expect(posts).toEqual([
      expect.objectContaining({ facebook_post_id: 'post-awaiting-confirmation', status: 'pending_confirmation' }),
      expect.objectContaining({ facebook_post_id: 'post-awaiting-review', status: 'pending_review' }),
    ]);
    for (const post of posts ?? []) {
      expect(post.processing_started_at ?? null).toBeNull();
    }
  });

  it('claims a normal pending post for processing', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('facebook_posts', [{
      id: 'post-row-pending',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
    }]);

    const result = await claimPostForProcessing(
      fake.client as unknown as PostProcessorDependencies['supabase'],
      TRUCK_ID,
      POST_ID,
    );

    expect(result).toEqual({ success: true });
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status, processing_started_at')
      .eq('facebook_post_id', POST_ID)
      .single();
    expect(post?.status).toBe('processing');
    expect(post?.processing_started_at).not.toBeNull();
  });

  it('applies a dated override despite manual recurring hours, manual location, and menu ineligibility', async () => {
    const fake = createFakeSupabaseClient();
    const recentManualEdit = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    fake.seedTable('food_trucks', [{
      id: TRUCK_ID,
      facebook_page_id: 'facebook-page-sunset-tacos',
      timezone: 'America/New_York',
      slug: 'sunset-tacos',
      facebook_auto_updates_enabled: true,
      operating_hours: { friday: { open: '11:00', close: '21:00' } },
      schedule_updated_by: 'manual',
      schedule_updated_at: recentManualEdit,
      location_updated_by: 'manual',
      location_updated_at: recentManualEdit,
      menu_updated_by: 'manual',
      menu_updated_at: recentManualEdit,
      street_address: '100 Permanent Plaza, Augusta, GA 30901',
      menu: [{ name: 'Regular Menu Item', price: '$9' }],
    }]);
    fake.seedTable('facebook_posts', [{
      id: 'parent-uuid',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
      created_time: CANONICAL_CREATED_TIME,
    }]);

    const mixedText =
      'Today only: Jerk chicken plates. Find us at 1201 Knox Ave, North Augusta, SC 29841 from 5:30 PM until 8:30 PM today, August 25, 2026.';
    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      { post_id: POST_ID, message: mixedText, created_time: CANONICAL_CREATED_TIME },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result).toMatchObject({ success: true, status: 'processed' });

    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('service_date, start_time, end_time, location_data')
      .eq('food_truck_id', TRUCK_ID);
    expect(overrides).toHaveLength(1);
    expect(overrides?.[0]).toMatchObject({
      service_date: '2026-08-25',
      start_time: '17:30',
      end_time: '20:30',
      location_data: expect.objectContaining({
        address: '1201 Knox Ave, North Augusta, SC 29841',
      }),
    });

    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours, street_address, menu, schedule_updated_by, location_updated_by, menu_updated_by')
      .eq('id', TRUCK_ID)
      .single();
    expect(truck?.operating_hours).toEqual({ friday: { open: '11:00', close: '21:00' } });
    expect(truck?.street_address).toBe('100 Permanent Plaza, Augusta, GA 30901');
    expect(truck?.schedule_updated_by).toBe('manual');
    expect(truck?.location_updated_by).toBe('manual');
    expect(truck?.menu_updated_by).toBe('manual');
    expect(truck?.menu).toEqual([{ name: 'Regular Menu Item', price: '$9' }]);
  });

  it('rejects a SCHEDULE-only dated post when Facebook auto-updates are disabled', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{
      id: TRUCK_ID,
      facebook_page_id: 'facebook-page-sunset-tacos',
      timezone: 'America/New_York',
      facebook_auto_updates_enabled: false,
    }]);
    fake.seedTable('facebook_posts', [{
      id: 'parent-uuid',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
      created_time: CANONICAL_CREATED_TIME,
    }]);

    const scheduleOnlyText =
      'Join us today, August 25, 2026, from 5:30 PM until 8:30 PM at 1201 Knox Ave, North Augusta, SC 29841.';
    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      { post_id: POST_ID, message: scheduleOnlyText, created_time: CANONICAL_CREATED_TIME },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result).toMatchObject({
      success: false,
      status: 'rejected',
      reason: 'Facebook auto-updates disabled for this truck',
    });
    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('id')
      .eq('food_truck_id', TRUCK_ID);
    expect(overrides).toEqual([]);
  });

  it('does not disturb an active confirmation when a queued duplicate arrives for a pending_confirmation post', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('food_trucks', [{
      id: TRUCK_ID,
      facebook_page_id: 'facebook-page-sunset-tacos',
      timezone: 'America/New_York',
    }]);
    fake.seedTable('facebook_posts', [{
      id: 'post-row-pc',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending_confirmation',
      created_time: CANONICAL_CREATED_TIME,
    }]);
    fake.seedTable('facebook_post_confirmations', [{
      id: 'confirmation-1',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status: 'pending',
      update_type: 'schedule',
      proposed_data: {},
      reason: 'needs confirmation',
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      { post_id: POST_ID, message: LIVE_TEXT, created_time: CANONICAL_CREATED_TIME },
      { supabase: fake.client as unknown as PostProcessorDependencies['supabase'] },
    );

    expect(result).toMatchObject({ success: false });
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('facebook_post_id', POST_ID)
      .single();
    expect(post?.status).toBe('pending_confirmation');

    const { data: confirmations } = await fake.client
      .from('facebook_post_confirmations')
      .select('id, status, expires_at')
      .eq('facebook_post_id', POST_ID);
    expect(confirmations).toHaveLength(1);
    expect(confirmations?.[0]).toMatchObject({
      id: 'confirmation-1',
      status: 'pending',
      expires_at: expect.any(String),
    });
  });
});
