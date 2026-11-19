import type { FoodTruck } from '@/lib/supabase';

/**
 * Field-level write guard for `POST /api/trucks`.
 *
 * The route is reachable by any authenticated truck owner or admin and its
 * body is validated by `CreateFoodTruckSchema`, which carries
 * `verification_status`. Before this guard existed the validated body flowed
 * straight into an INSERT through the service-role client, so an owner could
 * create a truck already marked `verified` and self-award the trust badge —
 * the same forgery the PUT whitelist closes, on the create verb.
 *
 * Only the keys listed here may be supplied by the client. Everything else —
 * including every server-managed column and any unknown key — is dropped, and
 * `verification_status` is then forced to the initial state server-side. Kept
 * pure and dependency-free so it can be unit-tested without mocks.
 *
 * The allowlist mirrors the client-facing create contract (`CreateFoodTruckSchema`)
 * minus the server-managed status field.
 */
export const CREATABLE_TRUCK_FIELDS = [
  'name',
  'description',
  'current_location',
  'scheduled_locations',
  'operating_hours',
  'menu',
  'contact_info',
  'social_media',
  'data_quality_score',
  'cuisine_type',
  'price_range',
  'specialties',
] as const;

export type CreatableTruckField = (typeof CREATABLE_TRUCK_FIELDS)[number];

const CREATABLE_TRUCK_FIELD_SET: ReadonlySet<string> = new Set(CREATABLE_TRUCK_FIELDS);

/**
 * The state every newly created truck must start in. Matches the database
 * default (`alter column "verification_status" set default 'pending'`) and the
 * admin verification workflow, where an admin promotes a truck from `pending`
 * to `verified` through the admin data-quality path.
 */
export const INITIAL_TRUCK_VERIFICATION_STATUS = 'pending' as const;

/**
 * Pick only client-creatable keys out of an arbitrary request body.
 *
 * Values are passed through unchanged (including `undefined`) so callers keep
 * their existing create semantics: an omitted optional key stays omitted and a
 * key the client explicitly set to `null` stays `null`.
 */
export function pickCreatableTruckFields<T extends object>(
  body: T,
): Partial<FoodTruck> & Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (CREATABLE_TRUCK_FIELD_SET.has(key)) {
      result[key] = (body as Record<string, unknown>)[key];
    }
  }
  return result as Partial<FoodTruck> & Record<string, unknown>;
}

/**
 * Build the payload for a new truck: keep only client-creatable fields and
 * force every server-managed trust/status default, regardless of what the
 * client asked for.
 */
export function forceServerManagedCreateDefaults<T extends object>(
  body: T,
): Partial<FoodTruck> & Record<string, unknown> {
  return {
    ...pickCreatableTruckFields(body),
    verification_status: INITIAL_TRUCK_VERIFICATION_STATUS,
  };
}
