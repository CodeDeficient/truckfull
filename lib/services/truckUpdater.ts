/**
 * Truck Updater Service
 * Updates truck data (schedule, service location) based on Facebook post
 * processing. Pre-Meta: the permanent/default truck address is never a
 * Facebook write target.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { categorizeMenuItem } from './menuCategorizer';
import { logError } from '@/lib/logging';
import type { ParsedPost } from '@/lib/ai/parseFacebookPost';
import { geocodeAddress } from '@/lib/utils/geocoding';
import { enrichOverrideLocation } from './overrideLocationEnrichment';
import type { OverrideLocation } from './scheduleOverride';
import type { Classification } from './postClassifier';
import type { ValidationResult } from './postValidator';
import {
  isValidTimezone,
  isOvernightTimeRange,
  validateOverrideShape,
  writeScheduleOverride,
} from './scheduleOverride';
import {
  invalidatePublicTruckBySlug,
  invalidatePublicTruckSearchCaches,
} from '@/lib/services/publicTruckPage';
import { normalizeWeekdaySet } from './weekday';
import {
  getScheduleValidationDiagnostic,
  hasStrictCompleteTimes,
  isCompleteRecurringSchedule,
  normalizeCompleteTimes,
} from './scheduleSemantics';
import {
  arbitrateFacebookRecurringAction,
  facebookRecurringAssertedUnits,
  facebookRecurringDayUnitDiff,
  readRecurringDayMeta,
  stampFacebookDayActions,
  type RecurringArbitrationUnit,
} from './recurringArbitration';

export interface TruckUpdateResult {
  success: boolean;
  updatedFields: string[];
  queued: boolean;
  error?: string;
}

export interface DatedUpdateContext {
  readonly facebookPostId: string;
  readonly sourcePostCreatedAt?: string;
}

export interface MenuItemInput {
  name: string;
  category: ReturnType<typeof categorizeMenuItem>;
  dietary_info: string[];
  is_popular: boolean;
}

export function buildMenuItems(foodItems: string[]): MenuItemInput[] {
  return foodItems.map((item) => ({
    name: item,
    category: categorizeMenuItem(item),
    dietary_info: [] as string[],
    is_popular: false,
  }));
}

export interface RecurringDayEntry {
  open: string;
  close: string;
  location?: string;
  endsNextDay?: boolean;
}

/**
 * Builds recurring day entries for the given canonical weekdays. Setting
 * hours makes the day open (a stale closed: true never survives). The
 * incoming exact recurring service location, when supplied, becomes the
 * day's service location; when absent the caller is responsible for
 * preserving any existing per-day location (see mergeRecurringDay).
 */
export function buildOperatingHours(
  start: string,
  end: string,
  days?: string[],
  location?: string,
): Record<string, RecurringDayEntry> {
  const normalizedTimes = normalizeCompleteTimes({ start, end });
  const normalizedDays = normalizeWeekdaySet(days);
  if (!normalizedTimes || !normalizedDays) return {};

  const trimmedLocation = location?.trim();
  const overnight = isOvernightTimeRange(normalizedTimes.start, normalizedTimes.end);
  const hours: Record<string, RecurringDayEntry> = {};
  for (const day of normalizedDays) {
    hours[day] = {
      open: normalizedTimes.start,
      close: normalizedTimes.end,
      ...(trimmedLocation ? { location: trimmedLocation } : {}),
      ...(overnight ? { endsNextDay: true } : {}),
    };
  }

  return hours;
}

/**
 * Merges new recurring hours for one day into existing operating hours
 * with setDayHours semantics: setting hours makes the day open (a stale
 * closed marker never survives), an existing per-day location is
 * preserved when Facebook supplies no new location, an incoming exact
 * location replaces the existing one, and unrelated days are untouched.
 */
export function mergeRecurringDay(
  existingHours: Record<string, RecurringDayEntry>,
  day: string,
  start: string,
  end: string,
  location?: string,
): Record<string, RecurringDayEntry> {
  const existing = existingHours[day];
  const effectiveLocation =
    location?.trim() || (typeof existing?.location === 'string' ? existing.location : undefined);
  const dayEntries = buildOperatingHours(start, end, [day], effectiveLocation);
  const entry = dayEntries[day];
  if (!entry) return existingHours;
  // Rebuild preserves the stored per-day arbitration metadata; only the
  // caller that wins arbitration for a unit re-stamps it afterwards.
  const storedMeta = readRecurringDayMeta(existing);
  return {
    ...existingHours,
    [day]: (Object.keys(storedMeta).length > 0 ? { ...entry, _meta: storedMeta } : entry) as RecurringDayEntry,
  };
}

export interface UpdateWriteOptions {
  /** Admin client override (tests); defaults to getSupabaseAdmin(). */
  readonly supabase?: ReturnType<typeof getSupabaseAdmin>;
  /**
   * Canonical Facebook created_time for the recurring schedule write's
   * per-unit arbitration. Missing or invalid fails closed.
   */
  readonly fbActionAt?: string;
}

export async function updateTruckData(
  truckId: string,
  classification: Classification,
  ocrResult: ParsedPost,
  validation: ValidationResult,
  datedContext?: DatedUpdateContext,
  writeOptions?: UpdateWriteOptions,
): Promise<TruckUpdateResult> {
  try {
    const client = writeOptions?.supabase ?? getSupabaseAdmin();
    const updatedFields: string[] = [];
    const scheduleDiagnostic = getScheduleValidationDiagnostic(ocrResult.times);
    if (scheduleDiagnostic === 'DEGENERATE_TIMES_REJECTED') {
      return { success: false, updatedFields: [], queued: false, error: scheduleDiagnostic };
    }

    if (validation.resolvedServiceDate && datedContext) {
      // The dated override is the canonical operation: write it first so a
      // menu mutation can never block or fail the schedule/location update.
      const datedResult = await updateDatedScheduleOverride(
        client,
        truckId,
        ocrResult,
        validation.resolvedServiceDate,
        datedContext.facebookPostId,
        datedContext.sourcePostCreatedAt,
      );

      if (!datedResult.success) {
        logError('Failed to apply dated schedule override', {
          truckId,
          serviceDate: validation.resolvedServiceDate,
          error: datedResult.error,
        });
        return {
          success: false,
          updatedFields: [],
          queued: false,
          error: datedResult.error,
        };
      }

      updatedFields.push('schedule');
      if (datedResult.slug) {
        invalidatePublicTruckBySlug(datedResult.slug);
      }
      invalidatePublicTruckSearchCaches();

      // Pre-Meta: menu automation is disabled. Incidental food_items in a
      // dated/mixed post never mutate the customer-visible menu; they stay
      // on the durable receipt only.

      return { success: true, updatedFields, queued: false };
    }

    const now = new Date().toISOString();

    const hasLocation = ocrResult.location?.address;
    const scheduleStart = ocrResult.times?.start;
    const scheduleEnd = ocrResult.times?.end;
    const hasSchedule = hasStrictCompleteTimes(ocrResult.times);
    if (
      ocrResult.times?.scope === 'recurring_weekly' &&
      hasSchedule &&
      !isCompleteRecurringSchedule(ocrResult.times)
    ) {
      return {
        success: false,
        updatedFields: [],
        queued: false,
        error: 'NONCANONICAL_DAYSET_REJECTED',
      };
    }

    // Recurring-scope service location lives in operating_hours[day].location,
    // never the permanent/default truck address. A recurring schedule update
    // with a parsed non-fuzzy location carries it into the day entries; a
    // fuzzy/incomplete location never becomes a recurring service location.
    // Parity with confirmationPolicy's source gate: the location is only
    // routed per-day when the schedule write will actually run — complete
    // times AND a canonical (alias-aware) weekday set. Otherwise
    // recurringLocation stays undefined and the guard below fails closed
    // with LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA, so a day-set without an
    // applicable schedule can never silently drop the location and the
    // permanent/default address is never a Facebook write target.
    const isRecurringScope = isCompleteRecurringSchedule(ocrResult.times);
    const recurringLocation =
      isRecurringScope && ocrResult.location?.address && !ocrResult.location.fuzzy
        ? ocrResult.location.address
        : undefined;

    // Pre-Meta blocker: a location-only Facebook service announcement is
    // not authorization to rewrite the truck's permanent/default address.
    // The dated-override path above is the only sanctioned location write
    // (service-date scoped, with hours). A location that no applicable
    // schedule write will absorb (recurringLocation undefined) can neither
    // inherit effective hours (no such mechanism) nor build a valid review
    // proposal (the review contract requires schedule evidence), so it
    // fails closed with an explicit diagnostic. The guard keys on evidence,
    // not the classification label: incidental food keywords make a
    // location announcement classify MIXED, which must not bypass the
    // permanent-location protection.
    if (hasLocation && !recurringLocation) {
      return {
        success: false,
        updatedFields: [],
        queued: false,
        error: 'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA',
      };
    }

    if (hasSchedule && isRecurringScope) {
      const scheduleResult = await updateSchedule({
        supabase: client,
        truckId,
        start: scheduleStart!,
        end: scheduleEnd!,
        days: ocrResult.times?.days,
        now,
        location: recurringLocation,
        fbActionAt: writeOptions?.fbActionAt,
      });

      if (scheduleResult.success) {
        updatedFields.push('schedule');
        if (scheduleResult.slug) {
          invalidatePublicTruckBySlug(scheduleResult.slug);
        }
      } else if (scheduleResult.error) {
        logError('Failed to update schedule', { truckId, error: scheduleResult.error });
        return { success: false, updatedFields: [], queued: false, error: scheduleResult.error };
      }
    }

    return {
      success: updatedFields.length > 0,
      updatedFields,
      queued: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error updating truck data', { truckId, error: errorMessage });
    return {
      success: false,
      updatedFields: [],
      queued: false,
      error: errorMessage,
    };
  }
}

export async function updateDatedScheduleOverride(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  truckId: string,
  ocrResult: ParsedPost,
  serviceDate: string,
  facebookPostId: string,
  sourcePostCreatedAt?: string,
): Promise<{ success: boolean; error?: string; slug?: string }> {
  const { data: truck, error: truckError } = await supabase
    .from('food_trucks')
    .select('timezone, slug')
    .eq('id', truckId)
    .single();

  if (truckError || !truck) {
    return { success: false, error: truckError?.message ?? 'Truck not found' };
  }

  const timezone = typeof truck.timezone === 'string' ? truck.timezone : '';
  if (!isValidTimezone(timezone)) {
    return { success: false, error: 'Truck timezone not found or invalid' };
  }

  const startTime = ocrResult.times?.start ?? '';
  const endTime = ocrResult.times?.end ?? '';
  const rawLocation: OverrideLocation = {
    address: ocrResult.location?.address ?? '',
    city: ocrResult.location?.city,
    state: ocrResult.location?.state,
    fuzzy: ocrResult.location?.fuzzy ?? false,
  };
  // Attach map coordinates to the dated stop without ever blocking the write:
  // geocode failure yields a words-only location, never an error.
  const location = await enrichOverrideLocation(rawLocation, geocodeAddress);
  const shape = {
    serviceDate,
    isClosed: false,
    isAllDay: false,
    startTime,
    endTime,
    endsNextDay: isOvernightTimeRange(startTime, endTime),
    location,
  };

  const shapeValidation = validateOverrideShape(shape);
  if (!shapeValidation.valid) {
    return { success: false, error: shapeValidation.reason };
  }

  const { data: postRecord } = await supabase
    .from('facebook_posts')
    .select('id')
    .eq('facebook_post_id', facebookPostId)
    .eq('truck_id', truckId)
    .maybeSingle();

  if (!postRecord?.id) {
    return { success: false, error: 'Facebook post not found' };
  }

  const result = await writeScheduleOverride(supabase, {
    truckId,
    shape,
    source: 'facebook',
    sourcePostId: postRecord.id,
    timezone,
    now: new Date().toISOString(),
    sourcePostCreatedAt: sourcePostCreatedAt ?? null,
  });

  return result.success
    ? { success: true, slug: truck.slug ?? undefined }
    : { success: false, error: result.error };
}

export interface UpdateScheduleArgs {
  supabase: ReturnType<typeof getSupabaseAdmin>;
  truckId: string;
  start: string;
  end: string;
  days: string[] | undefined;
  now: string;
  /** Exact recurring service location; persisted per-day, never permanent. */
  location?: string;
  /**
   * Canonical Facebook created_time for the recurring action. Required for
   * every recurring write; missing or invalid fails closed with
   * RECURRING_FB_ACTION_TIME_MISSING before any merge or write.
   */
  fbActionAt?: string;
}

const RECURRING_WRITE_RETRY = 'RECURRING_WRITE_RETRY';
const MAX_RECURRING_WRITE_ATTEMPTS = 3;

async function attemptScheduleUpdate({
  supabase,
  truckId,
  start,
  end,
  days,
  now,
  location,
  fbActionAt,
}: UpdateScheduleArgs): Promise<{ success: boolean; error?: string; slug?: string }> {
  const newHours = buildOperatingHours(start, end, days, location);

  if (Object.keys(newHours).length === 0) {
    logError('No canonical weekdays to write for schedule update', { truckId, days });
    return { success: false, error: 'No canonical weekdays to write' };
  }

  const { data: existing, error: readError } = await supabase
    .from('food_trucks')
    .select('operating_hours')
    .eq('id', truckId)
    .single();

  if (readError) {
    logError('Failed to read existing operating_hours for schedule update', {
      truckId,
      error: readError.message,
    });
    return { success: false, error: readError.message };
  }

  const existingHours: Record<string, RecurringDayEntry> =
    existing?.operating_hours &&
    typeof existing.operating_hours === 'object' &&
    !Array.isArray(existing.operating_hours)
      ? (existing.operating_hours as unknown as Record<string, RecurringDayEntry>)
      : {};

  // Explicitly asserted units participate even when their business value is
  // unchanged so a newer canonical Facebook action can advance provenance.
  const affectedDays: string[] = [];
  const affectedUnitsByDay: Record<string, RecurringArbitrationUnit[]> = {};
  const changedUnitsByDay: Record<string, Record<RecurringArbitrationUnit, boolean>> = {};
  for (const day of Object.keys(newHours)) {
    const diff = facebookRecurringDayUnitDiff(existingHours[day], newHours[day]);
    const units = facebookRecurringAssertedUnits(newHours[day]);
    if (units.length === 0) continue;
    affectedDays.push(day);
    affectedUnitsByDay[day] = units;
    changedUnitsByDay[day] = diff;
  }

  if (affectedDays.length === 0) {
    return { success: true };
  }

  const arbitration = arbitrateFacebookRecurringAction({
    existingHours,
    affectedUnitsByDay,
    fbActionAt,
  });

  function firstDenyReason(): string | null {
    if (arbitration.firstDeny) {
      return `${arbitration.firstDeny.code}: ${arbitration.firstDeny.reason}`;
    }
    for (const day of Object.values(arbitration.verdicts)) {
      for (const verdict of [day.schedule, day.location]) {
        if (verdict.allow === false) return `${verdict.code}: ${verdict.reason}`;
      }
    }
    return null;
  }

  if (!arbitration.appliedAny) {
    const denial = firstDenyReason();
    logError('Recurring Facebook action failed per-unit arbitration', {
      truckId,
      reason: denial,
    });
    return { success: false, error: denial ?? 'Recurring arbitration failed' };
  }

  // Day-level, per-unit merge with setDayHours semantics:
  //   schedule unit allowed  -> hours set, day open (stale closed never
  //                             survives), incoming location when the
  //                             location unit also applies, else existing
  //                             per-day location preserved;
  //   schedule unit denied   -> existing hours preserved;
  //   location unit applied  -> incoming exact location replaces;
  //   location unit denied / not contested -> existing per-day location kept;
  //   a day with no contested unit is byte-for-byte untouched;
  // arbitration _meta survives every rebuild path.
  let mergedHours: Record<string, RecurringDayEntry> = existingHours;
  const appliedStamps: Record<string, RecurringArbitrationUnit[]> = {};
  for (const day of affectedDays) {
    const dayVerdict = arbitration.verdicts[day];
    const incoming = newHours[day];
    const existingEntry = existingHours[day];
    const units = affectedUnitsByDay[day];
    const scheduleApplies = units.includes('schedule') && dayVerdict.schedule.allow;
    const locationApplies = units.includes('location') && dayVerdict.location.allow;

    if (scheduleApplies && changedUnitsByDay[day].schedule) {
      const effectiveLocation = locationApplies && changedUnitsByDay[day].location
        ? incoming.location
        : typeof existingEntry?.location === 'string'
          ? existingEntry.location
          : undefined;
      mergedHours = mergeRecurringDay(
        mergedHours,
        day,
        incoming.open,
        incoming.close,
        effectiveLocation,
      );
    }
    if (locationApplies && changedUnitsByDay[day].location) {
      const current = mergedHours[day];
      const trimmedLocation = typeof incoming.location === 'string' ? incoming.location : undefined;
      mergedHours = {
        ...mergedHours,
        [day]: { ...current, ...(trimmedLocation ? { location: trimmedLocation } : {}) },
      };
    }
    appliedStamps[day] = units.filter((unit) =>
      unit === 'schedule' ? scheduleApplies : locationApplies,
    );
  }

  mergedHours = stampFacebookDayActions(mergedHours, appliedStamps, fbActionAt as string) as Record<
    string,
    RecurringDayEntry
  >;

  const expectedHours = existing?.operating_hours ?? null;
  let updateQuery = supabase
    .from('food_trucks')
    .update({
      facebook_last_sync: now,
      operating_hours: mergedHours as unknown as import('@/lib/database.remote.types').Json,
      schedule_updated_by: 'facebook',
      schedule_updated_at: fbActionAt ?? now,
      updated_at: now,
    })
    .eq('id', truckId);
  updateQuery =
    expectedHours === null
      ? updateQuery.is('operating_hours', null)
      : updateQuery.filter('operating_hours', 'eq', JSON.stringify(expectedHours));

  const { data: updatedRow, error: updateError } = await updateQuery.select('slug').maybeSingle();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  if (!updatedRow) {
    return { success: false, error: RECURRING_WRITE_RETRY };
  }

  return { success: true, slug: updatedRow?.slug ?? undefined };
}

export async function updateSchedule(args: UpdateScheduleArgs): Promise<{
  success: boolean;
  error?: string;
  slug?: string;
}> {
  for (let attempt = 0; attempt < MAX_RECURRING_WRITE_ATTEMPTS; attempt += 1) {
    const result = await attemptScheduleUpdate(args);
    if (result.error !== RECURRING_WRITE_RETRY) return result;
  }

  return {
    success: false,
    error: 'RECURRING_SCHEDULE_WRITE_CONFLICT: Schedule changed during update; retry later',
  };
}

const COUNTRY_SUFFIXES = [', United States of America', ', United States', ', USA', ', US'];

export function stripCountrySuffix(address: string): string {
  for (const suffix of COUNTRY_SUFFIXES) {
    if (address.endsWith(suffix)) {
      return address.slice(0, -suffix.length).trim();
    }
  }
  return address;
}

const STATE_ZIP_REGEX = /^([A-Z]{2})\s*(\d{5}(?:-\d{4})?)$/;
const ZIP_REGEX = /\b(\d{5}(?:-\d{4})?)\b/;
const STATE_REGEX = /\b([A-Z]{2})\b/;

export function parseAddressComponents(formattedAddress: string): {
  city: string;
  state: string;
  zip: string;
} {
  const parts = formattedAddress.split(',').map((p) => p.trim());

  let city = '';
  let state = '';
  let zip = '';

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const stateZipMatch = part.match(STATE_ZIP_REGEX);
    if (stateZipMatch) {
      state = stateZipMatch[1];
      zip = stateZipMatch[2];
      if (i > 0) {
        city = parts[i - 1];
      }
      break;
    }
  }

  if (!state && !zip && !city) {
    const zipMatch = formattedAddress.match(ZIP_REGEX);
    const stateMatch = formattedAddress.match(STATE_REGEX);
    if (zipMatch && stateMatch) {
      zip = zipMatch[1];
      state = stateMatch[1];
    }
  }

  return { city, state, zip };
}
