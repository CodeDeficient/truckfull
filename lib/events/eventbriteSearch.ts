import { logError, logMessage } from '@/lib/logging';

const EVENTBRITE_SEARCH_URL = 'https://www.eventbriteapi.com/v3/destination/search/';
const MAX_429_RETRIES = 3;
const SEARCH_PAGE_SIZE = 10;

interface EventbriteSearchResult {
  id: string;
  name: string;
  start_date: string;
  primary_venue_id?: string;
  primary_organizer_id?: string;
  summary?: string;
}

interface EventbriteOrganizerHistory {
  organizerId: string;
  organizerName: string;
  totalEvents: number;
  pastEvents: number;
  futureEvents: number;
  topVenues: Array<{ venueId: string; venueName: string; count: number }>;
  sampleEventNames: string[];
}

interface EventbriteVenueHistory {
  venueId: string;
  venueName: string;
  totalEvents: number;
  pastEvents: number;
  futureEvents: number;
  topOrganizers: Array<{ organizerId: string; organizerName: string; count: number }>;
  sampleEventNames: string[];
}

async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  for (let i = 0; i < MAX_429_RETRIES; i++) {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15_000),
    });
    if (response.ok) return response;
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delaySec = retryAfter
        ? Number.parseInt(retryAfter, 10)
        : Math.min(5 * Math.pow(2, i), 30);
      await new Promise((r) => setTimeout(r, delaySec * 1000));
      continue;
    }
    throw new Error(`Eventbrite search error: ${response.status} ${response.statusText}`);
  }
  throw new Error('Eventbrite search: max retries exceeded');
}

async function searchByOrganizer(
  organizerId: string,
  apiKey: string,
  maxPages = 2,
): Promise<EventbriteSearchResult[]> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const results: EventbriteSearchResult[] = [];
  let continuation: string | null = null;
  let isFirstPage = true;
  let pageNum = 0;

  while ((isFirstPage || continuation) && pageNum < maxPages) {
    isFirstPage = false;
    pageNum++;

    const body: Record<string, unknown> = {
      event_search: {
        organizer: organizerId,
        page_size: SEARCH_PAGE_SIZE,
      },
    };
    if (continuation) body.continuation = continuation;

    try {
      const response = await fetchWithRetry(EVENTBRITE_SEARCH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = JSON.parse(await response.text());
      const events = data.events?.results ?? [];
      for (const e of events) {
        results.push({
          id: e.id,
          name: e.name ?? '',
          start_date: e.start_date ?? '',
          primary_venue_id: e.primary_venue_id,
          primary_organizer_id: e.primary_organizer_id,
          summary: e.summary,
        });
      }

      continuation = data.events?.pagination?.continuation ?? null;
      if (!continuation) break;
    } catch (error) {
      logError(`Eventbrite organizer search failed (page ${pageNum})`, error);
      break;
    }
  }

  return results;
}

async function searchByVenue(
  venueId: string,
  apiKey: string,
  maxPages = 2,
): Promise<EventbriteSearchResult[]> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const results: EventbriteSearchResult[] = [];
  let continuation: string | null = null;
  let isFirstPage = true;
  let pageNum = 0;

  while ((isFirstPage || continuation) && pageNum < maxPages) {
    isFirstPage = false;
    pageNum++;

    const body: Record<string, unknown> = {
      event_search: {
        venue: venueId,
        page_size: SEARCH_PAGE_SIZE,
      },
    };
    if (continuation) body.continuation = continuation;

    try {
      const response = await fetchWithRetry(EVENTBRITE_SEARCH_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = JSON.parse(await response.text());
      const events = data.events?.results ?? [];
      for (const e of events) {
        results.push({
          id: e.id,
          name: e.name ?? '',
          start_date: e.start_date ?? '',
          primary_venue_id: e.primary_venue_id,
          primary_organizer_id: e.primary_organizer_id,
          summary: e.summary,
        });
      }

      continuation = data.events?.pagination?.continuation ?? null;
      if (!continuation) break;
    } catch (error) {
      logError(`Eventbrite venue search failed (page ${pageNum})`, error);
      break;
    }
  }

  return results;
}

function classifyEvents(events: EventbriteSearchResult[]): {
  past: number;
  future: number;
  sampleNames: string[];
} {
  const today = new Date().toISOString().split('T')[0];
  let past = 0;
  let future = 0;
  const names = new Set<string>();

  for (const e of events) {
    if (e.start_date < today) past++;
    else future++;
    if (names.size < 5) names.add(e.name);
  }

  return { past, future, sampleNames: [...names] };
}

export async function getOrganizerHistory(
  organizerId: string,
  organizerName: string,
  apiKey: string,
): Promise<EventbriteOrganizerHistory | null> {
  try {
    const events = await searchByOrganizer(organizerId, apiKey);
    if (events.length === 0) return null;

    const { past, future, sampleNames } = classifyEvents(events);

    const venueCounts = new Map<string, { venueId: string; venueName: string; count: number }>();
    for (const e of events) {
      if (e.primary_venue_id) {
        const existing = venueCounts.get(e.primary_venue_id);
        if (existing) {
          existing.count++;
        } else {
          venueCounts.set(e.primary_venue_id, {
            venueId: e.primary_venue_id,
            venueName: `Venue ${e.primary_venue_id}`,
            count: 1,
          });
        }
      }
    }

    const topVenues = [...venueCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

    logMessage(
      `Eventbrite: organizer "${organizerName}" (${organizerId}) has ${events.length} events (${past} past, ${future} future)`,
    );

    return {
      organizerId,
      organizerName,
      totalEvents: events.length,
      pastEvents: past,
      futureEvents: future,
      topVenues,
      sampleEventNames: sampleNames,
    };
  } catch (error) {
    logError(`Failed to get Eventbrite organizer history for ${organizerId}`, error);
    return null;
  }
}

export async function getVenueHistory(
  venueId: string,
  apiKey: string,
): Promise<EventbriteVenueHistory | null> {
  try {
    const events = await searchByVenue(venueId, apiKey);
    if (events.length === 0) return null;

    const { past, future, sampleNames } = classifyEvents(events);

    const orgCounts = new Map<
      string,
      { organizerId: string; organizerName: string; count: number }
    >();
    for (const e of events) {
      if (e.primary_organizer_id) {
        const existing = orgCounts.get(e.primary_organizer_id);
        if (existing) {
          existing.count++;
        } else {
          orgCounts.set(e.primary_organizer_id, {
            organizerId: e.primary_organizer_id,
            organizerName: `Organizer ${e.primary_organizer_id}`,
            count: 1,
          });
        }
      }
    }

    const topOrganizers = [...orgCounts.values()].sort((a, b) => b.count - a.count).slice(0, 3);

    const venueName = `Venue ${venueId}`;

    logMessage(
      `Eventbrite: venue ${venueId} has ${events.length} events (${past} past, ${future} future)`,
    );

    return {
      venueId,
      venueName,
      totalEvents: events.length,
      pastEvents: past,
      futureEvents: future,
      topOrganizers,
      sampleEventNames: sampleNames,
    };
  } catch (error) {
    logError(`Failed to get Eventbrite venue history for ${venueId}`, error);
    return null;
  }
}

export function scoreEventbriteHistory(
  history: EventbriteOrganizerHistory | EventbriteVenueHistory,
): number {
  if (history.totalEvents === 0) return 0;

  const pastRatio = history.pastEvents / history.totalEvents;

  let score = 0;
  if (history.totalEvents >= 10) score = 0.3;
  else if (history.totalEvents >= 5) score = 0.2;
  else if (history.totalEvents >= 2) score = 0.1;

  if (pastRatio >= 0.7) score += 0.4;
  else if (pastRatio >= 0.4) score += 0.25;
  else if (pastRatio >= 0.2) score += 0.1;

  score += Math.min(history.futureEvents * 0.05, 0.3);

  return Math.min(score, 1);
}
