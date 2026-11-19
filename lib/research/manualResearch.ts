import { parseEventText, sanitizeInput as sanitizeText } from '@/lib/research/parseEventText';
import { searchEvent } from './researchService';
import { vetEvent } from '@/lib/events/eventVetting';
import { sanitizeInput as sanitizeHtmlTags } from '@/lib/security/sanitizer';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/database.remote.types';
import { logMessage, logError } from '@/lib/logging';
import { extractVenue } from './extractVenue';
import { getCityCenter } from '@/lib/events/vettingLocationFallback';
import { geocodeAddress } from '@/lib/utils/geocoding';
import { searchVenueByName } from '@/lib/traffic/foursquare';
import { rankSources, calculateSearchConfidence } from './sourceRelevance';
import { extractClaims } from './claimExtractor';
import { verifyClaims } from './claimVerification';
import { fetchPageContent } from './fetchPageContent';
import { llmDeepVerify } from './llmClaimVerifier';
import { aggregateEvidence } from './aggregateEvidence';
import { verifyPhone, verifyEmail, verifyWebsite } from './verifyPhone';
import type { ParsedEventData } from './parseEventText';
import type { ResearchSource } from './types';
import type { EventVettingResult } from '@/lib/events/eventVetting';
import type { EvidenceAggregate } from './aggregateEvidence';
import {
  buildEventCacheTarget,
  type EventCacheInvalidator,
  type EventIdentityRow,
} from '@/lib/events/eventCacheTargets';

const LATIN_LETTERS = /[a-zA-Z]/g;
const WHITESPACE_CHARS = /\s/g;

const REFERENCE_DOMAINS = [
  'merriam-webster.com',
  'dictionary.com',
  'thefreedictionary.com',
  'wiktionary.org',
  'wikipedia.org',
  'britannica.com',
  'thesaurus.com',
  'oxfordlearnersdictionaries.com',
  'cambridge.org',
  'vocabulary.com',
  'urbandictionary.com',
];

const NON_ENGLISH_DOMAINS = [
  'zhihu.com',
  'weibo.com',
  'baidu.com',
  'taobao.com',
  'qq.com',
  'sina.com.cn',
  'sohu.com',
  '163.com',
  'toutiao.com',
  'csdn.net',
  'douyin.com',
  'bilibili.com',
  'naver.com',
  'daum.net',
];

function hasNonLatinText(text: string): boolean {
  const latinChars = (text.match(LATIN_LETTERS) ?? []).length;
  const totalChars = text.replaceAll(WHITESPACE_CHARS, '').length;
  if (totalChars === 0) return false;
  return latinChars / totalChars < 0.5;
}

function isNonEnglishSource(url: string, snippet: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (NON_ENGLISH_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`))) return true;
  } catch {}
  return hasNonLatinText(snippet);
}

function buildSearchQuery(text: string, parsed: ParsedEventData | null): string {
  const parts: string[] = [];

  if (parsed?.name) {
    parts.push(parsed.name);
  }

  const venue = parsed?.location.address || extractVenue(text);
  if (venue) parts.push(venue);

  if (parsed?.location.city) parts.push(parsed.location.city);
  if (parsed?.location.state) parts.push(parsed.location.state);

  if (parsed?.date) {
    const d = new Date(parsed.date);
    parts.push(d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));
  }

  if (parsed?.contactInfo.phone) parts.push(parsed.contactInfo.phone);

  if (parts.length > 0) return parts.join(' ');

  const lines = text.split('\n').filter((l) => l.trim().length > 3);
  return lines.slice(0, 3).join(' ') || text.slice(0, 200);
}

function isReferenceSource(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return REFERENCE_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

type ExternalEventsRow = Database['public']['Tables']['external_events']['Row'];
type ExternalEventsInsert = Database['public']['Tables']['external_events']['Insert'];

export interface ManualResearchInput {
  text: string;
  sourceEventId?: string;
  shareWithCommunity: boolean;
  userId: string;
  isProUser?: boolean;
}

export interface ManualResearchResult {
  parsed: ParsedEventData | null;
  vetting: EventVettingResult | null;
  searchConfidence: number;
  sources: Array<{ title: string; url: string; snippet: string }>;
  evidence: EvidenceAggregate | null;
  eventId: string | null;
  shared: boolean;
  isNameFragment: boolean;
}

export async function runManualResearch(
  input: ManualResearchInput,
  invalidate?: EventCacheInvalidator,
): Promise<ManualResearchResult> {
  const sanitized = sanitizeText(input.text);
  if (!sanitized) {
    return {
      parsed: null,
      vetting: null,
      searchConfidence: 0,
      sources: [],
      evidence: null,
      eventId: null,
      shared: false,
      isNameFragment: false,
    };
  }

  const parsed = await parseEventText(sanitized);

  if (parsed) {
    logMessage(
      `Manual research: Parsed location — address="${parsed.location.address ?? 'null'}", city="${parsed.location.city ?? 'null'}", state="${parsed.location.state ?? 'null'}", lat=${parsed.location.lat ?? 'null'}, lng=${parsed.location.lng ?? 'null'}`,
    );
    logMessage(
      `Manual research: Parsed contact — phone="${parsed.contactInfo.phone ?? 'null'}", email="${parsed.contactInfo.email ?? 'null'}", website="${parsed.contactInfo.website ?? 'null'}"`,
    );
  }
  const searchResult = await runSearch(sanitized, parsed);
  const vetting = await runVetting(parsed);

  logMessage(
    `Manual research: Running deep verification — ${parsed?.contactInfo.phone ?? 'no phone'}, ${searchResult.sources.length} sources, confidence=${searchResult.confidence.toFixed(2)}`,
  );

  const evidence = await runDeepVerification(
    searchResult.sources, parsed, input.isProUser ?? false, searchResult.confidence,
  );

  let eventId: string | null = input.sourceEventId ?? null;
  let shared = false;

  if (parsed && shouldSaveCommunityEvent(input)) {
    const result = await saveCommunityEvent(input, parsed, invalidate);
    eventId = result.eventId;
    shared = result.saved;
  }

  return {
    parsed,
    vetting,
    searchConfidence: evidence?.overallConfidence ?? searchResult.confidence,
    sources: searchResult.sources,
    evidence,
    eventId,
    shared,
    isNameFragment: evidence?.isNameFragment ?? !parsed?.name,
  };
}

async function runSearch(
  text: string,
  parsed: ParsedEventData | null,
): Promise<{ confidence: number; sources: Array<{ title: string; url: string; snippet: string }> }> {
  try {
    const query = buildSearchQuery(text, parsed);
    const result = await searchEvent(query);

    if (!result) {
      return { confidence: 0, sources: [] };
    }

    const allSources: ResearchSource[] = result.sources
      .filter((s) => !isReferenceSource(s.url))
      .filter((s) => !isNonEnglishSource(s.url, s.snippet));

    const ranked = rankSources(allSources, parsed);
    const confidence = calculateSearchConfidence(allSources, parsed);

    return {
      confidence,
      sources: ranked.slice(0, 5).map((s) => ({
        title: s.title,
        url: s.url,
        snippet: s.snippet,
      })),
    };
  } catch (error) {
    logError('Manual research search failed:', error);
    return { confidence: 0, sources: [] };
  }
}

async function runDeepVerification(
  sources: Array<{ title: string; url: string; snippet: string }>,
  parsed: ParsedEventData | null,
  isProUser: boolean,
  searchConfidence: number,
): Promise<EvidenceAggregate | null> {
  if (!parsed || sources.length === 0) {
    logMessage('Manual research: No parsed data or sources, skipping deep verification');
    return null;
  }

  const { claims, isNameFragment } = extractClaims(parsed);
  if (claims.length === 0) {
    logMessage('Manual research: No claims extracted, skipping deep verification');
    return null;
  }

  const skipExternalVerification = searchConfidence < 0.4;

  logMessage(
    `Manual research: Deep verification — ${claims.length} claims, ${sources.length} sources, confidence=${searchConfidence.toFixed(2)}, skipExternal=${skipExternalVerification}`,
  );

  const researchSources: ResearchSource[] = sources.map((s) => ({
    title: s.title,
    url: s.url,
    snippet: s.snippet,
    engines: [],
  }));

  const ranked = rankSources(researchSources, parsed);
  const topSources = ranked.slice(0, 8);

  if (topSources.length === 0) return null;

  const verifiedSources: Array<{
    source: ResearchSource;
    verification: ReturnType<typeof verifyClaims>;
    fullContentFetched: boolean;
  }> = [];

  const fetchPromises = topSources.map(async (source) => {
    const snippetVerification = verifyClaims(claims, source.snippet);
    const hasSomeMatch = snippetVerification.criticalSupported > 0
      || snippetVerification.criticalPartial > 0
      || snippetVerification.totalScore > 0.1;

    let finalVerification = snippetVerification;
    let fullContentFetched = false;
    let fetchedContent: string | null = null;

    if (hasSomeMatch) {
      fetchedContent = await fetchPageContent(source.url);
      if (fetchedContent) {
        fullContentFetched = true;
        const fullVerification = verifyClaims(claims, fetchedContent);

        if (fullVerification.totalScore > snippetVerification.totalScore) {
          finalVerification = fullVerification;
        }
      }
    }

    if (isProUser && finalVerification.totalScore > 0.1 && finalVerification.totalScore < 0.8) {
      const contentToVerify = fetchedContent ?? source.snippet;

      finalVerification = await llmDeepVerify(claims, source.title, contentToVerify, finalVerification);
    }

    return { source, verification: finalVerification, fullContentFetched };
  });

  const results = await Promise.allSettled(fetchPromises);
  for (const r of results) {
    if (r.status === 'fulfilled') {
      verifiedSources.push(r.value);
    }
  }

  let phoneResult = null;
  if (parsed.contactInfo.phone) {
    const venueName = parsed.location.address
      ?? extractVenue(parsed.name)
      ?? parsed.location.city
      ?? null;
    const near = [parsed.location.city, parsed.location.state].filter(Boolean).join(', ');
    logMessage(`Manual research: Verifying phone ${parsed.contactInfo.phone} for venue "${venueName ?? 'unknown'}"`);
    phoneResult = await verifyPhone(parsed.contactInfo.phone, venueName, near || undefined);
    logMessage(`Manual research: Phone verification result — status=${phoneResult.status}, name=${phoneResult.venueName ?? 'none'}, venuePhone=${phoneResult.venuePhone ?? 'none'}`);
  }

  let emailResult = null;
  if (!skipExternalVerification && parsed.contactInfo.email) {
    const venueName = parsed.location.address ?? parsed.location.city ?? null;
    logMessage(`Manual research: Verifying email ${parsed.contactInfo.email}`);
    emailResult = await verifyEmail(parsed.contactInfo.email, venueName);
    logMessage(`Manual research: Email verification result — status=${emailResult.status}`);
  }

  let websiteResult = null;
  if (!skipExternalVerification && parsed.contactInfo.website) {
    const venueName = parsed.location.address ?? parsed.location.city ?? null;
    websiteResult = await verifyWebsite(
      parsed.contactInfo.website,
      venueName,
      parsed.name,
    );
  }

  return aggregateEvidence(
    verifiedSources, claims, phoneResult, isNameFragment,
    emailResult, websiteResult,
  );
}

async function runVetting(
  parsed: ParsedEventData | null,
): Promise<EventVettingResult | null> {
  if (!parsed) return null;

  let lat = parsed.location.lat;
  let lng = parsed.location.lng;

  if (lat == null || lng == null) {
    if (parsed.location.city && parsed.location.state) {
      logMessage(`Manual research: Checking city center for ${parsed.location.city}, ${parsed.location.state}`);
      const center = getCityCenter(parsed.location.city, parsed.location.state);
      if (center) {
        lat = center.lat;
        lng = center.lng;
        logMessage(`Manual research: City center found (${center.lat}, ${center.lng})`);
      } else {
        logMessage(`Manual research: No city center for ${parsed.location.city}, ${parsed.location.state}`);
      }
    }

    const address = parsed.location.address;
    if ((lat == null || lng == null) && address) {
      logMessage('Manual research: Geocoding address for vetting');
      const geo = await geocodeAddress(address);
      if (geo.success) {
        lat = geo.lat;
        lng = geo.lng;
        logMessage(`Manual research: Geocoded address to (${geo.lat}, ${geo.lng})`);
      } else {
        logMessage(`Manual research: Geocoding failed for "${address}"`);
      }
    }

    if (lat == null || lng == null) {
      const venueQuery = address || extractVenue(parsed.name);
      const near = [parsed.location.city, parsed.location.state].filter(Boolean).join(', ');
      if (venueQuery) {
        logMessage('Manual research: Searching Foursquare for venue', { query: venueQuery, near });
        try {
          const venue = await searchVenueByName(venueQuery, near || undefined);
          if (venue) {
            lat = venue.location.lat;
            lng = venue.location.lng;
            logMessage(`Manual research: Found venue "${venue.name}" via Foursquare`);
          }
        } catch (error) {
          logError('Manual research: Foursquare venue search failed:', error);
        }
      }
    }
  }

  if (lat == null || lng == null) {
    logMessage('Manual research: No location for vetting, skipping vetting step');
    return null;
  }

  try {
    return await vetEvent({
      eventId: 'manual-research',
      eventName: parsed.name,
      location: {
        lat,
        lng,
        address: parsed.location.address ?? '',
      },
      city: parsed.location.city ?? undefined,
      state: parsed.location.state ?? undefined,
      date: parsed.date,
      source: 'external',
      locationType: parsed.location.lat == null ? 'approximate' : 'precise',
    });
  } catch (error) {
    logError('Manual research vetting failed:', error);
    return null;
  }
}

export function shouldSaveCommunityEvent(
  input: Pick<ManualResearchInput, 'shareWithCommunity' | 'sourceEventId'>,
): boolean {
  return input.shareWithCommunity && input.sourceEventId === undefined;
}

export function buildCommunityEventInsert(
  input: ManualResearchInput,
  parsed: ParsedEventData,
  coordinates: { readonly lat: number | null; readonly lng: number | null },
): ExternalEventsInsert {
  return {
    title: sanitizeHtmlTags(parsed.name, []),
    description: sanitizeHtmlTags(parsed.description, []),
    event_start_date: parsed.date,
    location_address: parsed.location.address,
    city: parsed.location.city ?? 'Unknown',
    state: parsed.location.state ?? 'Unknown',
    location_lat: coordinates.lat,
    location_lng: coordinates.lng,
    category: parsed.category,
    source: 'community',
    source_type: 'community',
    external_id: `community-${Date.now()}-${input.userId.slice(0, 8)}`,
    is_food_truck_relevant: null,
    is_community_submitted: true,
    submitted_by: input.userId,
    community_shared_at: input.shareWithCommunity ? new Date().toISOString() : null,
    vetting_score: null,
    vetting_result: null,
    vetted_at: null,
    vetting_location_type: parsed.location.lat == null ? 'approximate' : 'precise',
  };
}

async function saveCommunityEvent(
  input: ManualResearchInput,
  parsed: ParsedEventData,
  invalidate?: EventCacheInvalidator,
): Promise<{ eventId: string | null; saved: boolean }> {
  const supabase = getSupabaseAdmin();

  let lat = parsed.location.lat;
  let lng = parsed.location.lng;

  if ((lat == null || lng == null) && parsed.location.city && parsed.location.state) {
    const center = getCityCenter(parsed.location.city, parsed.location.state);
    if (center) {
      lat = center.lat;
      lng = center.lng;
    }
  }

    const { data, error } = await supabase
      .from('external_events')
      .insert(buildCommunityEventInsert(input, parsed, { lat, lng }))
      .select('id, title, city, state, event_start_date')
      .single();

    if (error || !data) {
      logError('Failed to insert community event:', error);
      return { eventId: null, saved: false };
    }

    const insertedRow = data as unknown as ExternalEventsRow;
    logMessage(`Community event created: ${insertedRow.id}`);

    if (invalidate) {
      const row: EventIdentityRow = {
        id: insertedRow.id,
        title: insertedRow.title,
        city: insertedRow.city,
        state: insertedRow.state,
        event_start_date: insertedRow.event_start_date,
      };
      const target = buildEventCacheTarget(row);
      if (target) {
        try {
          await invalidate([target]);
        } catch (invalidationError) {
          logError(
            `Failed to invalidate event cache for community event ${insertedRow.id}`,
            invalidationError,
          );
        }
      }
    }

    return { eventId: insertedRow.id, saved: true };
}
