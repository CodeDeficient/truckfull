import type { FoodTruck, FoodTruckDomain } from '@/lib/types';

export const ENRICH_TIERS_ENDPOINT = '/api/trucks/enrich-tiers';
export const ENRICH_TIERS_BATCH_LIMIT = 500;

export const PUBLIC_TRUCK_CLIENT_COLUMNS = [
  'id',
  'name',
  'slug',
  'description',
  'cuisine_type',
  'current_location',
  'default_lat',
  'default_lng',
  'live_gps_lat',
  'live_gps_lng',
  'status',
  'operating_hours',
  'timezone',
  'menu',
  'price_range',
  'specialties',
  'contact_info',
  'social_media',
  'average_rating',
  'review_count',
  'data_quality_score',
  'verification_status',
  'is_active',
  'is_claimed',
  'claimed_at',
  'owner_id',
  'view_count',
  'last_synced_at',
  'created_at',
  'updated_at',
].join(',');

export type EnrichTiersResponse = { tiers: Record<string, string | null> };

/**
 * Extract unique, defined owner_ids from a list of trucks in stable order.
 * Exported for testing.
 */
export function extractOwnerIdsForEnrichment(
  trucks: ReadonlyArray<FoodTruckDomain | FoodTruck>,
): string[] {
  const ownerIds: string[] = [];
  const seen = new Set<string>();
  for (const truck of trucks) {
    const ownerId = truck.owner_id;
    if (typeof ownerId === 'string' && ownerId.length > 0 && !seen.has(ownerId)) {
      seen.add(ownerId);
      ownerIds.push(ownerId);
    }
  }
  return ownerIds;
}

/**
 * Apply a tier map to trucks. Owners not present in the map get undefined tier
 * (matching the original enrichWithSubscriptionTiers semantics).
 * Exported for testing.
 */
export function applyTiersToTrucks<T extends FoodTruckDomain | FoodTruck>(
  trucks: ReadonlyArray<T>,
  tiers: Record<string, string | null>,
): T[] {
  return trucks.map((truck) => {
    if (!truck.owner_id) return truck;
    const tier = tiers[truck.owner_id];
    return { ...truck, subscription_tier: tier ?? undefined };
  });
}
