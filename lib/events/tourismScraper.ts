import {
  hashCalendarData,
  type EprovalCalendarEntry,
  type TourismScraperConfig,
} from '@/lib/events/types';

const HTML_TAGS = /<[^>]*?>/g;
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;
const LEADING_DOT = /^\./;
const BLOCK_OPEN_TAG = /<(div|article|section)/i;
const CONTENT_OPEN_TAG = /<(div|article|section|span|header|p|h[1-6])[\s>]/i;
const WHITESPACE = /\s+/;
const TAG_NAME = /^([a-z][a-z0-9]*)$/i;
const CROSS_MONTH_RANGE = /^(\w+)\s+(\d{1,2})\s*-\s*(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i;
const SAME_MONTH_RANGE = /^(\w+)\s+(\d{1,2})\s*-\s*(\d{1,2}),?\s+(\d{4})$/i;
const SINGLE_DATE = /^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/i;
const TIME_RANGE = /(\d{1,2}):(\d{2})\s*(am|pm)\s*[-–]\s*(\d{1,2}):(\d{2})\s*(am|pm)/i;
const NON_ALPHANUMERIC_RUNS = /[^a-z0-9]+/g;
const EDGE_DASHES = /(?:^-)|(?:-$)/g;
const LAST_PATH_SEGMENT = /\/([^/]+)\/?$/;
const HTML_EXTENSION = /\.html?$/gi;
const NON_SLUG_CHARS = /[^a-z0-9-]/gi;
const DASH_RUNS = /-+/g;

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function stripHtml(html: string): string {
  return (
    html
       
      .replaceAll(HTML_TAGS, '')
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&amp;', '&')
      .replaceAll('&#39;', "'")
      .replaceAll('&quot;', '"')
      .replaceAll('&apos;', "'")
      .replaceAll('&nbsp;', ' ')
      .trim()
  );
}

function escapeRegex(str: string): string {
  return str.replaceAll(REGEX_SPECIAL_CHARS, String.raw`\$&`);
}

function extractBlocks(html: string, selector: string): string[] {
  const className = selector.replace(LEADING_DOT, '').split('.').shift()!;
  const escaped = escapeRegex(className);
  const openPattern = new RegExp(
    String.raw`<(?:div|article|section)[^>]*class="[^"]*\b${escaped}\b[^"]*"[^>]*>`,
    'gi',
  );
  const blocks: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = openPattern.exec(html)) !== null) {
    const block = extractFullTag(html, match.index, match[0]);
    if (block) {
      blocks.push(block);
      openPattern.lastIndex = match.index + block.length;
    }
  }

  return blocks;
}

function extractFullTag(html: string, startIndex: number, openTag: string): string | null {
  const tagMatch = BLOCK_OPEN_TAG.exec(openTag);
  if (!tagMatch) return null;
  const tagName = tagMatch[1].toLowerCase();
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let i = startIndex;

  while (i < html.length) {
    if (html.slice(i).startsWith(`</${tagName}`)) {
      depth--;
      if (depth === 0) {
        return html.slice(startIndex, i + closeTag.length);
      }
      i += closeTag.length;
      continue;
    }
    const openRe = new RegExp(String.raw`^<${tagName}[\s>]`, 'i');
    const openMatch = openRe.exec(html.slice(i));
    if (openMatch) {
      depth++;
      i += openMatch[0].length;
      continue;
    }
    i++;
  }

  return html.slice(startIndex);
}

function findTagAndContent(
  searchHtml: string,
  className: string,
): { index: number; tag: string; content: string } | null {
  const escaped = escapeRegex(className);
  const openRe = new RegExp(String.raw`<[^>]*class="[^"]*\b${escaped}\b[^"]*"[^>]*>`, 'i');
  const openMatch = openRe.exec(searchHtml);
  if (!openMatch) return null;

  const tagMatch = CONTENT_OPEN_TAG.exec(openMatch[0]);
  if (!tagMatch) return null;

  const tagName = tagMatch[1].toLowerCase();
  const content = extractTagByDepth(searchHtml, openMatch.index, openMatch[0], tagName);
  if (!content) return null;

  return { index: openMatch.index, tag: tagName, content };
}

function findTagByTypeAndContent(
  searchHtml: string,
  tagName: string,
): { index: number; content: string } | null {
  const openRe = new RegExp(String.raw`<${tagName}(?:\s[^>]*)?>`, 'i');
  const openMatch = openRe.exec(searchHtml);
  if (!openMatch) return null;

  const content = extractTagByDepth(searchHtml, openMatch.index, openMatch[0], tagName);
  if (!content) return null;

  return { index: openMatch.index, content };
}

function extractTagContent(html: string, selector: string): string {
  const parts = selector.replaceAll('>', '').trim().split(WHITESPACE);
  let searchHtml = html;

  for (const part_ of parts) {
    const part = part_;
    if (part.startsWith('.')) {
      const className = part.replace(LEADING_DOT, '');
      const found = findTagAndContent(searchHtml, className);
      if (!found) return '';
      searchHtml = found.content;
    } else {
      const tagMatch = TAG_NAME.exec(part);
      if (!tagMatch) return '';
      const tagName = tagMatch[1].toLowerCase();
      const found = findTagByTypeAndContent(searchHtml, tagName);
      if (!found) return '';
      searchHtml = found.content;
    }
  }

  return stripHtml(searchHtml);
}

function extractTagByDepth(
  html: string,
  startIndex: number,
  openTag: string,
  tagName: string,
): string | null {
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let i = startIndex;

  while (i < html.length) {
    if (html.slice(i).startsWith(closeTag)) {
      depth--;
      if (depth === 0) {
        const contentStart = startIndex + openTag.length;
        return html.slice(contentStart, i);
      }
      i += closeTag.length;
      continue;
    }
    const openRe = new RegExp(String.raw`^<${tagName}[\s>]`, 'i');
    const openMatch = openRe.exec(html.slice(i));
    if (openMatch) {
      depth++;
      i += openMatch[0].length;
      continue;
    }
    i++;
  }

  return null;
}

function extractSimpleClassText(block: string, selector: string): string {
  const className = selector.replace(LEADING_DOT, '').split('.').pop() || selector.replace(LEADING_DOT, '');
  const escaped = escapeRegex(className);
  const pattern = new RegExp(
    String.raw`<[^>]*class="[^"]*\b${escaped}\b[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>`,
    'i',
  );
  const match = pattern.exec(block);
  if (!match) return '';
  return stripHtml(match[1]);
}

function extractText(block: string, selector: string): string {
  const parts = selector.replaceAll('>', '').trim().split(WHITESPACE);
  if (parts.length <= 1) {
    return extractSimpleClassText(block, selector);
  }

  return extractTagContent(block, selector);
}

function extractHref(block: string, selector: string): string | null {
  const parts = selector.split(WHITESPACE);
  const lastPart = parts.at(-1)!;

  if (lastPart.startsWith('.') === false) {
    const tagMatch = TAG_NAME.exec(lastPart);
    if (tagMatch) {
      const tag = tagMatch[1];
      const parentParts = parts.slice(0, -1);
      let searchHtml = block;
      if (parentParts.length > 0) {
        const parentClass = parentParts.at(-1)!.replace(LEADING_DOT, '');
        const parentEscaped = escapeRegex(parentClass);
        const parentPattern = new RegExp(
          String.raw`<[^>]*class="[^"]*\b${parentEscaped}\b[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>`,
          'i',
        );
        const parentMatch = parentPattern.exec(block);
        if (parentMatch) searchHtml = parentMatch[1];
      }
      const hrefPattern = new RegExp(`<${tag}[^>]*href="([^"]+)"`, 'i');
      const match = hrefPattern.exec(searchHtml);
      return match ? match[1] : null;
    }
  }

  const lastClass = lastPart.replace(LEADING_DOT, '');
  const escaped = escapeRegex(lastClass);
  const pattern = new RegExp(
    String.raw`<a[^>]*class="[^"]*\b${escaped}\b[^"]*"[^>]*href="([^"]+)"`,
    'i',
  );
  const match = pattern.exec(block);
  return match ? match[1] : null;
}

function formatDateComponents(month: number | undefined, day: number, year: number): string {
  const monthStr = month ? String(month).padStart(2, '0') : '';
  return `${monthStr}-${String(day).padStart(2, '0')}-${year}`;
}

function parseDateRange(raw: string): { start: string; end: string } | null {
  const fullRangeMatch = CROSS_MONTH_RANGE.exec(raw);
  if (fullRangeMatch) {
    const startMonth = MONTH_NAMES[fullRangeMatch[1].toLowerCase()];
    const startDay = Number.parseInt(fullRangeMatch[2], 10);
    const endMonth = MONTH_NAMES[fullRangeMatch[3].toLowerCase()];
    const endDay = Number.parseInt(fullRangeMatch[4], 10);
    const year = Number.parseInt(fullRangeMatch[5], 10);
    const start = formatDateComponents(startMonth, startDay, year);
    const end = formatDateComponents(endMonth, endDay, year);
    return { start: start || end, end: end || start };
  }

  const dayRangeMatch = SAME_MONTH_RANGE.exec(raw);
  if (dayRangeMatch) {
    const month = MONTH_NAMES[dayRangeMatch[1].toLowerCase()];
    const startDay = Number.parseInt(dayRangeMatch[2], 10);
    const endDay = Number.parseInt(dayRangeMatch[3], 10);
    const year = Number.parseInt(dayRangeMatch[4], 10);
    return {
      start: formatDateComponents(month, startDay, year),
      end: formatDateComponents(month, endDay, year),
    };
  }

  return null;
}

function parseEventDate(dateStr: string, pattern: string): { start: string; end: string } {
  const regex = new RegExp(pattern, 'i');
  const match = regex.exec(dateStr);

  const raw = match ? match[1].trim() : dateStr.trim();
  if (!raw) return { start: '', end: '' };

  const rangeResult = parseDateRange(raw);
  if (rangeResult) return rangeResult;

  const date = parseSingleDate(raw);
  return { start: date, end: date };
}

function parseSingleDate(dateStr: string): string {
  const match = SINGLE_DATE.exec(dateStr);
  if (!match) return '';

  const month = MONTH_NAMES[match[1].toLowerCase()];
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);

  if (!month) return '';
  return formatDateComponents(month, day, year);
}

function parseEventTime(block: string): { start: string | undefined; end: string | undefined } {
  const match = TIME_RANGE.exec(block);
  if (!match) return { start: undefined, end: undefined };

  return {
    start: `${match[1]}:${match[2]} ${match[3].toLowerCase()}`,
    end: `${match[4]}:${match[5]} ${match[6].toLowerCase()}`,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(NON_ALPHANUMERIC_RUNS, '-')
    .replaceAll(EDGE_DASHES, '');
}

function generateExternalId(title: string, date: string): string {
  const slug = slugify(title);
  return slug || `evt-${date}`;
}

function buildParentLinks(html: string): Map<string, string> {
  const parentLinks = new Map<string, string>();
  const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkPattern.exec(html)) !== null) {
    parentLinks.set(linkMatch[2], linkMatch[1]);
  }
  return parentLinks;
}

function findLinkForBlock(block: string, parentLinks: Map<string, string>): string | null {
  for (const [content, url] of parentLinks) {
    if (block.includes(content.trimStart()) || content.includes(block)) {
      return url;
    }
  }
  return null;
}

function buildCalendarEntry(options: {
  title: string;
  startDate: string;
  endDate: string;
  location: string | undefined;
  description: string;
  website: string | undefined;
  externalId: string;
}): EprovalCalendarEntry {
  const calendarData = {
    calendarTitle: options.title,
    calendarStartDate: options.startDate,
    calendarEndDate: options.endDate,
    calendarDescription: options.description,
    calendarCategory: '',
    calendarOrganization: '',
    calendarWebsite: options.website,
    calendarLocation: options.location,
    calendarStartTime: undefined as string | undefined,
    calendarEndTime: undefined as string | undefined,
    calendarPermitStartDate: options.startDate,
    calendarPermitEndDate: options.endDate,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${options.externalId}` },
    RowKey: { $: 'Edm.String', _: options.externalId },
    Timestamp: { $: 'Edm.DateTime', _: new Date().toISOString() },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `TOUR_${options.externalId}` },
    contentHash: hashCalendarData(calendarData),
  };
}

export function parseTourismHtml(
  html: string,
  config: TourismScraperConfig,
): EprovalCalendarEntry[] {
  const blocks = extractBlocks(html, config.eventContainerSelector);
  const parentLinks = config.linkSelector === 'a' ? buildParentLinks(html) : new Map();
  const entries: EprovalCalendarEntry[] = [];
  const seenIds = new Set<string>();

  for (const block of blocks) {
    const title = extractText(block, config.titleSelector);
    if (!title) continue;

    const dateBlockText = resolveDateBlockText(block, config);
    const { start: startDate, end: endDate } = parseEventDate(
      dateBlockText,
      config.dateParsePattern,
    );
    if (!startDate) continue;

    const location = resolveLocation(block, config);
    const description = resolveDescription(block, config);
    const link = resolveLink(block, config, parentLinks);
    const website = link || undefined;
    const externalId = link
      ? generateExternalIdFromUrl(link)
      : generateExternalId(title, startDate);

    if (seenIds.has(externalId)) continue;
    seenIds.add(externalId);

    const { start: startTime, end: endTime } = parseEventTime(block);
    const entry = buildCalendarEntry({
      title,
      startDate,
      endDate,
      location,
      description,
      website,
      externalId,
    });
    entry.CalendarData._ = JSON.stringify({
      ...JSON.parse(entry.CalendarData._),
      calendarStartTime: startTime,
      calendarEndTime: endTime,
    });
    entries.push(entry);
  }

  return entries;
}

function resolveDateBlockText(block: string, config: TourismScraperConfig): string {
  let dateBlockText = extractText(block, config.dateSelector);
  if (config.daySelector && dateBlockText) {
    const dayText = extractText(block, config.daySelector);
    if (dayText) {
      dateBlockText = `${dateBlockText} ${dayText}, ${new Date().getFullYear()}`;
    }
  }
  return dateBlockText;
}

function resolveLocation(block: string, config: TourismScraperConfig): string | undefined {
  if (config.locationSelector) {
    return extractText(block, config.locationSelector) || undefined;
  }
  return config.defaultLocation;
}

function resolveDescription(block: string, config: TourismScraperConfig): string {
  if (config.descriptionSelector) {
    return extractText(block, config.descriptionSelector);
  }
  return '';
}

function resolveLink(
  block: string,
  config: TourismScraperConfig,
  parentLinks: Map<string, string>,
): string | null {
  if (config.linkSelector === 'a') {
    return findLinkForBlock(block, parentLinks);
  }
  if (config.linkSelector) {
    return extractHref(block, config.linkSelector);
  }
  return null;
}

function generateExternalIdFromUrl(url: string): string {
  const match = LAST_PATH_SEGMENT.exec(url);
  if (!match) return generateExternalId(url, '');
  return match[1]
    .replaceAll(HTML_EXTENSION, '')
    .replaceAll(NON_SLUG_CHARS, '-')
    .replaceAll(DASH_RUNS, '-')
    .replaceAll(EDGE_DASHES, '');
}

export async function fetchTourismEvents(
  config: TourismScraperConfig,
): Promise<EprovalCalendarEntry[]> {
  const response = await fetch(config.url, {
    headers: { 'User-Agent': 'TruckFull/1.0' },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tourism page: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseTourismHtml(html, config);
}
