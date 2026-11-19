import type { PublicFoodTruck } from '@/lib/types';

export type FeaturedTruckCandidate = Pick<PublicFoodTruck, 'id' | 'name'> &
  Partial<
    Pick<
      PublicFoodTruck,
      'average_rating' | 'claimed_at' | 'is_claimed' | 'social_media' | 'updated_at' | 'view_count'
    >
  >;

export type RankedFeaturedTruck<T extends FeaturedTruckCandidate = FeaturedTruckCandidate> = T & {
  score: number;
  rating?: number;
  image_url?: string;
};

export interface TrendingTruck<T extends FeaturedTruckCandidate = FeaturedTruckCandidate> {
  id: string;
  name: string;
  rank: number;
  image?: string;
  truck: T;
}

const CLAIM_RECENCY_MAX_DAYS = 30;
const CLAIM_RECENCY_WEIGHT = 100;
const CLAIMED_NO_DATE_SCORE = 10;
const MILLISECONDS_PER_DAY = 86_400_000;

export function scoreFeaturedTruckAt(
  truck: FeaturedTruckCandidate,
  nowMilliseconds: number,
): number {
  if (!truck.is_claimed) return 0;
  if (!truck.claimed_at) return CLAIMED_NO_DATE_SCORE;

  const claimedMilliseconds = Date.parse(truck.claimed_at);
  if (!Number.isFinite(claimedMilliseconds)) return 1;

  const daysAgo = Math.max(0, (nowMilliseconds - claimedMilliseconds) / MILLISECONDS_PER_DAY);
  if (daysAgo > CLAIM_RECENCY_MAX_DAYS) return 1;

  return Math.round(CLAIM_RECENCY_WEIGHT * (1 - daysAgo / CLAIM_RECENCY_MAX_DAYS));
}

export function sortFeaturedByRecency<T extends FeaturedTruckCandidate>(
  trucks: readonly T[],
  nowMilliseconds: number,
): T[] {
  return [...trucks].sort((first, second) => {
    const scoreDifference =
      scoreFeaturedTruckAt(second, nowMilliseconds) - scoreFeaturedTruckAt(first, nowMilliseconds);
    if (scoreDifference !== 0) return scoreDifference;

    const firstDate = first.claimed_at ?? first.updated_at ?? '';
    const secondDate = second.claimed_at ?? second.updated_at ?? '';
    return secondDate.localeCompare(firstDate);
  });
}

export function buildFeaturedTrucks<T extends FeaturedTruckCandidate>(
  trucks: readonly T[],
  limit: number,
  nowMilliseconds: number,
): Array<RankedFeaturedTruck<T>> {
  return sortFeaturedByRecency(trucks, nowMilliseconds)
    .slice(0, limit)
    .map((truck) => ({
      ...truck,
      rating: truck.average_rating ?? undefined,
      image_url: truck.social_media?.photo_url ?? undefined,
      score: scoreFeaturedTruckAt(truck, nowMilliseconds),
    }));
}

export function buildTrendingItems<T extends FeaturedTruckCandidate>(
  trucks: readonly T[],
  limit: number,
): Array<TrendingTruck<T>> {
  return [...trucks]
    .sort((first, second) => (second.view_count ?? 0) - (first.view_count ?? 0))
    .slice(0, limit)
    .map((truck, index) => ({
      id: truck.id,
      name: truck.name ?? 'Unknown Truck',
      rank: index + 1,
      image: truck.social_media?.photo_url ?? undefined,
      truck,
    }));
}
