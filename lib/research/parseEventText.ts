import { callLLM, DEFAULT_LLM_CONFIG } from '@/lib/utils/callLLM';
import { logMessage, logError } from '@/lib/logging';
import { resolveEventDate, todayFormatted, todayISO } from './dateResolution';
import { isMaskedContact } from './contactValidation';
import { repairJson } from '@/lib/utils/jsonRepair';

const JSON_CODE_FENCE = /```json?\n?/g;
const TRAILING_CODE_FENCE = /```$/g;

export interface ParsedEventData {
  name: string;
  description: string;
  date: string | null;
  endDate: string | null;
  location: {
    address: string | null;
    city: string | null;
    state: string | null;
    lat: number | null;
    lng: number | null;
  };
  time: {
    start: string | null;
    end: string | null;
  };
  category: string | null;
  expectedAttendance: number | null;
  contactInfo: {
    phone: string | null;
    email: string | null;
    website: string | null;
  };
  confidence: number;
}

function buildParsePrompt(): string {
  return `Extract event information from the following text. The text may come from a poster, flyer, or pasted event listing.

Today's date is ${todayFormatted()} (${todayISO()}).

Return ONLY valid JSON:
{
  "name": "event name",
  "description": "brief description of the event",
  "date": "YYYY-MM-DD or null",
  "endDate": "YYYY-MM-DD or null (for multi-day events)",
  "location": {
    "address": "street address or null",
    "city": "city name or null",
    "state": "state abbreviation (GA, SC, etc) or null",
    "lat": null,
    "lng": null
  },
  "time": {
    "start": "HH:MM 24h format or null",
    "end": "HH:MM 24h format or null"
  },
  "category": "festival|concert|market|fair|community|sports|fundraiser|holiday|other or null",
  "expectedAttendance": null,
  "contactInfo": {
    "phone": "phone number or null",
    "email": "email or null",
    "website": "url or null"
  },
  "confidence": 0.0-1.0
}

Rules:
- Extract as much as possible, use null for missing fields
- For dates: if the text contains a month and day but NO year, set date to null. Do NOT guess or infer the year. If the text DOES include a year, use it exactly as YYYY-MM-DD.
- Convert times to 24h format
- Infer city/state from context if not explicit
- For expectedAttendance: always output null. Do NOT estimate or guess attendance numbers from the text.
- Confidence based on how complete the information is
- For website: only extract a URL if it appears EXACTLY as a complete, well-formed URL in the text (e.g. "www.example.com" or "https://example.com"). NEVER construct, infer, or guess URLs. If the text says "follow us on Facebook" with no URL, set website to null — do NOT fabricate a facebook.com URL from the business name.
- For phone: only extract numbers that appear as phone numbers in the text. Do NOT fabricate phone numbers. If the text says \"call us\" or \"contact us\" with no number, set phone to null.
- For email: extract the EXACT email as shown. Never mask, censor, or partially obscure emails (no ***, no ...). If an email appears partially obscured in the source, set it to null rather than fabricating a censored version.`;
}

const SANITIZE_MAX_LENGTH = 10_000;
const SUSPICIOUS_PATTERNS = [
  /<script\b/i,
  /javascript:/i,
  /on\w+\s*=/i,
  /data:text\/html/i,
];

export function sanitizeInput(text: string): string | null {
  if (!text || typeof text !== 'string') return null;

  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > SANITIZE_MAX_LENGTH) return trimmed.slice(0, SANITIZE_MAX_LENGTH);

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmed)) return null;
  }

  return trimmed;
}

export function validateParsedData(data: unknown): data is ParsedEventData {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.name !== 'string' || d.name.trim().length === 0) return false;

  if (typeof d.confidence !== 'number') {
    (d as Record<string, unknown>).confidence = 0.5;
  }

  if (!d.location || typeof d.location !== 'object') {
    (d as Record<string, unknown>).location = {
      address: null, city: null, state: null, lat: null, lng: null,
    };
  } else {
    const loc = d.location as Record<string, unknown>;
    for (const key of ['address', 'city', 'state'] as const) {
      if (typeof loc[key] !== 'string') loc[key] = null;
    }
    if (typeof loc.lat !== 'number') loc.lat = null;
    if (typeof loc.lng !== 'number') loc.lng = null;
  }

  if (!d.time || typeof d.time !== 'object') {
    (d as Record<string, unknown>).time = { start: null, end: null };
  } else {
    const time = d.time as Record<string, unknown>;
    if (typeof time.start !== 'string') time.start = null;
    if (typeof time.end !== 'string') time.end = null;
  }

  if (!d.contactInfo || typeof d.contactInfo !== 'object') {
    (d as Record<string, unknown>).contactInfo = { phone: null, email: null, website: null };
  } else {
    const ci = d.contactInfo as Record<string, unknown>;
    for (const key of ['phone', 'email', 'website'] as const) {
      if (typeof ci[key] !== 'string') ci[key] = null;
    }
  }

  if (typeof d.description !== 'string') d.description = '';
  if (typeof d.date !== 'string' && d.date !== null) d.date = null;
  if (typeof d.endDate !== 'string' && d.endDate !== null) d.endDate = null;
  if (typeof d.category !== 'string' || d.category.trim().length === 0) d.category = null;
  if (typeof d.expectedAttendance !== 'number') d.expectedAttendance = null;

  return true;
}

export async function parseEventText(rawText: string): Promise<ParsedEventData | null> {
  const text = sanitizeInput(rawText);
  if (!text) return null;

  try {
    const response = await callLLM(
      [
        { role: 'system', content: buildParsePrompt() },
        { role: 'user', content: text },
      ],
      DEFAULT_LLM_CONFIG,
    );

    if (!response.success || !response.data) {
      logError('parseEventText: LLM call failed:', response.error);
      return null;
    }

    let jsonText = response.data.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replaceAll(JSON_CODE_FENCE, '').replaceAll(TRAILING_CODE_FENCE, '').trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      const repaired = repairJson(jsonText);
      if (repaired) {
        logMessage('parseEventText: Repaired malformed JSON from LLM');
        try {
          parsed = JSON.parse(repaired);
        } catch {
          logError('parseEventText: JSON repair failed');
          return null;
        }
      } else {
        logError('parseEventText: Malformed JSON could not be repaired');
        return null;
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      logMessage('parseEventText: LLM returned array, extracting first element');
      parsed = parsed[0]!;
    }

    if (!validateParsedData(parsed)) {
      const preview = JSON.stringify(parsed, null, 2)?.slice(0, 500) ?? 'unknown';
      logError(`parseEventText: Invalid parsed structure: ${preview}`);
      return null;
    }

    const resolved = resolveEventDate(parsed.date, parsed.endDate);
    parsed.date = resolved.date;
    parsed.endDate = resolved.endDate;

    if (resolved.yearWasInferred) {
      logMessage(`parseEventText: No year found for "${parsed.name}" — date set to null`);
    }

    if (parsed.contactInfo?.email && isMaskedContact(parsed.contactInfo.email)) {
      logMessage(`parseEventText: Discarding masked email for "${parsed.name}"`);
      parsed.contactInfo.email = null;
    }
    if (parsed.contactInfo?.phone && isMaskedContact(parsed.contactInfo.phone)) {
      logMessage(`parseEventText: Discarding masked phone for "${parsed.name}"`);
      parsed.contactInfo.phone = null;
    }

    logMessage(`parseEventText: Parsed event "${parsed.name}" with confidence ${parsed.confidence}`);
    return parsed;
  } catch (error) {
    logError('parseEventText: Failed to parse event text:', error);
    return null;
  }
}
