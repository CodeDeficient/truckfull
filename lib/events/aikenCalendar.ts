import { hashCalendarData, type EprovalCalendarEntry } from '@/lib/events/types';
import { chromium } from 'playwright';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HTML_TAGS = /<[^>]*>/g;
const SLASH_DATE = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const MONTH_DAY = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i;
const TIME_RANGE = /(\d{1,2}):(\d{2})\s*(am|pm)\s*[–\-]\s*(\d{1,2}):(\d{2})\s*(am|pm)/i;
const SINGLE_TIME = /(\d{1,2}):(\d{2})\s*(am|pm)/i;
const AGENDA_TITLE = /<span class="ai1ec-event-title">\s*([\s\S]*?)\s*<\/span>/;
const AGENDA_TIME = /<div class="ai1ec-event-time">\s*([\s\S]*?)\s*<\/div>/;
const AGENDA_LINK = /<a class="ai1ec-load-event"\s+href="([^"]+)"/;
const AGENDA_DESCRIPTION = /<div class="ai1ec-event-description">([\s\S]*?)<\/div>\s*<\/div>/;
const AT_LOCATION = /@\s+(.+)$/;
const POPOVER_LOCATION_ALT = /alt="([^"]*@\s*[^"]+)"/;
const POPUP_EXCERPT = /class="ai1ec-popup-excerpt">([\s\S]*?)<\/div>/;
const PIN_LOCATION = /📍\s*(.+)/;
const MONTH_TITLE = /class="ai1ec-event-title">\s*([\s\S]*?)\s*<\/span>/;
const MONTH_TIME_SPAN = /class="(?:ai1ec|aiec)-event-time">\s*([\s\S]*?)\s*<\/span>/;
const HREF = /href="([^"]+)"/;
const MONTH_LOCATION_ALT = /alt="([^"]+@\s*[^"]+)"/;
const POPOVER_TIME = /class="(?:ai1ec|aiec)-event-time">\s*([\s\S]*?)<\/div>/;
const POPOVER_LINK = /class="ai1ec-load-event"[^>]*href="([^"]+)"/;

function stripHtml(html: string): string {
  return html
    .replaceAll(HTML_TAGS, '')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&')
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&nbsp;', ' ')
    .trim();
}

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function parseCellDate(cellDate: string): { month: number; day: number; year: number } {
  const match = cellDate.match(SLASH_DATE);
  if (!match) return { month: 1, day: 1, year: 2026 };
  return {
    month: Number.parseInt(match[1], 10),
    day: Number.parseInt(match[2], 10),
    year: Number.parseInt(match[3], 10),
  };
}

function parseDateFromTimeText(
  timeText: string,
  cellDate: string,
): { month: number; day: number; year: number } {
  const dateMatch = timeText.match(MONTH_DAY);
  if (dateMatch) {
    const month = MONTH_NAMES[dateMatch[1].toLowerCase().slice(0, 3)];
    const day = Number.parseInt(dateMatch[2], 10);
    const { year } = parseCellDate(cellDate);
    return { month, day, year };
  }
  return parseCellDate(cellDate);
}

function formatDate(month: number, day: number, year: number): string {
  return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}-${year}`;
}

export function parseAikenEventTime(timeText: string): {
  startTime: string | undefined;
  endTime: string | undefined;
} {
  const cleaned = timeText.trim();

  if (cleaned.includes('all-day')) {
    return { startTime: undefined, endTime: undefined };
  }

  const rangeMatch = cleaned.match(TIME_RANGE);
  if (rangeMatch) {
    return {
      startTime: `${rangeMatch[1]}:${rangeMatch[2]} ${rangeMatch[3].toLowerCase()}`,
      endTime: `${rangeMatch[4]}:${rangeMatch[5]} ${rangeMatch[6].toLowerCase()}`,
    };
  }

  const singleMatch = cleaned.match(SINGLE_TIME);
  if (singleMatch) {
    return {
      startTime: `${singleMatch[1]}:${singleMatch[2]} ${singleMatch[3].toLowerCase()}`,
      endTime: undefined,
    };
  }

  return { startTime: undefined, endTime: undefined };
}

interface ParsedAikenEvent {
  id: string;
  title: string;
  date: string;
  startTime: string | undefined;
  endTime: string | undefined;
  description: string;
  website: string;
  isAllDay: boolean;
}

function extractEventsFromHtml(html: string, cellDate: string): ParsedAikenEvent[] {
  const events: ParsedAikenEvent[] = [];
  const seenIds = new Set<string>();
  const eventRegex =
    /<div\s+class="ai1ec-event\s+ai1ec-event-id-(\d+)[^"]*"(?:\s+data-end="")?[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g;
  let match: RegExpExecArray | null;

  while ((match = eventRegex.exec(html)) !== null) {
    const block = match[0];
    const id = match[1];

    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const titleMatch = block.match(AGENDA_TITLE);
    const title = titleMatch ? stripHtml(titleMatch[1]) : '';

    const timeMatch = block.match(AGENDA_TIME);
    const timeText = timeMatch ? stripHtml(timeMatch[1]) : '';

    const linkMatch = block.match(AGENDA_LINK);
    const website = linkMatch ? linkMatch[1] : '';

    const descMatch = block.match(AGENDA_DESCRIPTION);
    let description = '';
    if (descMatch) {
      const pTexts: string[] = [];
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/g;
      let pMatch: RegExpExecArray | null;
      while ((pMatch = pRegex.exec(descMatch[1])) !== null) {
        const text = stripHtml(pMatch[1]);
        if (text) pTexts.push(text);
      }
      description = pTexts.join(' ');
    }

    const isAllDay = block.includes('ai1ec-allday');
    const { startTime, endTime } = parseAikenEventTime(timeText);

    const { month, day, year } = parseDateFromTimeText(timeText, cellDate);
    const date = formatDate(month, day, year);

    events.push({ id, title, date, startTime, endTime, description, website, isAllDay });
  }

  return events;
}

function eventToEntry(event: ParsedAikenEvent): EprovalCalendarEntry {
  const calendarData = {
    calendarTitle: event.title,
    calendarStartDate: event.date,
    calendarEndDate: event.date,
    calendarDescription: event.description,
    calendarCategory: '',
    calendarOrganization: '',
    calendarWebsite: event.website,
    calendarLocation: undefined as string | undefined,
    calendarStartTime: event.startTime,
    calendarEndTime: event.endTime,
    calendarPermitStartDate: event.date,
    calendarPermitEndDate: event.date,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${event.id}` },
    RowKey: { $: 'Edm.String', _: event.id },
    Timestamp: { $: 'Edm.DateTime', _: new Date().toISOString() },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `RSS_${event.id}` },
    contentHash: hashCalendarData(calendarData),
  };
}

export function parseAikenCalendarHtml(html: string, cellDate: string): EprovalCalendarEntry[] {
  const events = extractEventsFromHtml(html, cellDate);
  return events.map((event) => eventToEntry(event));
}

function extractLocationFromAlt(alt: string): string | undefined {
  const match = alt.match(AT_LOCATION);
  return match ? match[1].trim() : undefined;
}

function extractLocationFromPopover(popoverHtml: string): string | undefined {
  const altMatch = popoverHtml.match(POPOVER_LOCATION_ALT);
  if (altMatch) return extractLocationFromAlt(altMatch[1]);

  const excerptMatch = popoverHtml.match(POPUP_EXCERPT);
  if (excerptMatch) {
    const atMatch = excerptMatch[1].match(PIN_LOCATION);
    if (atMatch) return atMatch[1].trim();
  }
  return undefined;
}

interface MonthViewParsedEvent {
  id: string;
  instanceId: string;
  title: string;
  date: string;
  startTime: string | undefined;
  endTime: string | undefined;
  description: string;
  website: string;
  location: string | undefined;
  isAllDay: boolean;
}

function extractFullTag(html: string, startIndex: number, tagName: string): string {
  const openTag = `<${tagName}`;
  const closeTag = `</${tagName}>`;
  let depth = 0;
  let i = startIndex;
  while (i < html.length) {
    if (html.slice(i).startsWith(openTag)) {
      depth++;
      i += openTag.length;
      continue;
    }
    if (html.slice(i).startsWith(closeTag)) {
      depth--;
      if (depth === 0) {
        return html.slice(startIndex, i + closeTag.length);
      }
      i += closeTag.length;
      continue;
    }
    i++;
  }
  return html.slice(startIndex);
}

function extractMonthViewEvents(html: string): MonthViewParsedEvent[] {
  const events: MonthViewParsedEvent[] = [];
  const seenIds = new Set<string>();

  const eventRegex =
    /<a[^>]+class="[^"]*ai1ec-event-container[^"]*ai1ec-event-id-(\d+)[^"]*ai1ec-event-instance-id-(\d+)[^"]*"[^>]*>/g;
  let match: RegExpExecArray | null;

  while ((match = eventRegex.exec(html)) !== null) {
    const id = match[1];
    const instanceId = match[2];
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const fullTag = extractFullTag(html, match.index, 'a');
    const titleMatch = fullTag.match(MONTH_TITLE);
    const title = titleMatch ? stripHtml(titleMatch[1]) : '';

    const timeMatch = fullTag.match(MONTH_TIME_SPAN);
    const timeText = timeMatch ? stripHtml(timeMatch[1]) : '';

    const isAllDay = fullTag.includes('ai1ec-allday');
    const { startTime, endTime } = parseAikenEventTime(timeText);

    const hrefMatch = fullTag.match(HREF);
    const website = hrefMatch ? hrefMatch[1] : '';

    const date = '';

    let location: string | undefined;
    const altMatch = fullTag.match(MONTH_LOCATION_ALT);
    if (altMatch) {
      location = extractLocationFromAlt(altMatch[1]);
    }

    events.push({
      id,
      instanceId,
      title,
      date,
      startTime,
      endTime,
      description: '',
      website,
      location,
      isAllDay,
    });
  }

  const popoverRegex =
    /<div class="[^"]*ai1ec-popover[^"]*ai1ec-event-id-(\d+)[^"]*ai1ec-event-instance-id-(\d+)[^"]*">/g;
  let popMatch: RegExpExecArray | null;
  while ((popMatch = popoverRegex.exec(html)) !== null) {
    const popId = popMatch[1];
    const popBody = extractFullTag(html, popMatch.index, 'div');
    const existing = events.find((e) => e.id === popId);
    if (!existing) continue;

    const popLocation = extractLocationFromPopover(popBody);
    if (popLocation && !existing.location) {
      existing.location = popLocation;
    }

    const popTimeMatch = popBody.match(POPOVER_TIME);
    if (popTimeMatch) {
      const fullTimeText = stripHtml(popTimeMatch[1]);
      const { month, day, year } = parseDateFromTimeText(fullTimeText, '');
      existing.date = formatDate(month, day, year);
      const times = parseAikenEventTime(fullTimeText);
      existing.startTime = times.startTime;
      existing.endTime = times.endTime;
      existing.isAllDay = popBody.includes('ai1ec-allday-badge');
    }

    const popExcerptMatch = popBody.match(POPUP_EXCERPT);
    if (popExcerptMatch && !existing.description) {
      existing.description = stripHtml(popExcerptMatch[1]).slice(0, 300);
    }

    const popLinkMatch = popBody.match(POPOVER_LINK);
    if (popLinkMatch && !existing.website) {
      existing.website = popLinkMatch[1];
    }
  }

  return events.filter((e) => e.date !== '');
}

function monthViewEventToEntry(event: MonthViewParsedEvent): EprovalCalendarEntry {
  const calendarData = {
    calendarTitle: event.title,
    calendarStartDate: event.date,
    calendarEndDate: event.date,
    calendarDescription: event.description,
    calendarCategory: '',
    calendarOrganization: '',
    calendarWebsite: event.website,
    calendarLocation: event.location,
    calendarStartTime: event.startTime,
    calendarEndTime: event.endTime,
    calendarPermitStartDate: event.date,
    calendarPermitEndDate: event.date,
  };

  return {
    PartitionKey: { $: 'Edm.String', _: `RSS_Approved_${event.id}` },
    RowKey: { $: 'Edm.String', _: event.id },
    Timestamp: { $: 'Edm.DateTime', _: new Date().toISOString() },
    CalendarData: { $: 'Edm.String', _: JSON.stringify(calendarData) },
    Group: { $: 'Edm.String', _: `RSS_${event.id}` },
    contentHash: hashCalendarData(calendarData),
  };
}

export function parseAikenMonthViewHtml(html: string): EprovalCalendarEntry[] {
  const events = extractMonthViewEvents(html);
  return events.map((event) => monthViewEventToEntry(event));
}

const MONTHS_TO_FETCH = 3;

async function fetchViaPlaywright(): Promise<string[]> {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Setup a reasonable timeout
    page.setDefaultTimeout(30_000);

    await page.goto('https://www.cityofaikensc.gov/calendar-of-events/');

    const mv = await page.$('.ai1ec-month-view');
    if (!mv) {
      await page.click('.ai1ec-views-dropdown .ai1ec-dropdown-toggle');
      await page.waitForTimeout(1000);
      await page.click('#ai1ec-view-month');
      await page.waitForTimeout(3000);
    }

    const results: string[] = [];
    for (let i = 0; i < MONTHS_TO_FETCH; i++) {
      const html = await page.$eval('.ai1ec-calendar', (el) => el.innerHTML);
      results.push(html);

      if (i < MONTHS_TO_FETCH - 1) {
        const btn = await page.$('a.ai1ec-next-month');
        if (!btn) break;
        await btn.click();
        await page.waitForTimeout(3000);
      }
    }

    return results;
  } finally {
    await browser.close();
  }
}

async function fetchViaDevBrowser(): Promise<string[]> {
  const scriptPath = path.resolve('scripts/dev-browser/aiken-fetch.mjs');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`dev-browser script not found: ${scriptPath}`);
  }

  /* eslint-disable sonarjs/no-os-command-from-path */
  await new Promise<void>((resolve, reject) => {
    execFile(
      'dev-browser',
      ['--connect', '--timeout', '120', 'run', scriptPath],
      { timeout: 180_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`dev-browser failed: ${error.message}\n${stderr}`));
        } else {
          resolve();
        }
      },
    );
  });
  /* eslint-enable sonarjs/no-os-command-from-path */

  const tmpDir = path.join(process.env.HOME || '/root', '.dev-browser/tmp');
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < MONTHS_TO_FETCH; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push(d.toLocaleString('en-US', { month: 'long' }).toLowerCase());
  }

  const results: string[] = [];
  for (const name of months) {
    const filePath = path.join(tmpDir, `aiken-month-${name}.html`);
    if (fs.existsSync(filePath)) {
      results.push(fs.readFileSync(filePath, 'utf8'));
    }
  }

  return results;
}

export async function fetchAikenCalendar(): Promise<EprovalCalendarEntry[]> {
  let htmlPages: string[];
  try {
    htmlPages = await fetchViaPlaywright();
  } catch (error) {
    console.error('Failed to fetch Aiken calendar via Playwright:', error);
    try {
      htmlPages = await fetchViaDevBrowser();
    } catch (dbError) {
      console.error('Failed to fetch Aiken calendar via dev-browser:', dbError);
      htmlPages = [];
    }
  }

  const allEntries: EprovalCalendarEntry[] = [];
  const seenIds = new Set<string>();

  for (const html of htmlPages) {
    const entries = parseAikenMonthViewHtml(html);
    for (const entry of entries) {
      if (!seenIds.has(entry.RowKey._)) {
        seenIds.add(entry.RowKey._);
        allEntries.push(entry);
      }
    }
  }

  return allEntries;
}
