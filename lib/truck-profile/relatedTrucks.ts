import { getCachedPublicTruckCatalog } from '@/lib/services/publicTruckData.server';
import { calculateDistance } from '@/lib/utils/geoUtils';
import { logError } from '@/lib/logging';

export interface RelatedTruck {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly cuisines: readonly string[];
  readonly photoUrl: string | null;
  readonly distanceMiles: number | null;
}

export interface CuisineTruckList {
  readonly cuisine: string;
  readonly trucks: readonly RelatedTruck[];
}

export interface RawTruck {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  state: string | null;
  cuisine_type: string[] | null;
  photo_url: string | null;
  current_location: unknown;
}

const NEARBY_RADIUS_MILES = 20;
const MAX_RELATED_TRUCKS = 20;
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toRelatedTruck(row: RawTruck, origin: { lat: number; lng: number } | null): RelatedTruck {
  const location = isRecord(row.current_location) ? row.current_location : {};
  const lat = typeof location.lat === 'number' ? location.lat : null;
  const lng = typeof location.lng === 'number' ? location.lng : null;
  const calculatedDistanceMiles =
    origin && lat !== null && lng !== null
      ? calculateDistance(origin.lat, origin.lng, lat, lng)
      : null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    state: row.state,
    cuisines: row.cuisine_type ?? [],
    photoUrl: row.photo_url,
    distanceMiles: calculatedDistanceMiles,
  };
}

export function findNearbyTrucks(
  rows: readonly RawTruck[],
  origin: { lat: number; lng: number },
  excludeId: string,
): RelatedTruck[] {
  return rows
    .filter((row) => row.id !== excludeId)
    .map((row) => toRelatedTruck(row, origin))
    .filter(
      (truck): truck is RelatedTruck & { distanceMiles: number } =>
        truck.distanceMiles !== null && truck.distanceMiles <= NEARBY_RADIUS_MILES,
    )
    .sort((a, b) => a.distanceMiles - b.distanceMiles || a.id.localeCompare(b.id, 'en'))
    .slice(0, MAX_RELATED_TRUCKS);
}

async function fetchNearbyTrucks(
  origin: { lat: number; lng: number },
  excludeId: string,
): Promise<RelatedTruck[]> {
  try {
    return findNearbyTrucks(await getCachedPublicTruckCatalog(), origin, excludeId);
  } catch (catalogError) {
    logError('fetchNearbyTrucks: failed to load public truck catalog', catalogError);
    return [];
  }
}

async function fetchCuisineTrucks(cuisine: string, excludeId: string): Promise<RawTruck[]> {
  let catalog: Awaited<ReturnType<typeof getCachedPublicTruckCatalog>>;
  try {
    catalog = await getCachedPublicTruckCatalog();
  } catch (catalogError) {
    logError('fetchCuisineTrucks: failed to load public truck catalog', catalogError);
    return [];
  }

  return catalog
    .filter((row) => row.id !== excludeId && row.cuisine_type?.includes(cuisine))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'))
    .slice(0, MAX_RELATED_TRUCKS);
}

export function buildCuisineTruckLists(
  data: readonly { readonly cuisine: string; readonly rows: readonly RawTruck[] }[],
  origin: { lat: number; lng: number } | null,
  excludeId: string,
): CuisineTruckList[] {
  return data.flatMap(({ cuisine, rows }) => {
    const trucks = rows
      .filter((row) => row.id !== excludeId && row.cuisine_type?.includes(cuisine))
      .slice(0, MAX_RELATED_TRUCKS)
      .map((row) => toRelatedTruck(row, origin));
    return trucks.length > 0 ? [{ cuisine, trucks }] : [];
  });
}

export interface RelatedTrucksResult {
  readonly nearby: readonly RelatedTruck[];
  readonly byCuisine: readonly CuisineTruckList[];
}

export async function getRelatedTrucks(
  origin: { lat: number; lng: number } | null,
  cuisines: readonly string[],
  excludeId: string,
): Promise<RelatedTrucksResult> {
  const [nearby, cuisineRows] = await Promise.all([
    origin ? fetchNearbyTrucks(origin, excludeId) : [],
    Promise.all(
      [...new Set(cuisines)].map(async (cuisine) => ({
        cuisine,
        rows: await fetchCuisineTrucks(cuisine, excludeId),
      })),
    ),
  ]);
  return { nearby, byCuisine: buildCuisineTruckLists(cuisineRows, origin, excludeId) };
}
