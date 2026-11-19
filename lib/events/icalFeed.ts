import type { EprovalCalendarEntry } from '@/lib/events/types';

const FOLDED_LINE = /\r?\n[ \t]/g;
const HTML_TAGS = /<[^>]*>/g;
const NBSP_ENTITY = /&nbsp;/gi;
const LINE_BREAK = /\r?\n/;
const ISO_TZ_MARKERS = /[TZ]/g;
const URLS = /https?:\/\/[^\s]+/g;
const LEADING_DASH = /^-\s*/;
const FIRST_URL = /https?:\/\/[^\s\\]+/;

function unfoldIcalLines(text: string): string {
  return text.replaceAll(FOLDED_LINE, '');
}

function stripHtml(html: string): string {
  return html
    .replaceAll(HTML_TAGS, '')
    .replaceAll(NBSP_ENTITY, ' ')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .trim();
}

function extractProperty(vevent: string, propName: string): string {
  const lines = vevent.split(LINE_BREAK);
  for (const line of lines) {
    if (line.startsWith(`${propName}:`) || line.startsWith(`${propName};`)) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      return line.slice(colonIdx + 1).trim();
    }
  }
  return '';
}

function extractPropertyParams(vevent: string, propName: string): Record<string, string> {
  const lines = vevent.split(LINE_BREAK);
  for (const line of lines) {
    if (line.startsWith(`${propName};`) || line.startsWith(`${propName}:`)) {
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const paramStr = line.slice(propName.length + 1, colonIdx);
      const params: Record<string, string> = {};
      for (const part of paramStr.split(';')) {
        const eqIdx = part.indexOf('=');
        if (eqIdx !== -1) {
          params[part.slice(0, eqIdx).trim()] = part.slice(eqIdx + 1).trim();
        }
      }
      return params;
    }
  }
  return {};
}

function parseIcalDate(raw: string, params: Record<string, string>): string {
  const isAllDay = params['VALUE'] === 'DATE';
  const clean = raw.replaceAll(ISO_TZ_MARKERS, '');

  if (isAllDay || clean.length === 8) {
    const yyyy = clean.slice(0, 4);
    const mm = clean.slice(4, 6);
    const dd = clean.slice(6, 8);
    return `${mm}-${dd}-${yyyy}`;
  }

  if (clean.length >= 14) {
    const yyyy = clean.slice(0, 4);
    const mm = clean.slice(4, 6);
    const dd = clean.slice(6, 8);
    return `${mm}-${dd}-${yyyy}`;
  }

  return raw;
}

function extractTime(raw: string, params: Record<string, string>): string | undefined {
  if (params['VALUE'] === 'DATE') return undefined;

  const clean = raw.replaceAll(ISO_TZ_MARKERS, '');
  if (clean.length < 14) return undefined;

  const hh = clean.slice(8, 10);
  const min = clean.slice(10, 12);
  const h = Number.parseInt(hh, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  let h12 = h;
  if (h === 0) {
    h12 = 12;
  } else if (h > 12) {
    h12 = h - 12;
  }
  return `${h12}:${min} ${ampm}`;
}

function extractDescription(vevent: string): string {
  const raw = extractProperty(vevent, 'DESCRIPTION');
  const cleaned = raw
    .replaceAll(URLS, '')
    .replaceAll(String.raw`\n`, ' ')
    .replaceAll(String.raw`\,`, ',')
    .replaceAll(String.raw`\;`, ';')
    .trim();
  return stripHtml(cleaned);
}

function extractLocation(vevent: string): string | undefined {
  const raw = extractProperty(vevent, 'LOCATION');
  const cleaned = raw
    .replaceAll(String.raw`\n`, ' ')
    .replaceAll(String.raw`\,`, ',')
    .replaceAll(String.raw`\;`, ';')
    .replace(LEADING_DASH, '')
    .trim();
  const stripped = stripHtml(cleaned);
  return stripped || undefined;
}

function extractEventUrl(vevent: string): string | undefined {
  const desc = extractProperty(vevent, 'DESCRIPTION');
  const urlMatch = desc.match(FIRST_URL);
  if (urlMatch) return urlMatch[0];

  const url = extractProperty(vevent, 'URL');
  return url || undefined;
}

function extractLastModified(vevent: string): string {
  const raw = extractProperty(vevent, 'LAST-MODIFIED');
  const clean = raw.replaceAll(ISO_TZ_MARKERS, '');
  if (clean.length < 14) return raw;

  const yyyy = clean.slice(0, 4);
  const mm = clean.slice(4, 6);
  const dd = clean.slice(6, 8);
  const hh = clean.slice(8, 10);
  const min = clean.slice(10, 12);
  const ss = clean.slice(12, 14);
  return new Date(`${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}Z`).toISOString();
}

interface ParsedVevent {
  uid: string;
  summary: string;
  startDate: string;
  endDate: string;
  startTime: string | undefined;
  endTime: string | undefined;
  location: string | undefined;
  description: string;
  website: string | undefined;
  lastModified: string;
}

function parseVevent(vevent: string): ParsedVevent | null {
  const uid = extractProperty(vevent, 'UID');
  if (!uid) return null;

  const summary = extractProperty(vevent, 'SUMMARY');
  const rawStart = extractProperty(vevent, 'DTSTART');
  const rawEnd = extractProperty(vevent, 'DTEND');
  const startParams = extractPropertyParams(vevent, 'DTSTART');
  const endParams = extractPropertyParams(vevent, 'DTEND');

  const startDate = parseIcalDate(rawStart, startParams);
  const endDate = parseIcalDate(rawEnd, endParams);
  const startTime = extractTime(rawStart, startParams);
  const endTime = extractTime(rawEnd, endParams);
  const location = extractLocation(vevent);
  const description = extractDescription(vevent);
  const website = extractEventUrl(vevent);
  const lastModified = extractLastModified(vevent);

  return {
    uid,
    summary,
    startDate,
    endDate,
    startTime,
    endTime,
    location,
    description,
    website,
    lastModified,
  };
}

function veventToEntry(vevent: ParsedVevent): EprovalCalendarEntry {
  const calendarData = {
    calendarTitle: vevent.summary,
    calendarStartDate: vevent.startDate,
    calendarEndDate: vevent.endDate,
    calendarDescription: vevent.description,
    calendarCategory: '',
    calendarOrganization: '',
    calendarWebsite: vevent.website ?? '',
    calendarLocation: vevent.location,
    calendarStartTime: vevent.startTime,
    calendarEndTime: vevent.endTime,
    calendarPermitStartDate: vevent.startDate,
    calendarPermitEndDate: vevent.endDate,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${vevent.uid}` },
    RowKey: { $: 'Edm.String', _: vevent.uid },
    Timestamp: { $: 'Edm.DateTime', _: vevent.lastModified },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `RSS_${vevent.uid}` },
  };
}

export function parseIcalFeed(ical: string): EprovalCalendarEntry[] {
  const unfolded = unfoldIcalLines(ical);
  const veventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  const entries: EprovalCalendarEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = veventRegex.exec(unfolded)) !== null) {
    const vevent = parseVevent(match[1]);
    if (vevent) {
      entries.push(veventToEntry(vevent));
    }
  }

  return entries;
}

export async function fetchIcalFeed(feedUrl: string): Promise<EprovalCalendarEntry[]> {
  const response = await fetch(feedUrl, {
    headers: { 'User-Agent': 'TruckFull/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch iCal feed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  return parseIcalFeed(text);
}
