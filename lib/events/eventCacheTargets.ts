import { safeBuildEventSlug } from './eventSlug';
import { slugifyCity } from '@/lib/utils/slugify';
import {
  isEventCacheTarget,
  type EventCacheScope,
  type EventCacheTarget,
} from './eventPageInvalidation';

export const VETTING_ELIGIBILITY_THRESHOLD = 30;

export interface EventIdentityRow {
  readonly id: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly title: string | null;
  readonly event_start_date: string | null;
  readonly vetting_score?: number | null;
}

export type EventCacheInvalidator = (targets: readonly EventCacheTarget[]) => Promise<void> | void;

export interface VettingCacheMetadata {
  readonly score: number | null;
  readonly researchConfidence: number;
  readonly vettedAt: string | null;
}

export function buildEventCacheTarget(row: EventIdentityRow): EventCacheTarget | null {
  const { id, city, state, title, event_start_date } = row;
  if (!id || !city || !state || !title || !event_start_date) return null;

  const eventSlug = safeBuildEventSlug(title, event_start_date);
  if (!eventSlug) return null;

  const target: EventCacheTarget = {
    eventId: id,
    city,
    state,
    citySlug: slugifyCity(city, state),
    eventSlug,
  };
  if (!isEventCacheTarget(target)) return null;

  return target;
}

function dedupeTargets(targets: readonly EventCacheTarget[]): EventCacheTarget[] {
  const seen = new Set<string>();
  const deduped: EventCacheTarget[] = [];
  for (const target of targets) {
    const key = `${target.eventId}:${target.citySlug}:${target.eventSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(target);
  }
  return deduped;
}

const CANONICALIZATION_FIELDS = [
  'is_canonical',
  'is_food_truck_relevant',
  'is_hidden',
  'vetting_score',
  'title',
  'city',
  'state',
  'event_start_date',
] as const;

function isEligibleScore(value: unknown): boolean {
  return typeof value === 'number' && value >= VETTING_ELIGIBILITY_THRESHOLD;
}

export function hasCanonicalizationChanged(
  before: Record<string, unknown> | null,
  after: Record<string, unknown>,
): boolean {
  if (!before) {
    return (
      after['is_canonical'] === true &&
      after['is_food_truck_relevant'] === true &&
      after['is_hidden'] === false &&
      isEligibleScore(after['vetting_score'])
    );
  }

  return CANONICALIZATION_FIELDS.some(
    (field) =>
      Object.prototype.hasOwnProperty.call(after, field) &&
      !Object.is(before[field], after[field]),
  );
}

function hasIdentityChanged(before: EventIdentityRow, after: EventIdentityRow): boolean {
  return (
    before.title !== after.title ||
    before.city !== after.city ||
    before.state !== after.state ||
    before.event_start_date !== after.event_start_date
  );
}

export function buildIdentityChangeTargets(
  before: EventIdentityRow,
  after: EventIdentityRow,
): EventCacheTarget[] {
  const targets = dedupeTargets(
    [before, after].flatMap((row) => {
      const target = buildEventCacheTarget(row);
      return target ? [target] : [];
    }),
  );
  return hasIdentityChanged(before, after)
    ? targets.map((target) => ({ ...target, canonicalizationChanged: true }))
    : targets;
}

export function buildDemotionTargets(rows: readonly EventIdentityRow[]): EventCacheTarget[] {
  return dedupeTargets(
    rows.flatMap((row) => {
      const target = buildEventCacheTarget(row);
      return target ? [{ ...target, canonicalizationChanged: true }] : [];
    }),
  );
}

export function buildRelevanceFlipTargets(
  event: EventIdentityRow,
  isRelevant: boolean,
): EventCacheTarget[] {
  if (!isRelevant) return [];
  const target = buildEventCacheTarget(event);
  return target
    ? [
        isEligibleScore(event.vetting_score)
          ? { ...target, canonicalizationChanged: true }
          : target,
      ]
    : [];
}

export function buildVettingEligibilityTargets(
  row: EventIdentityRow,
  beforeScore: number | null,
  afterScore: number | null,
): EventCacheTarget[] {
  const beforeEligible =
    typeof beforeScore === 'number' && beforeScore >= VETTING_ELIGIBILITY_THRESHOLD;
  const afterEligible =
    typeof afterScore === 'number' && afterScore >= VETTING_ELIGIBILITY_THRESHOLD;
  if (beforeEligible === afterEligible) return [];
  const target = buildEventCacheTarget(row);
  return target ? [{ ...target, canonicalizationChanged: true }] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getVettingResearchConfidence(result: unknown): number {
  if (!isRecord(result) || !isRecord(result['factors'])) return 0;
  const value = result['factors']['researchConfidence'];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function buildVettingCacheTargets(
  row: EventIdentityRow,
  before: VettingCacheMetadata,
  after: VettingCacheMetadata,
): EventCacheTarget[] {
  const thresholdTargets = buildVettingEligibilityTargets(row, before.score, after.score);
  if (thresholdTargets.length > 0) return thresholdTargets;

  const beforeEligible =
    typeof before.score === 'number' && before.score >= VETTING_ELIGIBILITY_THRESHOLD;
  const afterEligible =
    typeof after.score === 'number' && after.score >= VETTING_ELIGIBILITY_THRESHOLD;
  if (!beforeEligible || !afterEligible) return [];

  let cacheScope: EventCacheScope | null = null;
  if (before.score !== after.score || before.researchConfidence !== after.researchConfidence) {
    cacheScope = 'city';
  } else if (before.vettedAt !== after.vettedAt) {
    cacheScope = 'detail';
  }

  if (!cacheScope) return [];
  const target = buildEventCacheTarget(row);
  return target ? [{ ...target, cacheScope }] : [];
}
