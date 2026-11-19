import 'server-only';
import { unstable_cache } from 'next/cache';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { fetchNearbyTrucks, type TruckFromRPC } from '@/lib/api/trucks/fetchNearbyTrucks';
import { narrowToRadius, nearbyCell, paddedCellRadiusMiles } from '@/lib/api/trucks/nearbyCells';

export const NEARBY_SEARCH_REVALIDATE_SECONDS = 86_400;

const getCachedCellTrucks = unstable_cache(
  (cellLat: number, cellLng: number, cellRadiusMiles: number) =>
    fetchNearbyTrucks({
      lat: cellLat,
      lng: cellLng,
      radiusMiles: cellRadiusMiles,
      client: getSupabasePublicReader(),
      enrichTiers: true,
    }),
  ['nearby-search-cell'],
  { revalidate: NEARBY_SEARCH_REVALIDATE_SECONDS, tags: ['food-trucks'] },
);

export async function searchNearbyTrucks(
  lat: number,
  lng: number,
  radiusMiles: number,
): Promise<TruckFromRPC[]> {
  const cell = nearbyCell(lat, lng);
  const rows = await getCachedCellTrucks(cell.lat, cell.lng, paddedCellRadiusMiles(radiusMiles));
  return narrowToRadius(rows, { lat, lng }, radiusMiles);
}
