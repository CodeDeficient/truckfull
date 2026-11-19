import type { ParsedEventData } from './parseEventText';

const PUNCTUATION = /[^\w\s]/g;
const WHITESPACE = /\s+/;
const NON_DIGITS = /\D/g;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const WWW_PREFIX = /^www\./;
const HTTP_PROTOCOL = /^https?:\/\//;

export interface EventClaim {
  type: 'name' | 'venue' | 'date' | 'phone' | 'email' | 'food_truck' | 'website';
  severity: 'critical' | 'major' | 'minor';
  canonicalValue: string;
  matchPatterns: string[];
}

export interface ClaimsResult {
  claims: EventClaim[];
  isNameFragment: boolean;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'this', 'that', 'these', 'those',
  'it', 'its', 'we', 'our', 'you', 'your', 'they', 'their', 'them',
  'about', 'also', 'just', 'more', 'most', 'some', 'each', 'every',
  'new', 'year', 'years', 'day', 'days', 'time', 'event', 'events',
  'coming', 'find', 'check', 'look', 'get', 'us', 'call', 'join',
  'great', 'annual', 'upcoming', 'local', 'best', 'big', 'small',
]);

const GENERIC_NAME_WORDS = new Set([
  ...STOP_WORDS,
  'mall', 'plaza', 'center', 'park', 'market', 'fair', 'festival',
  'concert', 'show', 'sale', 'expo', 'event', 'celebration', 'gathering',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(PUNCTUATION, ' ')
    .split(WHITESPACE)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
    .join(' ');
}

function normalizePhone(raw: string): string {
  return raw.replaceAll(NON_DIGITS, '');
}

function parseYMD(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(ISO_DATE);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function generateDatePatterns(dateStr: string, endDateStr: string | null): string[] {
  const months = [
    '', 'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december',
  ];
  const shortMonths = [
    '', 'jan', 'feb', 'mar', 'apr', 'may', 'jun',
    'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
  ];

  const d = parseYMD(dateStr);
  if (!d) return [];

  const { month, day } = d;
  const longMonth = months[month];
  const shortMonth = shortMonths[month];

  const patterns = [
    `${shortMonth} ${day}`,
    `${longMonth} ${day}`,
    String(day),
  ];

  if (endDateStr) {
    const ed = parseYMD(endDateStr);
    if (ed && month === ed.month) {
      patterns.push(`${shortMonth} ${day}-${ed.day}`, `${longMonth} ${day}-${ed.day}`, String(ed.day));
    }
  }

  patterns.push(`${d.year}`);

  return [...new Set(patterns)];
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(WWW_PREFIX, '');
  } catch {
    return url.replace(HTTP_PROTOCOL, '').split('/')[0]!;
  }
}

function isGenericName(name: string): boolean {
  const tokens = name.split(WHITESPACE).filter((t) => t.length > 1);
  if (tokens.length === 0) return true;
  const nonGeneric = tokens.filter((t) => !GENERIC_NAME_WORDS.has(t.toLowerCase()));
  return nonGeneric.length <= 1;
}

export function extractClaims(parsed: ParsedEventData | null): ClaimsResult {
  if (!parsed) return { claims: [], isNameFragment: false };

  const claims: EventClaim[] = [];
  let isNameFragment = !parsed.name;

  if (parsed.name) {
    isNameFragment = isGenericName(parsed.name);
    if (isNameFragment) {
      claims.push({
        type: 'name',
        severity: 'major',
        canonicalValue: normalize(parsed.name),
        matchPatterns: parsed.name.split(WHITESPACE).filter((t) => t.length > 1 && !STOP_WORDS.has(t.toLowerCase())).slice(0, 6),
      });
    } else {
      claims.push({
        type: 'name',
        severity: 'critical',
        canonicalValue: normalize(parsed.name),
        matchPatterns: parsed.name.split(WHITESPACE).slice(0, 6),
      });
    }
  }

  const venueText = parsed.location.address || '';
  if (venueText) {
    claims.push({
      type: 'venue',
      severity: 'critical',
      canonicalValue: normalize(venueText),
      matchPatterns: venueText.split(WHITESPACE).filter((t) => t.length > 1),
    });
  } else if (parsed.location.city) {
    const cityOnly = [parsed.location.city, parsed.location.state || ''].join(' ').trim();
    claims.push({
      type: 'venue',
      severity: 'critical',
      canonicalValue: normalize(cityOnly),
      matchPatterns: [parsed.location.city],
    });
  }

  if (parsed.date) {
    claims.push({
      type: 'date',
      severity: 'critical',
      canonicalValue: parsed.date,
      matchPatterns: generateDatePatterns(parsed.date, parsed.endDate),
    });
  }

  if (parsed.contactInfo.phone) {
    claims.push({
      type: 'phone',
      severity: 'major',
      canonicalValue: normalizePhone(parsed.contactInfo.phone),
      matchPatterns: [normalizePhone(parsed.contactInfo.phone)],
    });
  }

  if (parsed.contactInfo.email) {
    claims.push({
      type: 'email',
      severity: 'major',
      canonicalValue: parsed.contactInfo.email.toLowerCase().trim(),
      matchPatterns: [parsed.contactInfo.email.toLowerCase().trim()],
    });
  }

  claims.push({
    type: 'food_truck',
    severity: 'major',
    canonicalValue: 'food truck vendor mobile cuisine',
    matchPatterns: ['food truck', 'food trucks', 'vendor', 'vendors', 'mobile food', 'food stand'],
  });

  if (parsed.contactInfo.website) {
    claims.push({
      type: 'website',
      severity: 'minor',
      canonicalValue: extractDomain(parsed.contactInfo.website),
      matchPatterns: [parsed.contactInfo.website],
    });
  }

  return { claims, isNameFragment };
}
