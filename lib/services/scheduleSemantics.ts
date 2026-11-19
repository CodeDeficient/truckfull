import { hasCanonicalWeekdaySet } from './weekday';
import { normalizeOverrideTime } from './scheduleOverride';

export interface ScheduleTimesLike {
  readonly start?: string;
  readonly end?: string;
  readonly days?: unknown;
  readonly scope?: string;
}

export type ScheduleValidationDiagnostic =
  | 'DEGENERATE_TIMES_REJECTED'
  | 'NONCANONICAL_DAYSET_REJECTED';

export function normalizeCompleteTimes(
  times: ScheduleTimesLike | undefined,
): { start: string; end: string } | null {
  if (typeof times?.start !== 'string' || typeof times.end !== 'string') return null;
  const start = normalizeOverrideTime(times.start);
  const end = normalizeOverrideTime(times.end);
  if (!start || !end || start === end) return null;
  return { start, end };
}

export function hasStrictCompleteTimes(times: ScheduleTimesLike | undefined): boolean {
  return normalizeCompleteTimes(times) !== null;
}

export function isCompleteRecurringSchedule(times: ScheduleTimesLike | undefined): boolean {
  return hasStrictCompleteTimes(times) && hasCanonicalWeekdaySet(times?.days);
}

export function getScheduleValidationDiagnostic(
  times: ScheduleTimesLike | undefined,
): ScheduleValidationDiagnostic | null {
  if (typeof times?.start === 'string' && typeof times.end === 'string') {
    const start = normalizeOverrideTime(times.start);
    const end = normalizeOverrideTime(times.end);
    if (start && end && start === end) return 'DEGENERATE_TIMES_REJECTED';
  }
  if (times?.days !== undefined && !hasCanonicalWeekdaySet(times.days)) {
    return 'NONCANONICAL_DAYSET_REJECTED';
  }
  return null;
}
