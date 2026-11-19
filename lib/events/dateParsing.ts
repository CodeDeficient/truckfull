import type { PermitStatus } from '@/lib/events/types';

const MM_DD_YYYY = /^(\d{2})-(\d{2})-(\d{4})$/;
const TWELVE_HOUR_TIME = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;

const VALID_STATUSES: ReadonlySet<string> = new Set<PermitStatus>([
  'Submitted',
  'More Info Needed',
  'Under Review',
  'Approved',
  'Closeout',
]);

const DAYS_IN_MONTH: ReadonlyArray<ReadonlyArray<number>> = [
  [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
];

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(month: number, year: number): number {
  const leapIndex = isLeapYear(year) ? 1 : 0;
  return DAYS_IN_MONTH[leapIndex][month - 1];
}

export function parseEprovalDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const match = raw.trim().match(MM_DD_YYYY);
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  if (month < 1 || month > 12 || day < 1 || year < 1900) return null;
  if (day > getDaysInMonth(month, year)) return null;
  return new Date(year, month - 1, day);
}

export function parseEprovalTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.trim().match(TWELVE_HOUR_TIME);
  if (!match) return null;
  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2];
  const period = match[3].toLowerCase();
  if (period === 'pm' && hours !== 12) {
    hours += 12;
  } else if (period === 'am' && hours === 12) {
    hours = 0;
  }
  return `${String(hours).padStart(2, '0')}:${minutes}`;
}

export function extractPermitStatus(partitionKey: string | null | undefined): PermitStatus {
  if (!partitionKey) return 'unknown';
  const prefixes = ['Public_', 'RSS_'];
  let afterPrefix = partitionKey;
  for (const prefix of prefixes) {
    if (partitionKey.startsWith(prefix)) {
      afterPrefix = partitionKey.slice(prefix.length);
      break;
    }
  }
  if (afterPrefix === partitionKey) return 'unknown';
  const guidIndex = afterPrefix.indexOf('_');
  const status = guidIndex === -1 ? afterPrefix : afterPrefix.slice(0, guidIndex);
  if (VALID_STATUSES.has(status)) return status as PermitStatus;
  return 'unknown';
}
