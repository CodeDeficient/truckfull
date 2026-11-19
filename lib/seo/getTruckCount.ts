import { unstable_cache } from 'next/cache';
import { logError } from '@/lib/logging';
import { getPublicTruckCount } from '@/lib/services/publicTruckData.server';
import { floorToNearestTen } from './truckCount.logic';

export const TRUCK_COUNT_CACHE_TAG = 'truck-count';
export const TRUCK_COUNT_METADATA_CACHE_TAG = 'truck-count-metadata';
export const TRUCK_COUNT_CACHE_KEY = 'truck-count-public-v2';
export const TRUCK_COUNT_METADATA_CACHE_KEY = 'truck-count-metadata-safe-v2';
export const TRUCK_COUNT_REVALIDATE_SECONDS = 24 * 60 * 60;
export const TRUCK_COUNT_METADATA_FALLBACK_SECONDS = 24 * 60 * 60;

export type TruckCountResult = {
  readonly rounded: number;
  readonly exact: number;
};

export type TruckCountQuery = () => PromiseLike<{
  readonly count: number | null;
  readonly error: { readonly message: string } | null;
}>;

export async function resolveTruckCount(query: TruckCountQuery): Promise<TruckCountResult> {
  const { count, error } = await query();
  if (error) {
    logError('getTruckCount: Supabase query failed', error);
    throw error;
  }

  const exact = count ?? 0;
  return { rounded: floorToNearestTen(exact), exact };
}

export async function truckCountWithFallback(
  fetchCount: () => Promise<TruckCountResult>,
): Promise<TruckCountResult | null> {
  try {
    return await fetchCount();
  } catch {
    return null;
  }
}

async function queryPublicTruckCount(): Promise<{
  readonly count: number | null;
  readonly error: { readonly message: string } | null;
}> {
  try {
    return { count: await getPublicTruckCount({ requireLocation: true }), error: null };
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
    return { count: null, error: { message } };
  }
}

async function fetchTruckCount(): Promise<TruckCountResult> {
  return resolveTruckCount(queryPublicTruckCount);
}

export const getCachedTruckCount = unstable_cache(
  fetchTruckCount,
  [TRUCK_COUNT_CACHE_KEY],
  {
    revalidate: TRUCK_COUNT_REVALIDATE_SECONDS,
    tags: [TRUCK_COUNT_CACHE_TAG],
  },
);

export async function getTruckCount(): Promise<TruckCountResult | null> {
  return truckCountWithFallback(getCachedTruckCount);
}

export const getMetadataSafeTruckCount = unstable_cache(
  fetchTruckCount,
  [TRUCK_COUNT_METADATA_CACHE_KEY],
  {
    revalidate: TRUCK_COUNT_METADATA_FALLBACK_SECONDS,
    tags: [TRUCK_COUNT_METADATA_CACHE_TAG],
  },
);
