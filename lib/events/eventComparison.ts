import { hashCalendarData, type CalendarData, type EprovalCalendarEntry } from './types';

const SHA256_HEX = /^[a-f0-9]{64}$/;

export interface EventComparison {
  readonly contentHash: string | null;
  readonly sourceUpdatedAt: string | null;
}

export function getEventComparison(
  entry: Pick<EprovalCalendarEntry, 'contentHash' | 'Timestamp'>,
): EventComparison {
  return {
    contentHash: normalizeComparisonValue(entry.contentHash),
    sourceUpdatedAt: normalizeComparisonValue(entry.Timestamp?._),
  };
}

export function isUnchangedEvent(persisted: EventComparison, incoming: EventComparison): boolean {
  if (persisted.contentHash !== null || incoming.contentHash !== null) {
    return (
      persisted.contentHash !== null &&
      incoming.contentHash !== null &&
      persisted.contentHash === incoming.contentHash
    );
  }

  return (
    persisted.sourceUpdatedAt !== null &&
    incoming.sourceUpdatedAt !== null &&
    persisted.sourceUpdatedAt === incoming.sourceUpdatedAt
  );
}

export function isValidContentHash(value: unknown): value is string {
  return typeof value === 'string' && SHA256_HEX.test(value);
}

export function ensureEventContentHash(
  entry: EprovalCalendarEntry,
  data: CalendarData,
): EprovalCalendarEntry {
  if (normalizeComparisonValue(entry.contentHash) !== null) return entry;
  return { ...entry, contentHash: hashCalendarData(data) };
}

function normalizeComparisonValue(value: string | null | undefined): string | null {
  return value && value.length > 0 ? value : null;
}
