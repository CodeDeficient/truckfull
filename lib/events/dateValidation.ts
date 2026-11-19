const MM_DD_YYYY = /^(\d{2})-(\d{2})-(\d{4})$/;
const HH_MM = /^(\d{2}):(\d{2})$/;

const SC_GA_LAT_MIN = 30;
const SC_GA_LAT_MAX = 36;
const SC_GA_LNG_MIN = -85;
const SC_GA_LNG_MAX = -75;

/**
 * Minimum event duration in hours for food-truck relevance.
 * Events shorter than this are skipped during ingestion — a food truck
 * needs setup, service, and teardown time, so sub-3-hour events (ribbon
 * cuttings, groundbreakings, photo ops) are not viable opportunities.
 */
export const MIN_EVENT_DURATION_HOURS = 3;

export interface BadDateResult {
  bad: boolean;
  reason: string;
}

export interface DurationCheckResult {
  /** true when the event is too short to be food-truck-relevant */
  tooShort: boolean;
  /** reason string when tooShort is true; empty otherwise */
  reason: string;
}

function parseMMDDYYYY(dateStr: string): Date | null {
  const match = dateStr.trim().match(MM_DD_YYYY);
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || year < 1900) return null;
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) {
    daysInMonth[1] = 29;
  }
  if (day > daysInMonth[month - 1]) return null;
  return new Date(year, month - 1, day);
}

export function isBadDate(startDate: string | null, endDate: string | null, _eventName: string): BadDateResult {
  if (!startDate && !endDate) {
    return { bad: true, reason: 'no_dates' };
  }

  const start = startDate ? parseMMDDYYYY(startDate) : null;
  const end = endDate ? parseMMDDYYYY(endDate) : null;

  if (startDate && (!start || Number.isNaN(start.getTime()))) {
    return { bad: true, reason: 'invalid_start' };
  }
  if (endDate && (!end || Number.isNaN(end.getTime()))) {
    return { bad: true, reason: 'invalid_end' };
  }

  if (start && end && start > end) {
    return { bad: true, reason: 'start_after_end' };
  }

  if (start) {
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
    const twoYearsFromNow = new Date(now.getFullYear() + 3, 11, 31);

    if (start < twoYearsAgo) {
      return { bad: true, reason: 'too_old' };
    }
    if (start > twoYearsFromNow) {
      return { bad: true, reason: 'too_far_future' };
    }
  }

  return { bad: false, reason: '' };
}

/**
 * Parses a 24-hour "HH:MM" time string (the format produced by
 * parseEprovalTime) into minutes since midnight. Returns null when the
 * string is absent or malformed.
 */
function parseHHMMToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = time.trim().match(HH_MM);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Checks whether an event meets the minimum duration for food-truck
 * relevance (MIN_EVENT_DURATION_HOURS). Uses start/end date plus optional
 * start/end time (24h "HH:MM"). When times are missing the check is
 * skipped — only same-day events with both times present can be rejected
 * as too short, since multi-day events always exceed the minimum.
 */
export function isTooShort(
  startDate: string | null,
  endDate: string | null,
  startTime: string | null,
  endTime: string | null,
): DurationCheckResult {
  const start = startDate ? parseMMDDYYYY(startDate) : null;
  const end = endDate ? parseMMDDYYYY(endDate) : null;
  if (!start || !end) return { tooShort: false, reason: '' };

  // Multi-day events always clear the minimum.
  const startMs = start.getTime();
  const endMs = end.getTime();
  const dayDiffMs = endMs - startMs;
  if (dayDiffMs > 0) return { tooShort: false, reason: '' };

  // Same-day event: need both times to evaluate duration.
  const startMin = parseHHMMToMinutes(startTime);
  const endMin = parseHHMMToMinutes(endTime);
  if (startMin === null || endMin === null) {
    return { tooShort: false, reason: '' };
  }

  const durationMin = endMin - startMin;
  // Tolerate end-before-start on time (e.g. end time omitted / carried over
  // midnight) by treating it as a full-day event — don't reject on bad data.
  if (durationMin < 0) return { tooShort: false, reason: '' };

  const minMinutes = MIN_EVENT_DURATION_HOURS * 60;
  if (durationMin < minMinutes) {
    return { tooShort: true, reason: `duration_${durationMin}min_below_${minMinutes}min` };
  }
  return { tooShort: false, reason: '' };
}

export function isWithinScGaBounds(
  lat: number | null,
  lng: number | null,
): boolean {
  if (lat == null || lng == null) {
    return false;
  }
  return (
    lat >= SC_GA_LAT_MIN &&
    lat <= SC_GA_LAT_MAX &&
    lng >= SC_GA_LNG_MIN &&
    lng <= SC_GA_LNG_MAX
  );
}

export function isValidUsBounds(lat: number, lng: number): boolean {
  if (lat < 25 || lat > 49 || lng < -125 || lng > -66) {
    return false;
  }
  if (lat > 44 && lng < -90) {
    return false;
  }
  return true;
}
