import type { EprovalCalendarEntry } from '@/lib/events/types';

const HTML_TAGS = /<[^>]*>/g;
const MONTH_NAME_DATE = /^(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})$/;
const EVENT_ID_PARAM = /[?&]EID=(\d+)/;
const LINE_BREAK_TAGS = /<br\s*\/?>/gi;
const EMPTY_COMMA_SEGMENTS = /,\s*,/g;
const WHITESPACE_RUNS = /\s+/g;
const LEADING_COMMA = /^,\s*/;
const ITEM_TITLE = /<title>([\s\S]*?)<\/title>/;
const ITEM_LINK = /<link>([\s\S]*?)<\/link>/;
const ITEM_PUB_DATE = /<pubDate>([\s\S]*?)<\/pubDate>/;
const ITEM_DESCRIPTION = /<description>([\s\S]*?)<\/description>/;
const ITEM_EVENT_DATES = /<calendarEvent:EventDates>([\s\S]*?)<\/calendarEvent:EventDates>/;
const ITEM_EVENT_TIMES = /<calendarEvent:EventTimes>([\s\S]*?)<\/calendarEvent:EventTimes>/;
const ITEM_LOCATION = /<calendarEvent:Location>([\s\S]*?)<\/calendarEvent:Location>/;
const ITEM_GUID = /<guid[^>]*>([\s\S]*?)<\/guid>/;
const RANGE_SEPARATOR = /\s*[-–]\s*/;

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

function parseRssDate(dateStr: string): string {
  const cleaned = dateStr.trim();
  const match = cleaned.match(MONTH_NAME_DATE);
  if (!match) return cleaned;
  const months: Record<string, string> = {
    January: '01',
    February: '02',
    March: '03',
    April: '04',
    May: '05',
    June: '06',
    July: '07',
    August: '08',
    September: '09',
    October: '10',
    November: '11',
    December: '12',
  };
  const month = months[match[1]] ?? '01';
  const day = match[2].padStart(2, '0');
  return `${month}-${day}-${match[3]}`;
}

function parsePubDate(pubDate: string): string {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;
  return date.toISOString();
}

function extractEid(link: string): string {
  const match = link.match(EVENT_ID_PARAM);
  return match ? match[1] : link;
}

function decodeEntities(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function extractDescriptionField(html: string, fieldName: string): string | null {
  const decoded = decodeEntities(html);
  const pattern = new RegExp(`<strong>${fieldName}:\\s*</strong>([\\s\\S]*?)(?=<strong>|$)`, 'i');
  const match = decoded.match(pattern);
  if (!match) return null;
  return stripHtml(match[1]).trim() || null;
}

function extractLocationText(raw: string): string {
  const cleaned = raw
    .replaceAll(LINE_BREAK_TAGS, ', ')
    .replaceAll(EMPTY_COMMA_SEGMENTS, ',')
    .replaceAll(WHITESPACE_RUNS, ' ')
    .trim();
  return cleaned.replace(LEADING_COMMA, '');
}

function parseRssTime(timeStr: string): string {
  return timeStr.trim().toLowerCase();
}

interface ParsedRssItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  eventDates: string;
  eventTimes: string;
  location: string;
  guid: string;
}

function extractItems(xml: string): ParsedRssItem[] {
  const items: ParsedRssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = block.match(ITEM_TITLE)?.[1] ?? '';
    const link = block.match(ITEM_LINK)?.[1] ?? '';
    const pubDate = block.match(ITEM_PUB_DATE)?.[1] ?? '';
    const description = block.match(ITEM_DESCRIPTION)?.[1] ?? '';
    const eventDates = block.match(ITEM_EVENT_DATES)?.[1] ?? '';
    const eventTimes = block.match(ITEM_EVENT_TIMES)?.[1] ?? '';
    const location = block.match(ITEM_LOCATION)?.[1] ?? '';
    const guid = block.match(ITEM_GUID)?.[1] ?? '';

    items.push({
      title: stripHtml(title),
      link,
      pubDate,
      description,
      eventDates: eventDates.trim(),
      eventTimes: eventTimes.trim(),
      location,
      guid,
    });
  }

  return items;
}

function parseDateRange(datesStr: string): { start: string; end: string } {
  const parts = datesStr.split(RANGE_SEPARATOR).map((s) => s.trim());
  const start = parseRssDate(parts[0] ?? '');
  const end = parts.length > 1 ? parseRssDate(parts[1]) : start;
  return { start, end };
}

function parseTimeRange(timesStr: string): { start: string; end: string } {
  const parts = timesStr.split(RANGE_SEPARATOR).map((s) => s.trim());
  return {
    start: parseRssTime(parts[0] ?? ''),
    end: parts.length > 1 ? parseRssTime(parts[1]) : '',
  };
}

function itemToEntry(item: ParsedRssItem): EprovalCalendarEntry {
  const eid = extractEid(item.link);
  const { start: startDate, end: endDate } = parseDateRange(item.eventDates);
  const { start: startTime, end: endTime } = parseTimeRange(item.eventTimes);
  const locationText = extractLocationText(decodeEntities(item.location));
  const descriptionText = extractDescriptionField(item.description, 'Description');

  const calendarData = {
    calendarTitle: item.title,
    calendarStartDate: startDate,
    calendarEndDate: endDate,
    calendarDescription: descriptionText ?? '',
    calendarCategory: '',
    calendarOrganization: '',
    calendarWebsite: item.link,
    calendarLocation: locationText || undefined,
    calendarStartTime: startTime || undefined,
    calendarEndTime: endTime || undefined,
    calendarPermitStartDate: startDate,
    calendarPermitEndDate: endDate,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${eid}` },
    RowKey: { $: 'Edm.String', _: eid },
    Timestamp: { $: 'Edm.DateTime', _: parsePubDate(item.pubDate) },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `RSS_${eid}` },
  };
}

export function parseCivicPlusRss(xml: string): EprovalCalendarEntry[] {
  const items = extractItems(xml);
  return items.map((item) => itemToEntry(item));
}

export async function fetchCivicPlusRss(rssUrl: string): Promise<EprovalCalendarEntry[]> {
  const response = await fetch(rssUrl, {
    headers: { 'User-Agent': 'TruckFull/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CivicPlus RSS: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseCivicPlusRss(xml);
}
