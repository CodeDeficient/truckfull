import {
  hashCalendarData,
  type EprovalCalendarEntry,
  type EventbriteMetadata,
} from '@/lib/events/types';
import { logError, logMessage } from '@/lib/logging';
import { getEventComparison, isUnchangedEvent, type EventComparison } from './eventComparison';

const EVENTBRITE_ERROR_STATUS = /Eventbrite API error: (\d{3})/u;
const RATE_LIMIT_HEADER = /(\d+)\/(\d+)\s+reset=(\d+)s/;

export interface EventbriteEventResult {
  id: string;
  name?: string;
  summary?: string;
  url?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  primary_venue_id?: string;
  status?: string;
  changed?: string;
  created?: string;
  category?: { name?: string };
  organizer?: { name?: string };
  tags?: EventbriteTag[];
  primary_venue?: VenueResponse;
  primary_organizer?: { name?: string };
}

interface EventbriteTag {
  prefix?: string;
  tag?: string;
  display_name?: string;
}

type ResolvedVenue = { name: string; address: string; lat: number | null; lng: number | null };

const SEARCH_EXPANSIONS = { 'expand.destination_event': ['primary_venue', 'primary_organizer'] };

interface DestinationSearchResponse {
  events: {
    results: EventbriteEventResult[];
    pagination: {
      object_count: number;
      page_size: number;
      continuation: string | null;
    };
  };
}

interface VenueAddress {
  address_1?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  latitude?: string;
  longitude?: string;
}

interface VenueResponse {
  id?: string;
  name?: string;
  address?: VenueAddress;
}

export interface EventbriteEnrichmentFailure {
  readonly venueId: string;
  readonly code: string;
}

function dateToMMDDYYYY(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[1]}-${parts[2]}-${parts[0]}`;
}

function time24toAMPM(timeStr: string): string | undefined {
  if (!timeStr || !timeStr.trim()) return undefined;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return undefined;
  const hours = Number.parseInt(parts[0], 10);
  const minutes = parts[1];
  if (Number.isNaN(hours)) return undefined;
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${String(displayHours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function tagNames(tags: readonly EventbriteTag[], prefix: string): string[] {
  return tags
    .filter((tag) => tag.prefix === prefix)
    .map((tag) => tag.display_name?.trim() ?? '')
    .filter((name) => name.length > 0);
}

function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

export function buildEventbriteMetadata(event: EventbriteEventResult): EventbriteMetadata {
  const tags = event.tags ?? [];
  return {
    category: tagNames(tags, 'EventbriteCategory')[0] ?? null,
    subcategory: tagNames(tags, 'EventbriteSubCategory')[0] ?? null,
    format: tagNames(tags, 'EventbriteFormat')[0] ?? null,
    organizerTags: tagNames(tags, 'OrganizerTag'),
    organizerName: nonEmpty(event.primary_organizer?.name ?? event.organizer?.name),
    venueCity: nonEmpty(event.primary_venue?.address?.city),
    venueRegion: nonEmpty(event.primary_venue?.address?.region),
  };
}

function eventToEntry(event: EventbriteEventResult): EprovalCalendarEntry {
  const id = event.id;
  const startDate = event.start_date ? dateToMMDDYYYY(event.start_date) : '';
  const endDate = event.end_date ? dateToMMDDYYYY(event.end_date) : startDate;
  const startTime = time24toAMPM(event.start_time ?? '');
  const endTime = time24toAMPM(event.end_time ?? '');

  const calendarData = {
    calendarTitle: event.name ?? '',
    calendarStartDate: startDate,
    calendarEndDate: endDate,
    calendarDescription: event.summary ?? '',
    calendarCategory: event.category?.name ?? '',
    calendarOrganization: event.organizer?.name ?? '',
    calendarWebsite: event.url ?? '',
    calendarStartTime: startTime,
    calendarEndTime: endTime,
    calendarPermitStartDate: startDate,
    calendarPermitEndDate: endDate,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${id}` },
    RowKey: { $: 'Edm.String', _: id },
    Timestamp: { $: 'Edm.DateTime', _: event.changed ?? new Date().toISOString() },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `EB_${id}` },
    contentHash: hashCalendarData(calendarData),
    eventbrite: buildEventbriteMetadata(event),
  };
}

export function parseEventbriteResponse(json: string): EprovalCalendarEntry[] {
  const response: DestinationSearchResponse = JSON.parse(json);
  const results = response.events?.results ?? [];
  return results.map((e) => eventToEntry(e));
}

export function parseVenueResponse(json: string): ResolvedVenue | null {
  return venueToLocation(JSON.parse(json));
}

function venueToLocation(venue: VenueResponse | null | undefined): ResolvedVenue | null {
  if (!venue || !venue.name) return null;

  const name = venue.name;
  const addr = venue.address;
  const rawLat = addr?.latitude ? Number.parseFloat(addr.latitude) : null;
  const rawLng = addr?.longitude ? Number.parseFloat(addr.longitude) : null;
  const lat = rawLat != null && !Number.isNaN(rawLat) ? rawLat : null;
  const lng = rawLng != null && !Number.isNaN(rawLng) ? rawLng : null;

  if (!addr?.address_1 && !addr?.city) {
    return { name, address: name, lat, lng };
  }

  const parts = [name];
  if (addr.address_1?.trim()) parts.push(addr.address_1.trim());
  if (addr.city?.trim() && addr.region) {
    const regionPostal = `${addr.region.trim()} ${addr.postal_code ?? ''}`.trim();
    parts.push(`${addr.city.trim()}, ${regionPostal}`);
  }
  return { name, address: parts.join(', '), lat, lng };
}

function computeBbox(
  lat: number,
  lng: number,
  radiusMiles: number,
): { left: string; top: string; bottom: string; right: string } {
  const latDegPerMile = 1 / 69;
  const lngDegPerMile = 1 / (69 * Math.cos((lat * Math.PI) / 180));
  const south = lat - radiusMiles * latDegPerMile;
  const north = lat + radiusMiles * latDegPerMile;
  const west = lng - radiusMiles * lngDegPerMile;
  const east = lng + radiusMiles * lngDegPerMile;
  return {
    left: west.toFixed(2),
    top: north.toFixed(2),
    bottom: south.toFixed(2),
    right: east.toFixed(2),
  };
}

export interface EventbriteConfig {
  windowBudget: number;
  safetyBuffer: number;
  maxPages: number;
  windowMs: number;
}

export function getEventbriteConfig(): EventbriteConfig {
  return {
    windowBudget: readEnvInt('EVENTBRITE_WINDOW_BUDGET', 2000),
    safetyBuffer: readEnvInt('EVENTBRITE_SAFETY_BUFFER', 100),
    maxPages: readEnvInt('EVENTBRITE_MAX_PAGES', 20),
    windowMs: readEnvInt('EVENTBRITE_WINDOW_MS', 1_223_000),
  };
}

function readEnvInt(key: string, defaultVal: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return defaultVal;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultVal;
  return parsed;
}

const RATE_LIMIT_DELAY_MS = 1000;
const VENUE_DELAY_MS = 500;
const MAX_429_RETRIES = 5;
const MAX_KEYWORD_PAGES = 1;
const MIN_REMAINING_BEFORE_PAUSE = 10;

function getEnrichmentFailureCode(error: unknown): string {
  if (error instanceof Error) {
    const status = error.message.match(EVENTBRITE_ERROR_STATUS)?.[1];
    if (status) return `http_${status}`;
  }
  return 'request_failed';
}

const FOOD_TRUCK_KEYWORDS = [
  'food truck',
  'festival',
  'BBQ',
  'brewery',
  'music',
  'art',
  'street fair',
  'block party',
  'cook-off',
  'seafood festival',
  'live music',
  'car show',
  'bike week',
  'beer festival',
  'oyster roast',
  'taste of',
  'chili',
  'wine festival',
];

export class EventbriteRateLimitExhausted extends Error {
  constructor(
    public readonly usedCalls: number,
    public readonly budget: number,
    public readonly resetAt: number | null,
  ) {
    super(
      `Eventbrite rate limit budget exhausted: ${usedCalls}/${budget} calls used. ` +
        `Resets at ${resetAt ? new Date(resetAt).toISOString() : 'unknown'}. ` +
        `Remaining Eventbrite cities will be skipped.`,
    );
    this.name = 'EventbriteRateLimitExhausted';
  }
}

export class EventbriteRateLimiter {
  private callsUsed = 0;
  private windowStart = Date.now();
  private serverRemaining: number | null = null;
  private serverResetAt: number | null = null;
  private consecutive429s = 0;
  private perCityCalls = 0;
  private readonly config: EventbriteConfig;

  constructor() {
    this.config = getEventbriteConfig();
  }

  private get effectiveBudget(): number {
    return this.config.windowBudget - this.config.safetyBuffer;
  }

  private maybeResetWindow(): void {
    const now = Date.now();
    if (now - this.windowStart >= this.config.windowMs) {
      logMessage('Eventbrite rate limiter: resetting window', {
        previousUsed: this.callsUsed,
        windowMs: this.config.windowMs,
      });
      this.callsUsed = 0;
      this.windowStart = now;
    }
  }

  updateFromHeaders(headers: Headers): void {
    const rateLimitHeader = headers.get('x-rate-limit');
    if (rateLimitHeader) {
      const match = rateLimitHeader.match(RATE_LIMIT_HEADER);
      if (match) {
        this.serverRemaining = Number.parseInt(match[2], 10) - Number.parseInt(match[1], 10);
        this.serverResetAt = Date.now() + Number.parseInt(match[3], 10) * 1000;
      }
    }
  }

  recordSuccess(): void {
    this.consecutive429s = 0;
  }

  recordCall(): void {
    this.maybeResetWindow();
    this.callsUsed++;
    this.perCityCalls++;
  }

  async acquireOrThrow(): Promise<void> {
    this.maybeResetWindow();

    if (this.serverRemaining !== null && this.serverRemaining < MIN_REMAINING_BEFORE_PAUSE && this.serverResetAt) {
        const waitMs = Math.max(this.serverResetAt - Date.now() + 1000, 2000);
        logMessage(
          `Eventbrite: server rate limit nearly exhausted (${this.serverRemaining} remaining), waiting ${Math.round(waitMs / 1000)}s`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        this.serverRemaining = null;
        this.serverResetAt = null;
        return;
      }

    if (this.callsUsed >= this.effectiveBudget) {
      throw new EventbriteRateLimitExhausted(this.callsUsed, this.effectiveBudget, this.serverResetAt);
    }

    if (this.serverRemaining !== null && this.serverRemaining <= 0) {
      throw new EventbriteRateLimitExhausted(this.callsUsed, this.effectiveBudget, this.serverResetAt);
    }
  }

  record429(): void {
    this.consecutive429s++;
    if (this.consecutive429s >= MAX_429_RETRIES) {
      throw new EventbriteRateLimitExhausted(
        this.callsUsed,
        this.effectiveBudget,
        this.serverResetAt,
      );
    }
  }

  get remaining(): number {
    return this.effectiveBudget - this.callsUsed;
  }

  timeUntilReset(): number {
    this.maybeResetWindow();
    const elapsed = Date.now() - this.windowStart;
    return Math.max(0, this.config.windowMs - elapsed);
  }

  resetWindow(): void {
    this.callsUsed = 0;
    this.windowStart = Date.now();
  }

  resetPerCityCount(): void {
    this.perCityCalls = 0;
  }

  get perCityCallCount(): number {
    return this.perCityCalls;
  }
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  limiter: EventbriteRateLimiter,
): Promise<Response> {
  for (let i = 0; i < MAX_429_RETRIES; i++) {
    await limiter.acquireOrThrow();
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(30_000),
    });
    limiter.recordCall();
    limiter.updateFromHeaders(response.headers);
    if (response.ok) {
      limiter.recordSuccess();
      return response;
    }
    if (response.status === 429) {
      limiter.record429();
      const retryAfter = response.headers.get('Retry-After');
      const delaySec = retryAfter
        ? Number.parseInt(retryAfter, 10)
        : Math.min(5 * Math.pow(2, i), 60);
      logMessage(
        `Eventbrite 429 rate limited, waiting ${delaySec}s (attempt ${i + 1}/${MAX_429_RETRIES})`,
      );
      await new Promise((r) => setTimeout(r, delaySec * 1000));
      continue;
    }
    throw new Error(`Eventbrite API error: ${response.status} ${response.statusText}`);
  }
  throw new Error('Eventbrite: max retries exceeded after rate limiting');
}

function authHeaders(apiKey: string): Record<string, string> {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

export async function fetchEventbriteEventsByIds(
  ids: readonly string[],
  apiKey: string,
  limiter: EventbriteRateLimiter,
): Promise<EventbriteEventResult[]> {
  const params = new URLSearchParams({
    event_ids: ids.join(','),
    expand: 'primary_venue,primary_organizer',
    page_size: String(ids.length),
  });
  const url = `https://www.eventbriteapi.com/v3/destination/events/?${params.toString()}`;
  const response = await fetchWithRetry(url, { headers: authHeaders(apiKey) }, limiter);
  const json = (await response.json()) as { events?: EventbriteEventResult[] };
  return json.events ?? [];
}

export async function fetchEventbriteFullDescription(
  id: string,
  apiKey: string,
  limiter: EventbriteRateLimiter,
): Promise<string | null> {
  const url = `https://www.eventbriteapi.com/v3/events/${id}/description/`;
  try {
    const response = await fetchWithRetry(url, { headers: authHeaders(apiKey) }, limiter);
    const json = (await response.json()) as { description?: string };
    return json.description ?? null;
  } catch (error) {
    if (getEnrichmentFailureCode(error) === 'http_404') return null;
    throw error;
  }
}

async function fetchVenueDetails(
  venueId: string,
  apiKey: string,
  limiter: EventbriteRateLimiter,
  onEnrichmentFailure?: (failure: EventbriteEnrichmentFailure) => void,
): Promise<ResolvedVenue | null> {
  const url = `https://www.eventbriteapi.com/v3/venues/${venueId}/`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetchWithRetry(url, { headers }, limiter);
    const text = await response.text();
    return parseVenueResponse(text);
  } catch (error) {
    logError(`Eventbrite venue lookup failed for venue ${venueId}`, error);
    onEnrichmentFailure?.({ venueId, code: getEnrichmentFailureCode(error) });
    return null;
  }
}

function seedVenueCache(
  rawResults: readonly EventbriteEventResult[],
  venueCache: Map<string, ResolvedVenue | null>,
): void {
  for (const rawEvent of rawResults) {
    const venueId = rawEvent.primary_venue_id;
    if (!venueId || !rawEvent.primary_venue || venueCache.has(venueId)) continue;
    const venue = venueToLocation(rawEvent.primary_venue);
    if (venue) venueCache.set(venueId, venue);
  }
}

async function resolveVenuesForEntries(
  entries: EprovalCalendarEntry[],
  rawResults: EventbriteEventResult[],
  apiKey: string,
  limiter: EventbriteRateLimiter,
  venueCache: Map<string, ResolvedVenue | null>,
  onEnrichmentFailure?: (failure: EventbriteEnrichmentFailure) => void,
): Promise<void> {
  seedVenueCache(rawResults, venueCache);
  const venueIds = new Set<string>();
  for (const entry of entries) {
    const rawEvent = rawResults.find((r) => r.id === entry.RowKey._);
    if (rawEvent?.primary_venue_id && !venueCache.has(rawEvent.primary_venue_id)) {
      venueIds.add(rawEvent.primary_venue_id);
    }
  }

  if (venueIds.size > 0) {
    for (const venueId of venueIds) {
      const venue = await fetchVenueDetails(venueId, apiKey, limiter, onEnrichmentFailure);
      venueCache.set(venueId, venue);
      await new Promise((r) => setTimeout(r, VENUE_DELAY_MS));
    }
  }

  for (const entry of entries) {
    const rawEvent = rawResults.find((r) => r.id === entry.RowKey._);
    if (rawEvent?.primary_venue_id) {
      const venue = venueCache.get(rawEvent.primary_venue_id);
      if (venue) {
        const cd = JSON.parse(entry.CalendarData._);
        cd.calendarLocation = venue.address;
        if (venue.lat != null && venue.lng != null) {
          cd.calendarLat = venue.lat;
          cd.calendarLng = venue.lng;
        }
        entry.CalendarData._ = JSON.stringify(cd);
      }
    }
  }
}

interface KeywordSearchContext {
  bbox: { left: string; top: string; bottom: string; right: string };
  apiKey: string;
  limiter: EventbriteRateLimiter;
  seenIds: Set<string>;
  venueCache: Map<string, ResolvedVenue | null>;
  allEntries: EprovalCalendarEntry[];
  onEnrichmentFailure?: (failure: EventbriteEnrichmentFailure) => void;
}

async function fetchKeywordResults(keywords: string[], ctx: KeywordSearchContext): Promise<void> {
  const { bbox, apiKey, limiter, seenIds, venueCache, allEntries, onEnrichmentFailure } = ctx;
  const searchUrl = 'https://www.eventbriteapi.com/v3/destination/search/';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  if (limiter.remaining < 100) {
    logMessage(`Eventbrite: skipping keyword search — only ${limiter.remaining} budget remaining`);
    return;
  }

  logMessage(`Eventbrite: running ${keywords.length} keyword searches...`);

  for (const keyword of keywords) {
    if (limiter.remaining < 50) {
      logMessage(`Eventbrite: stopping keyword search — only ${limiter.remaining} budget remaining`);
      break;
    }

    let keywordNew = 0;
    let continuation: string | null = null;

    for (let page = 0; page < MAX_KEYWORD_PAGES; page++) {
      const body: Record<string, unknown> = {
        event_search: { bbox, page_size: 50, q: keyword },
        ...SEARCH_EXPANSIONS,
      };
      if (continuation) body.continuation = continuation;

      try {
        const response = await fetchWithRetry(searchUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        }, limiter);

        const text = await response.text();
        const data: DestinationSearchResponse = JSON.parse(text);
        const pageEntries = parseEventbriteResponse(text);

        const deduped = pageEntries.filter((e) => {
          const id = e.RowKey._;
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });

        if (deduped.length === 0) {
          logMessage(`Eventbrite: "${keyword}" page ${page + 1} returned no new events — stopping keyword`);
          break;
        }

        keywordNew += deduped.length;
        allEntries.push(...deduped);

        await resolveVenuesForEntries(
          deduped,
          data.events.results,
          apiKey,
          limiter,
          venueCache,
          onEnrichmentFailure,
        );

        continuation = data.events.pagination.continuation ?? null;
        if (!continuation) break;

        await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS));
      } catch (error) {
        if (error instanceof EventbriteRateLimitExhausted) throw error;
        logError(`Eventbrite keyword search failed for "${keyword}"`, error);
        break;
      }
    }

    if (keywordNew > 0) {
      logMessage(`Eventbrite: "${keyword}" found ${keywordNew} new events`);
    }
  }
}

function filterPreExisting(
  pageEntries: EprovalCalendarEntry[],
  existingIds?: Map<string, EventComparison>,
): EprovalCalendarEntry[] {
  if (!existingIds) return pageEntries;
  return pageEntries.filter((e) => {
    const id = e.RowKey._;
    const existingComparison = existingIds.get(id);
    return (
      existingComparison === undefined ||
      !isUnchangedEvent(existingComparison, getEventComparison(e))
    );
  });
}

export async function fetchEventbriteEvents(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  apiKey: string,
  options?: {
    skipKeywordSearch?: boolean;
    rateLimiter?: EventbriteRateLimiter;
    existingIds?: Map<string, EventComparison>;
    onEnrichmentFailure?: (failure: EventbriteEnrichmentFailure) => void;
  },
): Promise<EprovalCalendarEntry[]> {
  const bbox = computeBbox(latitude, longitude, radiusMiles);
  const limiter = options?.rateLimiter ?? new EventbriteRateLimiter();
  const existingIds = options?.existingIds;

  const searchUrl = 'https://www.eventbriteapi.com/v3/destination/search/';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  const allEntries: EprovalCalendarEntry[] = [];
  const seenIds = new Set<string>();
  const venueCache = new Map<string, ResolvedVenue | null>();
  let totalVenuesFetched = 0;
  let lastPage = 0;
  const todayStr = `${String(new Date().getUTCMonth() + 1).padStart(2, '0')}-${String(new Date().getUTCDate()).padStart(2, '0')}-${new Date().getUTCFullYear()}`;
  const MAX_PAGES = getEventbriteConfig().maxPages;

  logMessage(
    `Eventbrite: fetching events in bbox ${bbox.left},${bbox.bottom} to ${bbox.right},${bbox.top}`,
  );

  for (let page = 1; page <= MAX_PAGES; page++) {
    lastPage = page;
    const eventSearch: Record<string, unknown> = { bbox, page_size: 50 };
    if (page > 1) eventSearch.page = page;
    const body: Record<string, unknown> = { event_search: eventSearch, ...SEARCH_EXPANSIONS };

    logMessage(`Eventbrite: fetching page ${page}...`);
    const response = await fetchWithRetry(searchUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }, limiter);

    const text = await response.text();
    const data: DestinationSearchResponse = JSON.parse(text);
    const pageEntries = parseEventbriteResponse(text);

    const preFiltered = filterPreExisting(pageEntries, existingIds);

    const deduped = preFiltered.filter((e) => {
      const id = e.RowKey._;
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    if (deduped.length === 0) {
      logMessage(`Eventbrite: page ${page} returned no new events — stopping`);
      break;
    }
    allEntries.push(...deduped);

    const futureOnPage = deduped.filter((e) => {
      const cd = JSON.parse(e.CalendarData._);
      return cd.calendarStartDate >= todayStr;
    }).length;

    logMessage(
      `Eventbrite: page ${page} returned ${pageEntries.length} events (${deduped.length} new, ${futureOnPage} future, total: ${allEntries.length})`,
    );

    seedVenueCache(data.events.results, venueCache);
    const newVenueCount = deduped.filter((e) => {
      const rawEvent = data.events.results.find((r) => r.id === e.RowKey._);
      return rawEvent?.primary_venue_id && !venueCache.has(rawEvent.primary_venue_id);
    }).length;

    await resolveVenuesForEntries(
      deduped,
      data.events.results,
      apiKey,
      limiter,
      venueCache,
      options?.onEnrichmentFailure,
    );
    totalVenuesFetched += newVenueCount;

    if (newVenueCount > 0) {
      logMessage(`Eventbrite: fetching ${newVenueCount} venues...`);
    }

    if (pageEntries.length < 50) {
      logMessage(`Eventbrite: page ${page} returned < 50 events — last page`);
      break;
    }
  }

  if (!options?.skipKeywordSearch) {
    await fetchKeywordResults(FOOD_TRUCK_KEYWORDS, {
      bbox,
      apiKey,
      limiter,
      seenIds,
      venueCache,
      allEntries,
      onEnrichmentFailure: options?.onEnrichmentFailure,
    });
  }

  const futureEntries = allEntries.filter((e) => {
    const cd = JSON.parse(e.CalendarData._);
    return cd.calendarStartDate >= todayStr;
  });

  const withLocation = futureEntries.filter((e) => {
    const cd = JSON.parse(e.CalendarData._);
    return !!cd.calendarLocation;
  });

  logMessage(
    `Eventbrite: ${allEntries.length} total fetched, ${futureEntries.length} future events, ${withLocation.length} with locations (${totalVenuesFetched} venue lookups across ${lastPage} pages, ${limiter.remaining} budget remaining)`,
  );
  return futureEntries;
}
