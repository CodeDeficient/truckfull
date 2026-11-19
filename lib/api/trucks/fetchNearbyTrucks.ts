import 'server-only';
import { type SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logging';
import { toPublicTruckList } from '@/lib/mappers/publicListView';
import { BLOCKED_VERIFICATION_STATUSES } from '@/lib/api/trucks/eligibility';
import { chunkTruckIds } from '@/lib/services/currentDaySchedule';
import { selectTrucksNeedingTimezoneBackfill } from '@/lib/api/trucks/timezoneEnrichment';
import { fetchAllRpcRows } from '@/lib/api/trucks/rpcPagination';
import { hasValidCoordinates } from '@/lib/services/activeLocation';
import type { FoodTruckCurrentLocation } from '@/lib/types';

const NEARBY_ENRICHMENT_BATCH_LIMIT = 100;

interface ProfileWithTier {
  id: string;
  subscription_tier: string | null;
}

export interface TruckFromRPC {
  id: string;
  name: string;
  owner_id?: string | null;
  data_quality_score?: number | null;
  verification_status?: string | null;
  subscription_tier?: string;
  [key: string]: unknown;
}

async function enrichWithSubscriptionTiers(
  trucks: TruckFromRPC[],
  supabase: SupabaseClient,
): Promise<TruckFromRPC[]> {
  if (!trucks || !Array.isArray(trucks) || trucks.length === 0) return trucks;

  try {
    const ownerIdSet = new Set<string>();
    for (const truck of trucks) {
      if (truck.owner_id) ownerIdSet.add(truck.owner_id);
    }
    const ownerIds = [...ownerIdSet];

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
      (profiles as ProfileWithTier[]).map((p) => [p.id, p.subscription_tier]),
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

async function enrichWithTimezones(
  trucks: TruckFromRPC[],
  supabase: SupabaseClient,
): Promise<TruckFromRPC[]> {
  if (!trucks || !Array.isArray(trucks) || trucks.length === 0) return trucks;

  const missing = selectTrucksNeedingTimezoneBackfill(trucks);
  if (missing.length === 0) return trucks;

  const timezoneMap = new Map<string, string | null>();
  try {
    for (const chunk of chunkTruckIds(
      missing.map((truck) => truck.id),
      NEARBY_ENRICHMENT_BATCH_LIMIT,
    )) {
      const { data, error } = await supabase
        .from('food_trucks')
        .select('id, timezone')
        .in('id', chunk);
      if (error) {
        logError('Error fetching timezones for enrichment:', error);
        continue;
      }
      for (const row of (data ?? []) as { id: string; timezone: string | null }[]) {
        timezoneMap.set(row.id, row.timezone);
      }
    }
  } catch (error) {
    logError('Error in enrichWithTimezones:', error);
    return trucks;
  }

  if (timezoneMap.size === 0) return trucks;
  return trucks.map((truck) =>
    'timezone' in truck ? truck : { ...truck, timezone: timezoneMap.get(truck.id) ?? null },
  );
}

export interface FetchNearbyTrucksInput {
  readonly lat: number;
  readonly lng: number;
  readonly radiusMiles: number;
  readonly client: SupabaseClient;
  readonly enrichTiers: boolean;
}

async function enrichMissingLocations(
  trucks: TruckFromRPC[],
  client: SupabaseClient,
): Promise<TruckFromRPC[]> {
  const missing = trucks.filter(
    (truck) => !hasValidCoordinates(truck.current_location as FoodTruckCurrentLocation | null),
  );
  if (missing.length === 0) return trucks;
  const locations = new Map<string, Record<string, unknown>>();
  for (const ids of chunkTruckIds(
    missing.map((truck) => truck.id),
    NEARBY_ENRICHMENT_BATCH_LIMIT,
  )) {
    const { data, error } = await client
      .from('food_trucks')
      .select('id, default_lat, default_lng, live_gps_lat, live_gps_lng, status')
      .in('id', ids);
    if (error) throw error;
    for (const row of data ?? []) locations.set(row.id, row);
  }
  return trucks.map((truck) => ({ ...truck, ...locations.get(truck.id) }));
}

async function enrichLocationsAndTiers(
  trucks: TruckFromRPC[],
  client: SupabaseClient,
  enrichTiers: boolean,
): Promise<TruckFromRPC[]> {
  const [withLocations, withTiers] = await Promise.all([
    enrichMissingLocations(trucks, client),
    enrichTiers ? enrichWithSubscriptionTiers(trucks, client) : null,
  ]);
  if (!withTiers) return withLocations;
  return withLocations.map((truck, index) => ({ ...withTiers[index], ...truck }));
}

export async function fetchNearbyTrucks({
  lat,
  lng,
  radiusMiles,
  client,
  enrichTiers,
}: FetchNearbyTrucksInput): Promise<TruckFromRPC[]> {
  const supabaseAdmin = client;

  const data = await fetchAllRpcRows<TruckFromRPC>(async (from, to, options) => {
    const {
      data: pageRows,
      error,
      count,
    } = await supabaseAdmin
      .rpc(
        'find_trucks_within_radius',
        {
          user_lat: lat,
          user_lng: lng,
          radius_meters: radiusMiles * 1609.34,
        },
        options?.withCount ? { count: 'exact' } : undefined,
      )
      .range(from, to);

    if (error) throw error;
    return { rows: (pageRows ?? []) as TruckFromRPC[], count };
  });

  if (!data) return [];

  const filteredData = (data as TruckFromRPC[]).filter(
    (t) =>
      (t.data_quality_score ?? 0) >= 0 &&
      !BLOCKED_VERIFICATION_STATUSES.has(t.verification_status ?? ''),
  );

  const trucksWithTier = await enrichLocationsAndTiers(filteredData, supabaseAdmin, enrichTiers);
  const trucksWithTimezone = await enrichWithTimezones(trucksWithTier, supabaseAdmin);

  const publicTrucks: Record<string, unknown>[] = trucksWithTimezone.map((truck) =>
    withoutOwnerId(truck),
  );
  return toPublicTruckList(publicTrucks) as unknown as TruckFromRPC[];
}

export function withoutOwnerId(truck: TruckFromRPC): TruckFromRPC {
  const { owner_id: ownerId, ...rest } = truck;
  return { ...rest, is_claimed: rest.is_claimed === true || Boolean(ownerId) };
}
