import { logError, logMessage, logWarning } from '@/lib/logging';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchAllSavannahEvents } from '@/lib/events/savannahEproval';
import { fetchCivicPlusRss } from '@/lib/events/civicPlusRss';
import { fetchSimpleviewRss, enrichSimpleviewEntries } from '@/lib/events/simpleviewRss';
import { fetchIcalFeed } from '@/lib/events/icalFeed';
import { fetchAikenCalendar } from '@/lib/events/aikenCalendar';
import { fetchEventbriteEvents } from '@/lib/events/eventbriteApi';
import { fetchAlgoliaEvents } from '@/lib/events/algoliaApi';
import { fetchTimelyEvents } from '@/lib/events/timelyApi';
import { fetchArcgisPermits } from '@/lib/events/arcgisPermits';
import { fetchTourismEvents } from '@/lib/events/tourismScraper';
import { isEventBlocked } from '@/lib/events/eventRelevanceFilter';
import { extractPermitStatus } from '@/lib/events/dateParsing';
import { isBadDate } from './dateValidation';
import { classifyRelevance } from './relevanceClassifier';
import { buildRecord, parseEntryWithDiagnostics } from './buildRecord';
import type { ExternalEventInsert, ParseIssueDiagnostic } from './buildRecord';
export {
  buildRecord,
  formatDateForDb,
  parseEntry,
  parseEntryWithDiagnostics,
  type BuildRecordInput,
  type ExternalEventInsert,
} from './buildRecord';
import { SAVANNAH_CONFIG } from '@/lib/events/cities';
import { geocodeAddress, validateStateBounds } from '@/lib/utils/geocoding';
import { EventbriteRateLimiter, EventbriteRateLimitExhausted } from '@/lib/events/eventbriteApi';
import { cleanAddress, extractIntersection } from '@/lib/utils/addressCleaner';
import { findLocation } from '@/lib/utils/locationLookup';
import { findCachedVenue, cacheVenueLocation } from '@/lib/utils/geocoding/venueCache';
import { parseIntersectionStreets, geocodeIntersection } from '@/lib/utils/geocoding/overpass';
import type { AiAddressResult } from '@/lib/utils/geocoding/aiAddressExtractor';
import { extractAddressWithAI } from '@/lib/utils/geocoding/aiAddressExtractor';
import type { CalendarData, EprovalCityConfig } from '@/lib/events/types';
import type { EprovalCalendarEntry, IngestionResult } from '@/lib/events/types';
import {
  ensureEventContentHash,
  getEventComparison,
  isValidContentHash,
  isUnchangedEvent,
  type EventComparison,
} from './eventComparison';
import {
  buildEventCacheTarget,
  buildIdentityChangeTargets,
  hasCanonicalizationChanged,
  type EventCacheInvalidator,
  type EventIdentityRow,
} from './eventCacheTargets';
import type { EventCacheTarget } from './eventPageInvalidation';

const GEOCODE_DELAY_MS = 100;
const BATCH_SIZE = 50;
const MAX_RETRY_BATCH_SIZE = 200;
const MAX_GEOCODE_ATTEMPTS = 5;
const MAX_VALIDATION_FAILURE_RATE = 0.1;

function readKeywordSkipThreshold(): number {
  const raw = process.env.EVENTBRITE_KEYWORD_SKIP_THRESHOLD;
  if (raw === undefined || raw === '') return 200;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 200;
}

export async function tryAIFallback(
  rawAddress: string,
): Promise<{ lat: number; lng: number; assessment: AiAddressResult } | null> {
  try {
    const aiResult = await extractAddressWithAI(rawAddress);
    if (
      !aiResult.cleaned_address ||
      aiResult.address_type === 'unresolvable' ||
      aiResult.confidence < 0.5
    ) {
      return null;
    }

    logMessage('AI extracted address, re-trying geocoder', {
      original: rawAddress.slice(0, 80),
      cleaned: aiResult.cleaned_address.slice(0, 80),
      type: aiResult.address_type,
    });

    const geo = await geocodeAddress(aiResult.cleaned_address);
    const ok = geo.success && !Number.isNaN(geo.lat) && !Number.isNaN(geo.lng);
    return ok ? { lat: geo.lat, lng: geo.lng, assessment: aiResult } : null;
  } catch (error) {
    logMessage('AI fallback failed', { address: rawAddress.slice(0, 80), error });
    return null;
  }
}

export async function resolveLocation(
  address: string,
  geocodedCache: Map<string, { lat: number | null; lng: number | null }>,
  externalId: string | undefined,
  city: string,
  state: string,
): Promise<{ lat: number | null; lng: number | null; pending: boolean; failureReason?: string }> {
  const cleanedAddress = cleanAddress(address);
  if (!cleanedAddress) {
    return { lat: null, lng: null, pending: true };
  }

  const cached = externalId ? geocodedCache.get(externalId) : undefined;
  if (cached?.lat != null && cached.lng != null) {
    return { lat: cached.lat, lng: cached.lng, pending: false };
  }

  const venueCached = await findCachedVenue(address, city, state);
  if (venueCached) {
    logMessage('Venue cache hit', { address });
    return { lat: venueCached.lat, lng: venueCached.lng, pending: false };
  }

  const locationMatch = await findLocation(address, { city, state });
  if (locationMatch && locationMatch.confidence >= 0.7) {
    if (validateStateBounds(locationMatch.lat, locationMatch.lng, state)) {
      logMessage('Location found via lookup', {
        address,
        match: locationMatch.name,
        confidence: locationMatch.confidence,
      });
      return { lat: locationMatch.lat, lng: locationMatch.lng, pending: false };
    } else {
      logWarning('Location lookup result outside state bounds, rejecting', {
        lat: locationMatch.lat,
        lng: locationMatch.lng,
        state,
        address,
      });
    }
  }

  if (locationMatch?.source === 'intersection') {
    const intersectionStr = extractIntersection(cleanedAddress);
    if (intersectionStr) {
      const parsed = parseIntersectionStreets(intersectionStr);
      if (parsed?.street1 && parsed.street2) {
        logMessage('Trying Overpass for intersection', { address, streets: parsed });
        try {
          const area = parsed.city || city;
          const overpassResult = await geocodeIntersection(parsed.street1, parsed.street2, area);
          if (
            overpassResult.success &&
            validateStateBounds(overpassResult.lat, overpassResult.lng, state)
          ) {
            logMessage('Intersection resolved via Overpass', {
              address,
              lat: overpassResult.lat,
              lng: overpassResult.lng,
            });
            return { lat: overpassResult.lat, lng: overpassResult.lng, pending: false };
          }
        } catch {
          logMessage('Overpass failed for intersection, falling back to geocoder', { address });
        }
      }
    }
  }

  try {
    const geo = await geocodeAddress(cleanedAddress);
    const ok =
      geo.success &&
      !Number.isNaN(geo.lat) &&
      !Number.isNaN(geo.lng) &&
      validateStateBounds(geo.lat, geo.lng, state);
    if (ok) {
      await cacheVenueLocation(address, geo.lat, geo.lng, city, state).catch(() => {});
      return { lat: geo.lat, lng: geo.lng, pending: false };
    }

    if (geo.success && !validateStateBounds(geo.lat, geo.lng, state)) {
      logWarning('Geocode result outside state bounds, rejecting', {
        lat: geo.lat,
        lng: geo.lng,
        state,
        address: cleanedAddress.slice(0, 60),
      });
    }
  } catch {
    logMessage('Standard geocoder failed, trying AI fallback', { address });
  } finally {
    // Intentional delay: rate-limit spacing between geocoding providers (Photon/Nominatim)
    // to avoid hitting API thresholds. NOT a performance bug.
    if (GEOCODE_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, GEOCODE_DELAY_MS));
    }
  }

  const aiResult = await tryAIFallback(address);
  if (aiResult && aiResult.assessment?.cleaned_address) {
    if (validateStateBounds(aiResult.lat, aiResult.lng, state)) {
      return { lat: aiResult.lat, lng: aiResult.lng, pending: false };
    }
    logWarning('AI fallback result outside state bounds, rejecting', {
      lat: aiResult.lat,
      lng: aiResult.lng,
      state,
      address,
    });
  }

  const assessmentType = aiResult?.assessment?.address_type ?? 'unknown';
  return {
    lat: null,
    lng: null,
    pending: true,
    failureReason: `all_geocoding_methods_failed | AI: ${assessmentType}`,
  };
}

export { hashCalendarData } from '@/lib/events/types';

const GEOCODE_CACHE_DAYS = 90;

export async function fetchGeocodedCache(
  source: string,
): Promise<Map<string, { lat: number | null; lng: number | null }>> {
  const supabase = getSupabaseAdmin();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - GEOCODE_CACHE_DAYS);
  const { data, error } = await supabase
    .from('external_events')
    .select('external_id, location_lat, location_lng')
    .eq('source', source)
    .gte('updated_at', cutoff.toISOString());

  if (error) {
    logError('Failed to fetch geocoded cache from DB', error);
    return new Map();
  }

  const cache = new Map<string, { lat: number | null; lng: number | null }>();
  if (data) {
    for (const row of data) {
      cache.set(row.external_id, { lat: row.location_lat, lng: row.location_lng });
    }
  }
  return cache;
}

export interface ExistingEventRow extends EventComparison {
  readonly id: string | null;
  readonly title: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly event_start_date: string | null;
  readonly is_canonical?: boolean | null;
  readonly is_food_truck_relevant?: boolean | null;
  readonly is_hidden?: boolean | null;
  readonly vetting_score?: number | null;
}

export async function fetchExistingIds(source: string): Promise<Map<string, ExistingEventRow>> {
  const supabase = getSupabaseAdmin();
  const map = new Map<string, ExistingEventRow>();
  let from = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from('external_events')
      .select(
        'external_id, source_updated_at, content_hash, id, title, city, state, event_start_date, is_canonical, is_food_truck_relevant, is_hidden, vetting_score',
      )
      .eq('source', source)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      logError('Failed to fetch existing external IDs', error);
      return new Map();
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      map.set(row.external_id, {
        contentHash: isValidContentHash(row.content_hash) ? row.content_hash : null,
        sourceUpdatedAt: row.source_updated_at,
        id: typeof row.id === 'string' ? row.id : null,
        title: typeof row.title === 'string' ? row.title : null,
        city: typeof row.city === 'string' ? row.city : null,
          state: typeof row.state === 'string' ? row.state : null,
          event_start_date: typeof row.event_start_date === 'string' ? row.event_start_date : null,
          is_canonical: row.is_canonical,
          is_food_truck_relevant: row.is_food_truck_relevant,
          is_hidden: row.is_hidden,
          vetting_score: row.vetting_score,
        });
    }

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return map;
}

export function collectIngestionInvalidationTargets(
  upsertedRows: readonly { id: string; external_id: string | null }[],
  batch: readonly ExternalEventInsert[],
  existingIds: ReadonlyMap<string, ExistingEventRow>,
): EventCacheTarget[] {
  const targets: EventCacheTarget[] = [];
  const seen = new Set<string>();
  const recordByExternalId = new Map<string, ExternalEventInsert>();
  for (const record of batch) {
    if (record.external_id) recordByExternalId.set(record.external_id, record);
  }

  const pushTarget = (row: EventIdentityRow, canonicalizationChanged = false): void => {
    const target = buildEventCacheTarget(row);
    if (!target) return;
    const markedTarget = canonicalizationChanged
      ? { ...target, canonicalizationChanged: true }
      : target;
    const key = `${markedTarget.eventId}:${markedTarget.citySlug}:${markedTarget.eventSlug}`;
    if (seen.has(key)) {
      if (canonicalizationChanged) {
        const index = targets.findIndex(
          (existingTarget) =>
            `${existingTarget.eventId}:${existingTarget.citySlug}:${existingTarget.eventSlug}` ===
            key,
        );
        if (index !== -1 && !targets[index].canonicalizationChanged) {
          targets[index] = markedTarget;
        }
      }
      return;
    }
    seen.add(key);
    targets.push(markedTarget);
  };

  for (const upserted of upsertedRows) {
    const existing = upserted.external_id ? existingIds.get(upserted.external_id) : undefined;
    const record = upserted.external_id ? recordByExternalId.get(upserted.external_id) : undefined;
    const after: EventIdentityRow = {
      id: upserted.id,
      title: record?.title ?? null,
      city: record?.city ?? null,
      state: record?.state ?? null,
      event_start_date: record?.event_start_date ?? null,
    };

    if (!existing) {
      const recordFields = record as unknown as Record<string, unknown> | undefined;
      pushTarget(after, recordFields ? hasCanonicalizationChanged(null, recordFields) : false);
      continue;
    }

    const before: EventIdentityRow = {
      id: existing.id,
      title: existing.title,
      city: existing.city,
      state: existing.state,
      event_start_date: existing.event_start_date,
    };
    for (const target of buildIdentityChangeTargets(before, after)) {
      const key = `${target.eventId}:${target.citySlug}:${target.eventSlug}`;
      if (seen.has(key)) continue;
      seen.add(key);
      targets.push(target);
    }
    if (record && hasCanonicalizationChanged(existing as unknown as Record<string, unknown>, record as unknown as Record<string, unknown>)) {
      pushTarget(after, true);
    }
  }

  return targets;
}

async function recordGeocodeFailure(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  address: string,
  cleanedAddress: string | null,
  reason: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc(
      'record_geocode_failure' as never,
      {
        p_address: address,
        p_cleaned_address: cleanedAddress ?? null,
        p_failure_reason: reason,
      } as never,
    );

    if (error) {
      logError('Failed to record geocode failure', { error, address });
    }
  } catch (error) {
    logError('Error writing to geocoding_failures table', { error, address });
  }
}

export interface GeocodeRetryResult {
  total: number;
  succeeded: number;
  failed: number;
  duration_ms: number;
}

async function invalidateResolvedGeocode(
  event: {
    readonly id: string;
    readonly title: string | null;
    readonly city: string | null;
    readonly state: string | null;
    readonly event_start_date: string | null;
  },
  invalidate: EventCacheInvalidator | undefined,
  targets: EventCacheTarget[],
): Promise<void> {
  if (!invalidate) return;
  const target = buildEventCacheTarget({
    id: event.id,
    title: event.title,
    city: event.city,
    state: event.state,
    event_start_date: event.event_start_date,
  });
  if (!target) return;
  targets.push(target);
  if (targets.length < 100) return;
  const chunk = targets.splice(0);
  try {
    await invalidate(chunk);
  } catch (invalidationError) {
    logError('Failed to invalidate event cache after geocode resolution', {
      count: chunk.length,
      eventIds: chunk.map((t) => t.eventId),
      error: invalidationError,
    });
  }
}

async function updateEventGeocode(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  eventId: string,
  lat: number,
  lng: number,
  label: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('external_events')
    .update({ location_lat: lat, location_lng: lng })
    .eq('id', eventId);

  if (error) {
    logError(`Failed to update geocode ${label}`, { id: eventId, error });
    return false;
  }
  return true;
}

async function tryOverpassIntersection(
  cleanedAddress: string,
  supabase: ReturnType<typeof getSupabaseAdmin>,
  eventId: string,
): Promise<'resolved' | 'failed' | 'skipped'> {
  const intersectionStr = extractIntersection(cleanedAddress);
  if (!intersectionStr) return 'skipped';

  const parsed = parseIntersectionStreets(intersectionStr);
  if (!parsed?.street1 || !parsed?.street2) return 'skipped';

  try {
    const area = parsed.city || 'Savannah';
    const overpassResult = await geocodeIntersection(parsed.street1, parsed.street2, area);
    if (!overpassResult.success) return 'skipped';

    const ok = await updateEventGeocode(
      supabase,
      eventId,
      overpassResult.lat,
      overpassResult.lng,
      'from Overpass',
    );
    if (ok) {
      logMessage('Resolved via Overpass intersection', {
        id: eventId,
        streets: `${parsed.street1} & ${parsed.street2}`,
      });
      return 'resolved';
    }
    return 'failed';
  } catch {
    logMessage('Overpass failed, falling back to geocoder', { id: eventId });
    return 'skipped';
  }
}

export async function retryPendingGeocodes(
  invalidate?: EventCacheInvalidator,
): Promise<GeocodeRetryResult> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();

  const skipAddresses = new Set<string>();
  let failFrom = 0;
  const FAIL_PAGE_SIZE = 1000;
  const MAX_FAIL_PAGES = 50;

  for (let page = 0; page < MAX_FAIL_PAGES; page++) {
    const { data: failPage } = await supabase
      .from('geocoding_failures')
      .select('address')
      .gte('attempt_count', MAX_GEOCODE_ATTEMPTS)
      .order('id')
      .range(failFrom, failFrom + FAIL_PAGE_SIZE - 1);

    if (!failPage || failPage.length === 0) break;
    for (const r of failPage) {
      skipAddresses.add(r.address);
    }
    if (failPage.length < FAIL_PAGE_SIZE) break;
    failFrom += FAIL_PAGE_SIZE;
  }

  const { data: pendingEvents, error: fetchError } = await supabase
    .from('external_events')
    .select('id, external_id, location_address, city, state, title, event_start_date')
    .is('location_geog', null)
    .not('location_address', 'is', null)
    .limit(MAX_RETRY_BATCH_SIZE);

  if (fetchError) {
    logError('Failed to fetch pending geocode events', fetchError);
    return { total: 0, succeeded: 0, failed: 0, duration_ms: Date.now() - startTime };
  }

  const events = (pendingEvents ?? []).filter(
    (e) => e.location_address && !skipAddresses.has(e.location_address),
  );

  if (events.length === 0) {
    logMessage('No pending geocodes found');
    logMessage('No pending geocodes found');
    return { total: 0, succeeded: 0, failed: 0, duration_ms: Date.now() - startTime };
  }

  logMessage(
    `Retrying geocodes for ${events.length} events (skipped ${skipAddresses.size} high-attempt addresses)`,
  );
  let succeeded = 0;
  let failed = 0;
  const pendingInvalidationTargets: EventCacheTarget[] = [];

  try {
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event.location_address) {
        failed++;
        continue;
      }

      const cleanedAddress = cleanAddress(event.location_address);
      if (!cleanedAddress) {
        logMessage(
          `[${i + 1}/${events.length}] skipped (empty address) "${event.location_address?.slice(0, 60)}"`,
        );
        failed++;
        continue;
      }

      try {
        const geo = await geocodeAddress(cleanedAddress);
        const ok =
          geo.success &&
          !Number.isNaN(geo.lat) &&
          !Number.isNaN(geo.lng) &&
          validateStateBounds(geo.lat, geo.lng, event.state);

        if (ok) {
          const updated = await updateEventGeocode(supabase, event.id, geo.lat, geo.lng, '');
          if (updated) {
            succeeded++;
          } else {
            failed++;
          }
          if (updated) {
            await invalidateResolvedGeocode(event, invalidate, pendingInvalidationTargets);
          }
          logMessage(
            `[${i + 1}/${events.length}] resolved via geocode addr="${cleanedAddress.slice(0, 60)}"`,
          );
          continue;
        }

        if (geo.success && !validateStateBounds(geo.lat, geo.lng, event.state)) {
          logWarning('Geocode result outside state bounds, rejecting', {
            lat: geo.lat,
            lng: geo.lng,
            state: event.state,
            address: cleanedAddress.slice(0, 60),
          });
        }
      } catch (error) {
        logError('Geocode retry failed for event', { id: event.id, error });
      }

      const locationMatch = await findLocation(event.location_address, {
        city: event.city,
        state: event.state,
      });
      if (locationMatch && locationMatch.confidence >= 0.7) {
        const { error: updateError } = await supabase
          .from('external_events')
          .update({
            location_lat: locationMatch.lat,
            location_lng: locationMatch.lng,
          })
          .eq('id', event.id);

        if (updateError) {
          logError('Failed to update geocode from lookup for event', {
            id: event.id,
            error: updateError,
          });
          failed++;
        } else {
          logMessage('Resolved via location lookup', {
            id: event.id,
            name: locationMatch.name,
            confidence: locationMatch.confidence,
          });
          succeeded++;
          await invalidateResolvedGeocode(event, invalidate, pendingInvalidationTargets);
        }
        logMessage(
          `[${i + 1}/${events.length}] resolved via location lookup addr="${event.location_address.slice(0, 60)}"`,
        );
        continue;
      }

      const overpassResult = await tryOverpassIntersection(cleanedAddress, supabase, event.id);
      if (overpassResult !== 'skipped') {
        if (overpassResult === 'resolved') {
          succeeded++;
          await invalidateResolvedGeocode(event, invalidate, pendingInvalidationTargets);
        } else {
          failed++;
        }
        logMessage(
          `[${i + 1}/${events.length}] overpass=${overpassResult} addr="${cleanedAddress.slice(0, 60)}"`,
        );
        continue;
      }

      const aiResult = await tryAIFallback(event.location_address ?? '');
      if (aiResult && aiResult.assessment?.cleaned_address) {
        const updated = await updateEventGeocode(
          supabase,
          event.id,
          aiResult.lat,
          aiResult.lng,
          'from AI fallback',
        );
        if (updated) {
          logMessage('AI fallback resolved event', { id: event.id });
          succeeded++;
          await invalidateResolvedGeocode(event, invalidate, pendingInvalidationTargets);
        } else {
          failed++;
        }
      } else {
        failed++;
        await recordGeocodeFailure(
          supabase,
          event.location_address,
          cleanedAddress,
          'all_geocoding_methods_failed',
        );
      }

      logMessage(
        `[${i + 1}/${events.length}] succeeded=${succeeded} failed=${failed} addr="${event.location_address?.slice(0, 60)}"`,
      );
    }
  } finally {
    if (pendingInvalidationTargets.length > 0 && invalidate) {
      try {
        await invalidate(pendingInvalidationTargets);
      } catch (invalidationError) {
        logError('Failed to invalidate event cache after geocode resolution', {
          count: pendingInvalidationTargets.length,
          eventIds: pendingInvalidationTargets.map((t) => t.eventId),
          error: invalidationError,
        });
      }
    }
  }

  const durationMs = Date.now() - startTime;
  logMessage(
    `Geocode retry done: ${succeeded}/${events.length} succeeded, ${failed} failed, ${(durationMs / 1000).toFixed(1)}s`,
  );
  logMessage('Geocode retry completed', {
    total: events.length,
    succeeded,
    failed,
    skipped: skipAddresses.size,
    duration_ms: durationMs,
  });

  return {
    total: events.length,
    succeeded,
    failed,
    duration_ms: durationMs,
  };
}

export interface GeocodeResult {
  lat: number | null;
  lng: number | null;
  pending: boolean;
  failureReason?: string;
}

export interface ProcessEntriesDeps {
  geocodeAddress: (address: string) => Promise<GeocodeResult>;
  isEventBlocked: (data: CalendarData) => boolean;
  cleanAddress: (address: string) => string;
}

export interface ProcessedRecord {
  record: ExternalEventInsert;
  geocodeFailure?: { address: string; cleanedAddress: string; reason: string };
}

export interface ProcessEntriesResult {
  records: ExternalEventInsert[];
  geocodeFailures: Array<{ address: string; cleanedAddress: string; reason: string }>;
  skipped: number;
  errors: number;
  validEntries: number;
  validationFailures: ValidationFailure[];
  geocodePending: number;
}

export interface ValidationFailure {
  source: string;
  recordId: string;
  partition: string;
  timestamp: string;
  issues: readonly ParseIssueDiagnostic[];
}

export function isSystemicValidationFailure(
  totalEntries: number,
  validEntries: number,
  invalidRecords: number,
): boolean {
  if (totalEntries <= 0 || invalidRecords <= 0) return false;
  return validEntries === 0 || invalidRecords / totalEntries >= MAX_VALIDATION_FAILURE_RATE;
}

export async function processEntries(
  entries: EprovalCalendarEntry[],
  config: EprovalCityConfig,
  existingIds: Map<string, EventComparison>,
  geocodedCache: Map<string, { lat: number | null; lng: number | null }>,
  deps: ProcessEntriesDeps,
): Promise<ProcessEntriesResult> {
  let skipped = 0;
  const errors = 0;
  let validEntries = 0;
  let geocodePending = 0;
  const records: ExternalEventInsert[] = [];
  const geocodeFailures: Array<{ address: string; cleanedAddress: string; reason: string }> = [];
  const validationFailures: ValidationFailure[] = [];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (i > 0 && i % 100 === 0) {
      logMessage(
        `Processing entry ${i}/${entries.length} (records: ${records.length}, skipped: ${skipped}, errors: ${errors})`,
      );
    }

    const permitStatus = extractPermitStatus(entry.PartitionKey?._);

    if (permitStatus !== 'Approved' && permitStatus !== 'unknown') {
      skipped++;
      continue;
    }

    const externalId = entry.RowKey?._;
    const existingComparison = externalId ? existingIds.get(externalId) : undefined;
    const parsed = parseEntryWithDiagnostics(entry);
    const data = parsed.data;
    if (!data) {
      const failure: ValidationFailure = {
        source: config.source,
        recordId: entry.RowKey?._ ?? 'unknown',
        partition: entry.PartitionKey?._ ?? 'unknown',
        timestamp: entry.Timestamp?._ ?? 'unknown',
        issues: parsed.issues,
      };
      validationFailures.push(failure);
      skipped++;
      logMessage('Skipping invalid external event record', failure);
      continue;
    }

    validEntries++;
    const comparisonEntry =
      existingComparison &&
      entry.contentHash === undefined &&
      existingComparison.contentHash !== null
        ? ensureEventContentHash(entry, data)
        : entry;

    if (
      existingComparison &&
      isUnchangedEvent(existingComparison, getEventComparison(comparisonEntry))
    ) {
      skipped++;
      continue;
    }

    if (deps.isEventBlocked(data)) {
      skipped++;
      continue;
    }

    if (!data.calendarLocation || !data.calendarLocation.trim()) {
      skipped++;
      continue;
    }

    const dateResult = isBadDate(
      data.calendarStartDate ?? null,
      data.calendarEndDate ?? null,
      data.calendarTitle ?? '',
    );
    if (dateResult.bad) {
      logMessage(`Skipping bad date event: "${data.calendarTitle}" - ${dateResult.reason}`);
      skipped++;
      continue;
    }

    const relevanceScore = classifyRelevance(
      data.calendarTitle ?? '',
      data.calendarDescription ?? '',
    );

    let lat: number | null = null;
    let lng: number | null = null;

    if (data.calendarLat != null && data.calendarLng != null) {
      if (validateStateBounds(data.calendarLat, data.calendarLng, config.state)) {
        lat = data.calendarLat;
        lng = data.calendarLng;
      } else {
        logWarning('Pre-geocoded coordinates outside state bounds, will retry geocoding', {
          lat: data.calendarLat,
          lng: data.calendarLng,
          state: config.state,
          title: data.calendarTitle?.slice(0, 60),
        });
      }
    } else {
      const cleanedAddress = deps.cleanAddress(data.calendarLocation);
      const cached = externalId ? geocodedCache.get(externalId) : undefined;
      if (cached?.lat != null && cached.lng != null) {
        lat = cached.lat;
        lng = cached.lng;
      } else if (cleanedAddress) {
        const geo = await deps.geocodeAddress(data.calendarLocation);
        lat = geo.lat;
        lng = geo.lng;
        if (geo.pending) {
          geocodePending++;
          geocodeFailures.push({
            address: data.calendarLocation,
            cleanedAddress,
            reason: geo.failureReason ?? 'ingestion_failed',
          });
        }
      }
    }

    records.push(
      buildRecord({
        entry: ensureEventContentHash(entry, data),
        data,
        permitStatus,
        lat,
        lng,
        config,
        relevanceScore,
      }),
    );
  }

  return {
    records,
    geocodeFailures,
    skipped,
    errors,
    validEntries,
    validationFailures,
    geocodePending,
  };
}

export async function ingestCityEvents(
  config: EprovalCityConfig,
  rateLimiter?: EventbriteRateLimiter,
  crossCityDedupKeys?: Map<string, true>,
  invalidate?: EventCacheInvalidator,
): Promise<IngestionResult> {
  const startTime = Date.now();
  let enrichmentFailures = 0;

  try {
    const geocodedCache = await fetchGeocodedCache(config.source);
    const existingIds = await fetchExistingIds(config.source);

    let entries: EprovalCalendarEntry[];
    switch (config.sourceType) {
      case 'civicplus_rss': {
        entries = await fetchCivicPlusRss(config.rssUrl!);
        break;
      }
      case 'simpleview_rss': {
        entries = await fetchSimpleviewRss(config.rssUrl!);
        entries = await enrichSimpleviewEntries(entries, async (url: string) => {
          const resp = await fetch(url, {
            headers: { 'User-Agent': 'TruckFull/1.0' },
            signal: AbortSignal.timeout(15_000),
          });
          if (!resp.ok) throw new Error(`Detail page ${resp.status}: ${url}`);
          return resp.text();
        });
        break;
      }
      case 'ical': {
        entries = await fetchIcalFeed(config.rssUrl!);
        break;
      }
      case 'aiken_playwright': {
        entries = await fetchAikenCalendar();
        break;
      }
      case 'eventbrite': {
        const apiKey = process.env.EVENTBRITE_PRIVATE_TOKEN;
        if (!apiKey) {
          throw new Error(
            'EVENTBRITE_PRIVATE_TOKEN environment variable is required for Eventbrite ingestion',
          );
        }
        if (config.latitude == null || config.longitude == null || config.radius == null) {
          throw new Error(
            `latitude, longitude, and radius required for eventbrite source: ${config.source}`,
          );
        }
        entries = await fetchEventbriteEvents(
          config.latitude,
          config.longitude,
          config.radius,
          apiKey,
          {
            rateLimiter,
            existingIds,
            skipKeywordSearch: existingIds.size > readKeywordSkipThreshold(),
            onEnrichmentFailure: (failure) => {
              enrichmentFailures++;
              logMessage('Eventbrite venue enrichment failure', {
                source: config.source,
                ...failure,
              });
            },
          },
        );
        break;
      }
      case 'algolia_api': {
        if (!config.algoliaConfig) {
          throw new Error(`algoliaConfig required for algolia_api source: ${config.source}`);
        }
        if (!config.algoliaConfig.appId) {
          throw new Error(
            `Algolia app ID missing for source: ${config.source}. Set the appropriate ALGOLIA_APP_ID env var.`,
          );
        }
        if (!config.algoliaConfig.apiKey) {
          throw new Error(
            `Algolia API key missing for source: ${config.source}. Set the appropriate ALGOLIA_API_KEY env var.`,
          );
        }
        entries = await fetchAlgoliaEvents(config.algoliaConfig);
        break;
      }
      case 'timely_api': {
        if (!config.timelyConfig) {
          throw new Error(`timelyConfig required for timely_api source: ${config.source}`);
        }
        if (!config.timelyConfig.apiKey) {
          throw new Error(
            `Timely API key missing for source: ${config.source}. Set the appropriate TIMELY_API_KEY env var.`,
          );
        }
        entries = await fetchTimelyEvents(config.timelyConfig);
        break;
      }
      case 'arcgis_permits': {
        if (!config.arcgisConfig) {
          throw new Error(`arcgisConfig required for arcgis_permits source: ${config.source}`);
        }
        entries = await fetchArcgisPermits(config.arcgisConfig);
        break;
      }
      case 'tourism_html': {
        if (!config.tourismSelectors) {
          throw new Error(`tourismSelectors required for tourism_html source: ${config.source}`);
        }
        entries = await fetchTourismEvents(config.tourismSelectors);
        break;
      }
      default: {
        entries = await fetchAllSavannahEvents(config);
      }
    }

    if (entries.length === 0) {
      logMessage(`No entries fetched from ${config.city} (${config.sourceType})`);
      return {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        invalidRecords: 0,
        enrichmentFailures,
        geocodePending: 0,
        duration_ms: Date.now() - startTime,
      };
    }

    logMessage(`Fetched ${entries.length} entries from ${config.city} (${config.sourceType})`);
    logMessage(`Cache: ${geocodedCache.size} geocoded, ${existingIds.size} existing IDs`);
    const supabase = getSupabaseAdmin();

    const {
      records,
      geocodeFailures,
      skipped,
      errors,
      validEntries,
      validationFailures,
      geocodePending,
    } = await processEntries(entries, config, existingIds, geocodedCache, {
      geocodeAddress: (address: string) =>
        resolveLocation(address, geocodedCache, undefined, config.city, config.state),
      isEventBlocked,
      cleanAddress,
    });
    const invalidRecords = validationFailures.length;

    if (isSystemicValidationFailure(entries.length, validEntries, invalidRecords)) {
      const errorMessage = `Systemic validation failure for ${config.source}: ${invalidRecords}/${entries.length} records invalid`;
      logError(errorMessage, {
        source: config.source,
        fetchedEntries: entries.length,
        validEntries,
        invalidRecords,
      });
      return {
        inserted: 0,
        updated: 0,
        skipped,
        errors: 1,
        invalidRecords,
        enrichmentFailures,
        geocodePending,
        duration_ms: Date.now() - startTime,
        error: errorMessage,
      };
    }

    logMessage(
      `Processing entries... (${records.length} records, ${skipped} skipped, ${invalidRecords} invalid, ${enrichmentFailures} enrichment failures, ${geocodePending} geocode pending)`,
    );

    const uniqueRecords = new Map<string, ExternalEventInsert>();
    for (const record of records) {
      if (record.external_id && !uniqueRecords.has(record.external_id)) {
        uniqueRecords.set(record.external_id, record);
      }
    }
    const dedupedRecords = [...uniqueRecords.values()];
    if (dedupedRecords.length < records.length) {
      logMessage(`Deduplicated ${records.length} -> ${dedupedRecords.length} records`);
    }

    let crossCityFiltered: ExternalEventInsert[] = dedupedRecords;
    if (crossCityDedupKeys) {
      crossCityFiltered = dedupedRecords.filter((record) => {
        const key = buildCrossCityKey(record);
        if (crossCityDedupKeys.has(key)) return false;
        crossCityDedupKeys.set(key, true);
        return true;
      });
      const removed = dedupedRecords.length - crossCityFiltered.length;
      if (removed > 0) {
        logMessage(`Cross-city dedup: removed ${removed} duplicates from ${config.city}`);
      }
    }

    let inserted = 0;
    let updated = 0;
    let batchErrors = 0;
    let batchRecords: ExternalEventInsert[] = [];
    let batchIdx = 0;

    const flushBatch = async (batch: ExternalEventInsert[], idx: number): Promise<void> => {
      if (batch.length === 0) return;

      const { data, error } = await supabase
        .from('external_events')
        .upsert(batch, {
          onConflict: 'source,external_id',
        })
        .select('id, external_id');

      if (error) {
        logError(`Failed to upsert batch ${idx}`, {
          error: error.message,
          batchSize: batch.length,
        });
        batchErrors += batch.length;
      } else {
        const upsertedRows = (data ?? []) as unknown as {
          id: string;
          external_id: string | null;
        }[];
        const existingCount = batch.filter((r) => existingIds.has(r.external_id!)).length;
        inserted += batch.length - existingCount;
        updated += existingCount;
        logMessage(`Batch ${idx} upserted`, { count: batch.length });
        logMessage(
          `Batch ${idx}: +${batch.length - existingCount} inserted, ${existingCount} updated`,
        );

        if (invalidate) {
          const targets = collectIngestionInvalidationTargets(upsertedRows, batch, existingIds);
          if (targets.length > 0) {
            try {
              await invalidate(targets);
            } catch (invalidationError) {
              logError(`Failed to invalidate event cache for batch ${idx}`, invalidationError);
            }
          }
        }
      }
    };

    for (const record of crossCityFiltered) {
      batchRecords.push(record);
      if (batchRecords.length >= BATCH_SIZE) {
        batchIdx++;
        await flushBatch(batchRecords, batchIdx);
        batchRecords = [];
      }
    }

    batchIdx++;
    await flushBatch(batchRecords, batchIdx);

    await Promise.all(
      geocodeFailures.map((f) =>
        recordGeocodeFailure(supabase, f.address, f.cleanedAddress, f.reason),
      ),
    );

    const durationMs = Date.now() - startTime;
    logMessage(`${config.city} ingestion completed`, {
      inserted,
      updated,
      skipped,
      errors: errors + batchErrors,
      invalidRecords,
      enrichmentFailures,
      geocodePending,
      duration_ms: durationMs,
    });

    return {
      inserted,
      updated,
      skipped,
      errors: errors + batchErrors,
      invalidRecords,
      enrichmentFailures,
      geocodePending,
      duration_ms: durationMs,
    };
  } catch (error) {
    if (error instanceof EventbriteRateLimitExhausted) throw error;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`${config.city} ingestion failed`, error);
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: 1,
      invalidRecords: 0,
      enrichmentFailures,
      geocodePending: 0,
      duration_ms: Date.now() - startTime,
      error: errorMessage,
    };
  }
}

function roundCoord(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'null';
  return value.toFixed(2);
}

function buildCrossCityKey(event: ExternalEventInsert): string {
  const name = (event.title ?? '').toLowerCase().trim();
  const date = event.event_start_date ?? '';
  const latBucket = roundCoord(event.location_lat);
  const lngBucket = roundCoord(event.location_lng);
  return `${name}|${date}|${latBucket}|${lngBucket}`;
}

export function deduplicateCrossCity(events: ExternalEventInsert[]): ExternalEventInsert[] {
  if (events.length === 0) return [];

  const keyToFirst = new Map<string, ExternalEventInsert>();
  let dedupedCount = 0;

  for (const event of events) {
    const compositeKey = buildCrossCityKey(event);

    if (compositeKey.endsWith('|null|null')) {
      keyToFirst.set(`${event.external_id}-null-coord-${keyToFirst.size}`, event);
      continue;
    }

    if (keyToFirst.has(compositeKey)) {
      dedupedCount++;
    } else {
      keyToFirst.set(compositeKey, event);
    }
  }

  if (dedupedCount > 0) {
    logMessage(
      `Cross-city dedup: removed ${dedupedCount} duplicate events (${events.length} -> ${keyToFirst.size})`,
    );
  }

  return [...keyToFirst.values()];
}

export async function ingestSavannahEvents(): Promise<IngestionResult> {
  return ingestCityEvents(SAVANNAH_CONFIG);
}
