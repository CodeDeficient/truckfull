/**
 * Review Proposal Contract (Stage B)
 *
 * Every pending_review row must carry a durable, structurally sufficient
 * proposal so a later stage can resolve it without reinterpreting the
 * original Facebook post. This module models the persisted proposed_data
 * shape: existing field names (location, times, serviceDate, reviewAction)
 * are kept; serviceScope, locationCandidates, and timeAlternatives are
 * additive persistence fields.
 *
 * The resolution contract (what the owner submitted) belongs to a later
 * stage and is deliberately not modeled here.
 */

import type { Times } from '@/lib/ai/parseFacebookPost';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import type { TimeAlternative } from './textExtractor';
import type { ValidationResult } from './postValidator';
import { hasCanonicalWeekdaySet } from './weekday';
import { hasStrictCompleteTimes, isCompleteRecurringSchedule } from './scheduleSemantics';

export type ReviewAction =
  | 'missing_location'
  | 'ambiguous_location'
  | 'ambiguous_time'
  | 'unresolved_schedule';

export type ServiceScope = 'one_off_date' | 'recurring' | 'unresolved_schedule';

export interface LocationCandidate {
  id: string;
  address: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

export interface OneOffServiceProposal {
  reviewAction: 'missing_location' | 'ambiguous_location';
  serviceScope: 'one_off_date';
  serviceDate: string;
  times: Times;
  location?: { address: string; fuzzy: boolean };
  locationCandidates?: LocationCandidate[];
  food_items?: string[];
  classification?: string;
  confidence?: number;
  unresolvedReason?: string;
}

export interface RecurringServiceProposal {
  reviewAction: 'missing_location' | 'ambiguous_location';
  serviceScope: 'recurring';
  times: Times;
  location?: { address: string; fuzzy: boolean };
  locationCandidates?: LocationCandidate[];
  food_items?: string[];
  classification?: string;
  confidence?: number;
  unresolvedReason?: string;
}

export interface UnresolvedScheduleProposal {
  reviewAction: 'unresolved_schedule';
  serviceScope: 'unresolved_schedule';
  times?: Times;
  location?: { address: string; fuzzy: boolean };
  locationCandidates?: LocationCandidate[];
  unresolvedReason: string;
  food_items?: string[];
  classification?: string;
  confidence?: number;
}

export interface AmbiguousTimeProposal {
  reviewAction: 'ambiguous_time';
  serviceScope: 'one_off_date';
  serviceDate: string;
  times: Times;
  timeAlternatives: [TimeAlternative, TimeAlternative];
  location: { address: string; fuzzy: boolean };
  food_items?: string[];
  classification?: string;
  confidence?: number;
}

export type ReviewProposal =
  | OneOffServiceProposal
  | RecurringServiceProposal
  | UnresolvedScheduleProposal
  | AmbiguousTimeProposal;

/**
 * Accepted durable schedule evidence for unresolved_schedule proposals,
 * restricted to concrete parser fields: partial start/end, a canonical
 * weekday/day set, or a dateReference/dateReferences array. Runtime-safe:
 * dateReferences must be an array containing at least one non-empty string —
 * empty/whitespace strings and non-string members never establish evidence.
 */
function hasScheduleEvidence(times?: Times): boolean {
  if (!times) return false;
  const dateReferences = times.dateReferences;
  const hasUsableDateReferences =
    Array.isArray(dateReferences) &&
    dateReferences.some((ref) => typeof ref === 'string' && ref.trim().length > 0);
  return Boolean(
    times.start ||
    times.end ||
    hasCanonicalWeekdaySet(times.days) ||
    (typeof times.dateReference === 'string' && times.dateReference.trim().length > 0) ||
    hasUsableDateReferences,
  );
}

export function resolveServiceScope(
  reviewAction: ReviewAction,
  parsed: Pick<ParsedPost, 'times'>,
  validation: Pick<ValidationResult, 'resolvedServiceDate'>,
): ServiceScope | null {
  if (reviewAction === 'unresolved_schedule') return 'unresolved_schedule';
  if (validation.resolvedServiceDate) return 'one_off_date';
  if (hasCanonicalWeekdaySet(parsed.times?.days)) return 'recurring';
  return null;
}

function validateCandidates(candidates: unknown): { valid: boolean; reason?: string } {
  if (!Array.isArray(candidates)) {
    return { valid: false, reason: 'locationCandidates must be an array' };
  }
  if (candidates.length === 0) {
    // Persistence contract: absent candidates ⇒ field omitted; present
    // candidates ⇒ non-empty, well-formed array. An explicit empty array
    // violates the contract even though the builder never emits one.
    return { valid: false, reason: 'locationCandidates must not be empty when present' };
  }
  for (const candidate of candidates) {
    const entry = candidate as Partial<LocationCandidate> | null;
    if (!entry || typeof entry !== 'object') {
      return { valid: false, reason: 'Invalid location candidate entry' };
    }
    if (typeof entry.id !== 'string' || entry.id.trim().length === 0) {
      return { valid: false, reason: 'Location candidate requires a non-empty id' };
    }
    if (typeof entry.address !== 'string' || entry.address.trim().length === 0) {
      return { valid: false, reason: 'Location candidate requires a non-empty address' };
    }
    if (
      (entry.lat !== undefined && typeof entry.lat !== 'number') ||
      (entry.lng !== undefined && typeof entry.lng !== 'number') ||
      (entry.lat !== undefined && !Number.isFinite(entry.lat)) ||
      (entry.lng !== undefined && !Number.isFinite(entry.lng))
    ) {
      return { valid: false, reason: 'Location candidate coordinates must be finite numbers' };
    }
  }
  return { valid: true };
}

export type ReviewProposalValidationResult = { valid: true } | { valid: false; reason: string };

/**
 * Persistence-contract validator for review proposals.
 *
 * Construction-time only in Stage B: the sole production caller validates
 * freshly built, typed builder output (postProcessor.queueReview). Nothing
 * re-validates persisted JSONB, so runtime discriminator-mismatch checks
 * are intentionally not added here. Runtime-safety is still required inside
 * the field checks because AI-parsed `times` reaches the builder without
 * runtime schema validation.
 */
export function validateReviewProposal(proposal: ReviewProposal): ReviewProposalValidationResult {
  const { locationCandidates } = proposal as { locationCandidates?: unknown };
  if (locationCandidates !== undefined && locationCandidates !== null) {
    const candidates = validateCandidates(locationCandidates);
    if (!candidates.valid)
      return { valid: false, reason: candidates.reason ?? 'Invalid location candidates' };
  }

  if (proposal.serviceScope === 'unresolved_schedule') {
    if (!hasScheduleEvidence(proposal.times)) {
      return {
        valid: false,
        reason:
          'Unresolved schedule proposal lacks durable schedule evidence (partial times, weekday set, or date reference)',
      };
    }
    if (
      typeof proposal.unresolvedReason !== 'string' ||
      proposal.unresolvedReason.trim().length === 0
    ) {
      return { valid: false, reason: 'Unresolved schedule proposal requires a reason' };
    }
    return { valid: true };
  }

  if (proposal.serviceScope === 'one_off_date') {
    if (!proposal.serviceDate) {
      return { valid: false, reason: 'One-off service proposal requires a resolved service date' };
    }
    if (!hasStrictCompleteTimes(proposal.times)) {
      return { valid: false, reason: 'One-off service proposal requires complete service hours' };
    }
    if (proposal.reviewAction === 'ambiguous_time') {
      if (!proposal.location.address.trim()) {
        return { valid: false, reason: 'Ambiguous time proposal requires a service location' };
      }
      if (
        !Array.isArray(proposal.timeAlternatives) ||
        proposal.timeAlternatives.length !== 2 ||
        proposal.timeAlternatives.some(
          (option) =>
            !option.label.trim() ||
            !hasStrictCompleteTimes({ start: option.start, end: option.end }),
        )
      ) {
        return {
          valid: false,
          reason: 'Ambiguous time proposal requires exactly two valid choices',
        };
      }
      if (
        proposal.timeAlternatives[0].start === proposal.timeAlternatives[1].start &&
        proposal.timeAlternatives[0].end === proposal.timeAlternatives[1].end
      ) {
        return { valid: false, reason: 'Ambiguous time choices must be distinct' };
      }
    }
  } else if (
    proposal.serviceScope === 'recurring' &&
    !isCompleteRecurringSchedule(proposal.times)
  ) {
    return {
      valid: false,
      reason: 'Recurring service proposal requires a canonical weekday set and complete service hours',
    };
  }

  if (
    proposal.reviewAction === 'ambiguous_location' &&
    (!proposal.location?.address || proposal.location.address.trim().length === 0)
  ) {
    return {
      valid: false,
      reason: 'Ambiguous location proposal requires the ambiguous source location text',
    };
  }

  return { valid: true };
}

export interface ReviewProposalInput {
  reviewAction: ReviewAction;
  parsed: ParsedPost;
  validation: Pick<ValidationResult, 'resolvedServiceDate'>;
  unresolvedReason?: string;
  locationCandidates?: LocationCandidate[];
  classificationType?: string;
  timeAlternatives?: [TimeAlternative, TimeAlternative];
}

export function buildReviewProposal(input: ReviewProposalInput): ReviewProposal | null {
  const serviceScope = resolveServiceScope(input.reviewAction, input.parsed, input.validation);
  if (!serviceScope) return null;

  const location = input.parsed.location?.address
    ? {
        address: input.parsed.location.address,
        fuzzy: input.parsed.location.fuzzy ?? false,
      }
    : undefined;

  const base = {
    reviewAction: input.reviewAction,
    serviceScope,
    ...(location ? { location } : {}),
    ...(input.locationCandidates && input.locationCandidates.length > 0
      ? { locationCandidates: input.locationCandidates }
      : {}),
    ...(input.parsed.food_items.length > 0 ? { food_items: input.parsed.food_items } : {}),
    ...(input.classificationType ? { classification: input.classificationType } : {}),
    confidence: input.parsed.confidence,
    ...(serviceScope === 'unresolved_schedule' && input.unresolvedReason
      ? { unresolvedReason: input.unresolvedReason }
      : {}),
  };

  if (
    input.reviewAction === 'ambiguous_time' &&
    serviceScope === 'one_off_date' &&
    input.validation.resolvedServiceDate &&
    input.parsed.times &&
    input.timeAlternatives &&
    location?.address
  ) {
    return {
      ...base,
      reviewAction: 'ambiguous_time',
      serviceScope: 'one_off_date',
      serviceDate: input.validation.resolvedServiceDate,
      times: input.parsed.times,
      timeAlternatives: input.timeAlternatives,
      location,
    };
  }
  if (input.reviewAction === 'ambiguous_time') return null;

  if (serviceScope === 'one_off_date' && input.validation.resolvedServiceDate) {
    return {
      ...base,
      serviceScope: 'one_off_date',
      serviceDate: input.validation.resolvedServiceDate,
      ...(input.parsed.times ? { times: input.parsed.times } : {}),
    } as OneOffServiceProposal;
  }

  if (serviceScope === 'recurring') {
    return {
      ...base,
      serviceScope: 'recurring',
      ...(input.parsed.times ? { times: input.parsed.times } : {}),
    } as RecurringServiceProposal;
  }

  return {
    ...base,
    serviceScope: 'unresolved_schedule',
    ...(input.parsed.times ? { times: input.parsed.times } : {}),
    unresolvedReason: input.unresolvedReason ?? 'Schedule could not be resolved',
  } as UnresolvedScheduleProposal;
}
