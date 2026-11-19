const NON_ALPHANUMERIC_OR_SPACE = /[^a-z0-9\s]/g;
const WHITESPACE_RUNS = /\s+/g;

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface DuplicateMatch {
  eventIds: string[];
  confidence: ConfidenceLevel;
  matchReason: string;
  title: string;
  startDate: string;
  city: string;
}

export interface ExternalEventForDedup {
  id: string;
  title: string;
  event_start_date: string | null;
  location_address: string | null;
  city: string | null;
  state: string | null;
  location_lat: number | null;
  location_lng: number | null;
  source: string;
}

function normalizeForComparison(s: string): string {
  return s.toLowerCase().replaceAll(NON_ALPHANUMERIC_OR_SPACE, ' ').replaceAll(WHITESPACE_RUNS, ' ').trim();
}

export function findDuplicates(events: ExternalEventForDedup[]): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const processed = new Set<string>();

  for (let i = 0; i < events.length; i++) {
    if (processed.has(events[i].id)) continue;

    const group: ExternalEventForDedup[] = [events[i]];

    for (let j = i + 1; j < events.length; j++) {
      if (processed.has(events[j].id)) continue;

      const confidence = compareEvents(events[i], events[j]);
      if (confidence) {
        group.push(events[j]);
        processed.add(events[j].id);
      }
    }

    if (group.length > 1) {
      const best = group[0];
      const confidenceSet = new Set(group.slice(1).map((g) => compareEvents(best, g)!.confidence));
      const overallConfidence: ConfidenceLevel =
        confidenceSet.has('high') ? 'high' :
        confidenceSet.has('medium') ? 'medium' : 'low';

      matches.push({
        eventIds: group.map((g) => g.id),
        confidence: overallConfidence,
        matchReason: `Found in ${group.map((g) => g.source).join(', ')}`,
        title: best.title,
        startDate: best.event_start_date ?? '',
        city: best.city ?? '',
      });

      processed.add(best.id);
    }
  }

  return matches;
}

function compareEvents(
  a: ExternalEventForDedup,
  b: ExternalEventForDedup,
): { confidence: ConfidenceLevel; reason: string } | null {
  if (a.source === b.source) return null;

  const titleSimilarity = computeTitleSimilarity(a.title, b.title);
  const sameDate = normalizeDate(a.event_start_date) === normalizeDate(b.event_start_date);
  const sameCity = normalizeString(a.city) === normalizeString(b.city);
  const sameCoords = computeDistance(
    a.location_lat, a.location_lng,
    b.location_lat, b.location_lng,
  ) < 0.5;

  if (titleSimilarity >= 1 && sameDate && sameCity) {
    return { confidence: 'high', reason: 'Same title, date, and city' };
  }

  if (titleSimilarity > 0.8 && sameDate && sameCoords) {
    return { confidence: 'high', reason: 'Similar title, same date, same location' };
  }

  if (titleSimilarity >= 0.5 && sameDate && sameCity) {
    return { confidence: 'medium', reason: 'Similar title, same date, same city' };
  }

  if (titleSimilarity > 0.4 && sameDate && sameCity) {
    return { confidence: 'low', reason: 'Loosely similar title, same date and city' };
  }

  return null;
}

function normalizeDate(date: string | null): string {
  if (!date) return '';
  return date.split('T')[0];
}

function normalizeString(s: string | null): string {
  if (!s) return '';
  return s.toLowerCase().trim();
}

function computeTitleSimilarity(a: string, b: string): number {
  const na = normalizeForComparison(a);
  const nb = normalizeForComparison(b);

  if (na === nb) return 1;

  const wordsA = new Set(na.split(' '));
  const wordsB = new Set(nb.split(' '));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

function computeDistance(
  lat1: number | null, lng1: number | null,
  lat2: number | null, lng2: number | null,
): number {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Infinity;
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
