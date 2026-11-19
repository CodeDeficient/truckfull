import { describe, it, expect } from '@jest/globals';
import type { ConnectedComponent, DedupEventInput, GraphEdge } from '@/lib/dedup/dedupTypes';
import {
  buildMergeAdvicePrompt,
  parseMergeAdvice,
  errorAdvice,
  ADVISORY_MODEL,
  PROMPT_VERSION,
  SCHEMA_VERSION,
  ADVISORY_KEY_FACTORS,
} from '@/lib/dedup/dedupLlmAdvisor';

function makeEvent(id: string, overrides: Partial<DedupEventInput> = {}): DedupEventInput {
  return {
    id,
    title: 'Augusta Food Festival',
    event_start_date: '2026-08-15',
    event_start_time: '18:00:00',
    location_lat: 33.4736,
    location_lng: -81.9745,
    location_address: '123 Main St',
    city: 'Augusta',
    state: 'GA',
    source: 'eventbrite',
    source_type: 'eventbrite',
    organization: 'Augusta Events LLC',
    vetting_score: null,
    ingested_at: null,
    ...overrides,
  };
}

const SAMPLE_STATIC_EVENTS: readonly DedupEventInput[] = [
  makeEvent('evt_001'),
  makeEvent('evt_002', {
    title: 'Augusta Food Fest',
    source: 'eproval',
    source_type: 'eproval',
    organization: null,
  }),
];

function makeComponent(events: DedupEventInput[], edges: GraphEdge[] = []): ConnectedComponent {
  return { events, edges, flagged: false };
}

const TEST_MODEL = ADVISORY_MODEL;
const TEST_PROVIDER = 'ollama';

// ──────────────────────────────────────────────
// 1. Prompt construction tests (pure, no mocks)
// ──────────────────────────────────────────────

describe('buildMergeAdvicePrompt', () => {
  it('returns system and user messages', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
  });

  it('system message includes insufficient-evidence instruction', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);

    expect(messages[0].content).toMatch(/insufficient/i);
    expect(messages[0].content).toMatch(/unsure/i);
  });

  it('system message includes keyFactors enum values', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);

    const factorValues = Object.values(ADVISORY_KEY_FACTORS);
    for (const factor of factorValues) {
      expect(messages[0].content).toContain(factor);
    }
  });

  it('user message content is valid JSON', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);

    expect(() => JSON.parse(messages[1].content)).not.toThrow();
  });

  it('parsed JSON contains promptVersion', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    expect(parsed.promptVersion).toBe(PROMPT_VERSION);
  });

  it('parsed JSON contains events array with all events', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    expect(parsed.events).toHaveLength(SAMPLE_STATIC_EVENTS.length);
  });

  it('each event has id field', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    for (const event of parsed.events) {
      expect(event).toHaveProperty('id');
      expect(typeof event.id).toBe('string');
    }
  });

  it('each event has raw fields (title, date, time, organizer, address, coordinates, city, state, source)', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    for (const event of parsed.events) {
      expect(event).toHaveProperty('title');
      expect(event).toHaveProperty('date');
      expect(event).toHaveProperty('time');
      expect(event).toHaveProperty('organizer');
      expect(event).toHaveProperty('address');
      expect(event).toHaveProperty('coordinates');
      expect(event).toHaveProperty('city');
      expect(event).toHaveProperty('state');
      expect(event).toHaveProperty('source');
    }
  });

  it('null fields are preserved as null in the JSON', () => {
    const events = [
      makeEvent('evt_null', {
        title: null,
        event_start_date: null,
        event_start_time: null,
        location_lat: null,
        location_lng: null,
        location_address: null,
        city: null,
        state: null,
        organization: null,
      }),
    ];
    const component = makeComponent(events);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    const event = parsed.events[0];
    expect(event.title).toBeNull();
    expect(event.date).toBeNull();
    expect(event.time).toBeNull();
    expect(event.organizer).toBeNull();
    expect(event.address).toBeNull();
    expect(event.coordinates).toBeNull();
    expect(event.city).toBeNull();
    expect(event.state).toBeNull();
  });

  it('coordinates are serialized as object when present', () => {
    const events = [
      makeEvent('evt_coords', {
        location_lat: 33.4736,
        location_lng: -81.9745,
      }),
    ];
    const component = makeComponent(events);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    expect(parsed.events[0].coordinates).toEqual({
      lat: 33.4736,
      lng: -81.9745,
    });
  });

  it('events are sorted by date, time, title, source, id', () => {
    const events = [
      makeEvent('C', { event_start_date: '2026-08-16', title: 'Zoo Event', source: 'eventbrite' }),
      makeEvent('A', { event_start_date: '2026-08-15', title: 'Art Show', source: 'eproval' }),
      makeEvent('B', { event_start_date: '2026-08-15', title: 'Art Show', source: 'eventbrite' }),
    ];
    const component = makeComponent(events);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    expect(parsed.events[0].id).toBe('A');
    expect(parsed.events[1].id).toBe('B');
    expect(parsed.events[2].id).toBe('C');
  });

  it('does not contain edge objects from component.edges', () => {
    const events = [...SAMPLE_STATIC_EVENTS];
    const edges: GraphEdge[] = [
      {
        from: 'evt_001',
        to: 'evt_002',
        strength: 'strong',
        reasons: ['coordinate_same_venue', 'title_high_similarity'],
        score: 100,
      },
    ];
    const component = makeComponent(events, edges);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);

    const jsonStr = JSON.stringify(parsed);
    expect(jsonStr).not.toMatch(/"from":\s*"/);
    expect(jsonStr).not.toMatch(/"to":\s*"/);
    expect(jsonStr).not.toContain('strong');
    expect(jsonStr).not.toContain('moderate');
    expect(jsonStr).not.toContain('weak');
    expect(jsonStr).not.toContain('coordinate_same_venue');
    expect(jsonStr).not.toContain('title_high_similarity');
    expect(jsonStr).not.toContain('"score"');
  });

  it('does not contain edge strength labels', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);
    const jsonStr = JSON.stringify(parsed);

    const strengths = ['strong', 'moderate', 'weak', 'none', 'against'];
    for (const strength of strengths) {
      expect(jsonStr).not.toMatch(
        new RegExp(`\\b${strength}\\b`, 'i'),
      );
    }
  });

  it('does not contain pair reason strings', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);
    const jsonStr = JSON.stringify(parsed);

    const pairReasons = [
      'coordinate_same_venue',
      'coordinate_nearby',
      'coordinate_too_far',
      'coordinate_contradiction',
      'time_close',
      'time_possible',
      'time_too_far',
      'time_contradiction',
      'title_high_similarity',
      'title_moderate_similarity',
      'organizer_match',
      'organizer_both_null',
      'address_match',
      'address_both_null',
    ];
    for (const reason of pairReasons) {
      expect(jsonStr).not.toContain(reason);
    }
  });

  it('does not contain numeric deterministic scores', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const messages = buildMergeAdvicePrompt(component);
    const parsed = JSON.parse(messages[1].content);
    const jsonStr = JSON.stringify(parsed);

    expect(jsonStr).not.toContain('"score"');
    expect(jsonStr).not.toContain('"vetting_score"');
  });

  it('deterministic: same component produces identical prompt', () => {
    const component = makeComponent([...SAMPLE_STATIC_EVENTS]);
    const first = buildMergeAdvicePrompt(component);
    const second = buildMergeAdvicePrompt(component);

    expect(first).toEqual(second);
  });

  it('different events produce different prompts', () => {
    const componentA = makeComponent([makeEvent('X')]);
    const componentB = makeComponent([makeEvent('Y')]);

    const promptA = buildMergeAdvicePrompt(componentA);
    const promptB = buildMergeAdvicePrompt(componentB);

    expect(promptA[1].content).not.toBe(promptB[1].content);
  });
});

// ──────────────────────────────────────────────
// 2. Response parsing tests (pure function, no mocks)
// ──────────────────────────────────────────────

describe('parseMergeAdvice', () => {
  it('returns success with merge for valid merge response', () => {
    const raw = '{"recommendation":"merge","reasoning":"Same event details match","keyFactors":["title_similarity","location_similarity"]}';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendation).toBe('merge');
      expect(result.reasoning).toBe('Same event details match');
      expect(result.keyFactors).toContain('title_similarity');
      expect(result.keyFactors).toContain('location_similarity');
    }
  });

  it('returns success with separate for valid separate response', () => {
    const raw = '{"recommendation":"separate","reasoning":"Different venues and times","keyFactors":["conflicting_location","conflicting_time"]}';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendation).toBe('separate');
    }
  });

  it('returns success with unsure for valid unsure response', () => {
    const raw = '{"recommendation":"unsure","reasoning":"Not enough data to determine","keyFactors":["insufficient_information"]}';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendation).toBe('unsure');
    }
  });

  it('returns error for malformed JSON', () => {
    const raw = 'not even close to json';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('error');
  });

  it('returns error for invalid recommendation value', () => {
    const raw = '{"recommendation":"maybe","reasoning":"test","keyFactors":[]}';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('error');
  });

  it('returns error for missing reasoning', () => {
    const raw = '{"recommendation":"merge","keyFactors":[]}';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('error');
  });

  it('returns error for hallucinated keyFactor', () => {
    const raw = '{"recommendation":"merge","reasoning":"test","keyFactors":["my_custom_factor"]}';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('error');
  });

  it('handles markdown-fenced JSON', () => {
    const raw = '```json\n{"recommendation":"merge","reasoning":"Matches","keyFactors":["title_similarity"]}\n```';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendation).toBe('merge');
    }
  });

  it('handles JSON fenced without language tag', () => {
    const raw = '```\n{"recommendation":"separate","reasoning":"No match","keyFactors":["conflicting_location"]}\n```';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendation).toBe('separate');
    }
  });

  it('handles multiple valid keyFactors', () => {
    const raw = '{"recommendation":"separate","reasoning":"Multiple discrepancies","keyFactors":["conflicting_location","conflicting_time","cross_state_listing"]}';
    const result = parseMergeAdvice(raw, TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.keyFactors).toHaveLength(3);
    }
  });
});

// ──────────────────────────────────────────────
// 3. Verdict distinguishability tests
// ──────────────────────────────────────────────

describe('MergeAdvice — verdict distinguishability', () => {
  it('error is distinguishable from success with separate', () => {
    const errorResult = errorAdvice('LLM failed', TEST_MODEL, TEST_PROVIDER);
    const successResult = parseMergeAdvice(
      '{"recommendation":"separate","reasoning":"No match","keyFactors":["conflicting_location"]}',
      TEST_MODEL,
      TEST_PROVIDER,
    );

    expect(errorResult.status).toBe('error');
    expect(successResult.status).toBe('success');
    expect(errorResult.status).not.toBe(successResult.status);
  });

  it('error does not have recommendation field', () => {
    const result = errorAdvice('failed', TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect('recommendation' in result).toBe(false);
    }
  });

  it('success has recommendation field', () => {
    const result = parseMergeAdvice(
      '{"recommendation":"merge","reasoning":"test","keyFactors":["title_similarity"]}',
      TEST_MODEL,
      TEST_PROVIDER,
    );

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.recommendation).toBe('merge');
    }
  });
});

// ──────────────────────────────────────────────
// 4. Metadata tests
// ──────────────────────────────────────────────

describe('MergeAdvice — metadata', () => {
  it('success result includes model, provider, promptVersion, schemaVersion', () => {
    const result = parseMergeAdvice(
      '{"recommendation":"merge","reasoning":"test","keyFactors":["title_similarity"]}',
      TEST_MODEL,
      TEST_PROVIDER,
    );

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.model).toBe(ADVISORY_MODEL);
      expect(result.provider).toBe(TEST_PROVIDER);
      expect(result.promptVersion).toBe(PROMPT_VERSION);
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
    }
  });

  it('model is non-empty and matches ADVISORY_MODEL', () => {
    const result = parseMergeAdvice(
      '{"recommendation":"separate","reasoning":"test","keyFactors":["missing_data"]}',
      ADVISORY_MODEL,
      'openrouter',
    );

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.model).toBeTruthy();
      expect(result.model).toBe(ADVISORY_MODEL);
    }
  });

  it('provider is passed through from arguments', () => {
    const result = parseMergeAdvice(
      '{"recommendation":"merge","reasoning":"test","keyFactors":["time_similarity"]}',
      TEST_MODEL,
      'openrouter',
    );

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.provider).toBe('openrouter');
    }
  });

  it('error result includes model, provider, promptVersion, schemaVersion', () => {
    const result = errorAdvice('Network error', TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.model).toBe(ADVISORY_MODEL);
      expect(result.provider).toBe(TEST_PROVIDER);
      expect(result.promptVersion).toBe(PROMPT_VERSION);
      expect(result.schemaVersion).toBe(SCHEMA_VERSION);
    }
  });

  it('error result includes error message', () => {
    const result = errorAdvice('Rate limited', TEST_MODEL, TEST_PROVIDER);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toContain('Rate limited');
    }
  });
});
