import type { Database } from '@/lib/database.remote.types';
import { fromFoodTruckRow } from '@/lib/mappers/domain';
import { toPublicFoodTruck } from '@/lib/mappers/publicView';
import { toPublicTruckList } from '@/lib/mappers/publicListView';
import { BLOCKED_STATUSES_SQL } from '@/lib/api/trucks/eligibility';
import { isFeaturedPublicTruck } from '@/lib/api/client/trucks';
import {
  buildFeaturedTrucks,
  buildTrendingItems,
  type RankedFeaturedTruck,
  type TrendingTruck,
} from '@/lib/services/featuredService.logic';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { chunkTruckIds } from '@/lib/services/currentDaySchedule';
import { enrichWithSubscriptionTiers } from '@/lib/supabase/services/foodTruckService.helpers';
import { convertToFoodTruck } from '@/lib/utils/truckUtils';
import type { FoodTruck, PublicFoodTruck } from '@/lib/types';

const FEATURED_CONTENT_LIMIT = 5;
const RECENT_CLAIM_WINDOW_DAYS = 30;
const MILLISECONDS_PER_DAY = 86_400_000;
const NEARBY_ID_BATCH_SIZE = 100;
const FEATURED_TRUCK_COLUMNS = [
  'id',
  'name',
  'slug',
  'description',
  'created_at',
  'updated_at',
  'current_location',
  'operating_hours',
  'cuisine_type',
  'data_quality_score',
  'verification_status',
  'last_synced_at',
  'average_rating',
  'review_count',
  'contact_info',
  'social_media',
  'is_claimed',
  'claimed_at',
  'owner_id',
  'view_count',
  'is_active',
  'menu',
].join(',');

type FeaturedContentLists = {
  featuredTrucks: Array<RankedFeaturedTruck<PublicFoodTruck>>;
  trendingItems: Array<TrendingTruck<PublicFoodTruck>>;
};

type FeaturedTruckRow = Pick<
  Database['public']['Tables']['food_trucks']['Row'],
  | 'id'
  | 'name'
  | 'slug'
  | 'description'
  | 'created_at'
  | 'updated_at'
  | 'current_location'
  | 'operating_hours'
  | 'cuisine_type'
  | 'data_quality_score'
  | 'verification_status'
  | 'last_synced_at'
  | 'average_rating'
  | 'review_count'
  | 'contact_info'
  | 'social_media'
  | 'is_claimed'
  | 'claimed_at'
  | 'owner_id'
  | 'view_count'
  | 'is_active'
  | 'menu'
>;

function mapRowsToFoodTrucks(rows: FeaturedTruckRow[]): FoodTruck[] {
  return rows
    .map((row) => {
      const domain = fromFoodTruckRow(
        row as unknown as Database['public']['Tables']['food_trucks']['Row'],
      );
      const truck = convertToFoodTruck(domain, false);
      if (typeof row.slug === 'string' && row.slug.length > 0) {
        truck.slug = row.slug;
      }
      return truck;
    })
    .filter((truck) => isFeaturedPublicTruck(toPublicFoodTruck(truck)));
}

async function enrichWithTiers(trucks: FoodTruck[]): Promise<PublicFoodTruck[]> {
  const enriched = await enrichWithSubscriptionTiers(trucks, getSupabaseAdmin());
  return toPublicTruckList(enriched.map((t) => toPublicFoodTruck(t)));
}

function appendUniqueTrucks(
  current: FoodTruck[],
  incoming: readonly FoodTruck[],
  limit: number,
): FoodTruck[] {
  const next = [...current];
  const seen = new Set(next.map(({ id }) => id));

  for (const truck of incoming) {
    if (seen.has(truck.id)) continue;
    next.push(truck);
    seen.add(truck.id);
    if (next.length >= limit) break;
  }

  return next;
}

function recentClaimCutoffIso(nowMilliseconds: number): string {
  return new Date(nowMilliseconds - RECENT_CLAIM_WINDOW_DAYS * MILLISECONDS_PER_DAY).toISOString();
}

async function fetchFeaturedTruckRows(
  buildQuery: (columns: string) => PromiseLike<{
    data: unknown;
    error: unknown;
  }>,
): Promise<FoodTruck[]> {
  const { data, error } = await buildQuery(FEATURED_TRUCK_COLUMNS);
  if (error) {
    throw error;
  }
  return mapRowsToFoodTrucks((data ?? []) as unknown as FeaturedTruckRow[]);
}

async function fetchRecentClaimedFeaturedTrucks(
  limit: number,
  cutoffIso: string,
): Promise<FoodTruck[]> {
  return fetchFeaturedTruckRows((columns) =>
    getSupabaseAdmin()
      .from('food_trucks')
      .select(columns)
      .gte('data_quality_score', 0)
      .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
      .not('name', 'ilike', '%test%')

      .eq('is_claimed', true)
      .gte('claimed_at', cutoffIso)
      .order('claimed_at', { ascending: false })
      .limit(limit),
  );
}

async function fetchClaimedWithoutDateFeaturedTrucks(limit: number): Promise<FoodTruck[]> {
  return fetchFeaturedTruckRows((columns) =>
    getSupabaseAdmin()
      .from('food_trucks')
      .select(columns)
      .gte('data_quality_score', 0)
      .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
      .not('name', 'ilike', '%test%')

      .eq('is_claimed', true)
      .is('claimed_at', null)
      .order('updated_at', { ascending: false })
      .limit(limit),
  );
}

async function fetchOlderClaimedFeaturedTrucks(
  limit: number,
  cutoffIso: string,
): Promise<FoodTruck[]> {
  return fetchFeaturedTruckRows((columns) =>
    getSupabaseAdmin()
      .from('food_trucks')
      .select(columns)
      .gte('data_quality_score', 0)
      .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
      .not('name', 'ilike', '%test%')

      .eq('is_claimed', true)
      .lt('claimed_at', cutoffIso)
      .order('claimed_at', { ascending: false })
      .limit(limit),
  );
}

async function fetchUnclaimedFeaturedTrucks(limit: number): Promise<FoodTruck[]> {
  return fetchFeaturedTruckRows((columns) =>
    getSupabaseAdmin()
      .from('food_trucks')
      .select(columns)
      .gte('data_quality_score', 0)
      .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
      .not('name', 'ilike', '%test%')

      .or('is_claimed.is.false,is_claimed.is.null')
      .order('updated_at', { ascending: false })
      .limit(limit),
  );
}

async function fetchTrendingFeaturedTrucks(limit: number): Promise<FoodTruck[]> {
  return fetchFeaturedTruckRows((columns) =>
    getSupabaseAdmin()
      .from('food_trucks')
      .select(columns)
      .gte('data_quality_score', 0)
      .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
      .not('name', 'ilike', '%test%')

      .order('view_count', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(limit),
  );
}

function compareRowIds(a: FeaturedTruckRow, b: FeaturedTruckRow): number {
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

async function fetchFeaturedRowsByIds(ids: readonly string[]): Promise<FeaturedTruckRow[]> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select(FEATURED_TRUCK_COLUMNS)
    .in('id', ids)
    .gte('data_quality_score', 0)
    .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
    .not('name', 'ilike', '%test%');

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as FeaturedTruckRow[];
}

async function fetchNearbyTrucks(
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<FoodTruck[]> {
  const { data: nearbyIds, error: rpcError } = await getSupabaseAdmin().rpc(
    'find_trucks_within_radius',
    {
      user_lat: lat,
      user_lng: lng,
      radius_meters: radiusMiles * 1609.34,
    },
  );

  if (rpcError) {
    throw rpcError;
  }

  const ids: string[] = (nearbyIds ?? []).map((row: { id: string }) => row.id);
  if (ids.length === 0) return [];

  const batches = await Promise.all(
    chunkTruckIds(ids, NEARBY_ID_BATCH_SIZE).map((batch) => fetchFeaturedRowsByIds(batch)),
  );
  const rows = batches.flat().sort(compareRowIds);
  return mapRowsToFoodTrucks(rows);
}

async function getGlobalFeaturedTrucks(limit: number): Promise<FoodTruck[]> {
  if (limit <= 0) return [];

  const cutoffIso = recentClaimCutoffIso(Date.now());
  let trucks = await fetchRecentClaimedFeaturedTrucks(limit, cutoffIso);
  if (trucks.length >= limit) return trucks.slice(0, limit);

  trucks = appendUniqueTrucks(
    trucks,
    await fetchClaimedWithoutDateFeaturedTrucks(limit - trucks.length),
    limit,
  );
  if (trucks.length >= limit) return trucks.slice(0, limit);

  trucks = appendUniqueTrucks(
    trucks,
    await fetchOlderClaimedFeaturedTrucks(limit - trucks.length, cutoffIso),
    limit,
  );
  if (trucks.length >= limit) return trucks.slice(0, limit);

  return appendUniqueTrucks(
    trucks,
    await fetchUnclaimedFeaturedTrucks(limit - trucks.length),
    limit,
  ).slice(0, limit);
}

export async function getFeaturedContentLists(
  location?: { lat: number; lng: number },
  radiusMiles: number = 30,
  limit: number = FEATURED_CONTENT_LIMIT,
): Promise<FeaturedContentLists> {
  if (location) {
    const nearbyTrucks = await fetchNearbyTrucks(location.lat, location.lng, radiusMiles);
    const enriched = await enrichWithTiers(nearbyTrucks);
    const nowMilliseconds = Date.now();
    return {
      featuredTrucks: buildFeaturedTrucks(enriched, limit, nowMilliseconds),
      trendingItems: buildTrendingItems(enriched, limit),
    };
  }

  const [featuredCandidates, trendingCandidates] = await Promise.all([
    getGlobalFeaturedTrucks(limit),
    fetchTrendingFeaturedTrucks(limit),
  ]);

  const [enrichedFeatured, enrichedTrending] = await Promise.all([
    enrichWithTiers(featuredCandidates),
    enrichWithTiers(trendingCandidates),
  ]);

  const nowMilliseconds = Date.now();
  return {
    featuredTrucks: buildFeaturedTrucks(enrichedFeatured, limit, nowMilliseconds),
    trendingItems: buildTrendingItems(enrichedTrending, limit),
  };
}
