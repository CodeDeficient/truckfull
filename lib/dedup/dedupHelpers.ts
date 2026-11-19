import { calculateDistance } from '@/lib/utils/geoUtils';
import { normalizeAddress } from '@/lib/research/contactValidation';
import type { DedupEventInput, EvidenceStrength, PairEvaluation, HardContradictionCategory } from './dedupTypes';
import type { PairReason } from './dedupConstants';
import {
  SAME_VENUE_RADIUS_METERS,
  PROBABLE_SAME_VENUE_RADIUS_METERS,
  NEVER_MERGE_RADIUS_METERS,
  TIME_TOLERANCE_MINUTES,
  WEAK_TIME_EVIDENCE_MINUTES,
  AMBIGUOUS_TIME_EVIDENCE_MINUTES,
  MAX_COORDINATE_EVIDENCE_SCORE,
  MAX_TIME_EVIDENCE_SCORE,
  MAX_TITLE_SIMILARITY_SCORE,
  MAX_ORGANIZER_MATCH_SCORE,
  MAX_ADDRESS_MATCH_SCORE,
  CONTRADICTORY_EVIDENCE_PENALTY,
  PROBABLE_VENUE_COORDINATE_SCORE,
  WEAK_TIME_EVIDENCE_SCORE,
  MODERATE_TITLE_SIMILARITY_SCORE,
  NULL_ORGANIZER_NEUTRAL_SCORE,
  NULL_ADDRESS_NEUTRAL_SCORE,
  HIGH_CONFIDENCE_TITLE_SIMILARITY_THRESHOLD,
  MODERATE_TITLE_SIMILARITY_THRESHOLD,
  PAIR_REASON,
} from './dedupConstants';

const NON_ALPHANUMERIC_OR_SPACE = /[^a-z0-9\s]/g;
const WHITESPACE_RUNS = /\s+/g;
const TWELVE_HOUR_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i;
const TWENTY_FOUR_HOUR_TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const ISO_DATETIME = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;
const HOUR_ONLY_TIME = /^(\d{1,2})\s*(am|pm)$/i;

function normalizeForComparison(s: string): string {
  return s.toLowerCase().replaceAll(NON_ALPHANUMERIC_OR_SPACE, ' ').replaceAll(WHITESPACE_RUNS, ' ').trim();
}

export function normalizeTitle(s: string | null): string {
  if (s === null || s === undefined) return '';
  return normalizeForComparison(s);
}

export function normalizeOrganizer(s: string | null): string {
  if (s === null || s === undefined) return '';
  return normalizeForComparison(s);
}

export function normalizeAddressForDedup(s: string | null): string {
  if (s === null || s === undefined) return '';
  return normalizeAddress(s);
}

export function coordinateDistanceMeters(
  lat1: number | null, lng1: number | null,
  lat2: number | null, lng2: number | null,
): number | null {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return null;
  if (!Number.isFinite(lat1) || !Number.isFinite(lng1) || !Number.isFinite(lat2) || !Number.isFinite(lng2)) return null;
  const miles = calculateDistance(lat1, lng1, lat2, lng2);
  if (!Number.isFinite(miles)) return null;
  return miles * 1609.344;
}

function parseTimeToMinutes(time: string | null): number | null {
  if (time === null || time === undefined) return null;
  const trimmed = time.trim();

  let match: RegExpMatchArray | null;

  match = trimmed.match(TWELVE_HOUR_TIME);
  if (match) {
    let hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    const period = match[4].toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  match = trimmed.match(TWENTY_FOUR_HOUR_TIME);
  if (match) {
    const hours = Number.parseInt(match[1], 10);
    const minutes = Number.parseInt(match[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes;
    }
  }

  match = trimmed.match(ISO_DATETIME);
  if (match) {
    const hours = Number.parseInt(match[4], 10);
    const minutes = Number.parseInt(match[5], 10);
    return hours * 60 + minutes;
  }

  match = trimmed.match(HOUR_ONLY_TIME);
  if (match) {
    let hours = Number.parseInt(match[1], 10);
    const period = match[2].toLowerCase();
    if (period === 'pm' && hours < 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;
    return hours * 60;
  }

  return null;
}

/**
 * Absolute minute difference between two time strings.
 *
 * Caller responsibility: both times must fall on the same `event_start_date`.
 * Cross-date comparison is meaningless — the SQL candidate filter (Phase 4.5)
 * partitions by date, so evaluatePair only sees same-date pairs. A 22-hour
 * gap on the same date is correctly a hard time contradiction, not a
 * midnight-rollover false positive.
 *
 * @returns absolute difference in minutes, or null if either time is unparseable.
 */
export function timeDifferenceMinutes(timeA: string | null, timeB: string | null): number | null {
  const minutesA = parseTimeToMinutes(timeA);
  const minutesB = parseTimeToMinutes(timeB);
  if (minutesA === null || minutesB === null) return null;
  return Math.abs(minutesA - minutesB);
}

export function computeStringSimilarity(a: string, b: string): number {
  const na = normalizeForComparison(a);
  const nb = normalizeForComparison(b);

  if (na === nb) return 1;
  if (na.length === 0 && nb.length === 0) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  const wordsA = new Set(na.split(' ').filter((w) => w.length > 0));
  const wordsB = new Set(nb.split(' ').filter((w) => w.length > 0));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  const intersection = new Set<string>();
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection.add(word);
  }

  const union = new Set([...wordsA, ...wordsB]);
  return intersection.size / union.size;
}

interface HardContradiction {
  readonly category: HardContradictionCategory;
  readonly details: string;
}

const CONTRADICTION_REASON: Record<HardContradictionCategory, PairReason> = {
  coordinate_distance: PAIR_REASON.COORDINATE_CONTRADICTION,
  time_separation: PAIR_REASON.TIME_CONTRADICTION,
};

function evaluateCoordinateEvidence(
  a: DedupEventInput, b: DedupEventInput,
): { score: number; reasons: string[]; contradiction: HardContradiction | null } {
  const distance = coordinateDistanceMeters(a.location_lat, a.location_lng, b.location_lat, b.location_lng);

  if (distance === null) {
    return { score: 0, reasons: [], contradiction: null };
  }

  if (distance <= SAME_VENUE_RADIUS_METERS) {
    return { score: MAX_COORDINATE_EVIDENCE_SCORE, reasons: [PAIR_REASON.COORDINATE_SAME_VENUE], contradiction: null };
  }

  if (distance <= PROBABLE_SAME_VENUE_RADIUS_METERS) {
    return { score: PROBABLE_VENUE_COORDINATE_SCORE, reasons: [PAIR_REASON.COORDINATE_NEARBY], contradiction: null };
  }

  if (distance > NEVER_MERGE_RADIUS_METERS) {
    return {
      score: 0,
      reasons: [PAIR_REASON.COORDINATE_TOO_FAR],
      contradiction: { category: 'coordinate_distance', details: `distance ${distance.toFixed(0)}m exceeds 1000m` },
    };
  }

  return { score: 0, reasons: [], contradiction: null };
}

function evaluateTimeEvidence(
  a: DedupEventInput, b: DedupEventInput,
): { score: number; reasons: string[]; contradiction: HardContradiction | null } {
  const diffMinutes = timeDifferenceMinutes(a.event_start_time, b.event_start_time);

  if (diffMinutes === null) {
    return { score: 0, reasons: [], contradiction: null };
  }

  if (diffMinutes <= TIME_TOLERANCE_MINUTES) {
    return { score: MAX_TIME_EVIDENCE_SCORE, reasons: [PAIR_REASON.TIME_CLOSE], contradiction: null };
  }

  if (diffMinutes <= WEAK_TIME_EVIDENCE_MINUTES) {
    return { score: WEAK_TIME_EVIDENCE_SCORE, reasons: [PAIR_REASON.TIME_POSSIBLE], contradiction: null };
  }

  if (diffMinutes > AMBIGUOUS_TIME_EVIDENCE_MINUTES) {
    return {
      score: 0,
      reasons: [PAIR_REASON.TIME_TOO_FAR],
      contradiction: { category: 'time_separation', details: `difference ${diffMinutes}min exceeds 240min` },
    };
  }

  return { score: 0, reasons: [], contradiction: null };
}

function evaluateTitleEvidence(
  a: DedupEventInput, b: DedupEventInput,
): { score: number; reasons: string[] } {
  const sim = computeStringSimilarity(a.title ?? '', b.title ?? '');

  if (sim >= HIGH_CONFIDENCE_TITLE_SIMILARITY_THRESHOLD) {
    return { score: MAX_TITLE_SIMILARITY_SCORE, reasons: [PAIR_REASON.TITLE_HIGH_SIMILARITY] };
  }

  if (sim >= MODERATE_TITLE_SIMILARITY_THRESHOLD) {
    return { score: MODERATE_TITLE_SIMILARITY_SCORE, reasons: [PAIR_REASON.TITLE_MODERATE_SIMILARITY] };
  }

  return { score: 0, reasons: [] };
}

function evaluateOrganizerEvidence(
  a: DedupEventInput, b: DedupEventInput,
): { score: number; reasons: string[] } {
  const na = normalizeOrganizer(a.organization);
  const nb = normalizeOrganizer(b.organization);

  if (na.length > 0 && nb.length > 0 && na === nb) {
    return { score: MAX_ORGANIZER_MATCH_SCORE, reasons: [PAIR_REASON.ORGANIZER_MATCH] };
  }

  if (na.length === 0 && nb.length === 0) {
    return { score: NULL_ORGANIZER_NEUTRAL_SCORE, reasons: [PAIR_REASON.ORGANIZER_BOTH_NULL] };
  }

  return { score: 0, reasons: [] };
}

function evaluateAddressEvidence(
  a: DedupEventInput, b: DedupEventInput,
): { score: number; reasons: string[] } {
  const na = normalizeAddressForDedup(a.location_address);
  const nb = normalizeAddressForDedup(b.location_address);

  if (na.length > 0 && nb.length > 0 && na === nb) {
    return { score: MAX_ADDRESS_MATCH_SCORE, reasons: [PAIR_REASON.ADDRESS_MATCH] };
  }

  if (na.length === 0 && nb.length === 0) {
    return { score: NULL_ADDRESS_NEUTRAL_SCORE, reasons: [PAIR_REASON.ADDRESS_BOTH_NULL] };
  }

  return { score: 0, reasons: [] };
}

export function evaluatePair(a: DedupEventInput, b: DedupEventInput): PairEvaluation {
  const coordResult = evaluateCoordinateEvidence(a, b);
  const timeResult = evaluateTimeEvidence(a, b);
  const titleResult = evaluateTitleEvidence(a, b);
  const organizerResult = evaluateOrganizerEvidence(a, b);
  const addressResult = evaluateAddressEvidence(a, b);

  const hardContradictions: HardContradiction[] = [];
  if (coordResult.contradiction) hardContradictions.push(coordResult.contradiction);
  if (timeResult.contradiction) hardContradictions.push(timeResult.contradiction);

  const penalty = hardContradictions.length * CONTRADICTORY_EVIDENCE_PENALTY;

  const rawScore = coordResult.score + timeResult.score + titleResult.score
    + organizerResult.score + addressResult.score - penalty;

  const clampedScore = Math.max(0, Math.min(100, rawScore));

  const reasons: string[] = [
    ...coordResult.reasons,
    ...timeResult.reasons,
    ...titleResult.reasons,
    ...organizerResult.reasons,
    ...addressResult.reasons,
    ...hardContradictions.map((c) => CONTRADICTION_REASON[c.category]),
  ];

  let strength: EvidenceStrength;

  if (hardContradictions.length > 0) {
    strength = 'against';
  } else if (clampedScore >= 80) {
    strength = 'strong';
  } else if (clampedScore >= 50) {
    strength = 'moderate';
  } else if (clampedScore >= 25) {
    strength = 'weak';
  } else {
    strength = 'none';
  }

  return { strength, reasons, score: clampedScore };
}
