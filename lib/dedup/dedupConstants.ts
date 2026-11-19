import type { CitySourceType } from '@/lib/events/types';

/**
 * Dedup system constants.
 *
 * The numeric scoring values are intentionally heuristic.
 * Correct behavior matters more than the exact numbers.
 * The thresholds may be adjusted after observing production metrics.
 */

// ── Coordinate evidence thresholds (meters) ──

/** Event coordinates within this distance are almost certainly the same venue. */
export const SAME_VENUE_RADIUS_METERS = 50;

/** Event coordinates within this distance are probably the same venue. */
export const PROBABLE_SAME_VENUE_RADIUS_METERS = 200;

/** Event coordinates beyond this distance are definitely different venues. */
export const NEVER_MERGE_RADIUS_METERS = 1000;

// ── Time evidence thresholds (minutes) ──

/** Events whose start times differ by at most this many minutes are considered matching on time. */
export const TIME_TOLERANCE_MINUTES = 15;

/** Events whose start times differ by at most this many minutes have weak time evidence. */
export const WEAK_TIME_EVIDENCE_MINUTES = 120;

/**
 * Events whose start times differ by more than this many minutes have ambiguous time evidence.
 * Events in the (WEAK, AMBIGUOUS) range have no time evidence either way — the system
 * neither supports nor opposes a merge based on time alone.
 */
export const AMBIGUOUS_TIME_EVIDENCE_MINUTES = 240;

// ── Deterministic graph decision thresholds (0–1 score) ──
// These govern the deterministic evidence path only — they are NOT related to LLM advisory output.
// The LLM advisory (Phase 4.6) uses its own categorical recommendation system (merge/separate/unsure)
// and does not produce a score that maps to these thresholds.

/** Auto-merge when mergeRecommendationScore >= this value. */
export const AUTO_MERGE_THRESHOLD = 0.98;

/** Human-review queue when mergeRecommendationScore is in [HUMAN_REVIEW_LOWER_BOUND, AUTO_MERGE_THRESHOLD). */
export const HUMAN_REVIEW_LOWER_BOUND = 0.9;

// ── Diagnostic flags ──

/** Any connected component exceeding this size is flagged for investigation. */
export const DIAGNOSTIC_CLUSTER_SIZE_FLAG = 20;

// ── SQL candidate pre-filter (computation reduction) ──

/**
 * Radius (kilometers) used by the SQL RPC to constrain candidate-pair computation.
 *
 * This is a computation-reduction parameter, NOT a dedup rule.
 * The 10 km window limits the number of pairs the graph builder evaluates.
 * Changing it affects performance, not correctness — pairs beyond this radius
 * are still deduped if they share the same normalized title and date.
 */
export const SQL_CANDIDATE_RADIUS_KM = 10;

// ── Source reliability ranking ──

/**
 * Source-reliability score used as a tiebreaker when picking the canonical row
 * in a duplicate group. Higher = more trustworthy.
 *
 * Government and civic sources rank above commercial aggregators.
 * Initial heuristic, not mathematically derived.
 */
export const SOURCE_RELIABILITY: { [K in CitySourceType | 'other']: number } = {
  eproval: 90,
  arcgis_permits: 90,
  civicplus_rss: 85,
  simpleview_rss: 85,
  ical: 80,
  aiken_playwright: 80,
  tourism_html: 75,
  algolia_api: 70,
  timely_api: 70,
  eventbrite: 50,
  other: 40,
};

// ── Evidence scoring weights ──

/**
 * Maximum score for each evidence category.
 * A perfect match in a category contributes this value to the total merge evidence score.
 */
export const MAX_COORDINATE_EVIDENCE_SCORE = 40;
export const MAX_TIME_EVIDENCE_SCORE = 25;
export const MAX_TITLE_SIMILARITY_SCORE = 20;
export const MAX_ORGANIZER_MATCH_SCORE = 10;
export const MAX_ADDRESS_MATCH_SCORE = 5;

/** Score deduction when evidence is explicitly contradictory. */
export const CONTRADICTORY_EVIDENCE_PENALTY = 30;

// ── Partial-match and neutral evidence scores ──

/** Coordinate evidence when distance is within the probable-same-venue radius (but not the same-venue radius). */
export const PROBABLE_VENUE_COORDINATE_SCORE = 20;

/** Time evidence when difference is within the weak-time-evidence window (but not the tolerance window). */
export const WEAK_TIME_EVIDENCE_SCORE = 12;

/** Title evidence when similarity is moderate (below high-confidence, above the no-contribution floor). */
export const MODERATE_TITLE_SIMILARITY_SCORE = 10;

/** Organizer evidence contributed when both rows have null organizer (unknown — neither supports nor opposes). */
export const NULL_ORGANIZER_NEUTRAL_SCORE = 5;

/** Address evidence contributed when both rows have null address (unknown — neither supports nor opposes). */
export const NULL_ADDRESS_NEUTRAL_SCORE = 2;

// ── Title similarity thresholds ──
// These are "high-confidence" and "moderate" contribution thresholds, NOT match thresholds.
// Title alone never decides a pair — these gate how much title evidence contributes to the score.

/** Title similarity at or above this contributes the full title evidence score. */
export const HIGH_CONFIDENCE_TITLE_SIMILARITY_THRESHOLD = 0.9;

/** Title similarity at or above this contributes the moderate title evidence score. */
export const MODERATE_TITLE_SIMILARITY_THRESHOLD = 0.7;

// ── Pair reason identifiers ──
// These are stable domain identifiers, NOT tuning values.
// They are the API surface for audit logging, review UI, and debugging.
// Do NOT embed threshold values — thresholds change, reasons are permanent.

export const PAIR_REASON = {
  COORDINATE_SAME_VENUE: 'coordinate_same_venue',
  COORDINATE_NEARBY: 'coordinate_nearby',
  COORDINATE_TOO_FAR: 'coordinate_too_far',
  COORDINATE_CONTRADICTION: 'coordinate_contradiction',
  TIME_CLOSE: 'time_close',
  TIME_POSSIBLE: 'time_possible',
  TIME_TOO_FAR: 'time_too_far',
  TIME_CONTRADICTION: 'time_contradiction',
  TITLE_HIGH_SIMILARITY: 'title_high_similarity',
  TITLE_MODERATE_SIMILARITY: 'title_moderate_similarity',
  ORGANIZER_MATCH: 'organizer_match',
  ORGANIZER_BOTH_NULL: 'organizer_both_null',
  ADDRESS_MATCH: 'address_match',
  ADDRESS_BOTH_NULL: 'address_both_null',
} as const;

/** Union of all valid pair reason identifiers. Use this for type-safe reason mappings. */
export type PairReason = typeof PAIR_REASON[keyof typeof PAIR_REASON];
