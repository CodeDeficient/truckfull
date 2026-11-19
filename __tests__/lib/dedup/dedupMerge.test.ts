import { describe, it, expect } from '@jest/globals';
import { decideMerge, pickCanonical } from '@/lib/dedup/dedupMerge';
import type { DedupEventInput, PairEvaluation, ConnectedComponent, GraphEdge } from '@/lib/dedup/dedupTypes';

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

function makeEdge(from: string, to: string, strength: 'strong' | 'moderate'): GraphEdge {
  return { from, to, strength, reasons: [], score: strength === 'strong' ? 100 : 60 };
}

function makeComponent(
  events: DedupEventInput[],
  edges: GraphEdge[],
): ConnectedComponent {
  return { events, edges, flagged: false };
}

function stubEvaluate(strength: 'strong' | 'moderate' | 'against' | 'none'): (a: DedupEventInput, b: DedupEventInput) => PairEvaluation {
  return () => ({ strength, reasons: [], score: strength === 'strong' ? 100 : strength === 'moderate' ? 60 : 0 });
}

function stubEvaluatePairs(
  pairs: Record<string, 'strong' | 'moderate' | 'against' | 'none'>,
): (a: DedupEventInput, b: DedupEventInput) => PairEvaluation {
  return (a, b) => {
    const key = [a.id, b.id].sort().join('-');
    const strength = pairs[key] ?? 'none';
    return { strength, reasons: [], score: strength === 'strong' ? 100 : strength === 'moderate' ? 60 : 0 };
  };
}

describe('decideMerge', () => {
  it('returns auto_merged for all-strong component', () => {
    const events = [
      makeEvent('A', { source: 'eventbrite', source_type: 'eventbrite' }),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
    ];
    const component = makeComponent(events, [makeEdge('A', 'B', 'strong')]);

    const result = decideMerge(component, stubEvaluate('strong'));

    expect(result.action).toBe('auto_merged');
    expect(result.canonicalEvent).not.toBeNull();
    expect(result.reasoning).toContain('All');
  });

  it('returns human_review for mixed strong+moderate component', () => {
    const events = [
      makeEvent('A', { source: 'eventbrite', source_type: 'eventbrite' }),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
      makeEvent('C', { source: 'eproval', source_type: 'eproval' }),
    ];
    const component = makeComponent(events, [
      makeEdge('A', 'B', 'strong'),
      makeEdge('B', 'C', 'moderate'),
    ]);

    const result = decideMerge(component, stubEvaluate('strong'));

    expect(result.action).toBe('human_review');
    expect(result.canonicalEvent).toBeNull();
    expect(result.reasoning).toContain('Mixed');
  });

  it('returns kept_separate when against-evidence present', () => {
    const events = [
      makeEvent('A', { source: 'eventbrite', source_type: 'eventbrite' }),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
    ];
    const component = makeComponent(events, [makeEdge('A', 'B', 'strong')]);

    const result = decideMerge(component, stubEvaluate('against'));

    expect(result.action).toBe('kept_separate');
    expect(result.canonicalEvent).toBeNull();
    expect(result.reasoning).toContain('Hard contradiction');
  });

  it('returns kept_separate for singleton component', () => {
    const events = [makeEvent('A')];
    const component = makeComponent(events, []);

    const result = decideMerge(component, stubEvaluate('none'));

    expect(result.action).toBe('kept_separate');
    expect(result.canonicalEvent).toBeNull();
    expect(result.reasoning).toContain('No connecting evidence');
  });

  it('returns kept_separate when against-evidence exists on unconnected pair', () => {
    const events = [
      makeEvent('A', { source: 'eventbrite', source_type: 'eventbrite' }),
      makeEvent('B', { source: 'civicplus_rss', source_type: 'civicplus_rss' }),
      makeEvent('C', { source: 'eproval', source_type: 'eproval' }),
    ];
    const component = makeComponent(events, [
      makeEdge('A', 'B', 'strong'),
    ]);

    const result = decideMerge(component, stubEvaluatePairs({
      'A-B': 'strong',
      'A-C': 'against',
      'B-C': 'none',
    }));

    expect(result.action).toBe('kept_separate');
    expect(result.canonicalEvent).toBeNull();
    expect(result.reasoning).toContain('Hard contradiction');
  });
});

describe('pickCanonical', () => {
  it('prefers coordinate-bearing rows', () => {
    const withCoords = makeEvent('A', { location_lat: 33.47, location_lng: -81.97 });
    const withoutCoords = makeEvent('B', { location_lat: null, location_lng: null });

    const result = pickCanonical([withoutCoords, withCoords]);
    expect(result.id).toBe('A');
  });

  it('prefers higher source reliability', () => {
    const lowReliability = makeEvent('A', { source_type: 'eventbrite' });
    const highReliability = makeEvent('B', { source_type: 'eproval' });

    const result = pickCanonical([lowReliability, highReliability]);
    expect(result.id).toBe('B');
  });

  it('prefers higher vetting score', () => {
    const lowScore = makeEvent('A', { vetting_score: 10 });
    const highScore = makeEvent('B', { vetting_score: 90 });

    const result = pickCanonical([lowScore, highScore]);
    expect(result.id).toBe('B');
  });

  it('prefers earlier ingested_at', () => {
    const later = makeEvent('A', { ingested_at: '2026-08-16T12:00:00' });
    const earlier = makeEvent('B', { ingested_at: '2026-08-15T12:00:00' });

    const result = pickCanonical([later, earlier]);
    expect(result.id).toBe('B');
  });

  it('handles timezone-suffixed ingested_at timestamps', () => {
    const utc = makeEvent('A', { ingested_at: '2026-08-15T12:00:00Z' });
    const edt = makeEvent('B', { ingested_at: '2026-08-15T08:00:00-04:00' });

    const result = pickCanonical([utc, edt]);
    expect(result.id).toBe('A');
  });

  it('prefers alphabetically earlier city', () => {
    const laterCity = makeEvent('A', { city: 'Zebulon' });
    const earlierCity = makeEvent('B', { city: 'Augusta' });

    const result = pickCanonical([laterCity, earlierCity]);
    expect(result.id).toBe('B');
  });

  it('applies full tiebreak chain', () => {
    const events = [
      makeEvent('A', {
        location_lat: null, location_lng: null,
        source_type: 'eventbrite',
        vetting_score: 10,
        ingested_at: '2026-08-16T12:00:00',
        city: 'Zebulon',
      }),
      makeEvent('B', {
        location_lat: 33.47, location_lng: -81.97,
        source_type: 'eproval',
        vetting_score: 90,
        ingested_at: '2026-08-15T12:00:00',
        city: 'Augusta',
      }),
    ];

    const result = pickCanonical(events);
    expect(result.id).toBe('B');
  });
});
