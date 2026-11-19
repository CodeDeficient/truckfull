import { fetchFeaturedContentData, type FeaturedContentLocation } from '@/lib/api/client/featuredContent';
import { logError } from '@/lib/logging';
import {
  scoreFeaturedTruckAt,
  sortFeaturedByRecency as sortFeaturedCandidates,
  type RankedFeaturedTruck,
  type TrendingTruck,
} from '@/lib/services/featuredService.logic';
import {
  getFeaturedEvents,
  getFeaturedOffers,
  type FeaturedEvent,
  type FeaturedOffer,
} from '@/lib/services/featuredService.static';
import type { PublicFoodTruck } from '@/lib/types';

export type FeaturedTruck = RankedFeaturedTruck<PublicFoodTruck>;
export type FeaturedTrending = TrendingTruck<PublicFoodTruck>;

export interface FeaturedContent {
  featuredTrucks: FeaturedTruck[];
  featuredEvents: FeaturedEvent[];
  featuredOffers: FeaturedOffer[];
  trendingItems: FeaturedTrending[];
}

interface UserLocation {
  lat: number;
  lng: number;
}

type FeaturedContentLists = Awaited<ReturnType<typeof fetchFeaturedContentData>>;

export function scoreFeaturedTruck(truck: PublicFoodTruck): number {
  return scoreFeaturedTruckAt(truck, Date.now());
}

export function sortFeaturedByRecency(trucks: readonly PublicFoodTruck[]): PublicFoodTruck[] {
  return sortFeaturedCandidates(trucks, Date.now());
}

async function loadFeaturedContentLists(
  userLocation: UserLocation | undefined,
  radiusMiles: number,
): Promise<FeaturedContentLists> {
  try {
    return await fetchFeaturedContentData(
      userLocation as FeaturedContentLocation | undefined,
      radiusMiles,
    );
  } catch (error) {
    logError('Error fetching featured content lists:', error);
    throw error;
  }
}

export const FeaturedService = {
  async getFeaturedTrucks(
    limit: number = 5,
    userLocation?: UserLocation,
    radiusMiles: number = 30,
  ): Promise<FeaturedTruck[]> {
    const { featuredTrucks } = await loadFeaturedContentLists(userLocation, radiusMiles);
    return featuredTrucks.slice(0, limit);
  },

  getFeaturedEvents(limit: number = 5): Promise<FeaturedEvent[]> {
    return Promise.resolve(getFeaturedEvents(limit));
  },

  getFeaturedOffers(limit: number = 5): Promise<FeaturedOffer[]> {
    return Promise.resolve(getFeaturedOffers(limit));
  },

  async getTrendingItems(
    limit: number = 5,
    userLocation?: UserLocation,
    radiusMiles: number = 30,
  ): Promise<FeaturedTrending[]> {
    const { trendingItems } = await loadFeaturedContentLists(userLocation, radiusMiles);
    return trendingItems.slice(0, limit);
  },

  async getFeaturedContent(
    userLocation?: UserLocation,
    radiusMiles: number = 30,
  ): Promise<FeaturedContent> {
    const [{ featuredTrucks, trendingItems }, featuredEvents, featuredOffers] = await Promise.all([
      loadFeaturedContentLists(userLocation, radiusMiles),
      this.getFeaturedEvents(5),
      this.getFeaturedOffers(5),
    ]);

    return {
      featuredTrucks,
      featuredEvents,
      featuredOffers,
      trendingItems,
    };
  },
};
