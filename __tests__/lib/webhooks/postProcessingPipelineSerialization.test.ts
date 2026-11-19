/**
 * @jest-environment node
 */

/**
 * Same-truck serialization regression tests for processPendingPosts().
 *
 * Why not a real DB integration test:
 * - Jest's module config redirects @/lib/supabase/admin to a mock, so the
 *   real DB path is not used in Jest tests.
 * - processPendingPosts() depends on parseFacebookPost() which calls an LLM.
 * - The concurrent lost-update race requires deterministic timing/state
 *   control that a real DB test cannot reproduce without artificial
 *   orchestration.
 *
 * Faked boundaries:
 * - Database adapter (@/lib/supabase/admin → FakeSupabaseClient)
 * - Parser (@/lib/ai/parseFacebookPost → deterministic schedule return)
 * - Logging (@/lib/logging → no-op)
 *
 * Real production behavior preserved:
 * - Batching, chunking, grouping, sequencing, result aggregation
 * - processSinglePost() and applyPostUpdate() flow
 * - Quality detection pipeline (spam, false positive, conflict, data quality)
 * - Confidence scoring
 * - processWithRetry retry semantics for the parser
 *
 * What this test proves:
 * - Same-invocation serialization: same-truck posts process sequentially
 * - Different-truck groups can overlap concurrently
 * - Not cross-process database atomicity
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { createFakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { FakeSupabaseFactory, FakeSupabaseClient } from '@/__tests__/fakes/fakeSupabase';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';

const fake: FakeSupabaseFactory = createFakeSupabaseClient();

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: jest.fn(() => trackedClient),
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logMessage: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

const mockParseFacebookPost = jest.fn<(message: string) => Promise<ParsedPost>>();

jest.unstable_mockModule('@/lib/ai/parseFacebookPost', () => ({
  parseFacebookPost: mockParseFacebookPost,
}));

const TRUCK_ID = 'truck-1';
const TRUCK_2_ID = 'truck-2';
const ADDRESS = '123 Main Street, City, State 12345';

function makeTruck(overrides?: Record<string, unknown>) {
  return {
    id: TRUCK_ID,
    name: 'Test Truck',
    owner_id: 'owner-1',
    facebook_auto_updates_enabled: true,
    operating_hours: {
      friday: { open: '10:00', close: '18:00' },
    },
    ...overrides,
  };
}

function makePost(overrides?: Record<string, unknown>) {
  return {
    id: 'post-1',
    truck_id: TRUCK_ID,
    facebook_post_id: 'fb-1',
    message: 'We are open Monday! Serving tacos at 123 Main Street, City, State 12345.',
    raw_text: null,
    attachments: null,
    created_time: '2026-07-29T12:00:00Z',
    status: 'pending',
    confidence: 0.9,
    source: 'facebook',
    ...overrides,
  };
}

function parseForDay(day: string, foodItem: string): ParsedPost {
  return {
    food_items: [foodItem],
    times: { start: '11:00', end: '14:00', days: [day] },
    confidence: 0.9,
    location: { address: ADDRESS },
  };
}

async function readOperatingHours(
  truckId: string,
): Promise<Record<string, { open: string; close: string }>> {
  const { data } = await fake.client
    .from('food_trucks')
    .select('operating_hours')
    .eq('id', truckId)
    .single();
  return (data as Record<string, unknown>).operating_hours as Record<string, {
    open: string;
    close: string;
  }>;
}

// ── Concurrency tracker (wraps food_trucks lookups) ─────────────────────────
// Proves same-truck serialization and different-truck overlap by tracking
// in-flight truck lookups. processSinglePost() always hits food_trucks first,
// so this boundary is reached for every post regardless of rejection.
const activePerTruck = new Map<string, number>();
const maxPerTruck = new Map<string, number>();
const activeTruckSet = new Set<string>();
let maxOverlap = 0;
const processedPostIds: string[] = [];
let trackingEnabled = false;
let delayDbReads = false;

function resetTracking(): void {
  activePerTruck.clear();
  maxPerTruck.clear();
  activeTruckSet.clear();
  maxOverlap = 0;
  processedPostIds.length = 0;
  trackingEnabled = false;
  delayDbReads = false;
}

function beginTruckOp(truckId: string): void {
  if (!trackingEnabled) return;
  const current = (activePerTruck.get(truckId) ?? 0) + 1;
  activePerTruck.set(truckId, current);
  maxPerTruck.set(truckId, Math.max(maxPerTruck.get(truckId) ?? 0, current));
  activeTruckSet.add(truckId);
  maxOverlap = Math.max(maxOverlap, activeTruckSet.size);
  processedPostIds.push(truckId);
}

function endTruckOp(truckId: string): void {
  if (!trackingEnabled) return;
  const current = (activePerTruck.get(truckId) ?? 1) - 1;
  activePerTruck.set(truckId, current);
  if (current <= 0) {
    activeTruckSet.delete(truckId);
  }
}

// Tracked client: wraps fake.client.from() to instrument food_trucks queries.
const trackedClient: FakeSupabaseClient = {
  from(tableName: string) {
    const qb = fake.client.from(tableName);
    if (tableName !== 'food_trucks') {
      return qb;
    }
    // Wrap then() to track concurrent truck lookups and optionally delay reads.
    // The lookup uses .eq('id', truckId).single(); we capture the truckId from
    // the eq filter stored on the FakeQueryBuilder instance.
    const originalThen = qb.then.bind(qb);
    const wrappedThen = (
      onfulfilled?: ((value: unknown) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null,
    ): Promise<unknown> => {
      const filters = (qb as unknown as { filters: Array<{ column: string; value: unknown }> }).filters;
      const idFilter = filters?.find((f) => f.column === 'id');
      const rawTruckId = idFilter ? idFilter.value : undefined;
      const truckKey = rawTruckId === undefined ? undefined : String(rawTruckId);

      if (truckKey !== undefined) beginTruckOp(truckKey);

      // When delayDbReads is active, delay before the read so concurrent
      // same-truck posts both read the original state before either writes.
      const readDelay = delayDbReads ? delay(20) : Promise.resolve();

      const p = readDelay.then(() => originalThen()).then(
        async (result: unknown) => {
          if (trackingEnabled) await delay(20);
          if (truckKey !== undefined) endTruckOp(truckKey);
          return result;
        },
        async (err: unknown) => {
          if (trackingEnabled) await delay(20);
          if (truckKey !== undefined) endTruckOp(truckKey);
          throw err;
        },
      );

      if (onfulfilled && onrejected) return (p as Promise<unknown>).then(onfulfilled, onrejected);
      if (onfulfilled) return (p as Promise<unknown>).then(onfulfilled);
      if (onrejected) return (p as Promise<unknown>).then(undefined, onrejected);
      return p;
    };
    qb.then = wrappedThen as typeof qb.then;
    return qb;
  },
  rpc: fake.client.rpc.bind(fake.client),
  channel: fake.client.channel.bind(fake.client),
  auth: fake.client.auth,
};

// ── Small async delay helper for deterministic overlap ──────────────────────
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('processPendingPosts same-truck serialization', () => {
  let processPendingPosts: typeof import('@/lib/webhooks/postProcessingPipeline').processPendingPosts;

  beforeEach(async () => {
    fake.clearAll();
    mockParseFacebookPost.mockReset();
    resetTracking();
    const mod = await import('@/lib/webhooks/postProcessingPipeline');
    processPendingPosts = mod.processPendingPosts;
  });

  it('serializes same-truck posts: final state has original + both new weekdays', async () => {
    fake.seedTable('food_trucks', [makeTruck()]);
    fake.seedTable('facebook_posts', [
      makePost({ id: 'post-1', message: 'We are open Monday! Serving tacos at 123 Main Street.' }),
      makePost({ id: 'post-2', message: 'We are open Tuesday! Serving burgers at 123 Main Street.' }),
    ]);

    mockParseFacebookPost.mockImplementation(async (message: string) => {
      await delay(10);
      if (message.includes('Monday')) return parseForDay('monday', 'tacos');
      if (message.includes('Tuesday')) return parseForDay('tuesday', 'burgers');
      return { food_items: [], confidence: 0 };
    });

    // Delay DB reads so both concurrent posts read the original state before
    // either writes. Old code loses one weekday; new serialized code preserves both.
    delayDbReads = true;
    const result = await processPendingPosts();

    expect(result.processed).toBe(2);
    expect(result.applied).toBe(2);

    const hours = await readOperatingHours(TRUCK_ID);
    expect(hours).toEqual({
      friday: { open: '10:00', close: '18:00' },
      monday: { open: '11:00', close: '14:00' },
      tuesday: { open: '11:00', close: '14:00' },
    });
  });

  it('processes same-truck posts with max active = 1', async () => {
    fake.seedTable('food_trucks', [makeTruck()]);
    fake.seedTable('facebook_posts', [
      makePost({ id: 'post-1', message: 'We are open Monday! Serving tacos at 123 Main Street.' }),
      makePost({ id: 'post-2', message: 'We are open Tuesday! Serving burgers at 123 Main Street.' }),
    ]);

    mockParseFacebookPost.mockImplementation(async (message: string) => {
      await delay(20);
      if (message.includes('Monday')) return parseForDay('monday', 'tacos');
      return parseForDay('tuesday', 'burgers');
    });

    trackingEnabled = true;
    await processPendingPosts();

    expect(maxPerTruck.get(TRUCK_ID)).toBe(1);
  });

  it('allows different truck groups to overlap concurrently', async () => {
    fake.seedTable('food_trucks', [
      makeTruck({ id: TRUCK_ID }),
      makeTruck({ id: TRUCK_2_ID, name: 'Truck 2' }),
    ]);
    fake.seedTable('facebook_posts', [
      makePost({
        id: 'post-1',
        truck_id: TRUCK_ID,
        message: 'We are open Monday! Serving tacos at 123 Main Street.',
      }),
      makePost({
        id: 'post-2',
        truck_id: TRUCK_2_ID,
        message: 'We are open Tuesday! Serving burgers at 456 Oak Avenue.',
      }),
    ]);

    mockParseFacebookPost.mockImplementation(async () => {
      await delay(20);
      return parseForDay('monday', 'food');
    });

    trackingEnabled = true;
    await processPendingPosts();

    expect(maxOverlap).toBeGreaterThanOrEqual(2);
  });

  it('preserves same-truck input order', async () => {
    fake.seedTable('food_trucks', [makeTruck()]);
    fake.seedTable('facebook_posts', [
      makePost({ id: 'post-1', message: 'We are open Monday! Serving tacos at 123 Main Street.' }),
      makePost({ id: 'post-2', message: 'We are open Tuesday! Serving burgers at 123 Main Street.' }),
    ]);

    const parseOrder: string[] = [];
    mockParseFacebookPost.mockImplementation(async (message: string) => {
      parseOrder.push(message);
      await delay(10);
      if (message.includes('Monday')) return parseForDay('monday', 'tacos');
      return parseForDay('tuesday', 'burgers');
    });

    await processPendingPosts();

    expect(parseOrder).toHaveLength(2);
    expect(parseOrder[0]).toContain('Monday');
    expect(parseOrder[1]).toContain('Tuesday');
  });

  it('isolates same-truck failure: first post fails, second still succeeds', async () => {
    fake.seedTable('food_trucks', [makeTruck()]);
    fake.seedTable('facebook_posts', [
      makePost({ id: 'post-1', message: 'We are open Monday! Serving tacos at 123 Main Street.' }),
      makePost({ id: 'post-2', message: 'We are open Tuesday! Serving burgers at 123 Main Street.' }),
    ]);

    // Parser throws for every call with "Monday" content (survives retries).
    mockParseFacebookPost.mockImplementation(async (message: string) => {
      if (message.includes('Monday')) {
        throw new Error('Parser failed for Monday post');
      }
      await delay(10);
      return parseForDay('tuesday', 'burgers');
    });

    const result = await processPendingPosts();

    expect(result.processed).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.applied).toBe(1);

    const firstResult = result.results.find((r) => r.postId === 'post-1');
    expect(firstResult?.action).toBe('error');
    expect(firstResult?.error).toBe('Parser failed for Monday post');

    const secondResult = result.results.find((r) => r.postId === 'post-2');
    expect(secondResult?.action).toBe('applied');

    const hours = await readOperatingHours(TRUCK_ID);
    expect(hours).toEqual({
      friday: { open: '10:00', close: '18:00' },
      tuesday: { open: '11:00', close: '14:00' },
    });
  });

  it('does not group posts with missing/invalid truck_id under one key', async () => {
    fake.seedTable('food_trucks', [makeTruck()]);
    fake.seedTable('facebook_posts', [
      makePost({ id: 'post-1', truck_id: '', message: 'We are open Monday! Serving tacos.' }),
      makePost({ id: 'post-2', truck_id: null, message: 'We are open Tuesday! Serving burgers.' }),
    ]);

    mockParseFacebookPost.mockImplementation(async () => parseForDay('monday', 'food'));

    trackingEnabled = true;
    const result = await processPendingPosts();

    expect(result.processed).toBe(2);

    const post1Result = result.results.find((r) => r.postId === 'post-1');
    const post2Result = result.results.find((r) => r.postId === 'post-2');
    expect(post1Result).toBeDefined();
    expect(post2Result).toBeDefined();

    // Both posts hit the truck-lookup boundary. If they were grouped under
    // one shared null/undefined key they would serialize (max overlap 1).
    // As independent workers they overlap (max overlap >= 2).
    // Note: eq('id', '') and eq('id', null) produce distinct truckId keys
    // in the tracker, but neither matches a real truck so both reject.
    // The overlap proof here is that two independent workers were started
    // concurrently for the same chunk.
    expect(maxOverlap).toBeGreaterThanOrEqual(2);
  });
});
