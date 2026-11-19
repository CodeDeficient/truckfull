import { ingestCityEvents, retryPendingGeocodes } from '@/lib/events/externalEventIngestion';
import { CITIES } from '@/lib/events/cities';
import { logMessage, logError } from '@/lib/logging';
import type { IngestionResult } from '@/lib/events/types';
import { vetEvent, saveVettingResult as saveVettingResultDb } from '@/lib/events/eventVetting';
import { EventbriteRateLimiter, EventbriteRateLimitExhausted } from '@/lib/events/eventbriteApi';
import type { EventSource } from '@/lib/events/vettingTypes';
import { saveVettingResult as saveVettingResultRedis } from '@/lib/events/vettingStore';
import { shouldUseCityFallback, getCityCenter } from '@/lib/events/vettingLocationFallback';
import type { EventVettingRequest, VetResult } from '@/lib/events/vettingTypes';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { searchEventsBatch } from '@/lib/research/researchService';
import { classifyRelevanceCron } from '@/lib/cron/classifyRelevance';
import { runDedupV2 } from '@/lib/dedup/dedupOrchestrator';
import type { DedupRunMetrics } from '@/lib/dedup/dedupOrchestrator';
import type { EventCacheInvalidator } from '@/lib/events/eventCacheTargets';

export interface IngestionCronResult {
  success: boolean;
  cities: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: number;
  invalidRecords: number;
  enrichmentFailures: number;
  geocodePending: number;
  duration_ms: number;
  cityResults?: Record<string, IngestionResult>;
  vetResult?: VetResult;
  dedupMetrics?: DedupRunMetrics;
  /** Rows newly demoted during this run; retained for compatibility with v1 callers. */
  dedupRemoved?: number;
  error?: string;
  /** True when a shutdown request stopped the city loop before all cities ran. */
  interrupted?: boolean;
  failedCities?: string[];
  stepErrors?: number;
}

/**
 * Optional hooks for long-running container runs. The laptop script and cron
 * API route call `runIngestion(invalidate)` and keep the defaults: never stop,
 * never checkpoint, plain timer waits.
 */
export interface IngestionRunHooks {
  /** Cities already completed by a previous interrupted run; skipped without results. */
  readonly skipCities?: ReadonlySet<string>;
  /** Returns true when the runner should stop at the next city boundary. */
  readonly shouldStop?: () => boolean;
  /** Called after each attempted city with its result (success or error). */
  readonly onCityCompleted?: (cityKey: string, result: IngestionResult) => void | Promise<void>;
  /** Wait for the given milliseconds; should resolve early on shutdown. */
  readonly delay?: (ms: number) => Promise<void>;
}

export interface GeocodeRetryCronResult {
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
}

export async function vetRelevantEvents(invalidate?: EventCacheInvalidator): Promise<VetResult> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();

  const { data: events, error } = await supabase
    .from('external_events')
    .select(
      'id, title, location_lat, location_lng, location_address, event_start_date, city, state',
    )
    .is('vetting_score', null)
    .eq('is_food_truck_relevant', true)
    .gte('event_start_date', new Date().toISOString().split('T')[0])
    // Batch size to prevent cron timeout. Remaining events caught in next run.
    .limit(100);

  if (error) {
    logError('Failed to load events for vetting:', error);
    return { vetted: 0, skipped: 0, failed: 1, duration_ms: Date.now() - startTime };
  }

  if (!events || events.length === 0) {
    logMessage('No un-vetted relevant events found');
    return { vetted: 0, skipped: 0, failed: 0, duration_ms: Date.now() - startTime };
  }

  let vetted = 0;
  let skipped = 0;
  let failed = 0;

  const eligible: Array<{
    event: (typeof events)[0];
    lat: number;
    lng: number;
    locationType: 'precise' | 'approximate';
  }> = [];

  for (const event of events) {
    let lat = event.location_lat;
    let lng = event.location_lng;
    let locationType: 'precise' | 'approximate' = 'precise';

    if (lat == null || lng == null) {
      if (!shouldUseCityFallback(event)) {
        skipped++;
        continue;
      }
      const center = getCityCenter(event.city, event.state);
      if (!center) {
        skipped++;
        continue;
      }
      lat = center.lat;
      lng = center.lng;
      locationType = 'approximate';
    }

    eligible.push({ event, lat: lat ?? 0, lng: lng ?? 0, locationType });
  }

  const batchResearch: Record<string, { score: number; sources: string[] } | null> = {};
  if (eligible.length > 0) {
    try {
      const queries = eligible.map(({ event }) => {
        const locationSuffix = [event.city, event.state].filter(Boolean).join(', ');
        const query = locationSuffix ? `${event.title} ${locationSuffix}` : event.title;
        return { id: event.id, query };
      });

      logMessage('Batch researching events', { count: queries.length });
      const researchResults = await searchEventsBatch(queries);

      for (const { id } of queries) {
        const r = researchResults[id];
        batchResearch[id] = r
          ? { score: r.confidence, sources: r.sources.map((s) => s.url) }
          : null;
      }
    } catch (error) {
      logError('Batch research failed, falling back to per-event research:', error);
    }
  }

  for (const { event, lat, lng, locationType } of eligible) {
    try {
      const request: EventVettingRequest = {
        eventId: event.id,
        eventName: event.title,
        location: { lat, lng, address: event.location_address ?? '' },
        date: event.event_start_date,
        source: 'external',
        locationType,
      };

      const preFetched = batchResearch[event.id];
      if (preFetched != null) {
        request.preFetchedResearch = preFetched;
      }

      const result = await vetEvent(request);
      const source: EventSource = 'external';
      const saveResults = await Promise.allSettled([
        saveVettingResultRedis(event.id, source, result),
        saveVettingResultDb(event.id, source, result, invalidate),
      ]);
      for (const sr of saveResults) {
        if (sr.status === 'rejected') {
          logError('Vetting save failed for event:', sr.reason);
        }
      }
      if (saveResults.some((sr) => sr.status === 'rejected')) {
        failed++;
        continue;
      }
      vetted++;
    } catch (error) {
      failed++;
      logError('Vetting failed for event:', error);
    }
  }

  const durationMs = Date.now() - startTime;
  logMessage('Vetting completed', { vetted, skipped, failed, duration_ms: durationMs });

  return { vetted, skipped, failed, duration_ms: durationMs };
}

type EventbriteBudgetOutcome = 'ready' | 'skipped' | 'stopped';

async function awaitEventbriteBudget(
  limiter: EventbriteRateLimiter,
  hooks: IngestionRunHooks | undefined,
  wait: (ms: number) => Promise<void>,
): Promise<EventbriteBudgetOutcome> {
  if (limiter.remaining >= 100) return 'ready';

  const waitMs = limiter.timeUntilReset();
  if (waitMs <= 0) {
    logMessage(`Skipping Eventbrite city: budget remaining ${limiter.remaining} below threshold`);
    return 'skipped';
  }

  logMessage(
    `Eventbrite budget low (${limiter.remaining} remaining), waiting ${Math.round(waitMs / 1000)}s for reset`,
  );
  await wait(waitMs + 1000);
  if (hooks?.shouldStop?.()) {
    logMessage('Stopping ingestion after Eventbrite wait: shutdown requested');
    return 'stopped';
  }
  limiter.resetWindow();
  return 'ready';
}

function aggregateResults(
  results: Record<string, IngestionResult>,
  totalDurationMs: number,
): IngestionCronResult {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  let invalidRecords = 0;
  let enrichmentFailures = 0;
  let geocodePending = 0;
  let hasError = false;

  for (const [, result] of Object.entries(results)) {
    inserted += result.inserted;
    updated += result.updated;
    skipped += result.skipped;
    errors += result.errors;
    invalidRecords += result.invalidRecords ?? 0;
    enrichmentFailures += result.enrichmentFailures ?? 0;
    geocodePending += result.geocodePending;
    if (result.error || result.errors > 0) {
      hasError = true;
    }
  }

  return {
    success: !hasError,
    cities: Object.keys(results).length,
    inserted,
    updated,
    skipped,
    errors,
    invalidRecords,
    enrichmentFailures,
    geocodePending,
    duration_ms: totalDurationMs,
    cityResults: results,
  };
}
function listFailedCities(results: Record<string, IngestionResult>): string[] {
  return Object.entries(results)
    .filter(([, result]) => Boolean(result.error) || result.errors > 0)
    .map(([name]) => name);
}

type PostIngestionStep = (
  aggregated: IngestionCronResult,
  invalidate: EventCacheInvalidator | undefined,
) => Promise<number>;

const runVetStep: PostIngestionStep = async (aggregated, invalidate) => {
  try {
    const vetResult = await vetRelevantEvents(invalidate);
    aggregated.vetResult = vetResult;
    return vetResult.failed;
  } catch (error) {
    logError('Post-ingestion vetting failed', error);
    return 1;
  }
};

const runDedupStep: PostIngestionStep = async (aggregated, invalidate) => {
  try {
    const dedupMetrics = await runDedupV2(
      { dryRun: false, enableLLM: false },
      undefined,
      invalidate,
    );
    aggregated.dedupMetrics = dedupMetrics;
    aggregated.dedupRemoved = dedupMetrics.rowsNewlyMarkedNonCanonical;
    logMessage('Deduplicated external events with v2', {
      newlyDemoted: aggregated.dedupRemoved,
      metrics: dedupMetrics,
    });
    return dedupMetrics.mutationErrors + dedupMetrics.queueInsertErrors;
  } catch (error) {
    logError('Post-ingestion dedup failed', error);
    return 1;
  }
};

const runClassifyStep: PostIngestionStep = async (_aggregated, invalidate) => {
  try {
    const relevanceResult = await classifyRelevanceCron(invalidate);
    logMessage('Post-ingestion relevance classification completed', {
      total: relevanceResult.total,
      confirmed: relevanceResult.confirmed,
      likely: relevanceResult.likely,
      rejected: relevanceResult.rejected,
      modelFailures: relevanceResult.modelFailures,
      errors: relevanceResult.errors,
    });
    return relevanceResult.errors;
  } catch (error) {
    logError('Post-ingestion relevance classification failed', error);
    return 1;
  }
};

const POST_INGESTION_STEPS: readonly PostIngestionStep[] = [
  runClassifyStep,
  runVetStep,
  runDedupStep,
];

async function runPostIngestionSteps(
  aggregated: IngestionCronResult,
  invalidate: EventCacheInvalidator | undefined,
): Promise<number> {
  for (const step of POST_INGESTION_STEPS) {
    const errors = await step(aggregated, invalidate);
    if (errors > 0) return errors;
  }
  return 0;
}

export async function runIngestion(
  invalidate?: EventCacheInvalidator,
  hooks?: IngestionRunHooks,
): Promise<IngestionCronResult> {
  const startTime = Date.now();

  try {
    const cityNames = Object.keys(CITIES);
    logMessage('Starting multi-city event ingestion', { cities: cityNames });

    const results: Record<string, IngestionResult> = {};
    const eventbriteLimiter = new EventbriteRateLimiter();
    let eventbriteSkipped = false;
    const skippedCities: string[] = [];
    const crossCityDedupKeys = new Map<string, true>();

    const nonEbCities = cityNames.filter((n) => CITIES[n].sourceType !== 'eventbrite');
    const ebCities = cityNames.filter((n) => CITIES[n].sourceType === 'eventbrite');

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split('T')[0];
    const countBySource = new Map<string, number>();

    const countResults = await Promise.all(
      ebCities.map(async (name) => {
        const source = CITIES[name].source;
        const { count, error } = await supabase
          .from('external_events')
          .select('id', { count: 'exact', head: true })
          .eq('source', source)
          .gte('event_start_date', today);
        if (error) {
          logError(`Failed to count existing events for source ${source}`, error);
        }
        return [source, count ?? 0] as const;
      }),
    );

    for (const [source, count] of countResults) {
      countBySource.set(source, count);
    }

    const sortedEbCities = [...ebCities].sort((a, b) => {
      const countA = countBySource.get(CITIES[a].source) ?? 0;
      const countB = countBySource.get(CITIES[b].source) ?? 0;
      return countA - countB;
    });

    const orderedNames = [...nonEbCities, ...sortedEbCities];

    const skipCities = hooks?.skipCities ?? new Set<string>();
    const wait = async (ms: number): Promise<void> => {
      if (hooks?.delay) {
        await hooks.delay(ms);
        return;
      }
      await new Promise((r) => setTimeout(r, ms));
    };
    let interrupted = false;

    for (const name of orderedNames) {
      if (skipCities.has(name)) {
        logMessage(`Skipping city already completed in a previous run: ${name}`);
        continue;
      }

      if (hooks?.shouldStop?.()) {
        logMessage(`Stopping ingestion before city ${name}: shutdown requested`);
        interrupted = true;
        break;
      }

      let attempted: IngestionResult | null = null;
      try {
        const config = CITIES[name];
        const budget =
          config.sourceType === 'eventbrite'
            ? await awaitEventbriteBudget(eventbriteLimiter, hooks, wait)
            : 'ready';

        if (budget === 'stopped') {
          interrupted = true;
          break;
        }

        if (budget === 'skipped') {
          skippedCities.push(name);
          results[name] = {
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            invalidRecords: 0,
            enrichmentFailures: 0,
            geocodePending: 0,
            duration_ms: 0,
            error: `Eventbrite rate budget exhausted before city: ${config.city}, ${config.state}`,
          };
          eventbriteSkipped = true;
          attempted = results[name];
        } else {
          logMessage(`Ingesting city: ${config.city}, ${config.state} (${config.source})`);
          eventbriteLimiter.resetPerCityCount();
          results[name] = await ingestCityEvents(
            config,
            config.sourceType === 'eventbrite' ? eventbriteLimiter : undefined,
            crossCityDedupKeys,
            invalidate,
          );
          attempted = results[name];
        }
      } catch (error) {
        if (error instanceof EventbriteRateLimitExhausted) {
          logMessage(`Eventbrite rate budget exhausted, skipping remaining cities`, {
            usedCalls: error.usedCalls,
            budget: error.budget,
          });
          eventbriteSkipped = true;
          const errorMessage = error.message;
          results[name] = {
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            invalidRecords: 0,
            enrichmentFailures: 0,
            geocodePending: 0,
            duration_ms: 0,
            error: errorMessage,
          };
          attempted = results[name];
        } else {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logError(`City ingestion failed: ${name}`, error);
          results[name] = {
            inserted: 0,
            updated: 0,
            skipped: 0,
            errors: 1,
            invalidRecords: 0,
            enrichmentFailures: 0,
            geocodePending: 0,
            duration_ms: 0,
            error: errorMessage,
          };
          attempted = results[name];
        }
      }
      if (attempted) {
        await hooks?.onCityCompleted?.(name, attempted);
      }
    }

    if (interrupted) {
      const partial = aggregateResults(results, Date.now() - startTime);
      partial.success = false;
      partial.interrupted = true;
      return partial;
    }

    if (eventbriteSkipped) {
      const ebCities = cityNames.filter((n) => CITIES[n].sourceType === 'eventbrite');
      const completedEb = ebCities.filter(
        (n) => results[n] && !results[n].error?.includes('budget exhausted'),
      );
      const skippedEb = ebCities.filter(
        (n) => !results[n] || results[n].error?.includes('budget exhausted'),
      );
      logMessage('Eventbrite ingestion partial completion', {
        completed: completedEb.length,
        skipped: skippedEb.length,
        budgetRemaining: eventbriteLimiter.remaining,
        skippedCityNames: skippedCities,
      });
    }

    if (hooks?.shouldStop?.()) {
      logMessage('Stopping ingestion after city loop: shutdown requested');
      const partial = aggregateResults(results, Date.now() - startTime);
      partial.success = false;
      partial.interrupted = true;
      return partial;
    }

    const totalDuration = Date.now() - startTime;
    const aggregated = aggregateResults(results, totalDuration);

    const perCitySkipped: Record<string, number> = {};
    for (const [key, result] of Object.entries(results)) {
      perCitySkipped[key] = result.skipped;
    }

    logMessage('Multi-city event ingestion completed', {
      cities: aggregated.cities,
      inserted: aggregated.inserted,
      updated: aggregated.updated,
      skipped: aggregated.skipped,
      errors: aggregated.errors,
      invalidRecords: aggregated.invalidRecords,
      enrichmentFailures: aggregated.enrichmentFailures,
      geocodePending: aggregated.geocodePending,
      duration_ms: aggregated.duration_ms,
      perCitySkipped,
    });

    const failedCities = listFailedCities(results);
    if (failedCities.length > 0) {
      logError('Cities failed during ingestion; continuing with the remaining steps', {
        failedCities: failedCities.map((name) => ({ city: name, error: results[name].error })),
      });
    }

    const stepErrors = await runPostIngestionSteps(aggregated, invalidate);
    aggregated.failedCities = failedCities;
    aggregated.stepErrors = stepErrors;
    aggregated.errors += stepErrors;
    aggregated.success = failedCities.length === 0 && stepErrors === 0;
    return aggregated;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('External events ingestion cron failed unexpectedly', error);
    return {
      success: false,
      cities: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      invalidRecords: 0,
      enrichmentFailures: 0,
      geocodePending: 0,
      duration_ms: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

export async function runGeocodeRetry(
  invalidate?: EventCacheInvalidator,
): Promise<GeocodeRetryCronResult> {
  try {
    const result = await retryPendingGeocodes(invalidate);
    logMessage('Geocode retry cron completed', {
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      duration_ms: result.duration_ms,
    });
    return {
      success: true,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
      duration_ms: result.duration_ms,
    };
  } catch (error) {
    logError('Geocode retry cron failed', error);
    return {
      success: false,
      total: 0,
      succeeded: 0,
      failed: 0,
      duration_ms: 0,
    };
  }
}
