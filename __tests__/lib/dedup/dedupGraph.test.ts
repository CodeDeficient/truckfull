import { describe, it, expect } from '@jest/globals';
import { buildDedupGraph, findConnectedComponents } from '@/lib/dedup/dedupGraph';
import type { DedupEventInput, PairEvaluation, ConnectedComponent } from '@/lib/dedup/dedupTypes';
import { DIAGNOSTIC_CLUSTER_SIZE_FLAG } from '@/lib/dedup/dedupConstants';

function makeEvent(id: string, overrides: Partial<DedupEventInput> = {}): DedupEventInput {
  return {
    id,
    title: 'Event',
    event_start_date: '2026-08-15',
    event_start_time: '18:00:00',
    location_lat: 33.47,
    location_lng: -81.97,
    location_address: '123 Main St',
    city: 'Augusta',
    state: 'GA',
    source: 'eventbrite',
    source_type: 'eventbrite',
    organization: 'Org',
    vetting_score: null,
    ingested_at: null,
    ...overrides,
  };
}

function makeStubEvaluator(
  overrides: Record<string, PairEvaluation>,
): (a: DedupEventInput, b: DedupEventInput) => PairEvaluation {
  return (a, b) => {
    const key = [a.id, b.id].sort().join('-');
    return overrides[key] ?? { strength: 'none', reasons: [], score: 0 };
  };
}

function componentByIds(components: readonly ConnectedComponent[]): string[][] {
  return components.map((c) => [...c.events].map((e) => e.id).sort());
}

describe('buildDedupGraph', () => {
  it('creates edges for strong evaluations', () => {
    const events = [makeEvent('A'), makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' })];
    const evaluate = makeStubEvaluator({ 'A-B': { strength: 'strong', reasons: ['title_high_similarity'], score: 100 } });

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.get('A')).toHaveLength(1);
    expect(graph.adjacency.get('B')).toHaveLength(1);
  });

  it('creates edges for moderate evaluations', () => {
    const events = [makeEvent('A'), makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' })];
    const evaluate = makeStubEvaluator({ 'A-B': { strength: 'moderate', reasons: ['title_moderate_similarity'], score: 60 } });

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.get('A')).toHaveLength(1);
    expect(graph.adjacency.get('B')).toHaveLength(1);
  });

  it('does not create edges for weak evaluations', () => {
    const events = [makeEvent('A'), makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' })];
    const evaluate = makeStubEvaluator({ 'A-B': { strength: 'weak', reasons: ['title_moderate_similarity'], score: 30 } });

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.get('A')).toHaveLength(0);
    expect(graph.adjacency.get('B')).toHaveLength(0);
  });

  it('does not create edges for none evaluations', () => {
    const events = [makeEvent('A'), makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' })];
    const evaluate = makeStubEvaluator({ 'A-B': { strength: 'none', reasons: [], score: 0 } });

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.get('A')).toHaveLength(0);
    expect(graph.adjacency.get('B')).toHaveLength(0);
  });

  it('does not create edges for against evaluations', () => {
    const events = [makeEvent('A'), makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' })];
    const evaluate = makeStubEvaluator({ 'A-B': { strength: 'against', reasons: ['coordinate_contradiction'], score: 0 } });

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.get('A')).toHaveLength(0);
    expect(graph.adjacency.get('B')).toHaveLength(0);
  });

  it('does not create edges for same-source pairs regardless of evaluation', () => {
    const events = [makeEvent('A'), makeEvent('B', { source: 'eventbrite' })];
    const evaluate = makeStubEvaluator({ 'A-B': { strength: 'strong', reasons: ['title_high_similarity'], score: 100 } });

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.get('A')).toHaveLength(0);
    expect(graph.adjacency.get('B')).toHaveLength(0);
  });

  it('returns empty adjacency for single event', () => {
    const events = [makeEvent('A')];
    const evaluate = makeStubEvaluator({});

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.get('A')).toHaveLength(0);
    expect(graph.eventIds).toEqual(['A']);
  });

  it('returns empty adjacency for empty input', () => {
    const events: DedupEventInput[] = [];
    const evaluate = makeStubEvaluator({});

    const graph = buildDedupGraph(events, evaluate);

    expect(graph.adjacency.size).toBe(0);
    expect(graph.eventIds).toEqual([]);
  });
});

describe('findConnectedComponents', () => {
  it('strong chain A-B-C produces one component', () => {
    const events = [
      makeEvent('A'),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
      makeEvent('C', { source: 'eproval', source_type: 'eproval' }),
    ];
    const evaluate = makeStubEvaluator({
      'A-B': { strength: 'strong', reasons: ['title_high_similarity'], score: 100 },
      'B-C': { strength: 'strong', reasons: ['title_high_similarity'], score: 100 },
    });

    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(1);
    expect(componentByIds(components)).toEqual([['A', 'B', 'C']]);
  });

  it('moderate chain A-B-C produces one component', () => {
    const events = [
      makeEvent('A'),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
      makeEvent('C', { source: 'eproval', source_type: 'eproval' }),
    ];
    const evaluate = makeStubEvaluator({
      'A-B': { strength: 'moderate', reasons: ['title_moderate_similarity'], score: 60 },
      'B-C': { strength: 'moderate', reasons: ['title_moderate_similarity'], score: 60 },
    });

    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(1);
    expect(componentByIds(components)).toEqual([['A', 'B', 'C']]);
  });

  it('weak-only chain A-B-C produces three components', () => {
    const events = [
      makeEvent('A'),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
      makeEvent('C', { source: 'eproval', source_type: 'eproval' }),
    ];
    const evaluate = makeStubEvaluator({
      'A-B': { strength: 'weak', reasons: ['title_moderate_similarity'], score: 30 },
      'B-C': { strength: 'weak', reasons: ['title_moderate_similarity'], score: 30 },
    });

    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(3);
  });

  it('mixed chain strong+moderate produces one component', () => {
    const events = [
      makeEvent('A'),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
      makeEvent('C', { source: 'eproval', source_type: 'eproval' }),
    ];
    const evaluate = makeStubEvaluator({
      'A-B': { strength: 'strong', reasons: ['title_high_similarity'], score: 100 },
      'B-C': { strength: 'moderate', reasons: ['title_moderate_similarity'], score: 60 },
    });

    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(1);
    expect(componentByIds(components)).toEqual([['A', 'B', 'C']]);
  });

  it('two clusters with weak bridge produce two components', () => {
    const events = [
      makeEvent('A'),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
      makeEvent('C', { source: 'eproval', source_type: 'eproval' }),
      makeEvent('D', { source: 'simpleview_rss', source_type: 'simpleview_rss' }),
    ];
    const evaluate = makeStubEvaluator({
      'A-B': { strength: 'strong', reasons: ['title_high_similarity'], score: 100 },
      'C-D': { strength: 'strong', reasons: ['title_high_similarity'], score: 100 },
      'B-C': { strength: 'weak', reasons: ['title_moderate_similarity'], score: 30 },
    });

    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(2);
    expect(componentByIds(components)).toContainEqual(['A', 'B']);
    expect(componentByIds(components)).toContainEqual(['C', 'D']);
  });

  it('single event produces one component with no edges', () => {
    const events = [makeEvent('A')];
    const evaluate = makeStubEvaluator({});

    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(1);
    expect(componentByIds(components)).toEqual([['A']]);
    expect(components[0].edges).toHaveLength(0);
  });

  it('empty input produces zero components', () => {
    const events: DedupEventInput[] = [];
    const evaluate = makeStubEvaluator({});

    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(0);
  });

  it('component exceeding DIAGNOSTIC_CLUSTER_SIZE_FLAG is flagged', () => {
    const events: DedupEventInput[] = [];
    for (let i = 0; i < DIAGNOSTIC_CLUSTER_SIZE_FLAG + 1; i++) {
      events.push(makeEvent(`evt-${i}`, { source: `source-${i}`, source_type: 'eventbrite' }));
    }

    const overrides: Record<string, PairEvaluation> = {};
    for (let i = 0; i < events.length - 1; i++) {
      const key = [events[i].id, events[i + 1].id].sort().join('-');
      overrides[key] = { strength: 'strong', reasons: ['title_high_similarity'], score: 100 };
    }

    const evaluate = makeStubEvaluator(overrides);
    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(1);
    expect(components[0].flagged).toBe(true);
  });

  it('component within DIAGNOSTIC_CLUSTER_SIZE_FLAG is not flagged', () => {
    const events: DedupEventInput[] = [];
    for (let i = 0; i < DIAGNOSTIC_CLUSTER_SIZE_FLAG - 1; i++) {
      events.push(makeEvent(`evt-${i}`, { source: `source-${i}`, source_type: 'eventbrite' }));
    }

    const overrides: Record<string, PairEvaluation> = {};
    for (let i = 0; i < events.length - 1; i++) {
      const key = [events[i].id, events[i + 1].id].sort().join('-');
      overrides[key] = { strength: 'strong', reasons: ['title_high_similarity'], score: 100 };
    }

    const evaluate = makeStubEvaluator(overrides);
    const graph = buildDedupGraph(events, evaluate);
    const components = findConnectedComponents(graph, events);

    expect(components).toHaveLength(1);
    expect(components[0].flagged).toBe(false);
  });
});
