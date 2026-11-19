import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { BLOCKED_STATUSES_SQL } from '@/lib/api/trucks/eligibility';
import { PUBLIC_TRUCK_CLIENT_COLUMNS } from '@/lib/supabase/services/foodTruckService.client.helpers';
import { enrichWithSubscriptionTiers } from '@/lib/supabase/services/foodTruckService.helpers';
import { toPublicFoodTruck } from '@/lib/mappers/publicView';
import { toPublicTruckList } from '@/lib/mappers/publicListView';
import type { FoodTruck, PublicFoodTruck } from '@/lib/types';

const DIGITS_ONLY = /^\d+$/;

export const PUBLIC_TRUCK_LIST_DEFAULT_LIMIT = 500;
export const PUBLIC_TRUCK_LIST_MAX_LIMIT = 5000;

export interface PublicTruckListParams {
  readonly limit: number;
  readonly offset: number;
}

function parseNonNegativeInteger(value: string | null): number | null {
  if (value === null || !DIGITS_ONLY.test(value)) return null;
  return Number.parseInt(value, 10);
}

export function parsePublicTruckListParams(searchParams: URLSearchParams): PublicTruckListParams {
  const limit = parseNonNegativeInteger(searchParams.get('limit'));
  const offset = parseNonNegativeInteger(searchParams.get('offset'));
  return {
    limit: Math.min(
      Math.max(limit ?? PUBLIC_TRUCK_LIST_DEFAULT_LIMIT, 1),
      PUBLIC_TRUCK_LIST_MAX_LIMIT,
    ),
    offset: offset ?? 0,
  };
}

export async function getPublicTruckListPage({
  limit,
  offset,
}: PublicTruckListParams): Promise<PublicFoodTruck[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('food_trucks')
    .select(PUBLIC_TRUCK_CLIENT_COLUMNS)
    .gte('data_quality_score', 0)
    .not('verification_status', 'in', BLOCKED_STATUSES_SQL)
    .range(offset, offset + limit - 1)
    .order('data_quality_score', { ascending: false });

  if (error) throw error;

  const trucks = (data ?? []) as unknown as FoodTruck[];
  const withTiers = await enrichWithSubscriptionTiers(trucks, supabase);
  return toPublicTruckList(withTiers.map((truck) => toPublicFoodTruck(truck)));
}
