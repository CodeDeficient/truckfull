import { citySlugMatchesName } from '@/lib/utils/slugify';

export interface CityStateCount {
  readonly city: string;
  readonly state: string;
  readonly count: number;
}

interface CityStateRow {
  readonly city: string | null;
  readonly state: string | null;
}

interface CuisineRow {
  readonly cuisine_type: readonly string[] | null;
}

export function filterTrucksInCity<T extends CityStateRow>(
  trucks: readonly T[],
  cityName: string,
  stateName: string,
): T[] {
  return trucks.filter(
    (truck) =>
      truck.state === stateName &&
      truck.city !== null &&
      citySlugMatchesName(truck.city, truck.state, cityName),
  );
}

export function countTrucksByCity(
  trucks: readonly CityStateRow[],
  options: { readonly state?: string; readonly excludeCity?: string } = {},
): CityStateCount[] {
  const excluded = options.excludeCity?.toLowerCase();
  const counts = new Map<string, { city: string; state: string; count: number }>();
  for (const truck of trucks) {
    if (!truck.city || !truck.state) continue;
    if (options.state !== undefined && truck.state !== options.state) continue;
    if (excluded !== undefined && truck.city.toLowerCase() === excluded) continue;
    const key = `${truck.city}-${truck.state}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { city: truck.city, state: truck.state, count: 1 });
    }
  }
  return [...counts.values()];
}

export function filterTrucksWithCuisine<T extends CuisineRow>(
  trucks: readonly T[],
  cuisineName: string,
): T[] {
  return trucks.filter(
    (truck) => Array.isArray(truck.cuisine_type) && truck.cuisine_type.includes(cuisineName),
  );
}
