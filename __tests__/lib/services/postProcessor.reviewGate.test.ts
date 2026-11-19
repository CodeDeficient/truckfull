import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { PostProcessorDependencies } from '@/lib/services/postProcessor';

// Hermeticity: callLLM captures provider credentials into module-level
// constants at evaluation time. Save the surrounding environment's exact
// values, remove the provider vars, and only then dynamically import the
// real postProcessor/callLLM so the module evaluates with providers
// unconfigured. No jest.mock, no unstable_mockModule — the real
// regex/fallback extraction path runs. Originals are restored in afterAll.
const ORIGINAL_OLLAMA_KEY = process.env.OLLAMA_CLOUD_API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

let processFacebookPost: typeof import('@/lib/services/postProcessor').processFacebookPost;

beforeAll(async () => {
  delete process.env.OLLAMA_CLOUD_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  ({ processFacebookPost } = await import('@/lib/services/postProcessor'));
});

afterAll(() => {
  if (ORIGINAL_OLLAMA_KEY !== undefined) {
    process.env.OLLAMA_CLOUD_API_KEY = ORIGINAL_OLLAMA_KEY;
  } else {
    delete process.env.OLLAMA_CLOUD_API_KEY;
  }
  if (ORIGINAL_OPENROUTER_KEY !== undefined) {
    process.env.OPENROUTER_API_KEY = ORIGINAL_OPENROUTER_KEY;
  } else {
    delete process.env.OPENROUTER_API_KEY;
  }
});

const TRUCK_ID = 'truck-review-gate';
const POST_ID = 'review-gate-post';
const CANONICAL_CREATED_TIME = '2026-08-25T21:13:47.000Z';

function seedTruck(fake: ReturnType<typeof createFakeSupabaseClient>): void {
  fake.seedTable('food_trucks', [
    {
      id: TRUCK_ID,
      facebook_page_id: 'facebook-page-review-gate',
      timezone: 'America/New_York',
      slug: 'review-gate-truck',
      facebook_auto_updates_enabled: true,
    },
  ]);
}

function seedPost(fake: ReturnType<typeof createFakeSupabaseClient>, status = 'pending'): void {
  fake.seedTable('facebook_posts', [
    {
      id: 'post-row-1',
      truck_id: TRUCK_ID,
      facebook_post_id: POST_ID,
      status,
      created_time: CANONICAL_CREATED_TIME,
    },
  ]);
}

function deps(fake: ReturnType<typeof createFakeSupabaseClient>): PostProcessorDependencies {
  return {
    supabase: fake.client as unknown as PostProcessorDependencies['supabase'],
    queueForConfirmation: async (truckId, facebookPostId, updateType, proposedData, reason) => {
      const { data: postRecord } = await fake.client
        .from('facebook_posts')
        .select('id')
        .eq('facebook_post_id', facebookPostId)
        .eq('truck_id', truckId)
        .single();
      if (!postRecord) return { success: false, error: 'Failed to find facebook_post' };
      const { error } = await fake.client.from('facebook_post_confirmations').insert({
        truck_id: truckId,
        facebook_post_id: (postRecord as { id: string }).id,
        update_type: updateType,
        proposed_data: proposedData,
        low_confidence_reason: reason,
        status: 'pending',
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    },
  };
}

async function getPostStatus(
  fake: ReturnType<typeof createFakeSupabaseClient>,
): Promise<string | undefined> {
  const { data } = await fake.client
    .from('facebook_posts')
    .select('status, processed_reason')
    .eq('facebook_post_id', POST_ID)
    .single();
  return data?.status;
}

async function getConfirmations(fake: ReturnType<typeof createFakeSupabaseClient>) {
  const { data } = await fake.client
    .from('facebook_post_confirmations')
    .select('id, update_type, proposed_data, status');
  return data ?? [];
}

describe('review proposal sufficiency gate', () => {
  it('rejects a location-only fuzzy post without creating a hollow pending_review', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake);

    // Cross-street text yields a fuzzy location, but no usable schedule/time
    // context exists — the frozen contract rejects it instead of queueing a
    // review that can never resolve into a service operation.
    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      {
        post_id: POST_ID,
        message: "We're at Main St & 5th Ave, come find us!",
        created_time: CANONICAL_CREATED_TIME,
      },
      deps(fake),
    );

    expect(result).toMatchObject({ success: false, status: 'rejected' });
    expect(result.reason).toMatch(/insufficient service context/i);
    expect(await getPostStatus(fake)).toBe('rejected');
    expect(await getConfirmations(fake)).toEqual([]);
  });

  it('persists a valid dated missing_location review with serviceScope', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      {
        post_id: POST_ID,
        message:
          "We'll be serving today, August 25, 2026 from 11 AM to 2 PM — location TBD, check back soon!",
        created_time: CANONICAL_CREATED_TIME,
      },
      deps(fake),
    );

    expect(result).toMatchObject({ status: 'pending_review' });
    const confirmations = await getConfirmations(fake);
    expect(confirmations).toHaveLength(1);
    expect(confirmations[0]).toMatchObject({ status: 'pending', update_type: 'schedule' });
    const proposed = confirmations[0].proposed_data as Record<string, unknown>;
    expect(proposed.serviceScope).toBe('one_off_date');
    expect(proposed.serviceDate).toBe('2026-08-25');
    expect(proposed.reviewAction).toBe('missing_location');
    expect(proposed).not.toHaveProperty('locationCandidates');
  });

  it('persists a valid dated ambiguous_location review with the source location preserved', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      {
        post_id: POST_ID,
        message: "We're at Main St & 5th Ave today, August 25, 2026 from 11 AM to 2 PM!",
        created_time: CANONICAL_CREATED_TIME,
      },
      deps(fake),
    );

    expect(result).toMatchObject({ status: 'pending_review' });
    const confirmations = await getConfirmations(fake);
    expect(confirmations).toHaveLength(1);
    const proposed = confirmations[0].proposed_data as Record<string, unknown>;
    expect(proposed.reviewAction).toBe('ambiguous_location');
    expect(proposed.serviceScope).toBe('one_off_date');
    expect(proposed.serviceDate).toBe('2026-08-25');
    expect(proposed.location).toMatchObject({ fuzzy: true });
    expect(proposed.times).toMatchObject({ start: '11:00', end: '14:00' });
  });

  it('persists unresolved_schedule evidence for an unresolvable dated post', async () => {
    const fake = createFakeSupabaseClient();
    seedTruck(fake);
    seedPost(fake);

    const result = await processFacebookPost(
      TRUCK_ID,
      POST_ID,
      {
        post_id: POST_ID,
        message:
          "We'll be serving from 11 AM to 2 PM at 1201 Knox Ave, North Augusta, SC 29841 this Friday and also today!",
        created_time: CANONICAL_CREATED_TIME,
      },
      deps(fake),
    );

    expect(result).toMatchObject({ status: 'pending_review' });
    const confirmations = await getConfirmations(fake);
    expect(confirmations).toHaveLength(1);
    const proposed = confirmations[0].proposed_data as Record<string, unknown>;
    expect(proposed.reviewAction).toBe('unresolved_schedule');
    expect(proposed.serviceScope).toBe('unresolved_schedule');
    expect(proposed.times).toMatchObject({ start: '11:00', end: '14:00' });
    expect(typeof proposed.unresolvedReason).toBe('string');
  });
});

describe('hermeticity — provider credentials cannot reach the external path', () => {
  it('evaluates callLLM with providers unconfigured regardless of surrounding credentials', async () => {
    // Imports the SAME module registry instance callLLM.ts was evaluated in
    // (after the env scrub in beforeAll). If either provider key existed in
    // the surrounding shell/.env.local, the scrub guaranteed the module
    // captured empty values — this assertion fails if that ever regresses.
    const { callLLM } = await import('@/lib/utils/callLLM');
    const result = await callLLM([{ role: 'user', content: 'ping' }]);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/);
  });

  it('keeps the provider environment scrubbed for the duration of the file', () => {
    // The file-scope afterAll restores the originals only after the whole
    // file finishes, so while any test in this file runs the vars must
    // still be absent (when the surrounding environment defined them).
    if (ORIGINAL_OLLAMA_KEY !== undefined) {
      expect(process.env.OLLAMA_CLOUD_API_KEY).toBeUndefined();
    }
    if (ORIGINAL_OPENROUTER_KEY !== undefined) {
      expect(process.env.OPENROUTER_API_KEY).toBeUndefined();
    }
  });
});
