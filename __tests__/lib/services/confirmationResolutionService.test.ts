import { describe, expect, it, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { revalidateTag } from 'next/cache';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';

const ORIGINAL_OLLAMA_KEY = process.env.OLLAMA_CLOUD_API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

type ResolveModule = typeof import('@/lib/services/confirmationResolutionService');

let service: ResolveModule;

beforeAll(async () => {
  delete process.env.OLLAMA_CLOUD_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  service = await import('@/lib/services/confirmationResolutionService');
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

beforeEach(() => {
  jest.clearAllMocks();
});

const TRUCK_ID = 'truck-resolve-test';
const POST_ID = 'resolve-test-post';
const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST = new Date(Date.now() - 60 * 1000).toISOString();

const PROPOSAL = {
  reviewAction: 'missing_location',
  serviceScope: 'one_off_date',
  serviceDate: '2026-08-25',
  times: { start: '11:00', end: '14:00', scope: 'one_off_date' },
};

function fakeAdmin(fake: ReturnType<typeof createFakeSupabaseClient>): never {
  return fake.client as never;
}

function seedConfirmation(
  fake: ReturnType<typeof createFakeSupabaseClient>,
  overrides: Record<string, unknown> = {},
): void {
  fake.seedTable('facebook_post_confirmations', [
    {
      id: 'conf-1',
      truck_id: TRUCK_ID,
      facebook_post_id: 'post-row-1',
      update_type: 'schedule',
      proposed_data: PROPOSAL,
      low_confidence_reason: null,
      status: 'pending',
      expires_at: FUTURE,
      updated_at: new Date().toISOString(),
      ...overrides,
    } as never,
  ]);
}

function seedPost(
  fake: ReturnType<typeof createFakeSupabaseClient>,
  status = 'pending_review',
): void {
  fake.seedTable('facebook_posts', [
    {
      id: 'post-row-1',
      truck_id: TRUCK_ID,
      facebook_post_id: 'post-row-1',
      status,
      created_time: '2026-08-25T21:13:47.000Z',
    } as never,
  ]);
}

const LOCATION_RESOLUTION = {
  locationResolution: { type: 'exact_location', location: { address: '1201 Knox Ave' } },
};

describe('resolveConfirmation — claim ordering and capture', () => {
  it('rejects resolve on a proposal without reviewAction before any claim or write', async () => {
    const fake = createFakeSupabaseClient();
    const { reviewAction: _omitted, ...plainProposal } = PROPOSAL;
    seedConfirmation(fake, { proposed_data: plainProposal });

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.code).toBe('invalid');
    expect(result.reason).toMatch(/review/i);
    const { data: row } = await fake.client
      .from('facebook_post_confirmations')
      .select('status, proposed_data')
      .eq('id', 'conf-1')
      .single();
    expect((row as unknown as { status: string }).status).toBe('pending');
    expect(
      (row as unknown as { proposed_data: Record<string, unknown> }).proposed_data,
    ).not.toHaveProperty('resolution');
  });

  it('captures the resolution in the claim and persists it', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake);

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(true);
    const { data: row } = await fake.client
      .from('facebook_post_confirmations')
      .select('*')
      .eq('id', 'conf-1')
      .single();
    expect(
      (row as unknown as { proposed_data: Record<string, unknown> }).proposed_data,
    ).toMatchObject({
      reviewAction: 'missing_location',
      resolution: LOCATION_RESOLUTION,
    });
  });

  it('rejects an invalid resolution before any claim or write', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake);

    const result = await service.resolveConfirmation(
      'conf-1',
      { locationResolution: { type: 'exact_location', location: { address: '   ' } } },
      { supabase: fakeAdmin(fake) },
    );

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/address/i);
    const { data: row } = await fake.client
      .from('facebook_post_confirmations')
      .select('status, proposed_data')
      .eq('id', 'conf-1')
      .single();
    expect((row as unknown as { status: string }).status).toBe('pending');
    expect(
      (row as unknown as { proposed_data: Record<string, unknown> }).proposed_data,
    ).not.toHaveProperty('resolution');
  });

  it('rejects a resolution that fails the merged-completeness gate', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, {
      proposed_data: {
        reviewAction: 'unresolved_schedule',
        serviceScope: 'unresolved_schedule',
        times: { start: '11:00', dateReferences: ['x'], scope: 'one_off_date' },
        unresolvedReason: 'conflicting dates',
        location: { address: '1201 Knox Ave', fuzzy: false },
      },
    });

    // Schedule-only resolution whose correction lacks a service date fails
    // validation; a complete schedule correction resolves.
    const bad = await service.resolveConfirmation(
      'conf-1',
      {
        scheduleResolution: {
          scope: 'one_off',
          serviceDate: 'bad',
          startTime: '11:00',
          endTime: '14:00',
        },
      },
      { supabase: fakeAdmin(fake) },
    );
    expect(bad.success).toBe(false);
    expect(bad.reason).toMatch(/service date/i);

    const good = await service.resolveConfirmation(
      'conf-1',
      {
        scheduleResolution: {
          scope: 'one_off',
          serviceDate: '2026-09-04',
          startTime: '11:00',
          endTime: '14:00',
        },
      },
      { supabase: fakeAdmin(fake) },
    );
    expect(good.success).toBe(true);
  });

  it('rejects an impossible date before claim, persistence, schedule writes, or invalidation', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, {
      proposed_data: {
        reviewAction: 'unresolved_schedule',
        serviceScope: 'unresolved_schedule',
        times: { start: '11:00', dateReferences: ['x'], scope: 'one_off_date' },
        unresolvedReason: 'conflicting dates',
        location: { address: '1201 Knox Ave', fuzzy: false },
      },
    });

    const result = await service.resolveConfirmation(
      'conf-1',
      {
        scheduleResolution: {
          scope: 'one_off',
          serviceDate: '2026-02-31',
          startTime: '11:00',
          endTime: '14:00',
        },
      },
      { supabase: fakeAdmin(fake) },
    );

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/service date/i);
    const { data: confirmation } = await fake.client
      .from('facebook_post_confirmations')
      .select('status, proposed_data')
      .eq('id', 'conf-1')
      .single();
    expect(confirmation).toMatchObject({ status: 'pending' });
    expect(
      (confirmation as unknown as { proposed_data: Record<string, unknown> }).proposed_data,
    ).not.toHaveProperty('resolution');
    const { data: overrides } = await fake.client.from('food_truck_schedule_overrides').select('*');
    expect(overrides).toHaveLength(0);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('rejects equal recurring times before claim, persistence, schedule writes, or invalidation', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, {
      proposed_data: {
        reviewAction: 'unresolved_schedule',
        serviceScope: 'unresolved_schedule',
        times: { start: '11:00', scope: 'recurring_weekly' },
        unresolvedReason: 'incomplete hours',
        location: { address: '1201 Knox Ave', fuzzy: false },
      },
    });

    const result = await service.resolveConfirmation(
      'conf-1',
      {
        scheduleResolution: {
          scope: 'recurring',
          days: ['friday'],
          startTime: '11:00',
          endTime: '11:00',
        },
      },
      { supabase: fakeAdmin(fake) },
    );

    expect(result.success).toBe(false);
    expect(result.reason).toBe('DEGENERATE_TIMES_REJECTED');
    const { data: confirmation } = await fake.client
      .from('facebook_post_confirmations')
      .select('status, proposed_data')
      .eq('id', 'conf-1')
      .single();
    expect(confirmation).toMatchObject({ status: 'pending' });
    expect(
      (confirmation as unknown as { proposed_data: Record<string, unknown> }).proposed_data,
    ).not.toHaveProperty('resolution');
    const { data: overrides } = await fake.client.from('food_truck_schedule_overrides').select('*');
    expect(overrides).toHaveLength(0);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('returns not-actionable for a non-pending row without writing resolution', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'applying', updated_at: new Date().toISOString() });

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    const { data: row } = await fake.client
      .from('facebook_post_confirmations')
      .select('proposed_data')
      .eq('id', 'conf-1')
      .single();
    expect(
      (row as unknown as { proposed_data: Record<string, unknown> }).proposed_data,
    ).not.toHaveProperty('resolution');
  });

  it('rejects an expired confirmation at action time and synchronizes the parent post', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_review');

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    const { data: conf } = await fake.client
      .from('facebook_post_confirmations')
      .select('status')
      .eq('id', 'conf-1')
      .single();
    expect((conf as unknown as { status: string }).status).toBe('expired');
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('rejected');
    expect((post as unknown as { processed_reason: string }).processed_reason).toBe(
      'Confirmation expired',
    );
  });

  it('synchronizes a pending_confirmation parent post when a plain confirmation expires', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_confirmation');

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('rejected');
    expect((post as unknown as { processed_reason: string }).processed_reason).toBe(
      'Confirmation expired',
    );
  });

  it('expires the target without changing an already processed parent post', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'processed');
    const { data: before } = await fake.client
      .from('facebook_posts')
      .select('*')
      .eq('id', 'post-row-1')
      .single();

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    const { data: after } = await fake.client
      .from('facebook_posts')
      .select('*')
      .eq('id', 'post-row-1')
      .single();
    expect(after).toEqual(before);
  });

  it('expires the target but keeps the parent pending_review when another applying sibling exists', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_review');
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: PROPOSAL,
        low_confidence_reason: null,
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
      {
        id: 'conf-2',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: {},
        low_confidence_reason: null,
        status: 'applying',
        expires_at: FUTURE,
        updated_at: new Date().toISOString(),
      } as never,
    ]);

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    const { data: conf2 } = await fake.client
      .from('facebook_post_confirmations')
      .select('status')
      .eq('id', 'conf-2')
      .single();
    expect((conf2 as unknown as { status: string }).status).toBe('applying');
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('pending_review');
  });

  it('keeps the parent owner-action when a fresh applying sibling exists despite its expired_at', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_review');
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: PROPOSAL,
        low_confidence_reason: null,
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
      {
        id: 'conf-2',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: {},
        low_confidence_reason: null,
        status: 'applying',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
    ]);

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('pending_review');
    expect((post as unknown as { processed_reason: string }).processed_reason).toBeUndefined();
  });

  it('keeps the parent owner-action when a stale applying sibling exists despite its expired_at', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_review');
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: PROPOSAL,
        low_confidence_reason: null,
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
      {
        id: 'conf-2',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: {},
        low_confidence_reason: null,
        status: 'applying',
        expires_at: PAST,
        updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      } as never,
    ]);

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('pending_review');
  });

  it('terminalizes the parent when only expired pending siblings remain', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_review');
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: PROPOSAL,
        low_confidence_reason: null,
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
      {
        id: 'conf-2',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: {},
        low_confidence_reason: null,
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
    ]);

    const result = await service.resolveConfirmation('conf-1', LOCATION_RESOLUTION, {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/expired/i);
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('rejected');
    expect((post as unknown as { processed_reason: string }).processed_reason).toBe(
      'Confirmation expired',
    );
  });
});

describe('expireIfDueAndSyncParent — shared action-time expiry preflight', () => {
  it('expires a genuinely plain pending confirmation and rejects its pending_confirmation parent', async () => {
    const fake = createFakeSupabaseClient();
    const plainProposal = {
      food_items: ['Tacos'],
      location: { address: '123 Main St', fuzzy: false },
      times: { start: '11:00', end: '14:00', scope: 'recurring_weekly', days: ['monday'] },
      classification: 'mixed',
      confidence: 0.6,
    };
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: plainProposal,
        low_confidence_reason: 'Confidence below threshold',
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
    ]);
    seedPost(fake, 'pending_confirmation');

    const result = await service.expireIfDueAndSyncParent('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.expired).toBe(true);
    const { data: conf } = await fake.client
      .from('facebook_post_confirmations')
      .select('status')
      .eq('id', 'conf-1')
      .single();
    expect((conf as unknown as { status: string }).status).toBe('expired');
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status, processed_reason')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('rejected');
    expect((post as unknown as { processed_reason: string }).processed_reason).toBe(
      'Confirmation expired',
    );
  });

  it('expires an expired review proposal and rejects its pending_review parent', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_review');

    const result = await service.expireIfDueAndSyncParent('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.expired).toBe(true);
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('rejected');
  });

  it('leaves an already processed parent unchanged when a plain confirmation expires', async () => {
    const fake = createFakeSupabaseClient();
    const plainProposal = {
      food_items: ['Tacos'],
      location: { address: '123 Main St', fuzzy: false },
      times: { start: '11:00', end: '14:00', scope: 'recurring_weekly', days: ['monday'] },
    };
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: plainProposal,
        low_confidence_reason: null,
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
    ]);
    seedPost(fake, 'processed');
    const { data: before } = await fake.client
      .from('facebook_posts')
      .select('*')
      .eq('id', 'post-row-1')
      .single();

    const result = await service.expireIfDueAndSyncParent('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.expired).toBe(true);
    const { data: after } = await fake.client
      .from('facebook_posts')
      .select('*')
      .eq('id', 'post-row-1')
      .single();
    expect(after).toEqual(before);
  });

  it('keeps the parent owner-action when an expired applying sibling exists', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST });
    seedPost(fake, 'pending_review');
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: PROPOSAL,
        low_confidence_reason: null,
        status: 'pending',
        expires_at: PAST,
        updated_at: new Date().toISOString(),
      } as never,
      {
        id: 'conf-2',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        proposed_data: {},
        low_confidence_reason: null,
        status: 'applying',
        expires_at: PAST,
        updated_at: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
      } as never,
    ]);

    const result = await service.expireIfDueAndSyncParent('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.expired).toBe(true);
    const { data: post } = await fake.client
      .from('facebook_posts')
      .select('status')
      .eq('id', 'post-row-1')
      .single();
    expect((post as unknown as { status: string }).status).toBe('pending_review');
  });

  it('does not expire an unexpired pending confirmation', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: FUTURE });
    seedPost(fake, 'pending_review');

    const result = await service.expireIfDueAndSyncParent('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.expired).toBe(false);
    const { data: conf } = await fake.client
      .from('facebook_post_confirmations')
      .select('status')
      .eq('id', 'conf-1')
      .single();
    expect((conf as unknown as { status: string }).status).toBe('pending');
  });

  it('reports not expired for a missing confirmation', async () => {
    const fake = createFakeSupabaseClient();

    const result = await service.expireIfDueAndSyncParent('missing-conf', {
      supabase: fakeAdmin(fake),
    });

    expect(result.expired).toBe(false);
  });
});

describe('applyResolvedConfirmation — schedule/location only application', () => {
  async function seedClaimedOneOff(
    fake: ReturnType<typeof createFakeSupabaseClient>,
    proposalOverrides: Record<string, unknown> = {},
  ): Promise<void> {
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-1',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        status: 'applying',
        expires_at: FUTURE,
        updated_at: new Date().toISOString(),
        low_confidence_reason: null,
        proposed_data: {
          ...PROPOSAL,
          resolution: LOCATION_RESOLUTION,
          ...proposalOverrides,
        },
      } as never,
    ]);
    seedPost(fake);
    fake.seedTable('food_trucks', [
      {
        id: TRUCK_ID,
        timezone: 'America/New_York',
        slug: 'resolve-test-truck',
        street_address: '500 Permanent Ave',
        city: 'Augusta',
        state: 'GA',
        schedule_updated_by: null,
        schedule_updated_at: null,
        facebook_auto_updates_enabled: true,
      } as never,
    ]);
  }

  it('rejects a resolved confirmation when Facebook auto-updates are disabled', async () => {
    const fake = createFakeSupabaseClient();
    await seedClaimedOneOff(fake);
    await fake.client
      .from('food_trucks')
      .update({ facebook_auto_updates_enabled: false })
      .eq('id', TRUCK_ID);

    const result = await service.applyResolvedConfirmation('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result).toEqual({
      success: false,
      error: 'Facebook auto-updates disabled for this truck',
    });
    const { data: overrides } = await fake.client
      .from('schedule_overrides')
      .select('*')
      .eq('truck_id', TRUCK_ID);
    expect(overrides).toEqual([]);
  });

  it('applies a one-off resolution as one override row and never touches permanent location', async () => {
    const fake = createFakeSupabaseClient();
    await seedClaimedOneOff(fake);

    const result = await service.applyResolvedConfirmation('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(true);
    expect(result.updatedFields).toContain('schedule');
    const { data: overrides } = await fake.client.from('food_truck_schedule_overrides').select('*');
    expect(overrides).toHaveLength(1);
    expect(overrides?.[0]).toMatchObject({
      food_truck_id: TRUCK_ID,
      service_date: '2026-08-25',
      start_time: '11:00',
      end_time: '14:00',
    });
    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('street_address, city, state, location_updated_by')
      .eq('id', TRUCK_ID)
      .single();
    // The resolve path never writes permanent location fields.
    expect(truck).not.toHaveProperty(['location_updated_by'], 'facebook');
    expect(truck).toMatchObject({
      street_address: '500 Permanent Ave',
      city: 'Augusta',
      state: 'GA',
    });
  });

  it('preserves fuzzy source-location provenance on a time-only override', async () => {
    const fake = createFakeSupabaseClient();
    await seedClaimedOneOff(fake, {
      reviewAction: 'ambiguous_time',
      location: { address: 'Harlem Ave. and 99th St.', fuzzy: true },
      timeAlternatives: [
        { start: '11:00', end: '14:00', label: '11 AM–2 PM' },
        { start: '23:00', end: '02:00', label: '11 PM–2 AM' },
      ],
      resolution: {
        scheduleResolution: {
          scope: 'one_off',
          serviceDate: '2026-08-25',
          startTime: '11:00',
          endTime: '14:00',
        },
      },
    });

    const result = await service.applyResolvedConfirmation('conf-1', {
      supabase: fakeAdmin(fake),
    });
    const { data: overrides } = await fake.client
      .from('food_truck_schedule_overrides')
      .select('location_data');

    expect(result.success).toBe(true);
    expect(overrides?.[0]?.location_data).toEqual({
      address: 'Harlem Ave. and 99th St.',
      city: undefined,
      state: undefined,
      fuzzy: true,
    });
  });

  it('invalidates truck-page and search caches after a successful resolved one-off action', async () => {
    const fake = createFakeSupabaseClient();
    await seedClaimedOneOff(fake);

    const result = await service.applyResolvedConfirmationAndInvalidate('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(true);
    expect(revalidateTag).toHaveBeenCalledTimes(3);
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'public-truck:resolve-test-truck', {
      expire: 0,
    });
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'public-trucks', { expire: 0 });
    expect(revalidateTag).toHaveBeenNthCalledWith(3, 'food-trucks', 'max');
  });

  it('skips the permanent-location source gate for a recurring resolve', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-recur',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        status: 'applying',
        expires_at: FUTURE,
        updated_at: new Date().toISOString(),
        low_confidence_reason: null,
        proposed_data: {
          reviewAction: 'missing_location',
          serviceScope: 'recurring',
          times: { start: '11:00', end: '14:00', days: ['monday'], scope: 'recurring_weekly' },
          resolution: LOCATION_RESOLUTION,
        },
      } as never,
    ]);
    seedPost(fake);
    fake.seedTable('food_trucks', [
      {
        id: TRUCK_ID,
        timezone: 'America/New_York',
        slug: 'resolve-test-truck',
        street_address: '500 Legacy St',
        location_updated_by: 'manual',
        location_updated_at: new Date().toISOString(),
        schedule_updated_by: null,
        facebook_auto_updates_enabled: true,
        operating_hours: { friday: { open: '09:00', close: '17:00', location: 'Old Friday spot' } },
      } as never,
    ]);

    const result = await service.applyResolvedConfirmationAndInvalidate('conf-recur', {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(true);
    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours, street_address, location_updated_by')
      .eq('id', TRUCK_ID)
      .single();
    const hours = (
      truck as unknown as { operating_hours: Record<string, { open: string; location?: string }> }
    ).operating_hours;
    expect(hours.monday).toMatchObject({
      open: '11:00',
      close: '14:00',
      location: '1201 Knox Ave',
    });
    // Unaffected weekday untouched
    expect(hours.friday).toEqual({ open: '09:00', close: '17:00', location: 'Old Friday spot' });
    // Permanent address unchanged, no facebook location write
    expect(truck).toMatchObject({ street_address: '500 Legacy St', location_updated_by: 'manual' });
    expect(revalidateTag).toHaveBeenCalledTimes(3);
    expect(revalidateTag).toHaveBeenNthCalledWith(1, 'public-truck:resolve-test-truck', {
      expire: 0,
    });
    expect(revalidateTag).toHaveBeenNthCalledWith(2, 'public-trucks', { expire: 0 });
    expect(revalidateTag).toHaveBeenNthCalledWith(3, 'food-trucks', 'max');
  });

  it('preserves an existing per-day location when neither resolution nor proposal supplies a new one', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-recur2',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        status: 'applying',
        expires_at: FUTURE,
        updated_at: new Date().toISOString(),
        low_confidence_reason: null,
        proposed_data: {
          reviewAction: 'unresolved_schedule',
          serviceScope: 'recurring',
          times: { start: '10:00', scope: 'recurring_weekly' },
          unresolvedReason: 'incomplete hours',
          resolution: {
            scheduleResolution: {
              scope: 'recurring',
              days: ['tuesday'],
              startTime: '12:00',
              endTime: '15:00',
            },
          },
        },
      } as never,
    ]);
    seedPost(fake);
    fake.seedTable('food_trucks', [
      {
        id: TRUCK_ID,
        timezone: 'America/New_York',
        slug: 'resolve-test-truck',
        facebook_auto_updates_enabled: true,
        schedule_updated_by: null,
        operating_hours: {
          tuesday: {
            open: '09:00',
            close: '17:00',
            location: 'Old Tuesday spot',
            _meta: {
              schedule: { source: 'manual', last_action_at: '2026-08-01T00:00:00.000Z' },
              location: { source: 'manual', last_action_at: '2026-08-01T00:00:00.000Z' },
            },
          },
        },
      } as never,
    ]);

    const result = await service.applyResolvedConfirmation('conf-recur2', {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(true);
    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours')
      .eq('id', TRUCK_ID)
      .single();
    const hours = (
      truck as unknown as { operating_hours: Record<string, { open: string; location?: string }> }
    ).operating_hours;
    expect(hours.tuesday).toMatchObject({
      open: '12:00',
      close: '15:00',
      location: 'Old Tuesday spot',
    });
  });

  it('uses the proposal non-fuzzy location as the recurring day location when only hours are corrected', async () => {
    const fake = createFakeSupabaseClient();
    fake.seedTable('facebook_post_confirmations', [
      {
        id: 'conf-recur3',
        truck_id: TRUCK_ID,
        facebook_post_id: 'post-row-1',
        update_type: 'schedule',
        status: 'applying',
        expires_at: FUTURE,
        updated_at: new Date().toISOString(),
        low_confidence_reason: null,
        proposed_data: {
          reviewAction: 'unresolved_schedule',
          serviceScope: 'recurring',
          times: { start: '10:00', scope: 'recurring_weekly' },
          unresolvedReason: 'incomplete hours',
          location: { address: '1201 Knox Ave', fuzzy: false },
          resolution: {
            scheduleResolution: {
              scope: 'recurring',
              days: ['tuesday'],
              startTime: '12:00',
              endTime: '15:00',
            },
          },
        },
      } as never,
    ]);
    seedPost(fake);
    fake.seedTable('food_trucks', [
      {
        id: TRUCK_ID,
        timezone: 'America/New_York',
        slug: 'resolve-test-truck',
        facebook_auto_updates_enabled: true,
        schedule_updated_by: null,
        operating_hours: {},
      } as never,
    ]);

    const result = await service.applyResolvedConfirmation('conf-recur3', {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(true);
    const { data: truck } = await fake.client
      .from('food_trucks')
      .select('operating_hours')
      .eq('id', TRUCK_ID)
      .single();
    const hours = (
      truck as unknown as { operating_hours: Record<string, { open: string; location?: string }> }
    ).operating_hours;
    expect(hours.tuesday).toMatchObject({
      open: '12:00',
      close: '15:00',
      location: '1201 Knox Ave',
    });
  });

  it('fails closed when the post predates a newer manual day action (canonical arbitration, no 7-day window)', async () => {
    const fake = createFakeSupabaseClient();
    await seedClaimedOneOff(fake, {
      reviewAction: 'unresolved_schedule',
      serviceScope: 'recurring',
      times: { start: '10:00', scope: 'recurring_weekly' },
      resolution: {
        scheduleResolution: {
          scope: 'recurring',
          days: ['monday'],
          startTime: '12:00',
          endTime: '15:00',
        },
      },
    });
    await fake.client
      .from('food_trucks')
      .update({
        operating_hours: {
          monday: {
            open: '09:00',
            close: '17:00',
            _meta: {
              schedule: { source: 'manual', last_action_at: '2026-08-27T00:00:00.000Z' },
            },
          },
        },
      })
      .eq('id', TRUCK_ID);

    const result = await service.applyResolvedConfirmationAndInvalidate('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/RECURRING_SCHEDULE_STALE_OWNER_ACTION/);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it('refuses to apply when the confirmation is not in applying', async () => {
    const fake = createFakeSupabaseClient();
    await seedClaimedOneOff(fake, {});
    await fake.client
      .from('facebook_post_confirmations')
      .update({ status: 'pending' })
      .eq('id', 'conf-1');

    const result = await service.applyResolvedConfirmation('conf-1', {
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/pending/);
  });
});
