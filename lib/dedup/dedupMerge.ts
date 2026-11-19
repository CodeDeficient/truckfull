import type { DedupEventInput, ConnectedComponent, MergeDecision, PairEvaluation } from './dedupTypes';
import { SOURCE_RELIABILITY } from './dedupConstants';

function toTimestamp(value: string | null): number {
  if (value === null) return Infinity;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? Infinity : ms;
}

/**
 * Decides what to do with a connected component of potentially-duplicate events.
 *
 * Uses two sources of truth:
 * 1. `component.edges` — pre-computed graph edges (only strong/moderate cross-source
 *    pairs). Used to classify the component as auto_merged (all strong) or human_review
 *    (mixed strong + moderate).
 * 2. `evaluate` callback — evaluates ALL pairs (including same-source and weak/none
 *    pairs that the graph builder intentionally skipped). Used to detect hard
 *    contradictions that force kept_separate regardless of edge structure.
 *
 * This dual design is intentional: the graph builder is conservative (creates edges only
 * for strong/moderate cross-source evidence), while the evaluate callback catches
 * against-evidence on any pair, including those the graph builder never considered.
 */
export function decideMerge(
  component: ConnectedComponent,
  evaluate: (a: DedupEventInput, b: DedupEventInput) => PairEvaluation,
): MergeDecision {
  const events = component.events;

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const evaluation = evaluate(events[i], events[j]);
      if (evaluation.strength === 'against') {
        return {
          action: 'kept_separate',
          canonicalEvent: null,
          reasoning: `Hard contradiction found between ${events[i].id} and ${events[j].id}`,
        };
      }
    }
  }

  const strongCount = component.edges.filter((e) => e.strength === 'strong').length;
  const moderateCount = component.edges.filter((e) => e.strength === 'moderate').length;

  if (component.edges.length > 0 && moderateCount === 0) {
    return {
      action: 'auto_merged',
      canonicalEvent: pickCanonical(events),
      reasoning: `All ${strongCount} edges are strong`,
    };
  }

  if (component.edges.length > 0) {
    return {
      action: 'human_review',
      canonicalEvent: null,
      reasoning: `Mixed evidence — ${strongCount} strong, ${moderateCount} moderate edges`,
    };
  }

  return {
    action: 'kept_separate',
    canonicalEvent: null,
    reasoning: 'No connecting evidence',
  };
}

export function pickCanonical(events: readonly DedupEventInput[]): DedupEventInput {
  const sorted = [...events].sort((a, b) => {
    const aHasCoords = a.location_lat !== null && a.location_lng !== null ? 1 : 0;
    const bHasCoords = b.location_lat !== null && b.location_lng !== null ? 1 : 0;
    if (aHasCoords !== bHasCoords) return bHasCoords - aHasCoords;

    const aReliability = SOURCE_RELIABILITY[a.source_type as keyof typeof SOURCE_RELIABILITY] ?? SOURCE_RELIABILITY.other;
    const bReliability = SOURCE_RELIABILITY[b.source_type as keyof typeof SOURCE_RELIABILITY] ?? SOURCE_RELIABILITY.other;
    if (aReliability !== bReliability) return bReliability - aReliability;

    const aScore = a.vetting_score ?? 0;
    const bScore = b.vetting_score ?? 0;
    if (aScore !== bScore) return bScore - aScore;

    const aTime = toTimestamp(a.ingested_at);
    const bTime = toTimestamp(b.ingested_at);
    if (aTime !== bTime) return aTime < bTime ? -1 : 1;

    const aCity = a.city ?? '';
    const bCity = b.city ?? '';
    return aCity.localeCompare(bCity);
  });

  return sorted[0];
}
