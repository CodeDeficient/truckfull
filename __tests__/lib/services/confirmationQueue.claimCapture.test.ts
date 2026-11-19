import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';

// Hermeticity: evaluate the real modules only after provider credentials
// are scrubbed (same pattern as postProcessor.reviewGate.test.ts).
const ORIGINAL_OLLAMA_KEY = process.env.OLLAMA_CLOUD_API_KEY;
const ORIGINAL_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

type ConfirmationQueueModule = typeof import('@/lib/services/confirmationQueue');

let confirmationQueue: ConfirmationQueueModule;

beforeAll(async () => {
  delete process.env.OLLAMA_CLOUD_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  confirmationQueue = await import('@/lib/services/confirmationQueue');
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

const TRUCK_ID = 'truck-claim-test';
const POST_ID = 'claim-test-post';
const FUTURE_EXPIRY = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const PAST_EXPIRY = new Date(Date.now() - 60 * 1000).toISOString();

type ConfirmationRow = {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  update_type: string;
  proposed_data: Record<string, unknown>;
  low_confidence_reason: string | null;
  status: string;
  expires_at: string;
  updated_at: string;
};

function seedConfirmation(
  fake: ReturnType<typeof createFakeSupabaseClient>,
  overrides: Partial<ConfirmationRow> = {},
): ConfirmationRow {
  const row: ConfirmationRow = {
    id: 'conf-1',
    truck_id: TRUCK_ID,
    facebook_post_id: 'post-row-1',
    update_type: 'schedule',
    proposed_data: { reviewAction: 'missing_location', serviceScope: 'one_off_date' },
    low_confidence_reason: null,
    status: 'pending',
    expires_at: FUTURE_EXPIRY,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
  fake.seedTable('facebook_post_confirmations', [row as never]);
  return row;
}

async function getRow(
  fake: ReturnType<typeof createFakeSupabaseClient>,
  id = 'conf-1',
): Promise<ConfirmationRow | undefined> {
  const { data } = await fake.client
    .from('facebook_post_confirmations')
    .select('*')
    .eq('id', id)
    .single();
  return data as ConfirmationRow | undefined;
}

function fakeAdmin(fake: ReturnType<typeof createFakeSupabaseClient>): never {
  return fake.client as never;
}

describe('claimConfirmationForApply — atomic resolution capture', () => {
  it('claims and durably persists proposed_data.resolution in one update', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake);

    const resolution = {
      locationResolution: { type: 'exact_location', location: { address: '1201 Knox Ave' } },
    };
    const result = await confirmationQueue.claimConfirmationForApply('conf-1', {
      resolution,
      proposedData: { reviewAction: 'missing_location', serviceScope: 'one_off_date' },
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(true);
    const row = await getRow(fake);
    expect(row?.status).toBe('applying');
    expect(row?.proposed_data).toMatchObject({
      reviewAction: 'missing_location',
      serviceScope: 'one_off_date',
      resolution,
    });
  });

  it('claims without a resolution, leaving proposed_data untouched', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake);
    const before = structuredClone((await getRow(fake)) ?? {});

    const result = await confirmationQueue.claimConfirmationForApply('conf-1', {
      supabase: fakeAdmin(fake),
    });
    expect(result.success).toBe(true);
    const row = await getRow(fake);
    expect(row?.status).toBe('applying');
    expect(row?.proposed_data).toEqual(before.proposed_data ?? row?.proposed_data);
  });

  it('does not write resolution or release when losing the race', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'applying', updated_at: new Date().toISOString() });

    const result = await confirmationQueue.claimConfirmationForApply('conf-1', {
      resolution: {
        locationResolution: { type: 'exact_location', location: { address: 'Rogue write' } },
      },
      proposedData: { reviewAction: 'missing_location', serviceScope: 'one_off_date' },
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    const row = await getRow(fake);
    expect(row?.status).toBe('applying');
    expect(row?.proposed_data).not.toHaveProperty('resolution');
    expect(JSON.stringify(row?.proposed_data)).not.toContain('Rogue write');
  });

  it('cannot claim an expired pending row', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, { status: 'pending', expires_at: PAST_EXPIRY });

    const result = await confirmationQueue.claimConfirmationForApply('conf-1', {
      resolution: { locationResolution: { type: 'exact_location', location: { address: 'X' } } },
      proposedData: {},
      supabase: fakeAdmin(fake),
    });

    expect(result.success).toBe(false);
    const row = await getRow(fake);
    expect(row?.status).toBe('pending');
  });
});

describe('releaseConfirmationClaim — returns to pending with resolution preserved', () => {
  it('releases applying to pending and preserves the captured resolution', async () => {
    const fake = createFakeSupabaseClient();
    seedConfirmation(fake, {
      status: 'applying',
      proposed_data: {
        reviewAction: 'missing_location',
        serviceScope: 'one_off_date',
        resolution: {
          locationResolution: { type: 'exact_location', location: { address: 'Saved' } },
        },
      },
    });

    const result = await confirmationQueue.releaseConfirmationClaim('conf-1', fakeAdmin(fake));
    expect(result.success).toBe(true);
    const row = await getRow(fake);
    expect(row?.status).toBe('pending');
    expect((row?.proposed_data as Record<string, unknown>).resolution).toMatchObject({
      locationResolution: { location: { address: 'Saved' } },
    });
  });
});
