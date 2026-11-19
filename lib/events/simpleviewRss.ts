import type { EprovalCalendarEntry } from '@/lib/events/types';

const HTML_TAGS = /<[^>]*>/g;
const ITEM_TITLE = /<title>([\s\S]*?)<\/title>/;
const ITEM_LINK = /<link>([\s\S]*?)<\/link>/;
const ITEM_PUB_DATE = /<pubDate>([\s\S]*?)<\/pubDate>/;
const ITEM_DESCRIPTION = /<description>([\s\S]*?)<\/description>/;
const ITEM_GUID = /<guid[^>]*>([\s\S]*?)<\/guid>/;
const ITEM_CATEGORIES = /<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g;
const CDATA_BLOCK = /<!\[CDATA\[([\s\S]*?)\]\]>/;
const TRAILING_NUMERIC_SEGMENT = /\/(\d+)\/$/;
const SLASH_DATE = /(\d{2})\/(\d{2})\/(\d{4})/;
const DATE_RANGE_TEXT = /(\d{2}\/\d{2}\/\d{4})\s+to[\s\S]*?(\d{2}\/\d{2}\/\d{4})/;
const STARTING_DATE_TEXT = /Starting\s+(\d{2}\/\d{2}\/\d{4})/;
const IMG_TAGS = /<img[^>]*>/gi;
const DIV_OPEN_TAGS = /<div[^>]*>/gi;
const DIV_CLOSE_TAGS = /<\/div>/gi;
const PARAGRAPHS = /<p>([\s\S]*?)<\/p>/g;
const PARAGRAPH_TAGS = /<\/?p>/gi;
const JSON_LD_SCRIPTS = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
const SCRIPT_BODY = /<script[^>]*>([\s\S]*?)<\/script>/;

function stripHtml(html: string): string {
  return html
    .replaceAll(HTML_TAGS, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&#x2019;', "'")
    .replaceAll('&#x2018;', "'")
    .replaceAll('&#x2013;', '–')
    .replaceAll('&#x2014;', '—')
    .replaceAll('&#x2022;', '•')
    .replaceAll('&#x24C7;', '')
    .trim();
}

function extractItems(xml: string): Array<{
  title: string;
  link: string;
  pubDate: string;
  description: string;
  categories: string[];
  guid: string;
}> {
  const items: Array<{
    title: string;
    link: string;
    pubDate: string;
    description: string;
    categories: string[];
    guid: string;
  }> = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    const title = block.match(ITEM_TITLE)?.[1] ?? '';
    const link = block.match(ITEM_LINK)?.[1] ?? '';
    const pubDate = block.match(ITEM_PUB_DATE)?.[1] ?? '';
    const description = block.match(ITEM_DESCRIPTION)?.[1] ?? '';
    const guid = block.match(ITEM_GUID)?.[1] ?? '';

    const categoryMatches = block.match(ITEM_CATEGORIES) ?? [];
    const categories = categoryMatches.map((c) => {
      const m = c.match(CDATA_BLOCK);
      return m ? m[1].trim() : '';
    });

    items.push({
      title: stripHtml(title),
      link: link.trim(),
      pubDate: pubDate.trim(),
      description: description.trim(),
      categories,
      guid: guid.trim(),
    });
  }

  return items;
}

function extractIdFromLink(link: string): string {
  const match = link.match(TRAILING_NUMERIC_SEGMENT);
  return match ? match[1] : link;
}

function parseSimpleviewDate(dateStr: string): string {
  const match = dateStr.match(SLASH_DATE);
  if (!match) return dateStr;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function extractDatesFromDescription(desc: string): { start: string; end: string } {
  const rangeMatch = desc.match(DATE_RANGE_TEXT);
  if (rangeMatch) {
    return {
      start: parseSimpleviewDate(rangeMatch[1]),
      end: parseSimpleviewDate(rangeMatch[2]),
    };
  }

  const startingMatch = desc.match(STARTING_DATE_TEXT);
  if (startingMatch) {
    const date = parseSimpleviewDate(startingMatch[1]);
    return { start: date, end: date };
  }

  return { start: '', end: '' };
}

function extractDescriptionText(desc: string): string {
  const cleaned = desc
    .replaceAll(IMG_TAGS, '')
    .replaceAll(DIV_OPEN_TAGS, '<p>')
    .replaceAll(DIV_CLOSE_TAGS, '</p>');

  const pMatches = cleaned.match(PARAGRAPHS);
  if (!pMatches) return '';

  const texts = pMatches.map((p) => {
    const inner = p.replaceAll(PARAGRAPH_TAGS, '');
    return stripHtml(inner).trim();
  });

  return texts.filter(Boolean).join(' ');
}

function parsePubDate(pubDate: string): string {
  const date = new Date(pubDate);
  if (Number.isNaN(date.getTime())) return pubDate;
  return date.toISOString();
}

function itemToEntry(item: ReturnType<typeof extractItems>[number]): EprovalCalendarEntry {
  const id = extractIdFromLink(item.link);
  const { start: startDate, end: endDate } = extractDatesFromDescription(item.description);
  const descriptionText = extractDescriptionText(item.description);
  const categoryText = item.categories.filter(Boolean).join(', ');

  const calendarData = {
    calendarTitle: item.title,
    calendarStartDate: startDate,
    calendarEndDate: endDate,
    calendarDescription: descriptionText,
    calendarCategory: categoryText || '',
    calendarOrganization: '',
    calendarWebsite: item.link,
    calendarLocation: undefined,
    calendarStartTime: undefined,
    calendarEndTime: undefined,
    calendarPermitStartDate: startDate,
    calendarPermitEndDate: endDate,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${id}` },
    RowKey: { $: 'Edm.String', _: id },
    Timestamp: { $: 'Edm.DateTime', _: parsePubDate(item.pubDate) },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `RSS_${id}` },
  };
}

export function parseSimpleviewRss(xml: string): EprovalCalendarEntry[] {
  const items = extractItems(xml);
  return items.map((item) => itemToEntry(item));
}

export interface JsonLdLocation {
  name: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
}

export function extractJsonLdLocation(html: string): JsonLdLocation | null {
  const jsonLdMatches = html.match(JSON_LD_SCRIPTS);
  if (!jsonLdMatches) return null;

  for (const block of jsonLdMatches) {
    const contentMatch = block.match(SCRIPT_BODY);
    if (!contentMatch) continue;

    try {
      const parsed = JSON.parse(contentMatch[1]);
      const location = parsed?.location;
      if (!location) continue;

      const name = typeof location.name === 'string' ? location.name : null;
      const address = location.address;
      const geo = location.geo;

      return {
        name,
        streetAddress: typeof address?.streetAddress === 'string' ? address.streetAddress : null,
        city: typeof address?.addressLocality === 'string' ? address.addressLocality : null,
        state: typeof address?.addressRegion === 'string' ? address.addressRegion : null,
        zip: typeof address?.postalCode === 'string' ? address.postalCode : null,
        lat: typeof geo?.latitude === 'number' ? geo.latitude : null,
        lng: typeof geo?.longitude === 'number' ? geo.longitude : null,
      };
    } catch {
      continue;
    }
  }

  return null;
}

export function formatLocationFromJsonLd(loc: JsonLdLocation): string | null {
  const parts: string[] = [];
  if (loc.name) parts.push(loc.name);
  if (loc.streetAddress) parts.push(loc.streetAddress);

  const cityStateZip: string[] = [];
  if (loc.city) cityStateZip.push(loc.city);
  if (loc.state) {
    const stateZip = loc.zip ? `${loc.state} ${loc.zip}` : loc.state;
    cityStateZip.push(stateZip);
  } else if (loc.zip) {
    cityStateZip.push(loc.zip);
  }

  if (cityStateZip.length > 0) parts.push(cityStateZip.join(', '));

  return parts.length > 0 ? parts.join(', ') : null;
}

export async function enrichSimpleviewEntries(
  entries: EprovalCalendarEntry[],
  fetchDetailPage: (url: string) => Promise<string>,
): Promise<EprovalCalendarEntry[]> {
  const enriched: EprovalCalendarEntry[] = [];

  for (const entry of entries) {
    let calendarData: Record<string, unknown> | null = null;
    try {
      if (entry.CalendarData?._) {
        calendarData = JSON.parse(entry.CalendarData._);
      }
    } catch {
      enriched.push(entry);
      continue;
    }

    const website = calendarData?.calendarWebsite as string | undefined;
    if (!website) {
      enriched.push(entry);
      continue;
    }

    try {
      const html = await fetchDetailPage(website);
      const loc = extractJsonLdLocation(html);

      if (loc && calendarData) {
        const locationStr = formatLocationFromJsonLd(loc);
        if (locationStr) {
          calendarData.calendarLocation = locationStr;
          entry.CalendarData._ = JSON.stringify(calendarData);
        }
      }
    } catch {
      // Keep original entry on fetch error
    }

    enriched.push(entry);
  }

  return enriched;
}

export async function fetchSimpleviewRss(rssUrl: string): Promise<EprovalCalendarEntry[]> {
  const response = await fetch(rssUrl, {
    headers: { 'User-Agent': 'TruckFull/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Simpleview RSS: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseSimpleviewRss(xml);
}
