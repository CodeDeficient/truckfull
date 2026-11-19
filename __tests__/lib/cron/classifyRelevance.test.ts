import { describe, expect, it } from '@jest/globals';
import {
  runFactsClassification,
  toListing,
  type EventForClassification,
  type FactsClassifierDeps,
  type RelevanceDecision,
} from '@/lib/cron/classifyRelevance';
import type { OpenCodeGoRequest, OpenCodeGoResult } from '@/lib/utils/callOpenCodeGo';
import type { EventCacheTarget } from '@/lib/events/eventCacheTargets';

function event(overrides: Partial<EventForClassification> = {}): EventForClassification {
  return {
    id: 'event-1',
    title: 'Fall Festival on Main',
    description: 'Local food trucks will be serving lunch all day.',
    source_url: 'https://example.com/fall-festival',
    city: 'Augusta',
    state: 'GA',
    event_start_date: '2026-10-24',
    vetting_score: 60,
    location_address: 'Main Street, Augusta, GA',
    organization: null,
    is_food_truck_relevant: false,
    eventbrite: null,
    ...overrides,
  };
}

const TURNS_ON = '11111111-1111-4111-8111-111111111111';
const STAYS_ON = '22222222-2222-4222-8222-222222222222';
const TURNS_OFF = '33333333-3333-4333-8333-333333333333';

const TRUCKS_REPLY = JSON.stringify({
  food_sellers: 'outside_vendors',
  food_evidence: 'Local food trucks will be serving lunch all day.',
  setting: 'outdoor',
  event_kind: 'festival_or_fair',
  audience: 'general',
});

const NIGHTLIFE_REPLY = JSON.stringify({
  food_sellers: 'not_mentioned',
  food_evidence: null,
  setting: 'indoor',
  event_kind: 'nightlife_or_party',
  audience: 'adults_only',
});

interface Harness {
  readonly deps: FactsClassifierDeps;
  readonly saved: Array<{ id: string; decision: RelevanceDecision }>;
  readonly requests: OpenCodeGoRequest[];
  readonly invalidated: EventCacheTarget[][];
  readonly pages: string[];
}

function harness(
  events: readonly EventForClassification[],
  replies: (request: OpenCodeGoRequest) => OpenCodeGoResult,
  options: { saveOk?: boolean; pageText?: string } = {},
): Harness {
  const saved: Harness['saved'] = [];
  const requests: OpenCodeGoRequest[] = [];
  const invalidated: EventCacheTarget[][] = [];
  const pages: string[] = [];
  const deps: FactsClassifierDeps = {
    fetchBatch: async () => events,
    callModel: async (request) => {
      requests.push(request);
      return replies(request);
    },
    fetchPage: async (url) => {
      pages.push(url);
      return options.pageText ?? null;
    },
    saveDecision: async (row, decision) => {
      saved.push({ id: row.id, decision });
      return options.saveOk ?? true;
    },
    delay: async () => undefined,
    invalidate: async (targets) => {
      invalidated.push([...targets]);
    },
  };
  return { deps, saved, requests, invalidated, pages };
}

const ok = (text: string): OpenCodeGoResult => ({
  success: true,
  text,
  inputTokens: 1,
  outputTokens: 1,
});

describe('runFactsClassification', () => {
  it('saves confirmed, likely and no outcomes and counts them', async () => {
    const likelyReply = JSON.stringify({
      food_sellers: 'not_mentioned',
      food_evidence: null,
      setting: 'outdoor',
      event_kind: 'market',
      audience: 'general',
    });
    const events = [
      event({ id: 'trucks' }),
      event({ id: 'market', title: 'Saturday Market', description: 'Shop local.' }),
      event({ id: 'club', title: 'Club Night', description: 'DJ all night.' }),
    ];
    const replyFor: Record<string, string> = {
      'Fall Festival on Main': TRUCKS_REPLY,
      'Saturday Market': likelyReply,
      'Club Night': NIGHTLIFE_REPLY,
    };
    const h = harness(events, (request) => ok(replyFor[request.user.split('\n')[0]!.slice(7)]!));

    const result = await runFactsClassification(h.deps);

    expect(result).toMatchObject({
      total: 3,
      confirmed: 1,
      likely: 1,
      rejected: 1,
      errors: 0,
      modelFailures: 0,
      success: true,
    });
    const outcomes = Object.fromEntries(h.saved.map((s) => [s.id, s.decision.outcome]));
    expect(outcomes).toEqual({ trucks: 'confirmed', market: 'likely', club: 'no' });
  });

  it('retries unparsable replies and counts a model failure without saving', async () => {
    const h = harness([event()], () => ok('I am not sure.'));
    const result = await runFactsClassification(h.deps);
    expect(h.requests).toHaveLength(3);
    expect(h.saved).toHaveLength(0);
    expect(result).toMatchObject({ total: 1, modelFailures: 1, errors: 0, success: true });
  });

  it('recovers when a retry succeeds', async () => {
    let calls = 0;
    const h = harness([event()], () =>
      ++calls === 1
        ? { success: false, error: 'OpenCode Go HTTP 500: busy', status: 500 }
        : ok(TRUCKS_REPLY),
    );
    const result = await runFactsClassification(h.deps);
    expect(calls).toBe(2);
    expect(result.confirmed).toBe(1);
  });

  it('counts failed saves as errors', async () => {
    const h = harness([event()], () => ok(TRUCKS_REPLY), { saveOk: false });
    const result = await runFactsClassification(h.deps);
    expect(result).toMatchObject({ errors: 1, confirmed: 0, success: false });
  });

  it('invalidates the cache only when the shown state changes', async () => {
    const events = [
      event({ id: TURNS_ON, is_food_truck_relevant: false }),
      event({ id: STAYS_ON, is_food_truck_relevant: true }),
    ];
    const h = harness(events, () => ok(TRUCKS_REPLY));
    await runFactsClassification(h.deps);
    expect(h.invalidated.flat().map((target) => target.eventId)).toEqual([TURNS_ON]);
  });

  it('invalidates the cache when an event is turned off', async () => {
    const h = harness(
      [event({ id: TURNS_OFF, is_food_truck_relevant: true, title: 'Club Night' })],
      () => ok(NIGHTLIFE_REPLY),
    );
    await runFactsClassification(h.deps);
    expect(h.invalidated.flat().map((target) => target.eventId)).toEqual([TURNS_OFF]);
  });

  it('fetches the source page only when no description is stored', async () => {
    const withText = event({ id: 'has-text' });
    const bare = event({ id: 'bare', description: null, source_url: 'https://example.com/bare' });
    const h = harness([withText, bare], () => ok(NIGHTLIFE_REPLY), { pageText: 'Page body text' });
    await runFactsClassification(h.deps);
    expect(h.pages).toEqual(['https://example.com/bare']);
    expect(
      h.requests.some((request) => request.user.includes('Full description:\nPage body text')),
    ).toBe(true);
  });
});

describe('toListing', () => {
  it('uses Eventbrite metadata and the full description from raw data', () => {
    const listing = toListing(
      event({
        eventbrite: {
          category: 'Food & Drink',
          organizerName: 'Downtown Association',
          organizerTags: ['Festival', 3],
          fullDescription: 'Twelve food trucks on site.',
        },
      }),
      'ignored page text',
    );
    expect(listing).toMatchObject({
      organizer: 'Downtown Association',
      category: 'Food & Drink',
      organizerTags: ['Festival'],
      fullDescription: 'Twelve food trucks on site.',
    });
  });

  it('tolerates missing or malformed Eventbrite data', () => {
    expect(toListing(event({ eventbrite: 'oops' }), null)).toMatchObject({
      organizer: null,
      category: null,
      organizerTags: [],
      fullDescription: null,
    });
  });
});
