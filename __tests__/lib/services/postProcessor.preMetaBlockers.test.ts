/**
 * @jest-environment node
 *
 * Pre-Meta launch blockers (corpus-derived):
 *
 * 1. MULTI-STOP FAIL-CLOSED — a post carrying multiple distinct service
 *    slots (time ranges / locations) cannot be represented losslessly by
 *    the single-slot ParsedPost contract. It must never auto-apply a
 *    subset; it fails closed.
 *
 * 2. MENU AUTOMATION DISABLED — MENU-only Facebook posts never mutate the
 *    truck menu automatically; MIXED posts keep applying schedule/location
 *    evidence with menu excluded.
 *
 * 3. LOCATION-ONLY NEVER MUTATES PERMANENT LOCATION — a location-only
 *    Facebook service announcement must not rewrite the truck's permanent
 *    default address.
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory } from '@/__tests__/fakes/fakeSupabase';
import type { getSupabaseAdmin } from '@/lib/supabase/admin';
import { shouldUpdateData } from '@/lib/services/postValidator';
import { classifyPost } from '@/lib/services/postClassifier';
import { extractTextBasedData } from '@/lib/services/textExtractor';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import type { Classification } from '@/lib/services/postClassifier';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

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

const TRUCK_ID = 'truck-premeta-blockers';

function seedTruck(fake: FakeSupabaseFactory): void {
  fake.seedTable('food_trucks', [
    {
      id: TRUCK_ID,
      slug: 'premeta-truck',
      timezone: 'America/New_York',
      street_address: '1 Permanent HQ Address',
      menu: [],
    },
  ]);
}

const ALLOW = { shouldUpdate: true, requiresConfirmation: false };

// ---------------------------------------------------------------------------
// Blocker 1: multi-slot detection (pure, pre-collapse)
// ---------------------------------------------------------------------------

describe('detectMultiServiceSlots (pre-collapse multi-slot detection)', () => {
  let detectMultiServiceSlots: typeof import('@/lib/services/textExtractor').detectMultiServiceSlots;

  beforeEach(async () => {
    ({ detectMultiServiceSlots } = await import('@/lib/services/textExtractor'));
  });

  it('flags two same-day time ranges (Wed 11-2 + Wed 5-8 corpus post)', () => {
    const post =
      'Wed 11-2 @ Roper Hospital then Wed 5-8 @ Magnolia Cane Bay. See you there!';
    expect(detectMultiServiceSlots(post)).toBe(true);
  });

  it('flags a weekly schedule with different slots across days', () => {
    const post =
      'New schedule! Mon 11-2 @ Roper Hospital, Wed 5-8 @ Magnolia Cane Bay, Fri 12-6 downtown.';
    expect(detectMultiServiceSlots(post)).toBe(true);
  });

  it('does not flag a single-slot dated update', () => {
    const post =
      'Join us Tuesday, August 25, 2026 from 11 AM to 8 PM at 1201 Knox Ave, North Augusta, SC 29841';
    expect(detectMultiServiceSlots(post)).toBe(false);
  });

  it('does not flag a single recurring schedule', () => {
    const post = 'We are out here every Tuesday from 5-8 PM at 1201 Knox Ave!';
    expect(detectMultiServiceSlots(post)).toBe(false);
  });

  it('does not flag a single range whose end is stated twice', () => {
    const post = 'We are here 11-2, yes 11am to 2pm today!';
    expect(detectMultiServiceSlots(post)).toBe(false);
  });

  it('does not flag a bare text range restated twice without meridiems', () => {
    const post = 'Wed 11-2 at the park — yes, same Wednesday 11-2 slot!';
    expect(detectMultiServiceSlots(post)).toBe(false);
  });

  it('does not flag promotional or empty text', () => {
    expect(detectMultiServiceSlots('Order on DoorDash tonight!')).toBe(false);
    expect(detectMultiServiceSlots('')).toBe(false);
  });

  it('does not flag generic numeric ranges that are not service slots', () => {
    expect(detectMultiServiceSlots('We serve 20-30 people at a time, come hungry!')).toBe(false);
    expect(detectMultiServiceSlots('August 25-27 specials all day!')).toBe(false);
    expect(detectMultiServiceSlots('Meals are $10-15 each, see you there!')).toBe(false);
  });

  it('flags two distinct chrono slots whose 12-hour dials collide', () => {
    // 11am-2pm (11-14) and 11pm-2am (23-26→2) share the dial "11-2" but are
    // genuinely different service windows; neither may be discarded.
    const post = 'Lunch 11am-2pm downtown, then late night 11pm-2am on the strip!';
    expect(detectMultiServiceSlots(post)).toBe(true);
  });

  it('flags two distinct cross-street stops with no time ranges (sole trigger)', () => {
    // Two distinct cross-street locations, no time tokens at all: the ONLY
    // multi-stop evidence is the second location. extractAddress consumes
    // cross-street matches (fuzzy:true), so both must be detected here or
    // one stop is silently discarded.
    const post = 'Come find us at Main St & 5th Ave, then swing by River Rd & Oak St.';
    expect(detectMultiServiceSlots(post)).toBe(true);
  });

  it('does not flag a single cross-street stop', () => {
    const post = "We're at Main St & 5th Ave today. Come hungry!";
    expect(detectMultiServiceSlots(post)).toBe(false);
  });

  it('counts a numbered intersection matched by two regex families as ONE stop', () => {
    // One physical location: ADDRESS_STREET_ONLY_REGEX captures
    // "1201 Knox Ave" and CROSS_STREET_REGEX captures "Knox Ave & 5th St."
    // from the same text. Overlapping regex-family matches of one
    // location must dedupe to one stop, not a phantom second stop.
    // (Sentence-final period: the cross-street lookahead accepts ./,/eos,
    // not "!".)
    const post = 'Find us today 11-2 at 1201 Knox Ave & 5th St.';
    expect(detectMultiServiceSlots(post)).toBe(false);
  });

  it('rejects a numbered-numbered two-intersection post as multi-stop', () => {
    // Equivalence-case guard: genuinely distinct intersections remain
    // multi-stop even when both are numbered.
    const post =
      'Find us 11-2 at 1201 Knox Ave & 5th St, then 5-8 at 400 River Rd & Oak St!';
    expect(detectMultiServiceSlots(post)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Blocker 1: pipeline fail-closed behavior
// ---------------------------------------------------------------------------

describe('multi-stop posts fail closed', () => {
  it('rejects a multi-stop post through the canonical path with a multi-stop diagnostic', async () => {
    const { processFacebookPost } = await import('@/lib/services/postProcessor');
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'multi-stop-dated',
        status: 'pending',
        created_time: '2026-08-25T16:00:00.000Z',
      },
    ]);

    const result = await processFacebookPost(
      TRUCK_ID,
      'multi-stop-dated',
      {
        post_id: 'multi-stop-dated',
        message:
          'Wed 11-2 @ 1201 Knox Ave, North Augusta, SC 29841 then Wed 5-8 @ 2255 MLK Jr Blvd, Augusta, GA 30901',
        created_time: '2026-08-25T16:00:00.000Z',
      },
      {
        supabase: fake.client as unknown as Parameters<typeof processFacebookPost>[3] extends
          | infer D
          | undefined
          ? D extends { supabase: infer C }
            ? C
            : never
          : never,
        queueForConfirmation: async () => ({ success: false, error: 'must not be reached' }),
      },
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('MULTI_STOP_UNSUPPORTED');
    const { data: rows } = await fake.client
      .from('food_trucks')
      .select('operating_hours, street_address, current_location')
      .eq('id', TRUCK_ID)
      .single();
    const row = rows as Record<string, unknown>;
    expect(row.operating_hours).toBeUndefined();
    // Permanent address remains exactly as seeded: no stop was selected.
    expect(row.street_address).toBe('1 Permanent HQ Address');
  });

  it('rejects a cross-street-only multi-stop post with no subset review proposal', async () => {
    // Sole multi-stop trigger is the second cross-street location: the post
    // carries no time tokens, so without cross-street counting the detector
    // returns false and the first stop silently survives to review.
    const { processFacebookPost } = await import('@/lib/services/postProcessor');
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'multi-stop-cross-street',
        status: 'pending',
        created_time: '2026-08-25T16:00:00.000Z',
      },
    ]);
    const queueForConfirmation = async (): Promise<never> => {
      throw new Error('queueForConfirmation must not be reached for multi-stop');
    };

    const result = await processFacebookPost(
      TRUCK_ID,
      'multi-stop-cross-street',
      {
        post_id: 'multi-stop-cross-street',
        message: 'Come find us at Main St & 5th Ave, then swing by River Rd & Oak St.',
        created_time: '2026-08-25T16:00:00.000Z',
      },
      {
        supabase: fake.client as unknown as Parameters<typeof processFacebookPost>[3],
        queueForConfirmation,
      },
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reason).toContain('MULTI_STOP_UNSUPPORTED');

    const { data: postRows } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('facebook_post_id', 'multi-stop-cross-street')
      .single();
    expect((postRows as { status?: string } | null)?.status).toBe('rejected');

    // No subset review proposal may be created.
    const { data: confirmations } = await fake.client
      .from('facebook_post_confirmations')
      .select('id');
    expect(confirmations).toEqual([]);

    // No writer reached: truck state untouched.
    const { data: truckRow } = await fake.client
      .from('food_trucks')
      .select('street_address, current_location, operating_hours')
      .eq('id', TRUCK_ID)
      .single();
    expect((truckRow as Record<string, unknown>).street_address).toBe('1 Permanent HQ Address');
    expect((truckRow as Record<string, unknown>).current_location).toBeUndefined();
    expect((truckRow as Record<string, unknown>).operating_hours).toBeUndefined();
  });

  it('does not return MULTI_STOP_UNSUPPORTED for one numbered intersection', async () => {
    // A single physical stop whose text is matched by both the street-only
    // and cross-street regex families counts as ONE stop: the pipeline must
    // treat it as a single-location post, never a phantom multi-stop.
    // (Sentence-final period: the cross-street lookahead accepts ./,/eos,
    // not "!".)
    const { processFacebookPost } = await import('@/lib/services/postProcessor');
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'single-numbered-intersection',
        status: 'pending',
        created_time: '2026-08-25T16:00:00.000Z',
      },
    ]);

    const result = await processFacebookPost(
      TRUCK_ID,
      'single-numbered-intersection',
      {
        post_id: 'single-numbered-intersection',
        message: 'Find us today 11-2 at 1201 Knox Ave & 5th St.',
        created_time: '2026-08-25T16:00:00.000Z',
      },
      {
        supabase: fake.client as unknown as Parameters<typeof processFacebookPost>[3],
        queueForConfirmation: async () => ({ success: false, error: 'must not be reached' }),
      },
    );

    expect(result.reason).not.toContain('MULTI_STOP_UNSUPPORTED');
    const { data: postRows } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('facebook_post_id', 'single-numbered-intersection')
      .single();
    expect((postRows as { processed_reason?: string } | null)?.processed_reason).not.toBe(
      'MULTI_STOP_UNSUPPORTED',
    );
  });
});

// ---------------------------------------------------------------------------
// Blocker 2: menu-only automation disabled
// ---------------------------------------------------------------------------

describe('menu-only automation disabled for canonical Facebook processing', () => {
  it('terminally rejects a DoorDash/menu promotion with no menu write and no confirmation', async () => {
    const { processFacebookPost } = await import('@/lib/services/postProcessor');
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'doordash-promo',
        status: 'pending',
        created_time: '2026-08-25T16:00:00.000Z',
      },
    ]);

    const result = await processFacebookPost(
      TRUCK_ID,
      'doordash-promo',
      {
        post_id: 'doordash-promo',
        message: 'Order tonight on DoorDash! Wings, burgers and loaded fries available.',
        created_time: '2026-08-25T16:00:00.000Z',
      },
      {
        supabase: fake.client as unknown as Parameters<typeof processFacebookPost>[3],
        queueForConfirmation: async () => ({ success: false, error: 'must not be reached' }),
      },
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe('rejected');
    const { data: rows } = await fake.client
      .from('food_trucks')
      .select('menu, menu_updated_by')
      .eq('id', TRUCK_ID)
      .single();
    const row = rows as Record<string, unknown>;
    expect(row.menu_updated_by).toBeUndefined();
  });

  it('classifies a promotional post without service evidence as needing no owner action', () => {
    const textData = extractTextBasedData('Order tonight on DoorDash! Wings and burgers!');
    const parsed = {
      food_items: ['wings', 'burgers'],
      confidence: 0.6,
    } as unknown as ParsedPost;
    const classification = classifyPost(parsed, textData, 'Order tonight on DoorDash!');
    // No promotional heuristics: the classifier may still call this MENU,
    // but a MENU-only post carries no schedule/location evidence, so the
    // pipeline terminally rejects it — no owner confirmation, no write.
    expect(['menu', 'unrelated']).toContain(classification.type);
  });

  it('applies schedule evidence from a mixed post with menu content, excluding the menu', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    const { updateTruckData } = await import('@/lib/services/truckUpdater');

    const result = await updateTruckData(
      TRUCK_ID,
      { type: 'mixed', confidence: 0.9, reason: 'Mixed update' },
      {
        food_items: ['wings', 'burgers'],
        location: undefined,
        times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'recurring_weekly' },
        confidence: 0.9,
      } as unknown as ParsedPost,
      ALLOW,
      undefined,
      { supabase: fake.client as unknown as AdminClient, fbActionAt: '2026-08-26T18:00:00.000Z' },
    );

    expect(result.success).toBe(true);
    expect(result.updatedFields).toEqual(['schedule']);
    const { data: rows } = await fake.client
      .from('food_trucks')
      .select('menu, menu_updated_by, operating_hours')
      .eq('id', TRUCK_ID)
      .single();
    const row = rows as Record<string, unknown>;
    expect(row.menu_updated_by).toBeUndefined();
    expect(row.operating_hours).toEqual({
      monday: {
        open: '11:00',
        close: '14:00',
        _meta: { schedule: { source: 'facebook', last_action_at: '2026-08-26T18:00:00.000Z' } },
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Blocker 3: location-only never mutates permanent location
// ---------------------------------------------------------------------------

describe('location-only Facebook posts never mutate the permanent location', () => {
  it('updateTruckData refuses the permanent-location path for a location-only classification', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    geocodeAddressMock.mockReset();
    geocodeAddressMock.mockImplementation(async (address: string) => ({
      success: true,
      lat: 33.5,
      lng: -81.9,
      formatted_address: address,
    }));
    const { updateTruckData } = await import('@/lib/services/truckUpdater');

    const result = await updateTruckData(
      TRUCK_ID,
      { type: 'location', confidence: 0.9, reason: 'Location update' },
      {
        food_items: [],
        location: { address: '3219 Dean Bridge Rd, Augusta, GA 30906', fuzzy: false },
        times: undefined,
        confidence: 0.9,
      } as unknown as ParsedPost,
      ALLOW,
      undefined,
      fake.client as unknown as AdminClient,
    );

    // The permanent-location writer must not run for Facebook location-only
    // evidence. Whatever the outcome shape, the permanent fields keep their
    // seeded values and the geocoder was never invoked.
    expect(geocodeAddressMock).not.toHaveBeenCalled();
    const { data: rows } = await fake.client
      .from('food_trucks')
      .select('street_address, current_location, city, state, zip')
      .eq('id', TRUCK_ID)
      .single();
    const row = rows as Record<string, unknown>;
    expect(row.street_address).toBe('1 Permanent HQ Address');
    expect(row.current_location).toBeUndefined();
    expect(row.city).toBeUndefined();
  });

  it('terminally rejects a location-only canonical post and cannot be requeued', async () => {
    const { processFacebookPost, requeueFailedPost } = await import('@/lib/services/postProcessor');
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    fake.seedTable('facebook_posts', [
      {
        id: 'post-row-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'location-only-terminal',
        status: 'pending',
        created_time: '2026-08-25T16:00:00.000Z',
      },
    ]);

    const result = await processFacebookPost(
      TRUCK_ID,
      'location-only-terminal',
      {
        post_id: 'location-only-terminal',
        message: 'We are at Cricket, 3219 Dean Bridge Rd, Augusta, GA 30906 today!',
        created_time: '2026-08-25T16:00:00.000Z',
      },
      {
        supabase: fake.client as unknown as Parameters<typeof processFacebookPost>[3],
        queueForConfirmation: async () => ({ success: false, error: 'must not be reached' }),
      },
    );

    // Deterministic policy outcome: terminal rejection, not a retryable
    // processing failure.
    expect(result.success).toBe(false);
    expect(result.status).toBe('rejected');
    expect(result.reason).toBe('LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA');

    const { data: postRows } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('facebook_post_id', 'location-only-terminal')
      .single();
    expect((postRows as { status?: string } | null)?.status).toBe('rejected');
    expect((postRows as { processed_reason?: string } | null)?.processed_reason).toBe(
      'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA',
    );

    // Permanent location remains unchanged.
    const { data: truckRow } = await fake.client
      .from('food_trucks')
      .select('street_address, current_location')
      .eq('id', TRUCK_ID)
      .single();
    expect((truckRow as Record<string, unknown>).street_address).toBe('1 Permanent HQ Address');
    expect((truckRow as Record<string, unknown>).current_location).toBeUndefined();

    // The retry/requeue path must not process it again: rejected is
    // terminal, so requeue mismatches the status guard.
    const requeue = await requeueFailedPost(
      fake.client as unknown as AdminClient,
      TRUCK_ID,
      'location-only-terminal',
    );
    expect(requeue).toEqual({ success: false, reason: 'Post is not retryable' });
    const { data: afterRequeue } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('facebook_post_id', 'location-only-terminal')
      .single();
    expect((afterRequeue as { status?: string } | null)?.status).toBe('rejected');
  });
});
