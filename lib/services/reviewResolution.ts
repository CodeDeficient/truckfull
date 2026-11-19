/**
 * Review Resolution Contract (Stage C1)
 *
 * The owner's answer to a durable Stage B ReviewProposal. Stored
 * namespaced at proposed_data.resolution so the original unresolved
 * proposal remains auditable and the two shapes never overwrite each
 * other. Location and schedule components are generally compositional;
 * bounded time-only proposals preserve their persisted date and location.
 * Required components are determined by the persisted proposal via
 * canResolve(), never by the client payload.
 *
 * Client payloads may never supply Facebook identity fields
 * (facebook_post_id, created_time), reviewAction, or serviceScope — those
 * remain canonical from the persisted confirmation/post row.
 */

import type { ReviewProposal } from './reviewProposal';
import { isValidServiceDate } from './scheduleOverride';
import {
  getScheduleValidationDiagnostic,
  hasStrictCompleteTimes,
  isCompleteRecurringSchedule,
} from './scheduleSemantics';
import { hasCanonicalWeekdaySet, normalizeWeekdaySet } from './weekday';

export interface ExactLocationInput {
  address: string;
  city?: string;
  state?: string;
}

export interface ScheduleCorrectionInput {
  scope: 'one_off' | 'recurring';
  serviceDate?: string;
  days?: string[];
  startTime?: string;
  endTime?: string;
}

export interface ReviewResolutionInput {
  locationResolution?:
    | { type: 'exact_location'; location: ExactLocationInput }
    | { type: 'candidate_selection'; candidateId: string };
  scheduleResolution?: ScheduleCorrectionInput;
}

const FORBIDDEN_KEYS = new Set([
  'facebook_post_id',
  'created_time',
  'reviewAction',
  'serviceScope',
]);

export type ReviewProposalLike = ReviewProposal;

export type ResolutionValidationResult = { valid: true } | { valid: false; reason: string };

function hasValidServiceDate(value?: string): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) return false;
  return isValidServiceDate(value.trim());
}

function validateScheduleCorrection(
  correction: ScheduleCorrectionInput,
  proposal: ReviewProposalLike,
): ResolutionValidationResult {
  const scope = correction.scope;
  if (scope !== 'one_off' && scope !== 'recurring') {
    return { valid: false, reason: 'Schedule correction scope must be one_off or recurring' };
  }

  const proposalScope = proposal.serviceScope;
  if (scope === 'one_off' && proposalScope === 'recurring') {
    return {
      valid: false,
      reason: 'Schedule correction scope one_off contradicts the persisted recurring proposal',
    };
  }
  if (scope === 'recurring' && proposalScope === 'one_off_date') {
    return {
      valid: false,
      reason: 'Schedule correction scope recurring contradicts the persisted one-off proposal',
    };
  }

  if (scope === 'one_off' && !hasValidServiceDate(correction.serviceDate)) {
    return { valid: false, reason: 'One-off schedule correction requires a valid service date' };
  }

  if (scope === 'recurring') {
    const days = correction.days;
    if (!Array.isArray(days) || days.length === 0) {
      return { valid: false, reason: 'Recurring schedule correction requires a weekday set' };
    }
    if (!hasCanonicalWeekdaySet(days)) {
      return { valid: false, reason: 'NONCANONICAL_DAYSET_REJECTED' };
    }
  }

  const timeDiagnostic = getScheduleValidationDiagnostic({
    start: correction.startTime,
    end: correction.endTime,
  });
  if (timeDiagnostic) return { valid: false, reason: timeDiagnostic };
  if (!hasStrictCompleteTimes({ start: correction.startTime, end: correction.endTime })) {
    return { valid: false, reason: 'Schedule correction requires complete HH:MM service hours' };
  }

  if (proposal.reviewAction === 'ambiguous_time') {
    if (correction.serviceDate !== proposal.serviceDate) {
      return { valid: false, reason: 'Time choice must preserve the proposed service date' };
    }
    const choices = (proposal as { timeAlternatives?: unknown }).timeAlternatives;
    const matchesChoice =
      Array.isArray(choices) &&
      choices.some((choice: unknown) => {
        if (!choice || typeof choice !== 'object') return false;
        const candidate = choice as { start?: unknown; end?: unknown };
        return candidate.start === correction.startTime && candidate.end === correction.endTime;
      });
    if (!matchesChoice) {
      return { valid: false, reason: 'Submitted service hours do not match a proposed choice' };
    }
  }

  return { valid: true };
}

function validateLocationResolution(
  locationResolution: NonNullable<ReviewResolutionInput['locationResolution']>,
  proposal: ReviewProposalLike,
): ResolutionValidationResult {
  if (locationResolution.type === 'exact_location') {
    const address = locationResolution.location?.address;
    if (typeof address !== 'string' || address.trim().length === 0) {
      return { valid: false, reason: 'Exact location resolution requires a non-empty address' };
    }
    return { valid: true };
  }

  if (locationResolution.type === 'candidate_selection') {
    const candidates = (proposal as { locationCandidates?: { id: unknown }[] }).locationCandidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return {
        valid: false,
        reason: 'Candidate selection requires persisted candidates on this confirmation',
      };
    }
    const match = candidates.some(
      (candidate) =>
        candidate &&
        typeof candidate === 'object' &&
        candidate.id === locationResolution.candidateId,
    );
    if (!match) {
      return {
        valid: false,
        reason: 'Selected candidate id does not match the persisted candidate set',
      };
    }
    return { valid: true };
  }

  return { valid: false, reason: 'Unknown location resolution type' };
}

/**
 * Validates a submitted owner resolution against the persisted Stage B
 * proposal. Runtime-safe: client/AI-shaped junk must never throw.
 */
export function validateReviewResolution(
  proposal: ReviewProposalLike,
  resolution: ReviewResolutionInput | null | undefined,
): ResolutionValidationResult {
  if (!resolution || typeof resolution !== 'object' || Array.isArray(resolution)) {
    return { valid: false, reason: 'A resolution payload is required' };
  }

  const forbidden = Object.keys(resolution).filter((key) => FORBIDDEN_KEYS.has(key));
  if (forbidden.length > 0) {
    return {
      valid: false,
      reason: `Resolution payload must not supply identity or contract fields (not permitted): ${forbidden.join(', ')}`,
    };
  }

  const { locationResolution, scheduleResolution } = resolution;
  if (!locationResolution && !scheduleResolution) {
    return { valid: false, reason: 'A resolution must supply a location or schedule correction' };
  }
  if (proposal.reviewAction === 'ambiguous_time' && locationResolution) {
    return { valid: false, reason: 'Time choice must preserve the proposed service location' };
  }

  if (locationResolution) {
    const locationResult = validateLocationResolution(locationResolution, proposal);
    if (!locationResult.valid) return locationResult;
  }

  if (scheduleResolution) {
    const scheduleResult = validateScheduleCorrection(scheduleResolution, proposal);
    if (!scheduleResult.valid) return scheduleResult;
  }

  return { valid: true };
}

export interface EffectiveOperation {
  serviceScope: ReviewProposal['serviceScope'];
  serviceDate?: string;
  times: {
    start: string;
    end: string;
    days?: string[];
    scope?: string;
    dateReference?: string;
    dateReferences?: string[];
  };
  location?: { address: string; city?: string; state?: string; fuzzy: boolean };
  reviewAction?: string;
  locationCandidates?: unknown[];
  unresolvedReason?: string;
}

function resolvedLocation(
  proposal: ReviewProposalLike,
  resolution: ReviewResolutionInput | null | undefined,
): EffectiveOperation['location'] | undefined {
  const locationResolution = resolution?.locationResolution;
  if (locationResolution?.type === 'exact_location') {
    const raw = locationResolution.location;
    return {
      address: raw.address.trim(),
      ...(raw.city?.trim() ? { city: raw.city.trim() } : {}),
      ...(raw.state?.trim() ? { state: raw.state.trim() } : {}),
      fuzzy: false,
    };
  }
  if (locationResolution?.type === 'candidate_selection') {
    const candidates = (
      proposal as {
        locationCandidates?: { id: string; address: string; city?: string; state?: string }[];
      }
    ).locationCandidates;
    const candidate = candidates?.find(
      (candidate) => candidate.id === locationResolution.candidateId,
    );
    if (!candidate) return undefined;
    return {
      address: candidate.address,
      ...(candidate.city ? { city: candidate.city } : {}),
      ...(candidate.state ? { state: candidate.state } : {}),
      fuzzy: false,
    };
  }
  const proposalLocation = (
    proposal as { location?: { address?: string; city?: string; state?: string; fuzzy?: boolean } }
  ).location;
  if (
    proposalLocation?.address &&
    (proposalLocation.fuzzy !== true || proposal.reviewAction === 'ambiguous_time')
  ) {
    return {
      address: proposalLocation.address,
      ...(proposalLocation.city ? { city: proposalLocation.city } : {}),
      ...(proposalLocation.state ? { state: proposalLocation.state } : {}),
      fuzzy:
        proposal.reviewAction === 'ambiguous_time' ? proposalLocation.fuzzy === true : false,
    };
  }
  return undefined;
}

function hasUsableTime(proposal: ReviewProposalLike): boolean {
  const times = (proposal as { times?: { start?: string; end?: string } }).times;
  return hasStrictCompleteTimes(times);
}

function hasUsableDate(proposal: ReviewProposalLike): boolean {
  const serviceDate = (proposal as { serviceDate?: string }).serviceDate;
  return hasValidServiceDate(serviceDate);
}

function hasUsableLocation(
  proposal: ReviewProposalLike,
  resolution: ReviewResolutionInput | null | undefined,
): boolean {
  return resolvedLocation(proposal, resolution) !== undefined;
}

/**
 * Proves the merged proposal + resolution forms one complete service
 * operation: usable service time, usable service location, and the
 * appropriate one-off date or recurring scope.
 */
export function canResolve(
  proposal: ReviewProposalLike,
  resolution: ReviewResolutionInput | null | undefined,
): { canResolve: true } | { canResolve: false; reason: string } {
  const scope = proposal.serviceScope;
  const proposalTimes = (proposal as { times?: { start?: string; end?: string; days?: unknown } })
    .times;
  const schedule = resolution?.scheduleResolution;
  if (proposal.reviewAction === 'ambiguous_time' && !schedule) {
    return { canResolve: false, reason: 'Ambiguous service hours require a time choice' };
  }
  const effectiveTimes = schedule
    ? { start: schedule.startTime, end: schedule.endTime, days: schedule.days }
    : proposalTimes;
  const diagnostic = getScheduleValidationDiagnostic(effectiveTimes);
  if (diagnostic) return { canResolve: false, reason: diagnostic };

  if (!timeUsable(proposal, resolution)) {
    return { canResolve: false, reason: 'Resolution still lacks usable service hours' };
  }

  if (!hasUsableLocation(proposal, resolution)) {
    return { canResolve: false, reason: 'Resolution still lacks a usable service location' };
  }

  if (scope === 'one_off_date' && !hasUsableDate(proposal)) {
    return { canResolve: false, reason: 'One-off resolution requires a service date' };
  }

  if (scope === 'recurring' && !isCompleteRecurringSchedule(effectiveTimes)) {
    return { canResolve: false, reason: 'NONCANONICAL_DAYSET_REJECTED' };
  }

  if (scope === 'unresolved_schedule') {
    const schedule = resolution?.scheduleResolution;
    if (!schedule) {
      return { canResolve: false, reason: 'Unresolved schedule requires a schedule correction' };
    }
    if (schedule.scope === 'one_off' && !hasValidServiceDate(schedule.serviceDate)) {
      return { canResolve: false, reason: 'One-off resolution requires a service date' };
    }
    if (
      schedule.scope === 'recurring' &&
      !isCompleteRecurringSchedule({
        start: schedule.startTime,
        end: schedule.endTime,
        days: schedule.days,
      })
    ) {
      return { canResolve: false, reason: 'NONCANONICAL_DAYSET_REJECTED' };
    }
  }

  return { canResolve: true };
}

function timeUsable(
  proposal: ReviewProposalLike,
  resolution: ReviewResolutionInput | null | undefined,
): boolean {
  if (hasUsableTime(proposal)) return true;
  const schedule = resolution?.scheduleResolution;
  if (!schedule) return false;
  return hasStrictCompleteTimes({ start: schedule.startTime, end: schedule.endTime });
}

function mergeTimes(
  proposal: ReviewProposalLike,
  resolution: ReviewResolutionInput | null | undefined,
): EffectiveOperation['times'] {
  const proposalTimes = (
    proposal as {
      times?: {
        start?: string;
        end?: string;
        days?: string[];
        scope?: string;
        dateReference?: string;
        dateReferences?: string[];
      };
    }
  ).times;
  const schedule = resolution?.scheduleResolution;

  const times: EffectiveOperation['times'] = {
    start: schedule?.startTime ?? proposalTimes?.start ?? '',
    end: schedule?.endTime ?? proposalTimes?.end ?? '',
    ...(proposalTimes?.dateReference ? { dateReference: proposalTimes.dateReference } : {}),
    ...(proposalTimes?.dateReferences ? { dateReferences: proposalTimes.dateReferences } : {}),
    scope: schedule?.scope === 'recurring' ? 'recurring_weekly' : proposalTimes?.scope,
  };

  if (schedule?.scope === 'recurring' && Array.isArray(schedule.days)) {
    times.days = normalizeWeekdaySet(schedule.days) ?? [];
  } else if (proposalTimes?.days) {
    times.days = proposalTimes.days;
  }

  return times;
}

export function mergeProposalWithResolution(
  proposal: ReviewProposalLike,
  resolution: ReviewResolutionInput | null | undefined,
): EffectiveOperation {
  const schedule = resolution?.scheduleResolution;
  const times = mergeTimes(proposal, resolution);

  return {
    serviceScope: proposal.serviceScope,
    ...(schedule?.scope === 'one_off' && schedule.serviceDate
      ? { serviceDate: schedule.serviceDate.trim() }
      : hasUsableDate(proposal)
        ? { serviceDate: (proposal as { serviceDate?: string }).serviceDate }
        : {}),
    times,
    ...(hasUsableLocation(proposal, resolution)
      ? { location: resolvedLocation(proposal, resolution) }
      : {}),
    reviewAction: undefined,
    locationCandidates: undefined,
    unresolvedReason: undefined,
  };
}
