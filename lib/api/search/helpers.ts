import { NextResponse } from 'next/server';
import {
  applyCuisineFilter,
  applyOpenNowFilter,
  applyTextSearchFilter,
} from '@/lib/api/search/filters';
import {
  getAndFilterFoodTrucks,
  sortFoodTrucksByQuality,
  toPublicSearchTrucks,
} from '@/lib/api/search/data';
import type { FoodTruckDomain } from '@/lib/types';

/**
 * Processes a search request and returns filtered and sorted food trucks based on query parameters.
 * @example
 * processSearchRequest({ query: 'tacos' })
 * // => { trucks: ["…"], total: 12, filters: { details: true } }
 */
export async function processSearchRequest({
  query,
  cuisine,
  openNow,
  lat,
  lng,
  radius,
}: {
  query: string | null;
  cuisine: string | null;
  openNow: boolean;
  lat: string | null;
  lng: string | null;
  radius: string | null;
}): Promise<NextResponse> {
  const trucksInitial: FoodTruckDomain[] = await getAndFilterFoodTrucks(lat, lng, radius);

  // Apply filters
  let trucks = applyTextSearchFilter(trucksInitial, query);
  trucks = applyCuisineFilter(trucks, cuisine);
  trucks = applyOpenNowFilter(trucks, openNow);

  // Sort by data quality score
  const publicTrucks = toPublicSearchTrucks(sortFoodTrucksByQuality(trucks));

  return NextResponse.json({
    trucks: publicTrucks,
    total: publicTrucks.length,
    filters: {
      query,
      cuisine,
      openNow,
      location:
        lat != undefined && lng != undefined
          ? { lat: Number.parseFloat(lat), lng: Number.parseFloat(lng) }
          : undefined,
      radius: Number.parseFloat(radius ?? '10'),
    },
  });
}
