import { hashCalendarData, type EprovalCalendarEntry } from '@/lib/events/types';

const HTML_TAGS = /<[^>]*>/g;

export interface TimelyEventConfig {
  calendarId: string;
  apiKey: string;
}

interface TimelyEventItem {
  id: number;
  title: string;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  description?: string;
  url?: string;
  location?: string;
  location_address?: string;
  categories?: Array<{ name: string; slug?: string }>;
  status?: string;
}

interface TimelyResponseData {
  items: TimelyEventItem[];
  total: number;
  from: number;
  size: number;
  has_prior: boolean;
  has_next: boolean;
}

interface TimelyResponse {
  data: TimelyResponseData;
}

function stripHtml(html: string): string {
  return html
    .replaceAll(HTML_TAGS, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&br;', '\n')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .trim();
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

function buildLocation(location?: string, locationAddress?: string): string | undefined {
  if (!location && !locationAddress) return undefined;
  if (location && locationAddress) return `${location}, ${locationAddress}`;
  return location ?? locationAddress;
}

function itemToEntry(item: TimelyEventItem): EprovalCalendarEntry {
  const id = String(item.id);
  const startDate = formatDate(item.start_datetime);
  const endDate = formatDate(item.end_datetime);
  const startTime = item.all_day ? undefined : formatTime(item.start_datetime);
  const endTime = item.all_day ? undefined : formatTime(item.end_datetime);
  const description = item.description ? stripHtml(item.description) : '';
  const location = buildLocation(item.location, item.location_address);
  const category = item.categories?.[0]?.name ?? '';

  const calendarData = {
    calendarTitle: item.title ?? '',
    calendarStartDate: startDate,
    calendarEndDate: endDate,
    calendarDescription: description || undefined,
    calendarCategory: category || undefined,
    calendarOrganization: undefined,
    calendarWebsite: item.url ?? undefined,
    calendarLocation: location,
    calendarStartTime: startTime,
    calendarEndTime: endTime,
    calendarPermitStartDate: startDate,
    calendarPermitEndDate: endDate,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${id}` },
    RowKey: { $: 'Edm.String', _: id },
    Timestamp: { $: 'Edm.DateTime', _: new Date().toISOString() },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `TIM_${id}` },
    contentHash: hashCalendarData(calendarData),
  };
}

export function parseTimelyResponse(json: string): EprovalCalendarEntry[] {
  const response: TimelyResponse = JSON.parse(json);
  const items = response.data?.items ?? [];
  return items.map((item) => itemToEntry(item));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchTimelyEvents(
  config: TimelyEventConfig,
  maxRetries = 3,
): Promise<EprovalCalendarEntry[]> {
  const baseUrl = `https://timelyapp.time.ly/api/calendars/${config.calendarId}/events`;
  const allEntries: EprovalCalendarEntry[] = [];
  let currentPage = 1;
  let hasNext = true;

  do {
    let retries = 0;
    let success = false;

    while (retries < maxRetries && !success) {
      try {
        const url = `${baseUrl}?page=${currentPage}&per_page=100`;
        const response = await fetch(url, {
          headers: {
            'X-Api-Key': config.apiKey,
          },
          signal: AbortSignal.timeout(30_000),
        });

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitMs = retryAfter ? Number(retryAfter) * 1000 : 1000;
          await sleep(waitMs);
          retries++;
          continue;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch Timely API: ${response.status} ${response.statusText}`);
        }

        const json = await response.text();
        const entries = parseTimelyResponse(json);
        allEntries.push(...entries);

        const parsed: TimelyResponse = JSON.parse(json);
        hasNext = parsed.data?.has_next ?? false;

        success = true;
      } catch (error) {
        retries++;
        if (retries >= maxRetries) throw error;
        await sleep(1000 * retries);
      }
    }

    if (!success) {
      throw new Error(
        `Timely API: failed to fetch page ${currentPage} after ${maxRetries} retries`,
      );
    }

    currentPage++;
    if (hasNext) {
      await sleep(200);
    }
  } while (hasNext);

  return allEntries;
}
