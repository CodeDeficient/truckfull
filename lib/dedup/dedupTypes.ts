/**
 * Domain contract for a dedup candidate event.
 *
 * Fields not read by evaluatePair() are consumed by downstream stages:
 *   - event_start_date: SQL candidate partition key (coarse pre-filter)
 *   - city, state: audit logging and review UI display
 *   - source, source_type: graph edge guard (same-source pairs not connected)
 *                         + canonical tiebreak via SOURCE_RELIABILITY
 *   - vetting_score, ingested_at: canonical tiebreak (higher score, earlier time preferred)
 *
 * Do NOT prune unused fields — they are part of the domain contract, not YAGNI.
 */
export interface DedupEventInput {
  readonly id: string;
  readonly title: string | null;
  readonly event_start_date: string | null;
  readonly event_start_time: string | null;
  readonly location_lat: number | null;
  readonly location_lng: number | null;
  readonly location_address: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly source: string;
  readonly source_type: string;
  readonly organization: string | null;
  readonly vetting_score: number | null;
  readonly ingested_at: string | null;
}

export type EvidenceStrength = 'strong' | 'moderate' | 'weak' | 'none' | 'against';

/**
 * Pair evaluation result.
 *
 * `strength` is the authoritative classification.
 * Consumers must not infer matchability from score alone.
 *
 * `score` represents accumulated evidence before/including contradictions
 * and exists for diagnostics, tuning, and audit purposes.
 *
 * A pair with strength === 'against' may still have positive score because
 * positive signals can exist alongside a disqualifying contradiction.
 */
export interface PairEvaluation {
  readonly strength: EvidenceStrength;
  readonly reasons: readonly string[];
  readonly score: number;
}

export type HardContradictionCategory = 'coordinate_distance' | 'time_separation';

/**
 * An edge in the dedup graph connecting two events with evaluation evidence.
 *
 * Extends PairEvaluation so consumers can access strength/reasons/score
 * directly on the edge without an intermediate `.evaluation` property.
 */
export interface GraphEdge extends PairEvaluation {
  readonly from: string;
  readonly to: string;
}

/**
 * A candidate group of events that may be duplicates.
 *
 * This is NOT a confirmed duplicate group. The merge decision stage
 * evaluates whether the component should merge. A component says
 * "these rows might be related"; the merge decision says "yes, merge"
 * or "no, keep separate" or "ask a human".
 */
export interface ConnectedComponent {
  readonly events: readonly DedupEventInput[];
  readonly edges: readonly GraphEdge[];
  readonly flagged: boolean;
}

/** The action to take for a candidate component. */
export type MergeAction = 'auto_merged' | 'human_review' | 'kept_separate';

/** The result of evaluating a candidate component for merge. */
export interface MergeDecision {
  readonly action: MergeAction;
  readonly canonicalEvent: DedupEventInput | null;
  readonly reasoning: string;
}
