const DATE_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat | null>();
const HOUR_MINUTE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const WEEKDAY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

/**
 * Timezone validation and date-key formatting run inside the render path, where
 * the same handful of truck timezones are formatted thousands of times per
 * interaction (measured: 39,304 formatters built across four scroll-zoom steps).
 * Constructing an Intl.DateTimeFormat is comparatively expensive, so formatters
 * are built once per timezone and reused. A null entry records an invalid
 * timezone so repeated failures do not re-attempt construction.
 */
function getDateKeyFormatter(timezone: string): Intl.DateTimeFormat | null {
  if (DATE_KEY_FORMATTERS.has(timezone)) {
    return DATE_KEY_FORMATTERS.get(timezone) ?? null;
  }

  let formatter: Intl.DateTimeFormat | null;
  try {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    formatter = null;
  }
  DATE_KEY_FORMATTERS.set(timezone, formatter);
  return formatter;
}

export function isValidTimezoneCached(timezone: string): boolean {
  return getDateKeyFormatter(timezone) !== null;
}

export function dateKeyInTimezoneCached(createdAt: string, timezone: string): string | null {
  const instant = new Date(createdAt);
  if (Number.isNaN(instant.getTime())) return null;

  const formatter = getDateKeyFormatter(timezone);
  if (formatter === null) return null;

  const values: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== 'literal') values[part.type] = part.value;
  }
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatHourMinuteInTimezone(
  now: Date,
  timezone: string,
): { hour: number; minute: number } {
  let formatter = HOUR_MINUTE_FORMATTERS.get(timezone);
  if (formatter === undefined) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    HOUR_MINUTE_FORMATTERS.set(timezone, formatter);
  }
  const parts = formatter.formatToParts(now);
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value),
    minute: Number(parts.find((part) => part.type === 'minute')?.value),
  };
}

export function formatClockTimeInTimezone(now: Date, timezone?: string | null): string {
  if (!timezone) return now.toTimeString().slice(0, 5);
  try {
    const { hour, minute } = formatHourMinuteInTimezone(now, timezone);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  } catch {
    return now.toTimeString().slice(0, 5);
  }
}

export function formatWeekdayInTimezone(now: Date, timezone?: string | null): string {
  const key = timezone ?? 'local';
  let formatter = WEEKDAY_FORMATTERS.get(key);
  if (formatter === undefined) {
    try {
      formatter = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        ...(timezone ? { timeZone: timezone } : {}),
      });
    } catch {
      formatter = new Intl.DateTimeFormat('en-US', { weekday: 'long' });
    }
    WEEKDAY_FORMATTERS.set(key, formatter);
  }
  return formatter.format(now).toLowerCase();
}
