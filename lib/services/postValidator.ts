/**
 * PostValidator Service
 * Determines if a post should update truck data and whether confirmation is needed
 */

import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import { PostType, type Classification } from './postClassifier';
import { resolveDateReferences, resolveServiceDate } from './scheduleOverride';
import { hasCanonicalWeekdaySet } from './weekday';
import {
  getScheduleValidationDiagnostic,
  hasStrictCompleteTimes,
  isCompleteRecurringSchedule,
} from './scheduleSemantics';

export interface ValidationConfig {
  minConfidence: number;
  warnConfidence: number;
}

export const VALIDATION_CONFIG: ValidationConfig = {
  minConfidence: 0.5,
  warnConfidence: 0.7,
};

export interface ValidationResult {
  shouldUpdate: boolean;
  requiresConfirmation: boolean;
  reviewRequired?: boolean;
  reviewAction?: 'ambiguous_location' | 'missing_location' | 'unresolved_schedule';
  warning?: string;
  reason?: string;
  resolvedServiceDate?: string;
}

export interface ScheduleValidationContext {
  createdAt?: string;
  timezone?: string;
}

function validateScheduleData(
  ocrResult: ParsedPost,
  context?: ScheduleValidationContext,
): ValidationResult | null {
  const scope = ocrResult.times?.scope;
  const hasStart = Boolean(ocrResult.times?.start);
  const hasEnd = Boolean(ocrResult.times?.end);
  const hasCompleteTimes = hasStrictCompleteTimes(ocrResult.times);
  const hasCanonicalDaySet = hasCanonicalWeekdaySet(ocrResult.times?.days);
  const diagnostic = getScheduleValidationDiagnostic(ocrResult.times);

  if (
    diagnostic === 'DEGENERATE_TIMES_REJECTED' ||
    (diagnostic === 'NONCANONICAL_DAYSET_REJECTED' &&
      (scope === 'recurring_weekly' || scope === 'scope_missing' || !scope))
  ) {
    return { shouldUpdate: false, requiresConfirmation: false, reason: diagnostic };
  }

  if (scope === 'recurring_weekly') {
    if (isCompleteRecurringSchedule(ocrResult.times)) {
      return { shouldUpdate: true, requiresConfirmation: false };
    }
    return {
      shouldUpdate: false,
      requiresConfirmation: false,
      reason: 'Schedule is missing complete times or weekday reference',
    };
  }

  if (scope === 'scope_missing' || !scope) {
    if (hasCanonicalDaySet && hasCompleteTimes) {
      return {
        shouldUpdate: false,
        requiresConfirmation: true,
        reason: 'Bare weekday schedule needs owner confirmation for recurring interpretation',
      };
    }
    return {
      shouldUpdate: false,
      requiresConfirmation: false,
      reason: hasCanonicalDaySet
        ? 'Schedule has weekday but incomplete times'
        : 'Schedule has no weekday reference - cannot determine recurring schedule',
    };
  }

  if (scope === 'one_off_unsupported') {
    return {
      shouldUpdate: false,
      requiresConfirmation: false,
      reason: 'Date-specific schedule updates are not yet supported',
    };
  }

  if (scope === 'one_off_date') {
    if (!hasCompleteTimes) {
      return {
        shouldUpdate: false,
        requiresConfirmation: false,
        reviewRequired: true,
        reviewAction: 'unresolved_schedule',
        reason: 'Date-specific schedule is missing complete times — owner input is required',
      };
    }

    const dateReferences = ocrResult.times?.dateReferences?.length
      ? ocrResult.times.dateReferences
      : [ocrResult.times?.dateReference ?? ''];
    const resolved = dateReferences.length > 1
      ? resolveDateReferences({
          dateReferences,
          createdAt: context?.createdAt ?? '',
          timezone: context?.timezone ?? '',
        })
      : resolveServiceDate({
          dateReference: dateReferences[0] ?? '',
          createdAt: context?.createdAt ?? '',
          timezone: context?.timezone ?? '',
        });

    if (resolved.status === 'unresolved') {
      return {
        shouldUpdate: false,
        requiresConfirmation: false,
        reviewRequired: true,
        reviewAction: 'unresolved_schedule',
        reason: `Date-specific schedule could not be resolved: ${resolved.reason}`,
      };
    }

    if (!ocrResult.location?.address) {
      return {
        shouldUpdate: false,
        requiresConfirmation: false,
        reviewRequired: true,
        reviewAction: 'missing_location',
        reason: 'Date-specific schedule is missing a service location',
        resolvedServiceDate: resolved.serviceDate,
      };
    }

    if (ocrResult.location.fuzzy) {
      return {
        shouldUpdate: false,
        requiresConfirmation: false,
        reviewRequired: true,
        reviewAction: 'ambiguous_location',
        reason: 'Date-specific schedule has an ambiguous service location',
        resolvedServiceDate: resolved.serviceDate,
      };
    }

    return {
      shouldUpdate: true,
      requiresConfirmation: false,
      resolvedServiceDate: resolved.serviceDate,
    };
  }

  if (hasStart || hasEnd || hasCanonicalDaySet) {
    return {
      shouldUpdate: false,
      requiresConfirmation: false,
      reason: 'Schedule has unrecognized scope',
    };
  }

  return null;
}

export function shouldUpdateData(
  ocrResult: ParsedPost,
  classification: Classification,
  context?: ScheduleValidationContext,
): ValidationResult {
  if (classification.type === PostType.UNRELATED) {
    return {
      shouldUpdate: false,
      requiresConfirmation: false,
      reason: classification.reason,
    };
  }

  const hasScheduleData = Boolean(ocrResult.times?.scope || ocrResult.times?.start);
  const isMixedWithSchedule = classification.type === PostType.MIXED && hasScheduleData;

  let resolvedScheduleDate: string | undefined;

  if (classification.type === PostType.SCHEDULE || isMixedWithSchedule) {
    const scheduleResult = validateScheduleData(ocrResult, context);
    if (scheduleResult && !scheduleResult.shouldUpdate) {
      return scheduleResult;
    }
    if (scheduleResult?.resolvedServiceDate) {
      resolvedScheduleDate = scheduleResult.resolvedServiceDate;
    }
  }

  if (classification.type === PostType.LOCATION || classification.type === PostType.MIXED) {
    if (!ocrResult.location?.address) {
      return {
        shouldUpdate: false,
        requiresConfirmation: false,
        reviewRequired: true,
        reviewAction: 'missing_location',
        reason: 'Location update is missing a service location',
      };
    }
    if (ocrResult.location.fuzzy) {
      return {
        shouldUpdate: false,
        requiresConfirmation: false,
        reviewRequired: true,
        reviewAction: 'ambiguous_location',
        reason: 'Service location is ambiguous — owner must select the exact location',
      };
    }
  }

  if (classification.type === PostType.AMBIGUOUS) {
    return {
      shouldUpdate: false,
      requiresConfirmation: true,
      reason: classification.reason,
    };
  }

  if (classification.confidence < VALIDATION_CONFIG.minConfidence) {
    return {
      shouldUpdate: false,
      requiresConfirmation: true,
      warning: 'Please confirm this post before we apply it.',
      reason: `Confidence ${Math.round(classification.confidence * 100)}% below minimum ${Math.round(VALIDATION_CONFIG.minConfidence * 100)}% — owner confirmation required`,
    };
  }

  if (classification.confidence < VALIDATION_CONFIG.warnConfidence) {
    return {
      shouldUpdate: true,
      requiresConfirmation: true,
      warning: 'Please confirm this post before we apply it.',
      reason: `Confidence ${Math.round(classification.confidence * 100)}% below warn threshold ${Math.round(VALIDATION_CONFIG.warnConfidence * 100)}% — owner confirmation required`,
    };
  }

  const hasData =
    (ocrResult.food_items && ocrResult.food_items.length > 0) ||
    Boolean(ocrResult.location?.address) ||
    Boolean(ocrResult.times?.start);

  if (!hasData) {
    return {
      shouldUpdate: false,
      requiresConfirmation: false,
      reason: 'No valid data to update',
    };
  }

  return {
    shouldUpdate: true,
    requiresConfirmation: false,
    ...(resolvedScheduleDate ? { resolvedServiceDate: resolvedScheduleDate } : {}),
  };
}
