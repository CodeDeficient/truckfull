import type { FoodTruckDomainWithEvents } from '@/lib/types';
import type { FoodTruck } from '@/lib/types';
import {
  handleSupabaseError,
  normalizeTruckLocation,
  groupMenuItems,
} from '@/lib/supabase/utils/index';
import { fromFoodTruckRow } from '@/lib/mappers/domain';
import {
  fetchEventsForTrucks as sharedFetchEventsForTrucks,
  fetchMenuItemsForTrucks as sharedFetchMenuItemsForTrucks,
  buildTrucksWithMenuForFoodTruck as sharedBuildTrucksWithMenuForFoodTruck,
} from './foodTruckService.shared';
import type { Database } from '@/lib/database.remote.types';
import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { BLOCKED_STATUSES_SQL } from '@/lib/api/trucks/eligibility';

type TruckReadClient = ReturnType<typeof getSupabase> | ReturnType<typeof getSupabaseAdmin>;

/**
 * Helper function to fetch raw trucks data with pagination
 */
export async function _getRawTrucks(
  limit: number,
  offset: number,
  supabase: TruckReadClient = getSupabase(),
) {
  const { data, error, count } = await supabase
    .from('food_trucks')
    .select('*', { count: 'exact' })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, error, count };
}

/**
 * Helper function to fetch public-eligible trucks with pagination.
 * Excludes blocked statuses (shadowbanned, rejected) and negative quality scores.
 */
export async function _getPublicTrucks(limit: number, offset: number) {
  const { data, error, count } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('*', { count: 'exact' })
    .gte('data_quality_score', 0)
    .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, error, count };
}

/**
 * Helper to enrich truck data with owner's subscription tier from profiles table
 * This is needed because food_trucks table doesn't have subscription_tier
 * It must be fetched from profiles table via LEFT JOIN
 */
export async function enrichWithSubscriptionTiers(
  trucks: FoodTruck[],
  supabase: ReturnType<typeof getSupabase>,
): Promise<FoodTruck[]> {
  if (!trucks || !Array.isArray(trucks) || trucks.length === 0) return trucks;

  try {
    const ownerIdsSet = new Set<string>();
    for (const t of trucks) {
      if (t.owner_id) {
        ownerIdsSet.add(t.owner_id);
      }
    }
    const ownerIds = [...ownerIdsSet];

    if (ownerIds.length === 0) return trucks;

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, subscription_tier')
      .in('id', ownerIds);

    if (error || !profiles) {
      logError('Error fetching profiles for enrichment:', error);
      return trucks;
    }

    const tierMap = new Map<string, string | null>(
      (profiles as Array<{ id: string; subscription_tier: string | null }>).map((p) => [
        p.id,
        p.subscription_tier,
      ]),
    );

    return trucks.map((truck) => ({
      ...truck,
      subscription_tier: truck.owner_id ? (tierMap.get(truck.owner_id) ?? undefined) : undefined,
    }));
  } catch (error) {
    logError('Error in enrichWithSubscriptionTiers:', error);
    return trucks;
  }
}

/**
 * Helper function to fetch trucks with menu items
 */
export async function fetchTrucksWithMenu(limit: number, offset: number) {
  const supabase = getSupabaseAdmin();
  const { data, error, count } = await _getRawTrucks(limit, offset, supabase);
  if (error) throw error;
  const trucks: FoodTruck[] = ((data ?? []) as unknown as FoodTruck[]).map((t) =>
    normalizeTruckLocation(t),
  );

  const [enrichedTrucks, menuItems] = await Promise.all([
    enrichWithSubscriptionTiers(trucks, supabase),
    sharedFetchMenuItemsForTrucks(supabase, trucks.map((t) => t.id)),
  ]);
  const trucksWithMenu = sharedBuildTrucksWithMenuForFoodTruck(enrichedTrucks, menuItems);
  return { trucks: trucksWithMenu, total: count ?? 0 };
}

/**
 * Helper function to fetch domain trucks with menu
 */
export async function fetchDomainTrucksWithMenu(limit: number, offset: number) {
  const { data, error, count } = await _getRawTrucks(limit, offset);
  if (error) throw error;
  const domain = (data ?? []).map((row) =>
    fromFoodTruckRow(row as Database['public']['Tables']['food_trucks']['Row']),
  );
  const truckIds = domain.map((truck) => truck.id);

  // Fetch events for all trucks
  const eventsByTruck = await sharedFetchEventsForTrucks(getSupabase(), truckIds);

  // Combine trucks with their events
  const trucksWithEvents = domain.map((truck) => ({
    ...truck,
    events: eventsByTruck[truck.id] || [],
  })) as FoodTruckDomainWithEvents[];

  return { trucks: trucksWithEvents, total: count ?? 0 };
}

/**
 * Helper function to standardize error handling for truck list operations
 */
export function handleTruckListServiceError(error: unknown, operation: string) {
  handleSupabaseError(error as Error, operation);
  return { trucks: [], total: 0, error: "That didn't work, please try again later." };
}

/**
 * Helper function to standardize error handling for truck domain list operations
 */
export function handleTruckDomainListServiceError(error: unknown, operation: string) {
  handleSupabaseError(error as Error, operation);
  return { trucks: [], total: 0, error: "That didn't work, please try again later." };
}

/**
 * Helper function to standardize error handling for single truck operations
 */
export function handleSingleTruckServiceError(error: unknown, operation: string) {
  handleSupabaseError(error as Error, operation);
  return { error: "That didn't work, please try again later." };
}

/**
 * Helper function to fetch truck by ID with menu
 */
export async function fetchTruckByIdWithMenu(
  id: string,
  getSupabaseFunc: () => ReturnType<typeof getSupabaseAdmin>,
) {
  try {
    const { data, error } = await getSupabaseFunc()
      .from('food_trucks')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    const truckData = (data ?? undefined) as unknown as FoodTruck | undefined;
    if (truckData == undefined) {
      return { error: "That didn't work, please try again later." };
    }
    const truck: FoodTruck = normalizeTruckLocation(truckData);

    const [[enrichedTruck], menuItems] = await Promise.all([
      enrichWithSubscriptionTiers([truck], getSupabaseFunc()),
      sharedFetchMenuItemsForTrucks(getSupabaseFunc(), [id]),
    ]);
    enrichedTruck.menu = groupMenuItems(menuItems);
    return enrichedTruck;
  } catch (error) {
    handleSupabaseError(error as Error, 'getTruckById');
    return { error: "That didn't work, please try again later." };
  }
}

export type ServiceResult<T> = { data: T } | { error: string };

/**
 * Pure function to calculate nearby trucks using Haversine formula
 * No external dependencies - just math and filtering
 */
export function calculateNearbyTrucks(
  lat: number,
  lng: number,
  radiusMiles: number,
  trucks: FoodTruck[],
  calculateDistanceFunc: (lat1: number, lon1: number, lat2: number, lon2: number) => number,
): (FoodTruck & { distance_meters?: number; distance_miles?: number })[] {
  const nearbyTrucks: Array<FoodTruck & { distance_meters: number; distance_miles: number }> = [];
  for (const truck of trucks) {
    const loc = truck.current_location;
    if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
      continue;
    }
    const distanceMiles = calculateDistanceFunc(lat, lng, loc.lat, loc.lng);
    if (distanceMiles <= radiusMiles) {
      nearbyTrucks.push({
        ...truck,
        distance_meters: distanceMiles * 1609.34,
        distance_miles: distanceMiles,
      });
    }
  }
  nearbyTrucks.sort((a, b) => a.distance_miles - b.distance_miles);
  return nearbyTrucks;
}

/**
 * Pure function to enrich trucks with subscription tiers
 * Extracts owner_ids and creates a tier map
 */
export function extractOwnerIds(trucks: FoodTruck[]): string[] {
  const ownerIdsSet = new Set<string>();
  for (const t of trucks) {
    if (t.owner_id) {
      ownerIdsSet.add(t.owner_id);
    }
  }
  return [...ownerIdsSet];
}

/**
 * Pure function to build tier map from profiles
 */
export function buildTierMap(
  profiles: Array<{ id: string; subscription_tier: string | null }>,
): Map<string, string | null> {
  return new Map<string, string | null>(profiles.map((p) => [p.id, p.subscription_tier]));
}

/**
 * Pure function to apply subscription tiers to trucks
 */
export function applySubscriptionTiers(
  trucks: FoodTruck[],
  tierMap: Map<string, string | null>,
): FoodTruck[] {
  return trucks.map((truck) => ({
    ...truck,
    subscription_tier: truck.owner_id ? (tierMap.get(truck.owner_id) ?? undefined) : undefined,
  }));
}

/**
 * Generic helper function to fetch truck by ID with events
 */
export async function fetchTruckByIdWithEventsBase(
  supabaseClient: ReturnType<typeof import('../client').getSupabase>,
  id: string,
  tableName: string,
  truckMapper: (data: unknown) => object,
): Promise<ServiceResult<unknown>> {
  try {
    const { data, error } = await supabaseClient
      .from(tableName as 'food_trucks')
      .select('*')
      .eq('id', id)
      .gte('data_quality_score', 0)
      .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return { error: 'Food truck not found' };
    }

    // Map the data from the table to appropriate object
    const truck = truckMapper(data);

    // Fetch events for this specific truck
    const eventsByTruck = await sharedFetchEventsForTrucks(supabaseClient, [id]);

    const truckWithEvents = {
      ...truck,
      events: eventsByTruck[id] || [],
    };

    return { data: truckWithEvents };
  } catch (error) {
    // Return error object in the same format as the original code
    return { error: error instanceof Error ? error.message : ('Unknown error' as string) };
  }
}
