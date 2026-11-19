const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function todayFormatted(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function isPlausibleYear(year: number): boolean {
  return year >= 2020 && year <= 2035;
}

export function resolveEventDate(
  rawDate: string | null,
  rawEndDate: string | null,
): { date: string | null; endDate: string | null; yearWasInferred: boolean } {
  if (!rawDate) return { date: null, endDate: null, yearWasInferred: false };

  const parsed = tryParseDate(rawDate);
  if (!parsed) return { date: null, endDate: null, yearWasInferred: false };

  if (isPlausibleYear(parsed.year)) {
    const endDate = rawEndDate ? tryParseDate(rawEndDate) : null;
    return {
      date: formatYMD(parsed.year, parsed.month, parsed.day),
      endDate: endDate ? formatYMD(resolveEndYear(parsed, endDate), endDate.month, endDate.day) : null,
      yearWasInferred: false,
    };
  }

  return { date: null, endDate: null, yearWasInferred: true };
}

interface DateParts {
  year: number;
  month: number;
  day: number;
}

function tryParseDate(raw: string): DateParts | null {
  const match = raw.match(ISO_DATE);
  if (match) {
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { year, month, day };
    }
  }
  return null;
}

function resolveEndYear(startParts: DateParts, endParts: DateParts): number {
  if (isPlausibleYear(endParts.year)) return endParts.year;

  let endYear = startParts.year;
  if (endParts.month < startParts.month) {
    endYear = startParts.year + 1;
  }
  return endYear;
}

function formatYMD(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}