import type { FoodTruck } from '@/lib/supabase';

/**
 * Field-level write guard for `PUT /api/trucks/[id]`.
 *
 * The route is reachable by any authenticated truck owner or admin. Before this
 * guard existed the handler spread the raw request body into an UPDATE, so a
 * client could write server-managed columns (verification_status,
 * average_rating, review_count, claim/subscription metadata, audit stamps) and
 * forge trust state on its own truck.
 *
 * Only the keys listed here may be written through the route. Everything else —
 * including every server-managed column and any unknown key — is dropped before
 * the row is updated, so a malicious or stale client cannot widen its own
 * privileges. Kept pure and dependency-free so it can be unit-tested without
 * mocks.
 */
export const WRITABLE_TRUCK_FIELDS = [
  'name',
  'slug',
  'description',
  'cuisine_type',
  'specialties',
  'price_range',
  'contact_info',
  'social_media',
  'current_location',
  'exact_location',
  'city_location',
  'default_location',
  'default_lat',
  'default_lng',
  'street_address',
  'city',
  'state',
  'zip',
  'timezone',
  'operating_hours',
  'menu',
  'data_quality_score',
] as const;

export type WritableTruckField = (typeof WRITABLE_TRUCK_FIELDS)[number];

const WRITABLE_TRUCK_FIELD_SET: ReadonlySet<string> = new Set(WRITABLE_TRUCK_FIELDS);

/**
 * Pick only client-writable keys out of an arbitrary request body.
 *
 * Values are passed through unchanged (including `undefined`) so callers keep
 * their existing update semantics: an omitted key stays omitted, and a key the
 * client explicitly set to `null` stays `null`.
 */
export function pickWritableTruckFields<T extends object>(
  body: T,
): Partial<FoodTruck> & Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (WRITABLE_TRUCK_FIELD_SET.has(key)) {
      result[key] = (body as Record<string, unknown>)[key];
    }
  }
  return result as Partial<FoodTruck> & Record<string, unknown>;
}
