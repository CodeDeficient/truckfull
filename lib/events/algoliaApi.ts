import { hashCalendarData, type EprovalCalendarEntry } from '@/lib/events/types';

const ALGOLIA_SERVER_ERROR = /Algolia API error: (5\d{2})/;

export interface AlgoliaEventConfig {
  appId: string;
  apiKey: string;
  indexName: string;
  filters: string;
}

function stripHtml(html: string): string {
  let result = '';
  let insideTag = false;
  for (const ch of html) {
    if (ch === '<') {
      insideTag = true;
      continue;
    }
    if (ch === '>') {
      insideTag = false;
      continue;
    }
    if (!insideTag) {
      result += ch;
    }
  }
  return result
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&br;', '\n')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .trim();
}

function formatDate(value: string | number): string {
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${month}-${day}-${year}`;
}

interface AlgoliaHit {
  objectID: string;
  title: string;
  uri?: string;
  locationName?: string;
  address?: string;
  startDate?: string | number;
  endDate?: string | number;
  eventCategories?: string[];
  content?: string;
  primaryImageUrl?: string;
  sectionName?: string;
  isPrimaryEvent?: boolean;
  _geoloc?: { lat: number; lng: number };
}

interface AlgoliaResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  nbPages: number;
  hitsPerPage: number;
  page: number;
}

function hitToEntry(hit: AlgoliaHit): EprovalCalendarEntry {
  const locationParts: string[] = [];
  if (hit.locationName) locationParts.push(hit.locationName);
  if (hit.address) locationParts.push(hit.address);

  const calendarData = {
    calendarTitle: hit.title ?? '',
    calendarStartDate: hit.startDate ? formatDate(hit.startDate) : '',
    calendarEndDate: hit.endDate ? formatDate(hit.endDate) : '',
    calendarDescription: hit.content ? stripHtml(hit.content) : '',
    calendarCategory: hit.eventCategories?.[0] ?? '',
    calendarOrganization: '',
    calendarWebsite: hit.uri ?? '',
    calendarLocation: locationParts.length > 0 ? locationParts.join(', ') : undefined,
    calendarPermitStartDate: hit.startDate ? formatDate(hit.startDate) : '',
    calendarPermitEndDate: hit.endDate ? formatDate(hit.endDate) : '',
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${hit.objectID}` },
    RowKey: { $: 'Edm.String', _: hit.objectID },
    Timestamp: { $: 'Edm.DateTime', _: new Date().toISOString() },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `ALG_${hit.objectID}` },
    contentHash: hashCalendarData(calendarData),
  };
}

export function parseAlgoliaResponse(json: string): EprovalCalendarEntry[] {
  const data: AlgoliaResponse = JSON.parse(json);
  return (data.hits ?? []).map((hit) => hitToEntry(hit));
}

const MAX_RETRIES = 3;
const PAGE_DELAY_MS = 200;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });

      if (response.ok) return response;

      if (response.status === 429 && attempt < retries) {
        const retryAfter = response.headers.get('Retry-After');
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 1000 * (attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      throw new Error(`Algolia API error: ${response.status} ${response.statusText}`);
    } catch (error) {
      if (attempt === retries) throw error;
      const isNonRetryable =
        error instanceof Error &&
        error.message.startsWith('Algolia API error') &&
        !ALGOLIA_SERVER_ERROR.test(error.message);
      if (isNonRetryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  throw new Error('Max retries exceeded');
}

export async function fetchAlgoliaEvents(
  config: AlgoliaEventConfig,
): Promise<EprovalCalendarEntry[]> {
  const baseUrl = `https://${config.appId}-dsn.algolia.net/1/indexes/${config.indexName}/query`;
  const headers: Record<string, string> = {
    'X-Algolia-Application-Id': config.appId,
    'X-Algolia-API-Key': config.apiKey,
    'Content-Type': 'application/json',
  };

  const allEntries: EprovalCalendarEntry[] = [];
  let currentPage = 0;
  let totalPages = 1;

  do {
    const body = {
      filters: config.filters,
      hitsPerPage: 100,
      page: currentPage,
    };
    const response = await fetchWithRetry(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const json = await response.text();
    const data: AlgoliaResponse = JSON.parse(json);
    const entries = (data.hits ?? []).map((hit) => hitToEntry(hit));
    allEntries.push(...entries);
    totalPages = data.nbPages;
    currentPage++;

    if (currentPage < totalPages) {
      await new Promise((resolve) => setTimeout(resolve, PAGE_DELAY_MS));
    }
  } while (currentPage < totalPages);

  return allEntries;
}
