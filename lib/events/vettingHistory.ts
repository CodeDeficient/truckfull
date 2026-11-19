const NON_ALPHANUMERIC_OR_SPACE = /[^a-z0-9\s]/g;
const WHITESPACE_RUNS = /\s+/g;

export interface ExternalEventHistoryScore {
  readonly score: number;
  readonly eventCount: number;
}

export interface PreviousExternalEvent {
  readonly title: string;
  readonly event_start_date: string;
}

const CLOSE_EVENT_DISTANCE_METERS = 1000;

export function scoreExternalEventHistory(
  eventCount: number,
  averageDistanceMeters: number,
): ExternalEventHistoryScore {
  const normalizedCount = normalizeCount(eventCount);
  if (normalizedCount === 0) return { score: 0.3, eventCount: 0 };

  const averageDistance = Number.isFinite(averageDistanceMeters)
    ? averageDistanceMeters
    : Number.POSITIVE_INFINITY;
  let score: number;
  if (normalizedCount > 50) score = 0.9;
  else if (normalizedCount > 20) score = 0.7;
  else if (normalizedCount > 5) score = 0.5;
  else score = 0.3;

  if (averageDistance < CLOSE_EVENT_DISTANCE_METERS) {
    score = Math.min(1, score + 0.1);
  }

  return { score, eventCount: normalizedCount };
}

export function countSimilarPreviousEvents(
  eventName: string,
  events: readonly PreviousExternalEvent[],
  currentYear = new Date().getFullYear(),
): number {
  const normalizedNew = normalizeTitle(eventName);
  return events.filter((event) => isSimilarPreviousEvent(event, normalizedNew, currentYear)).length;
}

function isSimilarPreviousEvent(
  event: PreviousExternalEvent,
  normalizedNew: string,
  currentYear: number,
): boolean {
  if (!event.event_start_date) return false;
  if (new Date(event.event_start_date).getFullYear() >= currentYear) return false;

  const existingWords = new Set(normalizeTitle(event.title).split(' '));
  const newWords = new Set(normalizedNew.split(' '));
  const shorterSet = existingWords.size <= newWords.size ? existingWords : newWords;
  const longerSet = existingWords.size <= newWords.size ? newWords : existingWords;
  let matchCount = 0;

  for (const word of shorterSet) {
    if (longerSet.has(word) && word.length > 3) matchCount++;
  }

  return shorterSet.size > 0 && matchCount / shorterSet.size >= 0.5;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replaceAll(NON_ALPHANUMERIC_OR_SPACE, '')
    .replaceAll(WHITESPACE_RUNS, ' ')
    .trim();
}

function normalizeCount(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
