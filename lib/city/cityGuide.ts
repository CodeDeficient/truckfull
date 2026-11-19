import { normalizeCityQuery } from '@/lib/city/cityDirectory';

export type CuisineCount = readonly [string, number];

export interface CityGuideStats {
  readonly listingCount: number;
  readonly cuisineCount: number;
  readonly topCuisine: string | null;
}

export function countCuisines(
  trucks: readonly { readonly cuisine_type: readonly string[] | null }[],
): CuisineCount[] {
  const counts = new Map<string, number>();
  for (const truck of trucks) {
    if (!Array.isArray(truck.cuisine_type)) continue;
    for (const cuisine of new Set(truck.cuisine_type)) {
      counts.set(cuisine, (counts.get(cuisine) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function buildCityGuideStats(
  listingCount: number,
  cuisines: readonly CuisineCount[],
): CityGuideStats {
  return {
    listingCount,
    cuisineCount: cuisines.length,
    topCuisine: cuisines[0]?.[0] ?? null,
  };
}

function joinList(items: readonly string[]): string {
  if (items.length < 3) return items.join(' and ');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1) ?? ''}`;
}

export function buildCityIntro(
  cityName: string,
  stateName: string,
  stats: CityGuideStats,
  cuisines: readonly CuisineCount[],
): string {
  const noun =
    stats.listingCount === 1 ? 'food truck or mobile vendor' : 'food trucks and mobile vendors';
  const listed = `TruckFull lists ${stats.listingCount} ${noun} in ${cityName}, ${stateName}`;
  const names = cuisines.slice(0, 3).map(([cuisine]) => cuisine);
  const serving = names.length > 0 ? `, serving ${joinList(names)}` : '';
  return `${listed}${serving}. Each listing shows the details we have on file, such as address, phone, website, social links and menu, so you can find a truck to visit or book for catering.`;
}

export const COLLAPSED_CUISINE_COUNT = 12;

export const BOOK_DIRECT_HASH = '#book-direct';

export function filterCuisineNames(names: readonly string[], query: string): Set<string> {
  const needle = normalizeCityQuery(query).toLowerCase();
  if (!needle) return new Set(names);
  return new Set(names.filter((name) => name.toLowerCase().includes(needle)));
}
