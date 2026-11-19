/**
 * Text Extractor Service
 * Extracts location mentions, @mentions, hashtags, and times from post text
 * Uses regex-based extraction for speed - AI is only called as fallback
 */

import * as chrono from 'chrono-node';
import type { ScheduleScope } from '@/lib/ai/parseFacebookPost';

const SPECIALS_TERMS = /\b(?:specials?|deals?|menu)\b/i;
const FOLLOWING_TIME_START = /^\s*[),;]?\s*(?:(?:at|from)\s+)?\d/;
const EVERY_PERIOD =
  /\b(?:every|each)\s+(?:day|week|weekday|weekend|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const EVERY_SHORT_DAY = /\b(?:every|each)\s+(?:mon|tue|tues|wed|weds|thu|thurs|fri|sat|sun)\b/i;
const WEEKLY_OR_DAILY = /\b(?:weekly|daily)\b/i;
const DAILY_SPECIALS =
  /\b(?:daily|weekly)(?:\s+[\w'-]+){0,3}\s+(?:specials?|deals?|features?|menus?)\b/i;
const PLURAL_WEEKDAYS = /\b(?:mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays)\b/i;
const WEEKDAY_SPAN =
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:-|through|to)\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const THIS_WEEKDAY_SPAN =
  /\bthis\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*(?:-|through|to)\s*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const EVERY_OTHER_PERIOD = /\b(?:every|each)\s+other\s+(?:day|week|weekday|weekend|month|year)\b/i;
const EVERY_OTHER_WEEKDAY =
  /\b(?:every|each)\s+other\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
const EVERY_OTHER_SHORT_DAY =
  /\b(?:every|each)\s+other\s+(?:mon|tue|tues|wed|weds|thu|thurs|fri|sat|sun)\b/i;
const RANGE_SEPARATOR = /\s*(?:-|to|–)\s*/;
const LEADING_HOUSE_NUMBER = /^\d+\s+/;
const PRICE_OR_DATE_CHAR = /[$\d/-]/;
const DATE_SEPARATOR = /[-/]/;
const TRAILING_WORD = /([A-Za-z]{3,9})\.?\s*$/;
const LEADING_WORD = /^\s*([A-Za-z]{3,9})\.?\b/;
const OUR_HOURS_PHRASE = /\bour\s+\w+\s+hours\b/i;
const DAILY = /\bdaily\b/i;
const EVERY_DAY = /\b(?:every|each)\s+day\b/i;
const EVERY_WEEKDAY = /\b(?:every|each)\s+weekday\b/i;
const EVERY_WEEKEND = /\b(?:every|each)\s+weekend\b/i;
const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\]\\]/g;

export interface ExtractedTimes {
  start: string;
  end: string;
  startMeridiemCertain: boolean;
  endMeridiemCertain: boolean;
  days?: string[];
  dateReference?: string;
  dateReferences?: string[];
  scope?: ScheduleScope;
}

export interface TimeAlternative {
  start: string;
  end: string;
  label: string;
}

export interface TextBasedData {
  location?: {
    address: string;
    fuzzy: boolean;
  };
  mentions?: string[];
  hashtags?: string[];
  times?: ExtractedTimes;
  food_items?: string[];
}

// Common food items for basic extraction
const FOOD_KEYWORDS = [
  'tacos',
  'burgers',
  'pizza',
  'seafood',
  ' BBQ ',
  'barbecue',
  'hot dogs',
  'fries',
  'chicken',
  'wings',
  'sandwiches',
  'wraps',
  'salads',
  'dessert',
  'ice cream',
  'coffee',
  ' lemonade',
  'tea',
  'soda',
  'water',
  'juice',
  'breakfast',
  'lunch',
  'dinner',
  'brunch',
  'quesadillas',
  'nachos',
  'burritos',
  'enchiladas',
  'steak',
  'ribs',
  'pulled pork',
  'brisket',
  'fried',
  'grilled',
  'smoked',
  'roasted',
  'special',
  'menu',
  'available',
  'serving',
];

export function hasFoodSignal(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return FOOD_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase().trim()));
}

export function extractTextBasedData(message: string): TextBasedData {
  const result: TextBasedData = {};

  if (!message || typeof message !== 'string') {
    return result;
  }

  result.mentions = extractMentions(message);
  result.hashtags = extractHashtags(message);
  result.times = extractTimes(message);
  result.food_items = extractFoodItems(message);

  const location = extractLocation(message);
  if (location) {
    result.location = location;
  }

  return result;
}

function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];

  let match;
  while ((match = mentionRegex.exec(text)) !== null) {
    if (match[1] && !mentions.includes(match[1])) {
      mentions.push(match[1]);
    }
  }

  return mentions;
}

function extractHashtags(text: string): string[] {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];

  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    if (match[1] && !hashtags.includes(match[1])) {
      hashtags.push(match[1]);
    }
  }

  return hashtags;
}

const RELATIVE_DATE_REGEX = /\b(today|tomorrow)(?!'s)\b/gi;
const WEEKDAY_DATE_REGEX =
  /\bthis\s+(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Tues|Wed|Weds|Thu|Thurs|Fri|Sat)\b/gi;
const NUMERIC_DATE_REGEX = /\b(?:\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/g;
const MONTH_NAMES = new Set([
  'jan', 'january', 'feb', 'february', 'mar', 'march', 'apr', 'april', 'may', 'jun', 'june',
  'jul', 'july', 'aug', 'august', 'sep', 'sept', 'september', 'oct', 'october', 'nov',
  'november', 'dec', 'december',
]);
const MONTH_DAY_REGEX = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,\s*\d{4})?\b/g;

interface DateReferenceMatch {
  value: string;
  index: number;
  end: number;
  isCalendarDate: boolean;
  isDateAnchor: boolean;
  isWeekdayConstraint: boolean;
}

const BARE_WEEKDAY_REGEX =
  /\b(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sun|Mon|Tue|Tues|Wed|Weds|Thu|Thurs|Fri|Sat)\b/gi;

function collectDateReferences(text: string): DateReferenceMatch[] {
  const matches: DateReferenceMatch[] = [];
  const patterns = [RELATIVE_DATE_REGEX, WEEKDAY_DATE_REGEX, NUMERIC_DATE_REGEX];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        value: match[0].trim(),
        index: match.index,
        end: match.index + match[0].length,
        isCalendarDate: pattern === NUMERIC_DATE_REGEX,
        isDateAnchor: pattern !== WEEKDAY_DATE_REGEX,
        isWeekdayConstraint: false,
      });
    }
  }

  MONTH_DAY_REGEX.lastIndex = 0;
  let monthDayMatch: RegExpExecArray | null;
  while ((monthDayMatch = MONTH_DAY_REGEX.exec(text)) !== null) {
    const month = monthDayMatch[1].toLowerCase();
    if (MONTH_NAMES.has(month)) {
      const trailingText = text.slice(monthDayMatch.index + monthDayMatch[0].length);
      const isMenuCalendarReference = SPECIALS_TERMS.test(trailingText.slice(0, 32));
      if (isMenuCalendarReference && matches.some((match) => !match.isWeekdayConstraint)) continue;
      matches.push({
        value: monthDayMatch[0].trim(),
        index: monthDayMatch.index,
        end: monthDayMatch.index + monthDayMatch[0].length,
        isCalendarDate: true,
        isDateAnchor: true,
        isWeekdayConstraint: false,
      });
    }
  }

  BARE_WEEKDAY_REGEX.lastIndex = 0;
  let weekdayMatch: RegExpExecArray | null;
  while ((weekdayMatch = BARE_WEEKDAY_REGEX.exec(text)) !== null) {
    const index = weekdayMatch.index;
    const end = index + weekdayMatch[0].length;
    const overlapsDatePhrase = matches.some(
      (match) => match.index <= index && end <= match.end,
    );
    const isAdjacentToDatePhrase = matches.some((match) => {
      if (!match.isDateAnchor) return false;
      const followingText = text.slice(end, end + 32);
      if (SPECIALS_TERMS.test(followingText)) return false;
      const dateAfterDistance = match.index - end;
      if (dateAfterDistance >= 0 && dateAfterDistance <= 3) return match.isCalendarDate;
      const dateBeforeDistance = index - match.end;
      return dateBeforeDistance >= 0 &&
        dateBeforeDistance <= 3 &&
        FOLLOWING_TIME_START.test(text.slice(end));
    });
    if (!overlapsDatePhrase && isAdjacentToDatePhrase) {
      matches.push({
          value: weekdayMatch[0].trim(),
          index,
          end,
          isCalendarDate: false,
          isDateAnchor: false,
          isWeekdayConstraint: true,
      });
    }
  }

  const sorted = matches.sort((left, right) => left.index - right.index);
  const hasDatePhrase = sorted.some((match) => !match.isWeekdayConstraint);
  if (!hasDatePhrase) return [];

  const unique = new Set<string>();
  return sorted.filter((match) => {
    const key = match.value.toLowerCase();
    if (unique.has(key)) return false;
    unique.add(key);
    return true;
  });
}

export function extractDateReferences(text: string): string[] {
  return collectDateReferences(text).map((match) => match.value);
}

export function extractDateReference(text: string): string | undefined {
  return extractDateReferences(text)[0];
}

export function hasRecurringScheduleIndicator(text: string): boolean {
  const lower = text.toLowerCase();
  const abbreviatedWeekday = '(?:mon|tues?|weds?|thu(?:rs)?|fri|sat|sun)';
  const recurringWords =
    EVERY_PERIOD.test(lower) ||
    EVERY_SHORT_DAY.test(lower) ||
    (WEEKLY_OR_DAILY.test(lower) &&
      !DAILY_SPECIALS.test(lower));
  const pluralWeekdays = PLURAL_WEEKDAYS.test(lower);
  const fullWeekdayRange = WEEKDAY_SPAN.test(lower);
  const abbreviatedWeekdayRange = new RegExp(`\\b${abbreviatedWeekday}\\s*(?:-|through|to)\\s*${abbreviatedWeekday}\\b`, 'i').test(lower);
  const weekdayRange = fullWeekdayRange || abbreviatedWeekdayRange;
  const dateQualifiedFullRange = THIS_WEEKDAY_SPAN.test(lower);
  const dateQualifiedAbbreviatedRange = new RegExp(`\\bthis\\s+${abbreviatedWeekday}\\s*(?:-|through|to)\\s*${abbreviatedWeekday}\\b`, 'i').test(lower);
  const dateQualifiedRange = dateQualifiedFullRange || dateQualifiedAbbreviatedRange;
  return recurringWords || pluralWeekdays || (weekdayRange && !dateQualifiedRange);
}

export function hasUnsupportedScheduleCadence(text: string): boolean {
  const cadenceUnit = EVERY_OTHER_PERIOD.test(text);
  const fullWeekday = EVERY_OTHER_WEEKDAY.test(text);
  const abbreviatedWeekday = EVERY_OTHER_SHORT_DAY.test(text);
  return cadenceUnit || fullWeekday || abbreviatedWeekday;
}

export function hasUnsupportedDateRange(text: string): boolean {
  const fullWeekday = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
  const abbreviatedWeekday = '(?:mon|tues?|weds?|thu(?:rs)?|fri|sat|sun)';
  const separator = '(?:-|through|to)';
  return new RegExp(`\\bthis\\s+${fullWeekday}\\s*${separator}\\s*(?:${fullWeekday}|${abbreviatedWeekday})\\b`, 'i').test(text) ||
    new RegExp(`\\bthis\\s+${abbreviatedWeekday}\\s*${separator}\\s*(?:${fullWeekday}|${abbreviatedWeekday})\\b`, 'i').test(text);
}

/**
 * Number of distinct service slots (time ranges) the raw text carries.
 * chrono parses only the first range into ParsedPost.times, so this must
 * run on the ORIGINAL text before any information loss. A single range
 * restated (same start/end pair, e.g. "11-2 … 11am to 2pm") counts once.
 *
 * Two detectors are combined:
 * - chrono for ranges with explicit meridiems ("11am-2pm");
 * - a lightweight meridiem-free range regex ("Wed 11-2", "5-8") which
 *   chrono cannot parse at all but which still denotes a service slot.
 * Ranges are compared as normalized (startHour, endHour) pairs so the
 * same slot stated twice is counted once.
 */
function countDistinctTimeRanges(text: string): number {
  // Raw 24h pairs are the primary slot identity: two chrono ranges with
  // distinct raw pairs are always distinct slots ("11am-2pm" vs
  // "11pm-2am" must not collapse).
  const rawPairs = new Set<string>();
  const results = chrono.parse(text, undefined, { forwardDate: false });
  for (const result of results) {
    const start = result.start;
    const end = result.end;
    if (!start || !end || !start.isCertain('hour') || !end.isCertain('hour')) continue;
    const startHour = start.get('hour');
    const endHour = end.get('hour');
    if (startHour === null || endHour === null) continue;
    rawPairs.add(`${startHour}-${endHour}`);
  }

  // Meridiem-free "11-2" / "11:30-2" style ranges (detection only; the
  // writer still requires a fully-meridiem'd chrono parse to apply).
  // Hours are capped at 23 so generic numeric ranges ("25-27", "20-30")
  // and price ranges are not mistaken for service slots. A text range is
  // deduped against the chrono pairs via the meridiem-insensitive dial,
  // because "11-2" and "11am-2pm" denote the same slot.
  const HOUR = String.raw`\d{1,2}`;
  const MINUTES = String.raw`(?::\d{2})?`;
  const rangeRegex = new RegExp(
    `\\b${HOUR}${MINUTES}\\s*(?:-|to|–)\\s*${HOUR}${MINUTES}\\b`,
    'g',
  );
  let textOnlyCount = 0;
  const textDials = new Set<string>();
  for (const match of text.matchAll(rangeRegex)) {
    if (!match[0]) continue;
    const [rawStart, rawEnd] = match[0].split(RANGE_SEPARATOR);
    const startHour = Number.parseInt(rawStart, 10);
    const endHour = Number.parseInt(rawEnd, 10);
    if (
      !Number.isFinite(startHour) ||
      !Number.isFinite(endHour) ||
      startHour > 23 ||
      endHour > 23 ||
      startHour === endHour
    ) {
      continue;
    }
    // Bare "11-2" convention: an end hour not exceeding the start is PM
    // (wraps past noon).
    const normalizedEnd = endHour < startHour ? endHour + 12 : endHour;
    const dial = `${startHour % 12}-${normalizedEnd % 12}`;
    if (textDials.has(dial)) continue;
    textDials.add(dial);
    const matchesChronoDial = [...rawPairs].some(
      (pair) => canonicalSlotKey(...(pair.split('-').map(Number) as [number, number])) === dial,
    );
    if (matchesChronoDial) continue;
    textOnlyCount += 1;
  }
  return rawPairs.size + textOnlyCount;
}

/**
 * Meridiem-insensitive slot identity: "17-20" (chrono 24h) and "5-8" (12h
 * text) denote the same service slot. Hours map onto a 12-hour dial so
 * "11am-2pm" and "11-2" also collapse to one key. The dial position alone
 * cannot distinguish AM from PM, so the raw 24h pair is kept alongside:
 * two chrono ranges with distinct raw pairs are always distinct slots even
 * when their dials collide ("11am-2pm" vs "11pm-2am").
 */
function canonicalSlotKey(startHour: number, endHour: number): string {
  return `${startHour % 12}-${endHour % 12}`;
}

/**
 * Number of distinct street-address locations the raw text carries.
 * extractAddress returns only the first match, so this must run on the
 * ORIGINAL text before any information loss. Cross-street matches are
 * service locations too (extractAddress consumes them), so they count
 * identically. Overlapping matches across regex families are the same
 * physical location and count once: a street-only match contained within
 * a with-city or cross-street match is that same stop, and vice versa.
 */
/**
 * True when a numbered street-only candidate ("1201 knox ave") names the
 * same street as a cross-street match ("knox ave & 5th st.") — the
 * house-number-anchored form whose street-name tail appears inside the
 * cross match is the same physical location.
 */
function sharesStreetName(candidate: string, cross: string): boolean {
  const name = candidate.replace(LEADING_HOUSE_NUMBER, '');
  return name.length > 0 && cross.includes(name);
}

function countDistinctStreetAddresses(text: string): number {
  const withCity: string[] = [];
  ADDRESS_WITH_CITY_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ADDRESS_WITH_CITY_REGEX.exec(text)) !== null) {
    withCity.push(match[0].trim().toLowerCase());
  }
  const crossStreet: string[] = [];
  CROSS_STREET_REGEX.lastIndex = 0;
  while ((match = CROSS_STREET_REGEX.exec(text)) !== null) {
    crossStreet.push(match[0].trim().toLowerCase());
  }
  // A match from one family overlapping (or embedded in) a match from
  // another family describes the same physical location; only the anchor
  // text differs ("1201 Knox Ave" vs "Knox Ave & 5th St."). Substring
  // containment covers the embed case; a numbered street-only candidate
  // whose street-name tail appears inside a cross-street match is the
  // same stop. Token ordering is never compared across families — street
  // names are matched as anchored substrings.
  const streetOnly: string[] = [];
  ADDRESS_STREET_ONLY_REGEX.lastIndex = 0;
  while ((match = ADDRESS_STREET_ONLY_REGEX.exec(text)) !== null) {
    const candidate = match[0].trim().toLowerCase();
    if (
      withCity.some((full) => full.includes(candidate) || candidate.includes(full)) ||
      crossStreet.some(
        (full) => full.includes(candidate) || candidate.includes(full) || sharesStreetName(candidate, full),
      )
    ) {
      continue;
    }
    streetOnly.push(candidate);
  }
  return new Set([...withCity, ...streetOnly, ...crossStreet]).size;
}

export function detectMultiServiceSlots(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return countDistinctTimeRanges(text) > 1 || countDistinctStreetAddresses(text) > 1;
}

export const MULTI_STOP_UNSUPPORTED = 'MULTI_STOP_UNSUPPORTED';
export const AMBIGUOUS_MERIDIEM_RANGE = 'AMBIGUOUS_MERIDIEM_RANGE';

const SOURCE_TIME_RANGE_REGEX =
  /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|–)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

function findBareTimeRange(text: string): RegExpExecArray | null {
  const match = SOURCE_TIME_RANGE_REGEX.exec(text);
  if (!match || match[3] || match[6]) return null;

  const preceding = text.slice(0, match.index).trimEnd().at(-1);
  const following = text
    .slice(match.index + match[0].length)
    .trimStart()
    .at(0);
  if (preceding && PRICE_OR_DATE_CHAR.test(preceding)) return null;
  if (following && DATE_SEPARATOR.test(following)) return null;

  const precedingWord = text.slice(0, match.index).match(TRAILING_WORD)?.[1];
  if (precedingWord && MONTH_NAMES.has(precedingWord.toLowerCase())) return null;
  const followingWord = text
    .slice(match.index + match[0].length)
    .match(LEADING_WORD)?.[1];
  if (followingWord && MONTH_NAMES.has(followingWord.toLowerCase())) return null;

  const startHour = Number(match[1]);
  const endHour = Number(match[4]);
  const startMinute = Number(match[2] ?? 0);
  const endMinute = Number(match[5] ?? 0);
  if (startHour < 1 || startHour > 12 || endHour < 1 || endHour > 12) return null;
  if (startMinute > 59 || endMinute > 59) return null;
  return startHour === endHour ? null : match;
}

function formatHour(hour: number, minute: number): string {
  const meridiem = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 || 12;
  const minuteText = minute === 0 ? '' : `:${minute.toString().padStart(2, '0')}`;
  return `${displayHour}${minuteText} ${meridiem}`;
}

function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

function nearestForwardHour(startHour: number, rawEndHour: number): number {
  const morningEnd = rawEndHour % 12;
  const eveningEnd = morningEnd + 12;
  const morningDuration = (morningEnd - startHour + 24) % 24 || 24;
  const eveningDuration = (eveningEnd - startHour + 24) % 24 || 24;
  return eveningDuration < morningDuration ? eveningEnd : morningEnd;
}

export function extractAmbiguousTimeAlternatives(text: string): TimeAlternative[] {
  const match = findBareTimeRange(text);
  if (!match) return [];

  const startHour = Number(match[1]);
  const startMinute = Number(match[2] ?? 0);
  const endHour = Number(match[4]);
  const endMinute = Number(match[5] ?? 0);
  const morningStart = startHour % 12;
  const eveningStart = (startHour % 12) + 12;
  const morningEnd = nearestForwardHour(morningStart, endHour);
  const eveningEnd = nearestForwardHour(eveningStart, endHour);

  return [
    {
      start: formatTime(morningStart, startMinute),
      end: formatTime(morningEnd, endMinute),
      label: `${formatHour(morningStart, startMinute)}–${formatHour(morningEnd, endMinute)}`,
    },
    {
      start: formatTime(eveningStart, startMinute),
      end: formatTime(eveningEnd, endMinute),
      label: `${formatHour(eveningStart, startMinute)}–${formatHour(eveningEnd, endMinute)}`,
    },
  ];
}

export function hasAmbiguousMeridiemRange(text: string, times: TextBasedData['times']): boolean {
  if (times && (times.startMeridiemCertain || times.endMeridiemCertain)) return false;
  return extractAmbiguousTimeAlternatives(text).length === 2;
}

function detectScheduleScope(text: string): ScheduleScope {
  const lower = text.toLowerCase();

  if (hasUnsupportedDateRange(lower)) {
    return 'one_off_unsupported';
  }
  if (hasUnsupportedScheduleCadence(lower)) {
    return 'one_off_unsupported';
  }
  if (hasRecurringScheduleIndicator(lower) || OUR_HOURS_PHRASE.test(lower)) {
    return 'recurring_weekly';
  }

  const dateReferences = collectDateReferences(text);

  if (dateReferences.length > 0) return 'one_off_date';

  return 'scope_missing';
}

/**
 * Extracts operating hours from text using chrono-node
 * Supports formats: "7:30am-11:30am", "7:30am to 11:30am", "7:30 AM - 11:30 AM",
 * "11a-2pm", "7am-11am"
 * Returns times as clean 24-hour "HH:MM" strings
 */
function extractTimes(text: string): ExtractedTimes | undefined {
  const results = chrono.parse(text, undefined, { forwardDate: false });

  for (const result of results) {
    const start = result.start;
    const end = result.end;

    if (start && end && start.isCertain('hour') && end.isCertain('hour')) {
      let startHour = start.get('hour');
      const startMinute = start.isCertain('minute') ? start.get('minute') : 0;
      let endHour = end.get('hour');
      const endMinute = end.isCertain('minute') ? end.get('minute') : 0;

      if (startHour === null || endHour === null) continue;
      if (startMinute === null || endMinute === null) continue;

      // For one-sided ranges, choose the matching AM/PM interpretation that
      // yields the shorter forward service interval.
      if (!start.isCertain('meridiem') && end.isCertain('meridiem')) {
        const rawStart = startHour % 12;
        const eveningStart = rawStart + 12;
        const morningDuration = (endHour - rawStart + 24) % 24 || 24;
        const eveningDuration = (endHour - eveningStart + 24) % 24 || 24;
        startHour = eveningDuration < morningDuration ? eveningStart : rawStart;
      } else if (start.isCertain('meridiem') && !end.isCertain('meridiem')) {
        const rawEnd = endHour % 12;
        const eveningEnd = rawEnd + 12;
        const morningDuration = (rawEnd - startHour + 24) % 24 || 24;
        const eveningDuration = (eveningEnd - startHour + 24) % 24 || 24;
        endHour = eveningDuration < morningDuration ? eveningEnd : rawEnd;
      }

      const startStr = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`;
      const endStr = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      const extractedDays = extractDays(text);
      const days = [...new Set([
        ...extractedDays,
        ...(extractedDays.length === 0 ? inferRecurringDays(text) : []),
      ])];
      const scope = detectScheduleScope(text);
      const dateReferences = extractDateReferences(text);
      const dateReference = dateReferences.length === 1 ? dateReferences[0] : undefined;

      const extracted = {
        start: startStr,
        end: endStr,
        days: days.length > 0 ? days : undefined,
        ...(dateReference ? { dateReference } : {}),
        ...(dateReferences.length > 1 ? { dateReferences } : {}),
        scope,
      };
      return Object.defineProperties(extracted, {
        startMeridiemCertain: {
          value: start.isCertain('meridiem'),
          enumerable: false,
        },
        endMeridiemCertain: {
          value: end.isCertain('meridiem'),
          enumerable: false,
        },
      }) as ExtractedTimes;
    }
  }

  return undefined;
}

function inferRecurringDays(text: string): string[] {
  const lower = text.toLowerCase();
  const recurring = hasRecurringScheduleIndicator(lower);
  if (recurring && (DAILY.test(lower) || EVERY_DAY.test(lower))) {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  }
  if (recurring && EVERY_WEEKDAY.test(lower)) {
    return ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  }
  if (recurring && EVERY_WEEKEND.test(lower)) {
    return ['saturday', 'sunday'];
  }
  return [];
}

function extractDays(text: string): string[] {
  const days: string[] = [];
  const lowerText = text.toLowerCase();

  const dayPatterns: [string, string][] = [
    ['sunday', 'sunday'],
    ['sun', 'sunday'],
    ['monday', 'monday'],
    ['mon', 'monday'],
    ['tuesday', 'tuesday'],
    ['tue', 'tuesday'],
    ['tues', 'tuesday'],
    ['wednesday', 'wednesday'],
    ['wed', 'wednesday'],
    ['weds', 'wednesday'],
    ['thursday', 'thursday'],
    ['thu', 'thursday'],
    ['thurs', 'thursday'],
    ['friday', 'friday'],
    ['fri', 'friday'],
    ['saturday', 'saturday'],
    ['sat', 'saturday'],
  ];

  for (const [pattern, day] of dayPatterns) {
    if (new RegExp(`\\b${pattern}s?\\b`, 'i').test(lowerText)) {
      days.push(day);
    }
  }

  return [...new Set(days)]; // Remove duplicates
}

/**
 * Extracts food items using keyword matching
 * This is a basic extraction - AI is used for more accurate extraction
 */
function extractFoodItems(text: string): string[] {
  const items: string[] = [];
  const lowerText = text.toLowerCase();

  const RAW_MATCH = String.raw`$&`;

  for (const keyword of FOOD_KEYWORDS) {
    const lowerKeyword = keyword.toLowerCase().trim();
    if (lowerText.includes(lowerKeyword)) {
      // Extract the phrase containing the keyword
      const regex = new RegExp(
        `[^.!?\\n]*${lowerKeyword.replaceAll(REGEX_SPECIAL_CHARS, RAW_MATCH)}[^.!?\\n]*`,
        'gi',
      );
      const matches = text.match(regex);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.trim();
          if (cleaned.length > 3 && cleaned.length < 100) {
            items.push(cleaned);
          }
        }
      }
    }
  }

  return [...new Set(items)].slice(0, 10); // Dedupe and limit
}

const FULL_SUFFIXES = 'Boulevard|Street|Avenue|Drive|Road|Court|Place|Circle|Trail|Run|Lane';
const ABBREV_SUFFIXES = 'Blvd|Ave|St|Dr|Rd|Ct|Pl|Cir|Way';
const DIRECTIONALS = 'Northeast|Southeast|Northwest|Southwest|NW|SW|NE|SE|W|E|N|S';
const ALL_SUFFIXES = `${FULL_SUFFIXES}|${ABBREV_SUFFIXES}`;

const ADDRESS_WITH_CITY_REGEX = new RegExp(
  `(\\d+)\\s+([A-Za-z]+(?:\\s+[A-Za-z]+)*)\\s+(${ALL_SUFFIXES})\\.?\\s*(${DIRECTIONALS})?\\s*,\\s*([A-Za-z]+(?:\\s+[A-Za-z]+)*),\\s*([A-Z]{2})\\s+(\\d{5}(?:-\\d{4})?)`,
  'gi',
);

const ADDRESS_STREET_ONLY_REGEX = new RegExp(
  `(\\d+)\\s+([A-Za-z]+)\\s+(${ALL_SUFFIXES})\\.?\\s*(${DIRECTIONALS})?(?=\\s|$|,)`,
  'gi',
);

const CROSS_STREET_REGEX = new RegExp(
  `(?:^|\\s)(\\d*[A-Za-z]+(?:\\s+[A-Za-z]+)?)\\s+(${ALL_SUFFIXES})\\.?\\s*(${DIRECTIONALS})?\\s*&\\s*(\\d*[A-Za-z]+(?:\\s+[A-Za-z]+)?)\\s+(${ALL_SUFFIXES})\\.?\\s*(${DIRECTIONALS})?(?=\\s|$|,)`,
  'gi',
);

const PREFIX_PATTERNS = [
  /^at\s+/i,
  /^find\s+us\s+at\s+/i,
  /^we're\s+at\s+/i,
  /^we\s+are\s+at\s+/i,
  /^come\s+find\s+us\s+at\s+/i,
];

function extractAddress(text: string): { address: string; fuzzy: boolean } | undefined {
  ADDRESS_WITH_CITY_REGEX.lastIndex = 0;
  const fullMatch = ADDRESS_WITH_CITY_REGEX.exec(text);
  if (fullMatch) {
    return { address: fullMatch[0].trim(), fuzzy: false };
  }

  ADDRESS_STREET_ONLY_REGEX.lastIndex = 0;
  const streetMatch = ADDRESS_STREET_ONLY_REGEX.exec(text);
  if (streetMatch) {
    return { address: streetMatch[0].trim(), fuzzy: true };
  }

  CROSS_STREET_REGEX.lastIndex = 0;
  const crossMatch = CROSS_STREET_REGEX.exec(text);
  if (crossMatch) {
    let address = crossMatch[0].trim();
    for (const prefix of PREFIX_PATTERNS) {
      address = address.replace(prefix, '');
    }
    if (address.trim()) {
      return { address: address.trim(), fuzzy: true };
    }
  }

  return undefined;
}

function extractLocation(text: string): { address: string; fuzzy: boolean } | undefined {
  return extractAddress(text);
}
