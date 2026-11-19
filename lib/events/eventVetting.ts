/**
 * Event Vetting Pipeline
 *
 * Scores events using available data sources:
 * - DOT Traffic Nodes: Average Annual Daily Traffic (AADT) from SC/GA stations
 * - SearXNG: Event research and confidence scoring
 * - Area Event Density: How many events happen in the vicinity
 * - Recurring Event: Has this event happened before at this location
 *
 * Weights:
 * - Traffic Score: 0.25
 * - Research Confidence: 0.30
 * - Area Event Density: 0.20
 * - Recurring Event: 0.25
 */

import type { Database, Json } from '@/lib/database.remote.types';
import { Redis } from '@upstash/redis';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage, logError } from '@/lib/logging';
import { detectAnnualPrefix } from '@/lib/research/textQuality';
import {
  countSimilarPreviousEvents,
  scoreExternalEventHistory,
  type PreviousExternalEvent,
} from '@/lib/events/vettingHistory';
import {
  buildEventCacheTarget,
  buildVettingCacheTargets,
  getVettingResearchConfidence,
  VETTING_ELIGIBILITY_THRESHOLD,
  type EventCacheInvalidator,
  type EventIdentityRow,
} from '@/lib/events/eventCacheTargets';
import { chunkEventCacheTargets, type EventCacheTarget } from '@/lib/events/eventPageInvalidation';

type RpcName = string & keyof Database['public']['Functions'];
type AdminSupabase = ReturnType<typeof getSupabaseAdmin>;

const PROJECTION_RETRY_INTERVAL_MS = 5 * 60 * 1000;
type HistoryProjection = 'aggregate' | 'previous';

interface ProjectionState {
  retryAt: number;
  generation: number;
}

const projectionStates: Record<HistoryProjection, ProjectionState> = {
  aggregate: { retryAt: 0, generation: 0 },
  previous: { retryAt: 0, generation: 0 },
};

export type EventSource = 'eventfull' | 'external';

export interface EventVettingRequest {
  eventId: string;
  eventName: string;
  location: { lat: number; lng: number; address: string };
  city?: string;
  state?: string;
  date: string | null;
  expectedAttendance?: number;
  source?: EventSource;
  locationType?: 'precise' | 'approximate';
  preFetchedResearch?: { score: number; sources: string[] };
}

export interface EventVettingResult {
  score: number;
  factors: {
    trafficScore: number;
    researchConfidence: number;
    historyScore: number;
    areaEventCount: number;
    recurringCount: number;
    venuePopularity?: number;
  };
  recommendation: 'highly_recommended' | 'recommended' | 'neutral' | 'caution' | 'limited_data';
  reasoning: string;
  sources: string[];
  locationType?: 'precise' | 'approximate';
}

export interface FactorScores {
  trafficScore: number;
  researchConfidence: number;
  historyScore: number;
  previouslyOccurredScore: number;
  areaEventCount: number;
  recurringCount: number;
  venuePopularity: number;
}

const TRAFFIC_WEIGHT = 0.25;
const RESEARCH_WEIGHT = 0.3;
const HISTORY_WEIGHT = 0.2;
const PREVIOUSLY_OCCURRED_WEIGHT = 0.25;

const CACHE_TTL_SECONDS = 24 * 60 * 60;

let redisClient: Redis | null = null;
let hasLoggedRedisWarning = false;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (!hasLoggedRedisWarning) {
      hasLoggedRedisWarning = true;
      logError(
        '[VETTING CACHE] Upstash Redis not configured. Caching disabled. ' +
          'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.',
      );
    }
    return null;
  }

  redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redisClient;
}

function isRedisConfigured(): boolean {
  return getRedisClient() !== null;
}

export function calculateWeightedScore(factors: FactorScores): number {
  const traffic = factors.trafficScore || 0;
  const research = factors.researchConfidence || 0;
  const history = factors.historyScore || 0;
  const previouslyOccurred = factors.previouslyOccurredScore || 0;

  const rawScore =
    traffic * TRAFFIC_WEIGHT +
    research * RESEARCH_WEIGHT +
    history * HISTORY_WEIGHT +
    previouslyOccurred * PREVIOUSLY_OCCURRED_WEIGHT;

  return Math.min(100, Math.round(rawScore * 100));
}

export function getRecommendation(score: number): EventVettingResult['recommendation'] {
  if (score >= 80) return 'highly_recommended';
  if (score >= 60) return 'recommended';
  if (score >= 40) return 'neutral';
  if (score >= 20) return 'caution';
  return 'limited_data';
}

async function getTrafficScore(lat: number, lng: number): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();
    const RADIUS_STEPS = [1500, 3000, 5000];

    for (const radius of RADIUS_STEPS) {
      const { data, error } = (await supabase.rpc(
        'find_traffic_nodes_optimized' as never,
        {
          p_lat: lat,
          p_lng: lng,
          p_radius_miles: Math.ceil(radius / 1609.34),
          p_limit: 20,
        } as never,
      )) as { data: Record<string, unknown>[] | null; error: { message: string } | null };

      if (error || !data || data.length === 0) continue;

      let totalWeight = 0;
      let weightedPercentileSum = 0;

      for (const node of data as unknown as Array<{
        distance_meters: number;
        score_percentile: number;
      }>) {
        const distance = Number(node.distance_meters ?? 1000);
        const percentile = Number(node.score_percentile ?? 0);
        const weight = 1 / (1 + distance / 1000);
        totalWeight += weight;
        weightedPercentileSum += percentile * weight;
      }

      if (totalWeight > 0) {
        return Math.min(1, weightedPercentileSum / totalWeight / 100);
      }
    }

    return 0;
  } catch (error) {
    logError('Failed to get DOT traffic score:', error);
    return 0;
  }
}

async function getVenuePopularityScore(lat: number, lng: number): Promise<number> {
  try {
    const { FoursquareService } = await import('@/lib/traffic/foursquare');
    const service = new FoursquareService();
    const venues = await service.searchVenuesByLocation(lat, lng, 500);

    if (venues.length === 0) return 0;

    const popularityScores = venues
      .map((v) => v.popularity)
      .filter((p) => typeof p === 'number' && Number.isFinite(p));

    if (popularityScores.length === 0) return 0;

    return popularityScores.reduce((sum, p) => sum + p, 0) / popularityScores.length;
  } catch (error) {
    logError('Failed to get Foursquare venue popularity:', error);
    return 0;
  }
}

function checkResearchAvailability(): boolean {
  const hasSearXNG = !!process.env.SEARXNG_URL;
  const hasTavily = !!process.env.TAVILY_API_KEY;
  const hasExa = !!process.env.EXA_API_KEY && !process.env.RESEARCH_DISABLE_EXA;
  const hasBrave = !!process.env.BRAVE_API_KEY;
  if (!hasSearXNG && !hasTavily && !hasExa && !hasBrave) {
    throw new Error(
      'Research service is unavailable: no search providers configured (SEARXNG_URL, TAVILY_API_KEY, EXA_API_KEY, or BRAVE_API_KEY).',
    );
  }
  return true;
}

async function getResearchConfidence(
  eventName: string,
  location: { city?: string; state?: string },
): Promise<{ score: number; sources: string[] }> {
  try {
    const { searchEvent } = await import('@/lib/research/researchService');
    const locationSuffix = [location.city, location.state].filter(Boolean).join(', ');
    const query = locationSuffix ? `${eventName} ${locationSuffix}` : eventName;
    const result = await searchEvent(query);

    if (!result) return { score: 0, sources: [] };
    return { score: result.confidence, sources: result.sources.map((s) => s.url) };
  } catch (error) {
    logError('Failed to get research:', error);
    return { score: 0, sources: [] };
  }
}

interface ExternalEventHistoryStats {
  event_count: number;
  average_distance_meters: number;
}

function beginHistoryProjectionAttempt(projection: HistoryProjection): number | null {
  const state = projectionStates[projection];
  return Date.now() >= state.retryAt ? state.generation : null;
}

function markHistoryProjectionUnavailable(projection: HistoryProjection): void {
  const state = projectionStates[projection];
  state.generation += 1;
  state.retryAt = Date.now() + PROJECTION_RETRY_INTERVAL_MS;
}

function markHistoryProjectionAvailable(projection: HistoryProjection, generation: number): void {
  const state = projectionStates[projection];
  if (state.generation === generation) state.retryAt = 0;
}

function scoreNearbyEvents(events: readonly { distance_meters: number }[]): {
  score: number;
  eventCount: number;
} {
  if (events.length === 0) return { score: 0.3, eventCount: 0 };

  const averageDistance =
    events.reduce((sum, event) => sum + Number(event.distance_meters), 0) / events.length;
  return scoreExternalEventHistory(events.length, averageDistance);
}

async function getLegacyHistoryScore(
  supabase: AdminSupabase,
  lat: number,
  lng: number,
): Promise<{ score: number; eventCount: number }> {
  const { data, error } = await supabase.rpc('find_nearby_external_events' as RpcName, {
    p_lat: lat,
    p_lng: lng,
    p_radius_meters: 16_000,
  });

  if (error) {
    logError('Failed to get legacy external event history:', error);
    return { score: 0.3, eventCount: 0 };
  }

  const events = (data ?? null) as unknown as Array<{ distance_meters: number }> | null;
  return scoreNearbyEvents(events ?? []);
}

async function getHistoryScore(
  lat: number,
  lng: number,
  source: EventSource = 'eventfull',
): Promise<{ score: number; eventCount: number }> {
  try {
    const supabase = getSupabaseAdmin();
    const rpcName = (
      source === 'external' ? 'get_external_event_history_stats' : 'find_nearby_events'
    ) as RpcName;

    if (source === 'external') {
      const projectionAttempt = beginHistoryProjectionAttempt('aggregate');
      if (projectionAttempt === null) {
        return getLegacyHistoryScore(supabase, lat, lng);
      }

      const { data, error } = (await supabase.rpc(rpcName, {
        p_lat: lat,
        p_lng: lng,
        p_radius_meters: 16_000,
      })) as { data: ExternalEventHistoryStats[] | null; error: { message: string } | null };

      const stats = data?.[0];
      if (error) {
        markHistoryProjectionUnavailable('aggregate');
        logError('Failed to get external event history stats:', error);
        return getLegacyHistoryScore(supabase, lat, lng);
      }
      if (!stats) return { score: 0.3, eventCount: 0 };
      markHistoryProjectionAvailable('aggregate', projectionAttempt);
      return scoreExternalEventHistory(
        Number(stats.event_count),
        Number(stats.average_distance_meters),
      );
    }

    const { data, error } = await supabase.rpc(rpcName, {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: 16_000,
    });

    if (error) {
      logError(`Failed to get nearby events (${source}):`, error);
      return { score: 0.3, eventCount: 0 };
    }

    const events = (data ?? null) as unknown as Array<{ distance_meters: number }> | null;
    return scoreNearbyEvents(events ?? []);
  } catch (error) {
    logError('Failed to get history score:', error);
    return { score: 0.3, eventCount: 0 };
  }
}

function scorePreviouslyOccurred(
  eventName: string,
  events: readonly PreviousExternalEvent[],
): { score: number; occurrenceCount: number } {
  const occurrenceCount = countSimilarPreviousEvents(eventName, events);
  let score: number;
  if (occurrenceCount >= 5) score = 1;
  else if (occurrenceCount >= 3) score = 0.8;
  else if (occurrenceCount >= 2) score = 0.6;
  else if (occurrenceCount >= 1) score = 0.4;
  else score = 0;

  return { score, occurrenceCount };
}

async function getLegacyPreviouslyOccurredScore(
  supabase: AdminSupabase,
  eventName: string,
  lat: number,
  lng: number,
): Promise<{ score: number; occurrenceCount: number }> {
  const { data, error } = await supabase.rpc('find_nearby_external_events' as RpcName, {
    p_lat: lat,
    p_lng: lng,
    p_radius_meters: 500,
  });

  if (error || !data) return { score: 0, occurrenceCount: 0 };

  const nearbyEvents = (data ?? []) as unknown as PreviousExternalEvent[];
  return scorePreviouslyOccurred(eventName, nearbyEvents);
}

export async function getPreviouslyOccurredScore(
  eventName: string,
  lat: number,
  lng: number,
): Promise<{ score: number; occurrenceCount: number }> {
  const annualCount = detectAnnualPrefix(eventName);
  if (annualCount !== null && annualCount >= 3) {
    return { score: 0.8, occurrenceCount: annualCount };
  }
  if (annualCount !== null && annualCount >= 1) {
    return { score: 0.4, occurrenceCount: annualCount };
  }

  try {
    const supabase = getSupabaseAdmin();

    const projectionAttempt = beginHistoryProjectionAttempt('previous');
    if (projectionAttempt === null) {
      return getLegacyPreviouslyOccurredScore(supabase, eventName, lat, lng);
    }

    const { data, error } = await supabase.rpc('find_previous_external_events' as RpcName, {
      p_lat: lat,
      p_lng: lng,
      p_radius_meters: 500,
    });

    if (error) {
      markHistoryProjectionUnavailable('previous');
      logError('Failed to get previous external event projection:', error);
      return getLegacyPreviouslyOccurredScore(supabase, eventName, lat, lng);
    }
    if (!data) {
      return { score: 0, occurrenceCount: 0 };
    }

    const nearbyEvents = (data ?? []) as unknown as PreviousExternalEvent[];
    markHistoryProjectionAvailable('previous', projectionAttempt);
    return scorePreviouslyOccurred(eventName, nearbyEvents);
  } catch (error) {
    logError('Failed to get previously occurred score:', error);
    return { score: 0, occurrenceCount: 0 };
  }
}

function generateReasoning(factors: FactorScores, recommendation: string): string {
  const reasons: string[] = [];

  if (factors.trafficScore >= 0.7) {
    reasons.push('High traffic area');
  } else if (factors.trafficScore < 0.3) {
    reasons.push('Low traffic area');
  }

  if (factors.researchConfidence >= 0.7) {
    reasons.push('Well-documented event with positive coverage');
  } else if (factors.researchConfidence < 0.3) {
    reasons.push('Limited event information available');
  }

  if (factors.historyScore >= 0.7) {
    reasons.push('Strong historical event density in this area');
  }

  if (factors.previouslyOccurredScore >= 0.6) {
    reasons.push('Recurring event with established track record');
  } else if (factors.previouslyOccurredScore === 0) {
    reasons.push('First-time event (no historical precedent)');
  }

  if (reasons.length === 0) {
    reasons.push('Moderate location characteristics');
  }

  return `${recommendation.replaceAll('_', ' ')}: ${reasons.join('; ')}.`;
}

export async function vetEvent(request: EventVettingRequest): Promise<EventVettingResult> {
  const { eventId, eventName, location, source = 'eventfull', locationType = 'precise' } = request;

  logMessage(`Vetting event: ${eventName} (${eventId}) [source=${source}]`);

  if (source === 'external' && !request.preFetchedResearch) {
    checkResearchAvailability();
  }

  const [trafficScore, researchResult, historyResult, previouslyOccurredResult, venuePopularity] =
    await Promise.all([
      getTrafficScore(location.lat, location.lng),
      request.preFetchedResearch
        ? Promise.resolve(request.preFetchedResearch)
        : getResearchConfidence(eventName, { city: request.city, state: request.state }),
      getHistoryScore(location.lat, location.lng, source),
      getPreviouslyOccurredScore(eventName, location.lat, location.lng),
      getVenuePopularityScore(location.lat, location.lng),
    ]);

  const factors: FactorScores = {
    trafficScore,
    researchConfidence: researchResult.score,
    historyScore: historyResult.score,
    previouslyOccurredScore: previouslyOccurredResult.score,
    areaEventCount: historyResult.eventCount,
    recurringCount: previouslyOccurredResult.occurrenceCount,
    venuePopularity,
  };

  const score = calculateWeightedScore(factors);
  const recommendation = getRecommendation(score);
  const reasoning = generateReasoning(factors, recommendation);
  const sources = researchResult.sources.filter((url) => {
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      const hidden = [
        'instagram.com',
        'facebook.com',
        'fb.com',
        'tiktok.com',
        'pinterest.com',
        'spotify.com',
        'youtube.com',
        'reddit.com',
        'yelp.com',
      ];
      return !hidden.some((d) => hostname === d || hostname.endsWith(`.${d}`));
    } catch {
      return false;
    }
  });

  const result: EventVettingResult = {
    score,
    factors: {
      trafficScore,
      researchConfidence: researchResult.score,
      historyScore: historyResult.score,
      areaEventCount: historyResult.eventCount,
      recurringCount: previouslyOccurredResult.occurrenceCount,
      venuePopularity,
    },
    recommendation,
    reasoning,
    sources,
    locationType,
  };

  logMessage(`Vetting complete for ${eventName}: ${recommendation} (${score})`);

  return result;
}

const CACHE_PREFIX = 'vetting:';

export async function getCachedVetting(eventId: string): Promise<EventVettingResult | null> {
  if (!isRedisConfigured()) {
    return null;
  }

  try {
    const client = getRedisClient()!;
    const cached = await client.get<EventVettingResult>(`${CACHE_PREFIX}${eventId}`);
    if (cached) {
      logMessage(`Cache hit for event ${eventId}`);
    }
    return cached ?? null;
  } catch (error) {
    logError('Redis getCachedVetting error:', error);
    return null;
  }
}

export async function setCachedVetting(eventId: string, result: EventVettingResult): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    await getRedisClient()!.set(`${CACHE_PREFIX}${eventId}`, result, {
      ex: CACHE_TTL_SECONDS,
    });
    logMessage(`Cached vetting result for event ${eventId}`);
  } catch (error) {
    logError('Redis setCachedVetting error:', error);
  }
}

export async function clearAllVettingCaches(): Promise<number> {
  let cleared = 0;

  if (isRedisConfigured()) {
    try {
      const client = getRedisClient()!;
      let cursor = 0;
      do {
        const [nextCursor, keys] = await client.scan(cursor, {
          match: `${CACHE_PREFIX}*`,
          count: 100,
        });
        cursor = Number(nextCursor);
        if (keys.length > 0) {
          await client.del(...keys);
          cleared += keys.length;
        }
      } while (cursor !== 0);
      logMessage(`Cleared ${cleared} vetting cache entries from Redis`);
    } catch (error) {
      logError('Redis clearAllVettingCaches error:', error);
    }
  }

  return cleared;
}

export async function clearVettingCache(eventId: string): Promise<void> {
  if (!isRedisConfigured()) {
    return;
  }

  try {
    await getRedisClient()!.del(`${CACHE_PREFIX}${eventId}`);
    logMessage(`Cleared cache for event ${eventId}`);
  } catch (error) {
    logError('Redis clearVettingCache error:', error);
  }
}

export async function saveVettingResult(
  eventId: string,
  source: EventSource,
  result: EventVettingResult,
  invalidate?: EventCacheInvalidator,
  supabaseClient?: AdminSupabase,
): Promise<void> {
  if (source === 'eventfull') {
    await setCachedVetting(eventId, result);
    return;
  }

  const supabase = supabaseClient ?? getSupabaseAdmin();
  const { data: existing, error: fetchError } = await supabase
    .from('external_events')
    .select('id, title, city, state, event_start_date, vetting_score, vetting_result, vetted_at')
    .eq('id', eventId)
    .single();

  if (fetchError) {
    logError('Failed to fetch existing event before saving vetting result:', fetchError);
  }

  const vettedAt = new Date().toISOString();
  const { error } = await supabase
    .from('external_events')
    .update({
      vetting_score: result.score,
      vetting_result: result as unknown as Json,
      vetted_at: vettedAt,
      vetting_version: 1,
      vetting_location_type: result.locationType ?? 'precise',
    })
    .eq('id', eventId);

  if (error) {
    logError('Failed to save vetting result to external_events:', error);
    throw new Error(`Failed to save vetting result: ${error.message}`);
  }

  if (!invalidate || !existing || fetchError) {
    return;
  }
  const row: EventIdentityRow = {
    id: typeof existing.id === 'string' ? existing.id : null,
    title: typeof existing.title === 'string' ? existing.title : null,
    city: typeof existing.city === 'string' ? existing.city : null,
    state: typeof existing.state === 'string' ? existing.state : null,
    event_start_date:
      typeof existing.event_start_date === 'string' ? existing.event_start_date : null,
  };
  const beforeScore = typeof existing.vetting_score === 'number' ? existing.vetting_score : null;
  const targets = buildVettingCacheTargets(
    row,
    {
      score: beforeScore,
      researchConfidence: getVettingResearchConfidence(existing.vetting_result),
      vettedAt: typeof existing.vetted_at === 'string' ? existing.vetted_at : null,
    },
    {
      score: result.score,
      researchConfidence: result.factors.researchConfidence,
      vettedAt,
    },
  );
  if (targets.length > 0) {
    try {
      await invalidate(targets);
    } catch (invalidationError) {
      logError(`Failed to invalidate event cache for vetting result ${eventId}`, invalidationError);
    }
  }
}

export async function sweepEligibleEventInvalidation(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  invalidate: EventCacheInvalidator,
): Promise<number> {
  const PAGE_SIZE = 1000;
  const CHUNK_SIZE = 100;
  let from = 0;
  let invalidated = 0;
  const seen = new Set<string>();

  while (true) {
    const { data, error } = await supabase
      .from('external_events')
      .select('id, title, city, state, event_start_date')
      .eq('is_food_truck_relevant', true)
      .eq('is_hidden', false)
      .gte('vetting_score', VETTING_ELIGIBILITY_THRESHOLD)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      logError('Failed to fetch eligible events for cache sweep:', error);
      return invalidated;
    }

    if (!data || data.length === 0) break;

    const pageTargets: EventCacheTarget[] = [];
    for (const row of data as unknown as Record<string, unknown>[]) {
      const target = buildEventCacheTarget({
        id: typeof row.id === 'string' ? row.id : null,
        title: typeof row.title === 'string' ? row.title : null,
        city: typeof row.city === 'string' ? row.city : null,
        state: typeof row.state === 'string' ? row.state : null,
        event_start_date: typeof row.event_start_date === 'string' ? row.event_start_date : null,
      });
      if (!target) continue;
      const key = `${target.eventId}:${target.citySlug}:${target.eventSlug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pageTargets.push(target);
    }

    if (pageTargets.length > 0) {
      try {
        for (const chunk of chunkEventCacheTargets(pageTargets, CHUNK_SIZE)) {
          await invalidate(chunk);
          invalidated += chunk.length;
        }
      } catch (invalidationError) {
        logError('Failed to sweep eligible event cache targets:', invalidationError);
        return invalidated;
      }
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return invalidated;
}

export async function getVettingResult(
  eventId: string,
  source: EventSource,
): Promise<EventVettingResult | null> {
  if (source === 'eventfull') {
    return getCachedVetting(eventId);
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('external_events')
    .select('vetting_result')
    .eq('id', eventId)
    .single();

  if (error || !data?.vetting_result) return null;
  return data.vetting_result as unknown as EventVettingResult;
}
