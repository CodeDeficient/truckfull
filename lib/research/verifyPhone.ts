import { logError, logMessage } from '@/lib/logging';
import { searchVenueByName } from '@/lib/traffic/foursquare';

const NON_DIGITS = /\D/g;
const WHITESPACE = /\s+/;

const ENFORMION_BASE = 'https://devapi.enformion.com';
const ENFORMION_TIMEOUT_MS = 8000;
const GEMINI_SEARCH_TIMEOUT_MS = 30_000;

export interface PhoneVerificationResult {
  status: 'validated' | 'mismatch' | 'not_found' | 'skipped';
  venueName: string | null;
  carrier: string | null;
  venuePhone: string | null;
}

export function normalizePhone(raw: string): string {
  return raw.replaceAll(NON_DIGITS, '');
}

function hasValidLength(digits: string): boolean {
  return digits.length === 10 || digits.length === 11;
}

function extractName(obj: Record<string, unknown> | undefined | null): string | null {
  if (!obj) return null;

  const raw = obj.name;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();

  if (raw !== null && typeof raw === 'object') {
    const nameObj = raw as Record<string, unknown>;
    const first = typeof nameObj.firstName === 'string' ? nameObj.firstName
      : typeof nameObj.first_name === 'string' ? nameObj.first_name
      : typeof nameObj.first === 'string' ? nameObj.first : '';
    const middle = typeof nameObj.middleName === 'string' ? nameObj.middleName
      : typeof nameObj.middle_name === 'string' ? nameObj.middle_name
      : typeof nameObj.middle === 'string' ? nameObj.middle : '';
    const last = typeof nameObj.lastName === 'string' ? nameObj.lastName
      : typeof nameObj.last_name === 'string' ? nameObj.last_name
      : typeof nameObj.last === 'string' ? nameObj.last : '';
    const full = typeof nameObj.full === 'string' ? nameObj.full : '';
    if (full) return full;
    return [first, middle, last].filter(Boolean).join(' ').trim() || null;
  }

  const first = typeof obj.firstName === 'string' ? obj.firstName
    : typeof obj.first_name === 'string' ? obj.first_name : '';
  const last = typeof obj.lastName === 'string' ? obj.lastName
    : typeof obj.last_name === 'string' ? obj.last_name : '';
  return [first, last].filter(Boolean).join(' ').trim() || null;
}

function toE164(digits: string): string {
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

function getEnformionCredentials(): { name: string; password: string } | null {
  const name = process.env.ENFORMION_PROFILE_KEY_NAME;
  const password = process.env.ENFORMION_PROFILE_KEY_PASSWORD;
  if (!name || !password) {
    logMessage('verifyPhone: ENFORMION_PROFILE_KEY_NAME or ENFORMION_PROFILE_KEY_PASSWORD not configured');
    return null;
  }
  return { name, password };
}

interface EnformionPerson {
  first_name?: string;
  last_name?: string;
  name?: string;
}

interface EnformionResponse {
  status?: number;
  results?: EnformionPerson[];
  person?: EnformionPerson;
  carrier?: string;
  line_type?: string;
  connected?: boolean;
  name?: { first?: string; last?: string; full?: string };
}

async function queryEnformion(phone: string): Promise<EnformionResponse | null> {
  const creds = getEnformionCredentials();
  if (!creds) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ENFORMION_TIMEOUT_MS);

    const response = await fetch(`${ENFORMION_BASE}/Phone/Enrich`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'galaxy-ap-name': creds.name,
        'galaxy-ap-password': creds.password,
        'galaxy-search-type': 'DevAPICallerID',
      },
      body: JSON.stringify({ phone }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 400) {
        logMessage(`verifyPhone: Enformion rejected phone format (HTTP 400)`);
      } else {
        logError(`verifyPhone: Enformion HTTP ${response.status}`);
      }
      return null;
    }

    return (await response.json()) as EnformionResponse;
  } catch (error) {
    logError('verifyPhone: Enformion request failed:', error);
    return null;
  }
}

function extractJSON(text: string): Record<string, unknown> | null {
  const fenceStart = text.indexOf('```');
  if (fenceStart !== -1) {
    const contentStart = text.indexOf('\n', fenceStart) + 1;
    const fenceEnd = text.indexOf('```', contentStart > 0 ? contentStart : fenceStart + 3);
    if (fenceEnd > fenceStart) {
      const inner = text.slice(contentStart > 0 ? contentStart : fenceStart + 3, fenceEnd).trim();
      try { return JSON.parse(inner) as Record<string, unknown>; } catch { /* fall through */ }
    }
  }

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>; } catch { /* fall through */ }
  }

  return null;
}

async function searchVerifyPhone(
  phone: string,
  venueName: string,
): Promise<PhoneVerificationResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Search the web for the venue/organizer "${venueName}" and:

1. Determine whether phone number ${phone} belongs to "${venueName}"
2. Find the actual official phone number for "${venueName}" from their website, Google Business listing, or other authoritative source
3. Whether the number is associated with "${venueName}" or a different entity

Respond with ONLY valid JSON:
{"verified": true/false, "venue_name": "name associated with the searched phone or null", "venue_phone": "the venue's actual official phone number or null", "carrier": "carrier name or null", "explanation": "brief summary"}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_SEARCH_TIMEOUT_MS);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0 },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      logError(`verifyPhone: Gemini search HTTP ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) return null;

    const parsed = extractJSON(text);
    if (!parsed) {
      logMessage('verifyPhone: Gemini search response had no parseable JSON');
      return null;
    }

    const result = parsed as {
      verified?: boolean;
      venue_name?: string | null;
      venue_phone?: string | null;
      carrier?: string | null;
    };

    logMessage(`verifyPhone: Gemini search for ${phone} → verified=${result.verified}, venue=${result.venue_name ?? 'unknown'}, venue_phone=${result.venue_phone ?? 'none'}`);

    return {
      status: result.verified ? 'validated' : 'mismatch',
      venueName: result.venue_name ?? null,
      carrier: result.carrier ?? null,
      venuePhone: result.venue_phone ?? null,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logMessage(`verifyPhone: Gemini search timed out after ${GEMINI_SEARCH_TIMEOUT_MS / 1000}s`);
    } else {
      logError('verifyPhone: Gemini search request failed:', error);
    }
    return null;
  }
}

export async function verifyPhone(
  rawPhone: string,
  venueName: string | null,
  nearLocation?: string | null,
): Promise<PhoneVerificationResult> {
  const digits = normalizePhone(rawPhone);
  if (!hasValidLength(digits)) {
    return { status: 'skipped', venueName: null, carrier: null, venuePhone: null };
  }

  const e164 = toE164(digits);
  const venue = venueName ?? 'the event venue';

  logMessage(`verifyPhone: Checking ${rawPhone} for venue "${venue}"`);

  const enformionResult = await queryEnformion(digits);

  let enformionName: string | null = null;
  let enformionCarrier: string | null = null;
  let verifiedStatus: PhoneVerificationResult['status'] | null = null;

  if (enformionResult) {
    logMessage(`verifyPhone: Raw Enformion result — ${JSON.stringify(enformionResult).slice(0, 500)}`);
    const person = enformionResult.person
      ?? (enformionResult.results && enformionResult.results.length > 0 ? { ...enformionResult.results[0] } : null);

    enformionCarrier = enformionResult.carrier ?? null;

    if (!person && !enformionResult.connected) {
      verifiedStatus = 'not_found';
      logMessage(`verifyPhone: Enformion found no person or connection for ${rawPhone}`);
    } else {
      enformionName = extractName(person as Record<string, unknown> ?? null)
        ?? extractName(enformionResult as Record<string, unknown> ?? null);

      logMessage(`verifyPhone: Enformion returned name="${enformionName ?? 'unknown'}" carrier="${enformionCarrier ?? 'none'}"`);

      if (enformionName && venueName) {
        const nameLower = enformionName.toLowerCase();
        const venueLower = venueName.toLowerCase();
        const venueWords = venueLower.split(WHITESPACE).filter((w) => w.length > 2);
        const matches = venueWords.filter((w) => nameLower.includes(w)).length;
        const overlap = venueWords.length > 0 ? matches / venueWords.length : 0;

        if (overlap >= 0.5) {
          verifiedStatus = 'validated';
          logMessage(`verifyPhone: Name match — "${enformionName}" ≈ "${venueName}" (${Math.round(overlap * 100)}%)`);
        } else {
          verifiedStatus = 'mismatch';
          logMessage(`verifyPhone: Name mismatch — "${enformionName}" ≠ "${venueName}" (${Math.round(overlap * 100)}%)`);
        }
      } else {
        verifiedStatus = enformionCarrier ? 'mismatch' : 'not_found';
      }
    }
  } else {
    logMessage(`verifyPhone: Enformion returned no data for ${rawPhone}, trying Gemini`);
  }

  let venuePhone: string | null = null;

  if (verifiedStatus === 'validated' || verifiedStatus === 'mismatch') {
    logMessage(`verifyPhone: Enformion returned definitive status (${verifiedStatus}), skipping Gemini`);
  } else {
    const geminiResult = await searchVerifyPhone(e164, venue);

    if (geminiResult && !verifiedStatus) {
      logMessage(`verifyPhone: Using Gemini result: verified=${geminiResult.status}`);
      venuePhone = geminiResult.venuePhone ?? null;
      return {
        ...geminiResult,
        venuePhone,
      };
    }

    venuePhone = geminiResult?.venuePhone ?? null;
  }

  if (!venuePhone && venueName) {
    const nearFoursquare = nearLocation || venue;
    logMessage(`verifyPhone: Trying Foursquare for venue phone (near: ${nearFoursquare})`);
    const fsqResult = await searchVenueByName(venueName, nearFoursquare);
    if (fsqResult) {
      logMessage(`verifyPhone: Foursquare matched "${fsqResult.name}" — tel=${fsqResult.tel ?? 'none'}`);
      venuePhone = fsqResult.tel ?? null;
    } else {
      logMessage('verifyPhone: Foursquare returned no result');
    }
  }

  return {
    status: verifiedStatus ?? 'not_found',
    venueName: enformionName ?? null,
    carrier: enformionCarrier ?? null,
    venuePhone,
  };
}

export async function verifyEmail(
  rawEmail: string,
  venueName: string | null,
): Promise<PhoneVerificationResult> {
  if (!rawEmail || !rawEmail.includes('@')) {
    return { status: 'skipped', venueName: null, carrier: null, venuePhone: null };
  }

  const domain = rawEmail.split('@')[1]?.toLowerCase() ?? '';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { status: 'skipped', venueName: null, carrier: null, venuePhone: null };

  const prompt = `Search the web and determine whether email address ${rawEmail} actually belongs to the venue/organizer "${venueName}".

Use Google Search to find:
1. Whether this email appears on the official website, business listings, or directory pages for "${venueName}"
2. Whether the email domain (${domain}) is the venue's actual domain or a different one
3. Whether this email has been reported as spam, scam, or fraudulent

Respond with ONLY valid JSON:
{"verified": true/false, "venue_name": "name of entity associated with this email or null", "explanation": "brief summary of what you found"}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_SEARCH_TIMEOUT_MS);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0 },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      logError(`verifyEmail: Gemini search HTTP ${response.status}`);
      return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };

    const parsed = extractJSON(text);
    if (!parsed) return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };

    const result = parsed as {
      verified?: boolean;
      venue_name?: string | null;
    };

    logMessage(`verifyEmail: Gemini search for ${rawEmail} → verified=${result.verified}, venue=${result.venue_name ?? 'unknown'}`);

    return {
      status: result.verified ? 'validated' : 'mismatch',
      venueName: result.venue_name ?? null,
      carrier: null,
      venuePhone: null,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logMessage(`verifyEmail: Gemini search timed out after ${GEMINI_SEARCH_TIMEOUT_MS / 1000}s`);
    } else {
      logError('verifyEmail: Gemini search request failed:', error);
    }
    return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };
  }
}

export async function verifyWebsite(
  rawUrl: string,
  venueName: string | null,
  eventName: string,
): Promise<PhoneVerificationResult> {
  if (!rawUrl) return { status: 'skipped', venueName: null, carrier: null, venuePhone: null };

  const venue = venueName ?? 'the event venue';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { status: 'skipped', venueName: null, carrier: null, venuePhone: null };

  const prompt = `Search the web and determine whether website ${rawUrl} is the legitimate, official website for the event "${eventName}" at venue "${venue}".

Use Google Search to find:
1. Whether this URL is referenced as the official event page on other websites, news articles, or event listing platforms
2. Whether the domain belongs to the venue, the event organizer, or an unrelated third party
3. Whether this URL has been flagged as suspicious, phishing, or scam

Respond with ONLY valid JSON:
{"verified": true/false, "venue_name": "who owns this site or null", "explanation": "brief summary of what you found"}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_SEARCH_TIMEOUT_MS);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { temperature: 0 },
        }),
        signal: controller.signal,
      },
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      logError(`verifyWebsite: Gemini search HTTP ${response.status}`);
      return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!text) return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };

    const parsed = extractJSON(text);
    if (!parsed) return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };

    const result = parsed as {
      verified?: boolean;
      venue_name?: string | null;
    };

    logMessage(`verifyWebsite: Gemini search for ${rawUrl} → verified=${result.verified}, venue=${result.venue_name ?? 'unknown'}`);

    return {
      status: result.verified ? 'validated' : 'mismatch',
      venueName: result.venue_name ?? null,
      carrier: null,
      venuePhone: null,
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      logMessage(`verifyWebsite: Gemini search timed out after ${GEMINI_SEARCH_TIMEOUT_MS / 1000}s`);
    } else {
      logError('verifyWebsite: Gemini search request failed:', error);
    }
    return { status: 'not_found', venueName: null, carrier: null, venuePhone: null };
  }
}
