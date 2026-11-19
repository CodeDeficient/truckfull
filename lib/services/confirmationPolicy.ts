import type { ParsedPost, Times } from '@/lib/ai/parseFacebookPost';
import { PostType, type Classification } from './postClassifier';
import type { ValidationResult } from './postValidator';
import {
  hasStrictCompleteTimes,
  isCompleteRecurringSchedule,
  type ScheduleTimesLike,
} from './scheduleSemantics';

export interface ConfirmationProposal {
  serviceDate?: string;
  serviceScope?: 'recurring' | 'one_off_date' | 'unresolved_schedule';
  times?: Times;
  food_items?: string[];
  location?: { address?: string; fuzzy?: boolean };
}

interface ExpectedServiceOperationProposal {
  readonly serviceScope?: 'recurring' | 'one_off_date' | 'unresolved_schedule';
  readonly times?: ScheduleTimesLike;
  readonly food_items?: string[];
  readonly location?: { address?: string; fuzzy?: boolean };
}

export type ConfirmationUpdateType = 'menu' | 'location' | 'schedule';

const PRE_META_REQUIRED_UNITS = new Set<ConfirmationUpdateType>(['location', 'schedule']);

export function preMetaRequiredUnits(
  units: readonly ConfirmationUpdateType[],
): ConfirmationUpdateType[] {
  return units.filter((unit) => PRE_META_REQUIRED_UNITS.has(unit));
}

export type ConfirmationApplicationDiagnostic =
  | 'APPLY_EXPECTED_UNIT_MISSING'
  | 'LOCATION_REVIEW_REQUIRED';

export type ReviewActionName = 'ambiguous_location' | 'missing_location' | 'unresolved_schedule';

export interface OwnerActionDecision {
  updateType: ConfirmationUpdateType;
  reviewAction?: ReviewActionName;
  reason: string;
}

export function hasNonScheduleData(proposal: ConfirmationProposal): boolean {
  return Boolean(proposal.food_items?.length || proposal.location?.address);
}

export function isUnresolvedDatedProposal(proposal: ConfirmationProposal): boolean {
  return proposal.times?.scope === 'one_off_date' && !proposal.serviceDate;
}

function updateTypeForPostType(postType: PostType): ConfirmationUpdateType {
  if (postType === PostType.MENU) return 'menu';
  if (postType === PostType.LOCATION) return 'location';
  return 'schedule';
}

/**
 * Classifies an owner-action-required post into a yes/no confirmation
 * proposal versus a review that requires owner input (location selection,
 * location entry, or date resolution).
 */
export function decideOwnerAction(
  mergedOcrResult: ParsedPost,
  classification: Classification,
  validation: ValidationResult,
): OwnerActionDecision {
  const updateType = updateTypeForPostType(classification.type);

  if (mergedOcrResult.times?.scope === 'one_off_date') {
    if (!validation.resolvedServiceDate) {
      return {
        updateType,
        reviewAction: 'unresolved_schedule',
        reason:
          'Date-specific schedule could not be resolved from the post — owner input is required to determine the service date',
      };
    }
    if (!mergedOcrResult.location?.address) {
      return {
        updateType,
        reviewAction: 'missing_location',
        reason:
          'Date-specific schedule has no service location — owner must provide the location',
      };
    }
    return {
      updateType,
      reviewAction: 'ambiguous_location',
      reason:
        'Date-specific schedule has an ambiguous service location — owner must select the exact location',
    };
  }

  return {
    updateType,
    reviewAction: mergedOcrResult.location?.fuzzy ? 'ambiguous_location' : undefined,
    reason:
      mergedOcrResult.location?.fuzzy
        ? 'Service location is ambiguous — owner must select the exact location'
        : (validation.reason ?? 'Owner confirmation required'),
  };
}

/**
 * Recurring-scope proposals persist a non-fuzzy service location to
 * operating_hours[day].location (per-day), never the permanent truck
 * address — so the permanent-location source unit must not gate them.
 * Canonical persisted semantics first: Stage B review proposals carry
 * serviceScope === 'recurring'. Plain confirmations (Stage A) carry the
 * parser's raw times, so the canonical weekday-set predicate is the
 * backward-compatible discriminator — the same evidence updateTruckData
 * uses to route the location into operating_hours[day] and skip
 * updateLocation. A bare weekday under scope_missing is queued exactly
 * "for recurring interpretation", so it counts too. An arbitrary
 * times+location proposal without a canonical day set is NOT recurring
 * and keeps its permanent-location gate.
 */
function isRecurringScheduleScope(proposal: ExpectedServiceOperationProposal): boolean {
  if (proposal.serviceScope === 'one_off_date') return false;
  if (
    proposal.serviceScope === 'unresolved_schedule' &&
    proposal.times?.scope !== 'recurring_weekly'
  ) {
    return false;
  }
  return isCompleteRecurringSchedule(proposal.times);
}

export function deriveExpectedServiceOperationUnits(
  proposal: ExpectedServiceOperationProposal,
  isDatedSchedule: boolean,
): ConfirmationUpdateType[] {
  // Menu remains in the derived set so menu-only proposals still surface a
  // diagnostic; Pre-Meta callers scope the apply-or-report invariant to the
  // service operation via preMetaRequiredUnits and never write menu.
  const expected: ConfirmationUpdateType[] = [];
  if (proposal.food_items?.length) expected.push('menu');

  const recurringServiceLocation =
    !isDatedSchedule &&
    Boolean(proposal.location?.address) &&
    !proposal.location?.fuzzy &&
    isRecurringScheduleScope(proposal);
  if (!isDatedSchedule && proposal.location?.address && !recurringServiceLocation) {
    expected.push('location');
  }
  if (hasStrictCompleteTimes(proposal.times)) expected.push('schedule');
  return expected;
}

export function assessConfirmationApplication(
  expectedUnits: readonly ConfirmationUpdateType[],
  appliedUnits: readonly string[],
  idempotentlyAppliedUnits: readonly ConfirmationUpdateType[] = [],
):
  | { success: true }
  | {
      success: false;
      code: 'APPLY_EXPECTED_UNIT_MISSING';
      missingUnits: ConfirmationUpdateType[];
    } {
  // Pre-Meta contract: required units are schedule/location only. Menu
  // evidence may remain persisted and may be processed opportunistically,
  // but menu success/failure/non-application must never block valid
  // schedule/location terminalization.
  const requiredUnits = preMetaRequiredUnits(expectedUnits);
  const satisfied = new Set([...appliedUnits, ...idempotentlyAppliedUnits]);
  const missingUnits = requiredUnits.filter((unit) => !satisfied.has(unit));
  return missingUnits.length === 0
    ? { success: true }
    : { success: false, code: 'APPLY_EXPECTED_UNIT_MISSING', missingUnits };
}

export function getLocationReviewDiagnostic(
  proposal: ConfirmationProposal,
): 'LOCATION_REVIEW_REQUIRED' | null {
  return proposal.location?.address && proposal.location.fuzzy
    ? 'LOCATION_REVIEW_REQUIRED'
    : null;
}

export function getConfirmationUpdateTypes(
  proposal: ConfirmationProposal,
  isDatedSchedule: boolean,
): ConfirmationUpdateType[] {
  return deriveExpectedServiceOperationUnits(proposal, isDatedSchedule);
}

export function requiresAtomicDatedApplication(proposal: ConfirmationProposal): boolean {
  const hasCompleteDatedSchedule = Boolean(
    proposal.serviceDate && hasStrictCompleteTimes(proposal.times),
  );
  return hasCompleteDatedSchedule && hasNonScheduleData(proposal);
}
