/**
 * Per-weekday, per-unit recurring arbitration metadata.
 *
 * Persistence grain: operating_hours[day]._meta with one independent clock per
 * affected unit:
 *
 *   operating_hours[day] = {
 *     open, close, endsNextDay?, location?,
 *     _meta?: {
 *       schedule?: { source: 'manual' | 'facebook', last_action_at: string },
 *       location?: { source: 'manual' | 'facebook', last_action_at: string },
 *     },
 *   }
 *
 * Invariant (latest applicable owner action wins, narrowly scoped):
 *   - A manual Monday hours edit must not suppress an unrelated Tuesday FB
 *     hours action, nor a Monday FB location action.
 *   - Arbitration key is weekday + unit, never truck-wide.
 *   - Facebook arbitration timestamps are canonical post created_time, never
 *     processing time. Missing canonical timestamp fails closed.
 *   - A day/unit with no stored metadata has no recorded owner action to
 *     protect: the write is treated like day creation and stamps fresh
 *     provenance on the first successful write.
 */

export type RecurringActionSource = 'manual' | 'facebook';

export type RecurringArbitrationUnit = 'schedule' | 'location';

export interface UnitActionMeta {
  readonly source: RecurringActionSource;
  readonly last_action_at: string;
}

export interface RecurringArbitrationMeta {
  readonly schedule?: UnitActionMeta;
  readonly location?: UnitActionMeta;
}

/** Shape after stripRecurringArbitrationMeta: business fields only. */
interface DayBusinessFields {
  open?: unknown;
  close?: unknown;
  closed?: unknown;
  endsNextDay?: unknown;
  location?: unknown;
}

type DayEntryLike = DayBusinessFields & { _meta?: unknown };

export type WeeklyHoursLike = { [day: string]: unknown | undefined };

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

/**
 * Server-authoritative arbitration metadata is never trusted from a request
 * body; dashboards stamp it only for units they actually changed.
 */
export function stripRecurringArbitrationMeta(
  hours: WeeklyHoursLike | null | undefined,
): WeeklyHoursLike {
  if (!hours || typeof hours !== 'object') return {};
  const stripped: WeeklyHoursLike = {};
  for (const [day, entry] of Object.entries(hours)) {
    if (!entry || typeof entry !== 'object') continue;
    const business = { ...(entry as DayEntryLike) };
    delete business._meta;
    stripped[day] = business;
  }
  return stripped;
}

function readDayMeta(entry: unknown): RecurringArbitrationMeta {
  if (!entry || typeof entry !== 'object') return {};
  const meta = (entry as { _meta?: unknown })._meta;
  if (!meta || typeof meta !== 'object') return {};
  const raw = meta as { schedule?: unknown; location?: unknown };
  const result: { schedule?: UnitActionMeta; location?: UnitActionMeta } = {};
  for (const unit of ['schedule', 'location'] as const) {
    const candidate = raw[unit];
    if (!candidate || typeof candidate !== 'object') continue;
    const { source, last_action_at } = candidate as Partial<UnitActionMeta>;
    if ((source === 'manual' || source === 'facebook') && isIsoTimestamp(last_action_at)) {
      result[unit] = { source, last_action_at };
    }
  }
  return result;
}

/** Read sanitized per-day arbitration metadata (invalid entries are dropped). */
export function readRecurringDayMeta(entry: unknown): RecurringArbitrationMeta {
  return readDayMeta(entry);
}

function businessFields(entry: unknown): Record<string, string> {
  if (!entry || typeof entry !== 'object') return {};
  const business = { ...(entry as DayEntryLike) };
  delete business._meta;
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(business)) {
    if (value === undefined) continue;
    // A falsy `closed` is semantically "open" and is not persisted by the
    // schedule editor (setDayHours / normalizeWeeklyScheduleForWrite omit the
    // key), while the dashboard form stores `closed: false` on open days.
    // Treating falsy `closed` as absent keeps a location-only edit from
    // falsely stamping the schedule clock.
    if (key === 'closed' && !value) continue;
    fields[key] = `${String(value)}`;
  }
  return fields;
}

function businessDiffers(priorEntry: unknown, nextEntry: unknown): boolean {
  const prior = businessFields(priorEntry);
  const next = businessFields(nextEntry);
  const priorKeys = Object.keys(prior).sort();
  const nextKeys = Object.keys(next).sort();
  if (priorKeys.length !== nextKeys.length) return true;
  for (const key of priorKeys) {
    if (prior[key] !== next[key]) return true;
  }
  return false;
}

export interface DayUnitChanges {
  readonly [day: string]: {
    readonly schedule: boolean;
    readonly location: boolean;
  };
}

/**
 * Per-day, per-unit change detection between the persisted hours and the
 * dashboard submission. A day's hours fields (open/close/closed/endsNextDay)
 * drive the schedule clock; the location field drives the location clock.
 * Arbitration `_meta` payloads never influence the diff.
 */
export function dayUnitChanges(
  prior: WeeklyHoursLike | null | undefined,
  next: WeeklyHoursLike | null | undefined,
): DayUnitChanges {
  const changes: Record<string, { schedule: boolean; location: boolean }> = {};
  const days = new Set([...Object.keys(prior ?? {}), ...Object.keys(next ?? {})]);
  for (const day of days) {
    const priorEntry = prior?.[day];
    const nextEntry = next?.[day];
    if (!priorEntry && !nextEntry) continue;
    const priorBusiness = businessFields(priorEntry);
    const nextBusiness = businessFields(nextEntry);

    // The location field never participates in the schedule comparison: a
    // location-only edit is a location-clocks change, not a schedule change.
    const scheduleChanged = businessDiffers(
      stripLocationField(priorBusiness),
      stripLocationField(nextBusiness),
    );
    const locationChanged = normalizeLocation(priorEntry) !== normalizeLocation(nextEntry);
    if (scheduleChanged || locationChanged) {
      changes[day] = { schedule: scheduleChanged, location: locationChanged };
    }
  }
  return changes;
}

export interface RecurringDayUnitDiff {
  readonly schedule: boolean;
  readonly location: boolean;
}

/**
 * Per-day unit-contest detection for a Facebook recurring write under
 * setDayHours merge semantics. A unit is contested only when the write would
 * actually change its persisted value:
 *   schedule  — the incoming hours fields (open/close/endsNextDay/closed)
 *               differ from the stored entry;
 *   location  — an incoming exact location is present AND differs from the
 *               stored one. An absent incoming location preserves the stored
 *               per-day location (mergeRecurringDay), so it is never a
 *               location write and never enters location arbitration.
 */
export function facebookRecurringDayUnitDiff(
  existingEntry: unknown,
  nextEntry: unknown,
): RecurringDayUnitDiff {
  const nextBusiness = businessFields(nextEntry);
  if (!nextBusiness.open && nextBusiness.closed === undefined) {
    return { schedule: false, location: false };
  }
  const scheduleChanges = businessDiffers(
    stripLocationField(businessFields(existingEntry)),
    stripLocationField(nextBusiness),
  );
  const nextLocation = normalizeLocation(nextEntry);
  const locationChanges =
    nextLocation !== undefined && normalizeLocation(existingEntry) !== nextLocation;
  return { schedule: scheduleChanges, location: locationChanges };
}

export function facebookRecurringAssertedUnits(nextEntry: unknown): RecurringArbitrationUnit[] {
  const nextBusiness = businessFields(nextEntry);
  const units: RecurringArbitrationUnit[] = [];
  if (nextBusiness.open || nextBusiness.closed !== undefined) units.push('schedule');
  if (normalizeLocation(nextEntry) !== undefined) units.push('location');
  return units;
}

function stripLocationField(fields: Record<string, string>): Record<string, string> {
  const rest = { ...fields };
  delete rest.location;
  return rest;
}

function normalizeLocation(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const loc = (entry as { location?: unknown }).location;
  return typeof loc === 'string' && loc.trim() ? loc : undefined;
}

/**
 * Stamp manual owner actions onto the days/units that actually changed.
 * Returns a new hours object; the input is never mutated.
 */
export function stampManualDayActions(
  hours: WeeklyHoursLike,
  changes: DayUnitChanges,
  actionAt: string,
): WeeklyHoursLike {
  const stamped: WeeklyHoursLike = { ...hours };
  for (const [day, units] of Object.entries(changes)) {
    const entry = stamped[day];
    if (!entry || typeof entry !== 'object') continue;
    const existing = readDayMeta(entry);
    const meta: { schedule?: UnitActionMeta; location?: UnitActionMeta } = { ...existing };
    if (units.schedule) {
      meta.schedule = { source: 'manual', last_action_at: actionAt };
    }
    if (units.location) {
      meta.location = { source: 'manual', last_action_at: actionAt };
    }
    stamped[day] = { ...entry, _meta: meta };
  }
  return stamped;
}

export interface ManualRecurringProvenanceResult {
  readonly hours: WeeklyHoursLike;
  readonly changes: DayUnitChanges;
  readonly changed: boolean;
}

/**
 * Build the server-authoritative dashboard write payload. Submitted `_meta`
 * is discarded, persisted metadata is restored for every retained day, and
 * removed days become closed tombstones so their manual action remains
 * orderable against delayed Facebook posts.
 */
export function applyManualRecurringProvenance(
  priorHours: WeeklyHoursLike | null | undefined,
  submittedHours: WeeklyHoursLike | null | undefined,
  actionAt: string,
): ManualRecurringProvenanceResult {
  const priorBusiness = stripRecurringArbitrationMeta(priorHours);
  const submittedBusiness = stripRecurringArbitrationMeta(submittedHours);
  const changes = dayUnitChanges(priorBusiness, submittedBusiness);
  const withPriorMeta: WeeklyHoursLike = {};

  for (const [day, entry] of Object.entries(submittedBusiness)) {
    if (!entry || typeof entry !== 'object') continue;
    const priorMeta = readDayMeta(priorHours?.[day]);
    withPriorMeta[day] =
      Object.keys(priorMeta).length > 0 ? { ...entry, _meta: priorMeta } : { ...entry };
  }

  for (const day of Object.keys(changes)) {
    if (submittedBusiness[day] === undefined && priorBusiness[day] !== undefined) {
      withPriorMeta[day] = { closed: true };
    }
  }

  const changed = Object.keys(changes).length > 0;
  return {
    hours: changed ? stampManualDayActions(withPriorMeta, changes, actionAt) : withPriorMeta,
    changes,
    changed,
  };
}

export type RecurringUnitVerdict =
  | { readonly allow: true }
  | { readonly allow: false; readonly code: string; readonly reason: string };

export type RecurringDayVerdict = {
  readonly schedule: RecurringUnitVerdict;
  readonly location: RecurringUnitVerdict;
};

export type RecurringArbitrationVerdict = {
  readonly [day: string]: RecurringDayVerdict;
};

const ABSENT_VERDICT: RecurringUnitVerdict = { allow: true };

function newDayVerdict(): { schedule: RecurringUnitVerdict; location: RecurringUnitVerdict } {
  return { schedule: ABSENT_VERDICT, location: ABSENT_VERDICT };
}

/**
 * Arbitrate the affected (day, unit) pairs of a recurring Facebook write.
 * Per-unit independent: a stale or unorderable unit on one day/unit never
 * poisons another. The caller decides, per (day, unit), whether an `allow`
 * verdict means "apply and stamp" and a deny means "preserve as-is".
 */
export function arbitrateFacebookRecurringAction(args: {
  readonly existingHours: WeeklyHoursLike | null | undefined;
  readonly affectedUnitsByDay: DayUnitStamps;
  readonly fbActionAt: string | null | undefined;
}): {
  readonly verdicts: RecurringArbitrationVerdict;
  readonly appliedAny: boolean;
  readonly firstDeny: { readonly code: string; readonly reason: string } | null;
} {
  if (!isIsoTimestamp(args.fbActionAt)) {
    // Every affected unit fails closed: no write occurs.
    const missing: RecurringUnitVerdict = {
      allow: false,
      code: 'RECURRING_FB_ACTION_TIME_MISSING',
      reason: 'Missing canonical Facebook created_time; recurring auto-apply fails closed',
    };
    const verdicts: Record<string, RecurringDayVerdict> = {};
    for (const [day, units] of Object.entries(args.affectedUnitsByDay)) {
      const verdict = newDayVerdict();
      for (const unit of units) verdict[unit] = missing;
      verdicts[day] = verdict;
    }
    return { verdicts, appliedAny: false, firstDeny: null };
  }
  const fbTime = Date.parse(args.fbActionAt as string);
  const hours = args.existingHours;
  const verdicts: Record<string, { schedule: RecurringUnitVerdict; location: RecurringUnitVerdict }> = {};
  let appliedAny = false;
  let firstDeny: { code: string; reason: string } | null = null;

  const deny = (code: string, reason: string): RecurringUnitVerdict => {
    if (!firstDeny) firstDeny = { code, reason };
    return { allow: false, code, reason };
  };

  for (const [day, affectedUnits] of Object.entries(args.affectedUnitsByDay)) {
    const entry = hours?.[day];
    const meta = readDayMeta(entry);
    const verdict = newDayVerdict();
    verdicts[day] = verdict;
    for (const unit of affectedUnits) {
      if (!entry) {
        // A day that does not exist is created by the write; there is no
        // stored value to protect, so creation is allowed.
        appliedAny = true;
        continue;
      }
      const stored = meta[unit];
      if (!stored) {
        // A day/unit with no stored metadata has no recorded owner action to
        // protect, so the write is treated like day creation and stamps fresh
        // provenance on the first successful write.
        appliedAny = true;
        continue;
      }
      const storedTime = Date.parse(stored.last_action_at);
      if (fbTime <= storedTime) {
        verdict[unit] = deny(
          `RECURRING_${unit.toUpperCase()}_STALE_OWNER_ACTION`,
          `Facebook ${unit} action (${String(args.fbActionAt)}) is not newer than the stored ${stored.source} action (${stored.last_action_at}) for ${day}`,
        );
        continue;
      }
      appliedAny = true;
    }
  }
  return { verdicts, appliedAny, firstDeny };
}

export interface DayUnitStamps {
  readonly [day: string]: readonly RecurringArbitrationUnit[];
}

/**
 * Attach facebook arbitration stamps for the days/units the successful write
 * touched, preserving the canonical action time (not processing time).
 */
export function stampFacebookDayActions(
  hours: WeeklyHoursLike,
  stamps: DayUnitStamps,
  actionAt: string,
): WeeklyHoursLike {
  const stamped: WeeklyHoursLike = { ...hours };
  for (const [day, units] of Object.entries(stamps)) {
    const entry = stamped[day];
    if (!entry || typeof entry !== 'object' || units.length === 0) continue;
    const meta: { schedule?: UnitActionMeta; location?: UnitActionMeta } = { ...readDayMeta(entry) };
    for (const unit of units) {
      meta[unit] = { source: 'facebook', last_action_at: actionAt };
    }
    stamped[day] = { ...entry, _meta: meta };
  }
  return stamped;
}
