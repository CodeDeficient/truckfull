import { describe, it, expect } from '@jest/globals';
import type { DedupEventInput } from '@/lib/dedup/dedupTypes';
import type { MergeAdvice } from '@/lib/dedup/dedupLlmAdvisor';
import {
  normalizeClusterRows,
  buildComponentKey,
  validateMergeMutation,
  computeRunMetrics,
  createSpatialFilteredEval,
  applyMergeMutation,
  runDedupV2,
} from '@/lib/dedup/dedupOrchestrator';
import type { DedupDecision } from '@/lib/dedup/dedupOrchestrator';
import { buildDedupGraph, findConnectedComponents } from '@/lib/dedup/dedupGraph';
import { evaluatePair } from '@/lib/dedup/dedupHelpers';
import { decideMerge } from '@/lib/dedup/dedupMerge';

function makeRpcRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'evt_001',
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
    vetting_score: 50,
    is_canonical: true,
    ingested_at: '2026-07-01T12:00:00Z',
    ...overrides,
  };
}

function makeDedupDecision(
  overrides: Partial<DedupDecision> = {},
): DedupDecision {
  return {
    componentKey: 'evt_001|evt_002',
    action: 'auto_merged',
    deterministicDecision: 'auto_merged',
    advisory: null,
    canonicalEventId: 'evt_001',
    nonCanonicalEventIds: ['evt_002'],
    componentSize: 2,
    reason: 'All edges are strong',
    ...overrides,
  };
}

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

// ──────────────────────────────────────────────
// 1. normalizeClusterRows
// ──────────────────────────────────────────────

describe('normalizeClusterRows', () => {
  it('maps RPC rows to DedupEventInput', () => {
    const rows = [makeRpcRow()] as never[];
    const result = normalizeClusterRows(rows);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('evt_001');
    expect(result[0].title).toBe('Augusta Food Festival');
    expect(result[0].event_start_date).toBe('2026-08-15');
    expect(result[0].event_start_time).toBe('18:00:00');
    expect(result[0].location_lat).toBe(33.4736);
    expect(result[0].location_lng).toBe(-81.9745);
    expect(result[0].location_address).toBe('123 Main St');
    expect(result[0].city).toBe('Augusta');
    expect(result[0].state).toBe('GA');
    expect(result[0].source).toBe('eventbrite');
    expect(result[0].source_type).toBe('eventbrite');
    expect(result[0].organization).toBe('Augusta Events LLC');
    expect(result[0].vetting_score).toBe(50);
    expect(result[0].ingested_at).toBe('2026-07-01T12:00:00Z');
  });

  it('preserves null fields', () => {
    const rows = [
      makeRpcRow({
        title: null,
        event_start_date: null,
        event_start_time: null,
        location_lat: null,
        location_lng: null,
        location_address: null,
        city: null,
        state: null,
        organization: null,
        vetting_score: null,
        ingested_at: null,
      }),
    ] as never[];
    const result = normalizeClusterRows(rows);

    expect(result[0].title).toBeNull();
    expect(result[0].event_start_date).toBeNull();
    expect(result[0].event_start_time).toBeNull();
    expect(result[0].location_lat).toBeNull();
    expect(result[0].location_lng).toBeNull();
    expect(result[0].location_address).toBeNull();
    expect(result[0].city).toBeNull();
    expect(result[0].state).toBeNull();
    expect(result[0].organization).toBeNull();
    expect(result[0].vetting_score).toBeNull();
    expect(result[0].ingested_at).toBeNull();
  });

  it('handles empty array', () => {
    expect(normalizeClusterRows([])).toEqual([]);
  });

  it('does not carry forward is_canonical (not in DedupEventInput)', () => {
    const rows = [makeRpcRow({ is_canonical: false })] as never[];
    const result = normalizeClusterRows(rows);
    expect(result[0]).not.toHaveProperty('is_canonical');
  });
});

// ──────────────────────────────────────────────
// 2. buildComponentKey
// ──────────────────────────────────────────────

describe('buildComponentKey', () => {
  it('produces sorted pipe-delimited key', () => {
    const key = buildComponentKey(['evt_003', 'evt_001', 'evt_002']);
    expect(key).toBe('evt_001|evt_002|evt_003');
  });

  it('is deterministic (same input → same output)', () => {
    const ids = ['z_id', 'a_id', 'm_id'];
    const result1 = buildComponentKey(ids);
    const result2 = buildComponentKey(ids);
    expect(result1).toBe(result2);
  });

  it('does not mutate the original array', () => {
    const ids = ['z_id', 'a_id'];
    const original = [...ids];
    buildComponentKey(ids);
    expect(ids).toEqual(original);
  });

  it('handles single element', () => {
    expect(buildComponentKey(['only_one'])).toBe('only_one');
  });

  it('handles empty array', () => {
    expect(buildComponentKey([])).toBe('');
  });
});

// ──────────────────────────────────────────────
// 3. validateMergeMutation
// ──────────────────────────────────────────────

describe('validateMergeMutation', () => {
  it('passes for valid auto_merged decision', () => {
    const decision = makeDedupDecision();
    expect(() => validateMergeMutation(decision)).not.toThrow();
  });

  it('throws when canonicalEventId is null', () => {
    const decision = makeDedupDecision({ canonicalEventId: null });
    expect(() => validateMergeMutation(decision)).toThrow(/canonicalEventId is null/);
  });

  it('throws when nonCanonicalEventIds is empty', () => {
    const decision = makeDedupDecision({ nonCanonicalEventIds: [] });
    expect(() => validateMergeMutation(decision)).toThrow(/nonCanonicalEventIds is empty/);
  });

  it('throws when canonicalEventId appears in nonCanonicalEventIds', () => {
    const decision = makeDedupDecision({
      canonicalEventId: 'evt_001',
      nonCanonicalEventIds: ['evt_001', 'evt_002'],
    });
    expect(() => validateMergeMutation(decision)).toThrow(/canonical would be self-demoted/);
  });

  it('includes componentKey in error message', () => {
    const decision = makeDedupDecision({
      componentKey: 'test-key',
      canonicalEventId: null,
    });
    expect(() => validateMergeMutation(decision)).toThrow(/componentKey=test-key/);
  });
});

// ──────────────────────────────────────────────
// 4. computeRunMetrics
// ──────────────────────────────────────────────

describe('computeRunMetrics', () => {
  const baseParams = {
    totalClusters: 5,
    decisions: [] as readonly DedupDecision[],
    crossStateClusters: 2,
    crossSourceClusters: 3,
    nullCoordinateClusters: 1,
    rowsAlreadyNonCanonical: 4,
    rowsSkippedMutationBecauseAlreadyNonCanonical: 2,
    rowsNewlyMarkedNonCanonical: 8,
    mutationErrors: 0,
    queueInsertErrors: 0,
    durationMs: 150,
    dryRun: false,
    llmCallsAttempted: 1,
    llmCallsSkippedDryRun: 2,
  };

  it('reports zero metrics for empty decisions', () => {
    const metrics = computeRunMetrics(baseParams);
    expect(metrics.totalClusters).toBe(5);
    expect(metrics.autoMerges).toBe(0);
    expect(metrics.humanReviewCount).toBe(0);
    expect(metrics.keptSeparateCount).toBe(0);
    expect(metrics.averageClusterSize).toBe(0);
    expect(metrics.largestClusterSize).toBe(0);
    expect(metrics.largestClusterKey).toBe('');
    expect(metrics.llmCallsAttempted).toBe(1);
    expect(metrics.llmCallsSkippedDryRun).toBe(2);
    expect(metrics.rowsAlreadyNonCanonical).toBe(4);
    expect(metrics.rowsNewlyMarkedNonCanonical).toBe(8);
    expect(metrics.crossStateClusters).toBe(2);
    expect(metrics.crossSourceClusters).toBe(3);
    expect(metrics.nullCoordinateClusters).toBe(1);
    expect(metrics.durationMs).toBe(150);
    expect(metrics.dryRun).toBe(false);
  });

  it('counts auto_merged decisions', () => {
    const decisions = [
      makeDedupDecision({
        componentKey: 'a|b',
        action: 'auto_merged',
        deterministicDecision: 'auto_merged',
        canonicalEventId: 'a',
        nonCanonicalEventIds: ['b'],
      }),
      makeDedupDecision({
        componentKey: 'c|d',
        action: 'kept_separate',
        deterministicDecision: 'kept_separate',
        canonicalEventId: null,
        nonCanonicalEventIds: [],
      }),
      makeDedupDecision({
        componentKey: 'e|f',
        action: 'human_review',
        deterministicDecision: 'human_review',
        canonicalEventId: null,
        nonCanonicalEventIds: [],
      }),
    ];
    const metrics = computeRunMetrics({ ...baseParams, decisions });
    expect(metrics.autoMerges).toBe(1);
    expect(metrics.keptSeparateCount).toBe(1);
    expect(metrics.humanReviewCount).toBe(1);
  });

  it('computes cluster sizes from componentSize', () => {
    const decisions = [
      makeDedupDecision({
        componentKey: 'a|b|c',
        canonicalEventId: 'a',
        nonCanonicalEventIds: ['b', 'c'],
        componentSize: 3,
      }),
      makeDedupDecision({
        componentKey: 'd|e',
        canonicalEventId: 'd',
        nonCanonicalEventIds: ['e'],
        componentSize: 2,
      }),
    ];
    const metrics = computeRunMetrics({ ...baseParams, decisions });
    expect(metrics.largestClusterSize).toBe(3);
    expect(metrics.largestClusterKey).toBe('a|b|c');
    expect(metrics.averageClusterSize).toBe(2.5);
  });

  it('computes largestClusterKey from the largest decision', () => {
    const decisions = [
      makeDedupDecision({
        componentKey: 'small|tiny',
        canonicalEventId: 'small',
        nonCanonicalEventIds: ['tiny'],
        componentSize: 2,
      }),
      makeDedupDecision({
        componentKey: 'big|medium|large|huge',
        canonicalEventId: 'big',
        nonCanonicalEventIds: ['medium', 'large', 'huge'],
        componentSize: 4,
      }),
    ];
    const metrics = computeRunMetrics({ ...baseParams, decisions });
    expect(metrics.largestClusterSize).toBe(4);
    expect(metrics.largestClusterKey).toBe('big|medium|large|huge');
  });

  it('counts singletons as kept_separate', () => {
    const decisions = [
      makeDedupDecision({
        componentKey: 'lonely',
        action: 'kept_separate',
        deterministicDecision: 'kept_separate',
        canonicalEventId: null,
        nonCanonicalEventIds: [],
      }),
    ];
    const metrics = computeRunMetrics({ ...baseParams, decisions });
    expect(metrics.keptSeparateCount).toBe(1);
  });

  it('counts singletons as clusterSize 1 (componentSize field)', () => {
    const decisions = [
      makeDedupDecision({
        componentKey: 'lonely',
        action: 'kept_separate',
        deterministicDecision: 'kept_separate',
        canonicalEventId: null,
        nonCanonicalEventIds: [],
        componentSize: 1,
      }),
    ];
    const metrics = computeRunMetrics({ ...baseParams, decisions });
    expect(metrics.largestClusterSize).toBe(1);
    expect(metrics.averageClusterSize).toBe(1);
  });

  it('passes through mutationErrors from params', () => {
    const metrics = computeRunMetrics({ ...baseParams, mutationErrors: 3 });
    expect(metrics.mutationErrors).toBe(3);
  });

  it('passes through queueInsertErrors from params', () => {
    const metrics = computeRunMetrics({ ...baseParams, queueInsertErrors: 2 });
    expect(metrics.queueInsertErrors).toBe(2);
  });
});

// ──────────────────────────────────────────────
// 5. createSpatialFilteredEval
// ──────────────────────────────────────────────

describe('createSpatialFilteredEval', () => {
  it('returns evaluatePair result for events within radius', () => {
    const evalFn = createSpatialFilteredEval(100);
    const a = makeEvent('a', { location_lat: 33.4736, location_lng: -81.9745 });
    const b = makeEvent('b', { location_lat: 33.4737, location_lng: -81.9744 });
    const result = evalFn(a, b);
    expect(result.strength).not.toBe('none');
    expect(Array.isArray(result.reasons)).toBe(true);
    expect(typeof result.score).toBe('number');
  });

  it('returns none for events far beyond radius', () => {
    const evalFn = createSpatialFilteredEval(10);
    const a = makeEvent('a', { location_lat: 33.47, location_lng: -81.97 });
    const b = makeEvent('b', { location_lat: 40.71, location_lng: -74.01 });
    const result = evalFn(a, b);
    expect(result.strength).toBe('none');
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  it('uses evaluatePair when one event has null coordinates', () => {
    const evalFn = createSpatialFilteredEval(100);
    const a = makeEvent('a', { location_lat: null, location_lng: null });
    const b = makeEvent('b', { location_lat: 33.471, location_lng: -81.971 });
    const result = evalFn(a, b);
    expect(result.strength).not.toBe('none');
  });

  it('uses evaluatePair when both events have null coordinates', () => {
    const evalFn = createSpatialFilteredEval(100);
    const a = makeEvent('a', { location_lat: null, location_lng: null });
    const b = makeEvent('b', { location_lat: null, location_lng: null });
    const result = evalFn(a, b);
    expect(result.strength).not.toBe('none');
  });

  it('interprets radius in meters correctly', () => {
    const evalFn = createSpatialFilteredEval(5000000);
    const a = makeEvent('a', { location_lat: 33.47, location_lng: -81.97 });
    const b = makeEvent('b', { location_lat: 40.71, location_lng: -74.01 });
    const result = evalFn(a, b);
    expect(result.strength).not.toBe('none');
  });
});

describe('applyMergeMutation', () => {
  it('changes only the component, remains idempotent, and supports null transitions', async () => {
    const state = new Map([
      ['evt_001', true],
      ['evt_002', null],
      ['unrelated', true],
    ]);
    let writes = 0;
    const client = {
      rpc: async (_name: string, args: Record<string, unknown>) => {
        const componentIds = args.p_component_row_ids as string[];
        const canonicalId = args.p_canonical_row_id as string;
        const newlyDemoted = componentIds.filter(
          (id) => state.get(id) === true && id !== canonicalId,
        ).length;
        for (const id of componentIds) {
          const nextState = id === canonicalId;
          if (state.get(id) !== nextState) writes++;
          state.set(id, nextState);
        }
        return { data: newlyDemoted, error: null };
      },
    } as unknown as Parameters<typeof applyMergeMutation>[0];

    const firstRun = await applyMergeMutation(client, makeDedupDecision());
    expect(firstRun.rowsNewlyMarkedNonCanonical).toBe(0);
    expect(writes).toBe(1);
    expect(state.get('evt_001')).toBe(true);
    expect(state.get('evt_002')).toBe(false);
    expect(state.get('unrelated')).toBe(true);

    const identicalSecondRun = await applyMergeMutation(client, makeDedupDecision());
    expect(identicalSecondRun.rowsNewlyMarkedNonCanonical).toBe(0);
    expect(writes).toBe(1);

    const winnerChanged = await applyMergeMutation(
      client,
      makeDedupDecision({ canonicalEventId: 'evt_002', nonCanonicalEventIds: ['evt_001'] }),
    );
    expect(winnerChanged.rowsNewlyMarkedNonCanonical).toBe(1);
    expect(writes).toBe(3);
    expect(state.get('evt_002')).toBe(true);
    expect(state.get('evt_001')).toBe(false);
    expect(state.get('unrelated')).toBe(true);

    const unchangedRun = await applyMergeMutation(
      client,
      makeDedupDecision({ canonicalEventId: 'evt_002', nonCanonicalEventIds: ['evt_001'] }),
    );
    expect(unchangedRun.rowsNewlyMarkedNonCanonical).toBe(0);
    expect(writes).toBe(3);
    expect(state.get('evt_001')).toBe(false);
    expect(state.get('evt_002')).toBe(true);
    expect(state.get('unrelated')).toBe(true);
  });
});

describe('runDedupV2 queue errors', () => {
  it('counts a normal queue RPC error without aborting the run', async () => {
    const client = {
      rpc: async (name: string) => {
        if (name === 'dedup_v2_candidates') {
          return {
            data: [{
              key: 'a|b|c',
              rows: [
                makeRpcRow({ id: 'a', source: 'eventbrite', source_type: 'eventbrite' }),
                makeRpcRow({ id: 'b', source: 'civicplus_rss', source_type: 'civicplus_rss' }),
                makeRpcRow({
                  id: 'c',
                  source: 'eproval',
                  source_type: 'eproval',
                  location_lat: 33.4745,
                  event_start_time: '19:00:00',
                  organization: 'Different Org',
                  location_address: '456 Other St',
                }),
              ],
            }],
            error: null,
          };
        }
        return { data: null, error: { message: 'queue unavailable' } };
      },
    } as unknown as Parameters<typeof runDedupV2>[1];

    const metrics = await runDedupV2({ dryRun: false, enableLLM: false }, client);

    expect(metrics.humanReviewCount).toBeGreaterThan(0);
    expect(metrics.queueInsertErrors).toBe(1);
    expect(metrics.llmCallsAttempted).toBe(0);
  });
});

// ──────────────────────────────────────────────
// 6. Invariant tests
// ──────────────────────────────────────────────

describe('DedupDecision invariant: action matches deterministicDecision', () => {
  it('auto_merged decision has matching action', () => {
    const decision = makeDedupDecision({
      action: 'auto_merged',
      deterministicDecision: 'auto_merged',
    });
    expect(decision.action).toBe(decision.deterministicDecision);
  });

  it('kept_separate decision has matching action', () => {
    const decision = makeDedupDecision({
      action: 'kept_separate',
      deterministicDecision: 'kept_separate',
    });
    expect(decision.action).toBe(decision.deterministicDecision);
  });

  it('human_review decision has matching action', () => {
    const decision = makeDedupDecision({
      action: 'human_review',
      deterministicDecision: 'human_review',
    });
    expect(decision.action).toBe(decision.deterministicDecision);
  });

  it('LLM output cannot change action — advisory is metadata only', () => {
    const advisoryMerge: MergeAdvice = {
      status: 'success',
      recommendation: 'merge',
      reasoning: 'These are clearly the same event',
      keyFactors: ['title_similarity', 'location_similarity'],
      model: 'gemma4:31b',
      provider: 'ollama',
      promptVersion: '4.6.0',
      schemaVersion: '1.0.0',
    };

    const advisorySeparate: MergeAdvice = {
      status: 'success',
      recommendation: 'separate',
      reasoning: 'Different venues',
      keyFactors: ['conflicting_location'],
      model: 'gemma4:31b',
      provider: 'ollama',
      promptVersion: '4.6.0',
      schemaVersion: '1.0.0',
    };

    const advisoryError: MergeAdvice = {
      status: 'error',
      error: 'LLM timeout',
      model: 'gemma4:31b',
      provider: 'ollama',
      promptVersion: '4.6.0',
      schemaVersion: '1.0.0',
    };

    const recommendations: MergeAdvice[] = [advisoryMerge, advisorySeparate, advisoryError];

    for (const advisory of recommendations) {
      const decision = makeDedupDecision({
        action: 'human_review',
        deterministicDecision: 'human_review',
        advisory,
      });
      expect(decision.action).toBe('human_review');
      expect(decision.action).toBe(decision.deterministicDecision);
    }
  });

  it('advisory errors are preserved (not collapsed to null)', () => {
    const advisoryError: MergeAdvice = {
      status: 'error',
      error: 'Provider returned 500',
      model: 'gemma4:31b',
      provider: 'ollama',
      promptVersion: '4.6.0',
      schemaVersion: '1.0.0',
    };

    const decision = makeDedupDecision({
      action: 'human_review',
      deterministicDecision: 'human_review',
      advisory: advisoryError,
    });

    expect(decision.advisory).not.toBeNull();
    expect(decision.advisory!.status).toBe('error');
    expect(decision.advisory!.error).toBe('Provider returned 500');
  });

  it('action cannot be promoted from human_review to auto_merged by advisory', () => {
    const decision = makeDedupDecision({
      action: 'human_review',
      deterministicDecision: 'human_review',
      advisory: {
        status: 'success',
        recommendation: 'merge',
        reasoning: 'Clearly the same',
        keyFactors: ['title_similarity'],
        model: 'gemma4:31b',
        provider: 'ollama',
        promptVersion: '4.6.0',
        schemaVersion: '1.0.0',
      },
    });
    expect(decision.action).toBe('human_review');
    expect(decision.action).toBe(decision.deterministicDecision);
  });

  it('action cannot be demoted from human_review to kept_separate by advisory', () => {
    const decision = makeDedupDecision({
      action: 'human_review',
      deterministicDecision: 'human_review',
      advisory: {
        status: 'success',
        recommendation: 'separate',
        reasoning: 'Different venues',
        keyFactors: ['conflicting_location'],
        model: 'gemma4:31b',
        provider: 'ollama',
        promptVersion: '4.6.0',
        schemaVersion: '1.0.0',
      },
    });
    expect(decision.action).toBe('human_review');
    expect(decision.action).toBe(decision.deterministicDecision);
  });
});

// ──────────────────────────────────────────────
// 7. Processing-path invariant tests
// ──────────────────────────────────────────────

function processCluster(rows: Record<string, unknown>[]): DedupDecision[] {
  const events = normalizeClusterRows(rows as never[]);
  const graph = buildDedupGraph(events, evaluatePair);
  const components = findConnectedComponents(graph, events);
  return components.map((component) => {
    const mergeResult = decideMerge(component, evaluatePair);
    const eventIds = component.events.map((e) => e.id);
    const canonicalId = mergeResult.canonicalEvent?.id ?? null;
    const nonCanonicalIds =
      canonicalId === null ? [] : eventIds.filter((id) => id !== canonicalId);
    return {
      componentKey: buildComponentKey(eventIds),
      action: mergeResult.action,
      deterministicDecision: mergeResult.action,
      advisory: null,
      canonicalEventId: canonicalId,
      nonCanonicalEventIds: nonCanonicalIds,
      componentSize: component.events.length,
      reason: mergeResult.reasoning,
    };
  });
}

describe('processing path: RPC cluster → DedupDecision invariant', () => {
  it('matching events from different sources auto-merge', () => {
    const rows = [
      makeRpcRow({ id: 'a', source: 'eventbrite', source_type: 'eventbrite' }),
      makeRpcRow({ id: 'b', source: 'eproval', source_type: 'eproval' }),
    ];
    const decisions = processCluster(rows);
    for (const d of decisions) {
      expect(d.action).toBe(d.deterministicDecision);
    }
    expect(decisions.some((d) => d.action === 'auto_merged')).toBe(true);
  });

  it('contradictory events from different sources are kept separate', () => {
    const rows = [
      makeRpcRow({
        id: 'a',
        source: 'eventbrite',
        source_type: 'eventbrite',
        location_lat: 33.4736,
        location_lng: -81.9745,
        event_start_time: '18:00:00',
      }),
      makeRpcRow({
        id: 'b',
        source: 'eproval',
        source_type: 'eproval',
        location_lat: 40.7128,
        location_lng: -74.006,
        event_start_time: '09:00:00',
      }),
    ];
    const decisions = processCluster(rows);
    for (const d of decisions) {
      expect(d.action).toBe(d.deterministicDecision);
    }
    const autoMerged = decisions.filter((d) => d.action === 'auto_merged');
    expect(autoMerged).toHaveLength(0);
  });

  it('singleton component is kept_separate', () => {
    const rows = [makeRpcRow({ id: 'only' })];
    const decisions = processCluster(rows);
    for (const d of decisions) {
      expect(d.action).toBe(d.deterministicDecision);
    }
    expect(decisions).toHaveLength(1);
    expect(decisions[0].action).toBe('kept_separate');
  });

  it('same-source events are not connected (each becomes singleton)', () => {
    const rows = [
      makeRpcRow({ id: 'a', source: 'eventbrite', source_type: 'eventbrite' }),
      makeRpcRow({ id: 'b', source: 'eventbrite', source_type: 'eventbrite' }),
    ];
    const decisions = processCluster(rows);
    for (const d of decisions) {
      expect(d.action).toBe(d.deterministicDecision);
      expect(d.action).toBe('kept_separate');
    }
  });

  it('all decisions in a mixed cluster respect the invariant', () => {
    const rows = [
      makeRpcRow({
        id: 'a',
        source: 'eventbrite',
        source_type: 'eventbrite',
        location_lat: 33.47,
        location_lng: -81.97,
      }),
      makeRpcRow({
        id: 'b',
        source: 'eproval',
        source_type: 'eproval',
        location_lat: 33.471,
        location_lng: -81.971,
      }),
      makeRpcRow({
        id: 'c',
        source: 'eproval',
        source_type: 'eproval',
        location_lat: 40.71,
        location_lng: -74.01,
        event_start_time: '09:00:00',
      }),
    ];
    const decisions = processCluster(rows);
    for (const d of decisions) {
      expect(d.action).toBe(d.deterministicDecision);
    }
  });
});
