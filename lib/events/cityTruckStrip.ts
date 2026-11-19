import { filterTrucksInCity } from '@/lib/services/publicTruckFilters';
import type { RelatedTruck } from '@/lib/truck-profile/relatedTrucks';

export const CITY_TRUCK_STRIP_SIZE = 16;

export interface CityTruckStripSource {
  readonly id: string;
  readonly name: string;
  readonly slug: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly photo_url: string | null;
  readonly cuisine_type: readonly string[] | null;
  readonly data_quality_score: number | null;
}

export interface CityTruckStrip {
  readonly trucks: readonly RelatedTruck[];
  readonly totalInCity: number;
}

function toStripItem(row: CityTruckStripSource): RelatedTruck {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    city: row.city,
    state: row.state,
    cuisines: row.cuisine_type ?? [],
    photoUrl: row.photo_url || null,
    distanceMiles: null,
  };
}

function stripOrder(a: CityTruckStripSource, b: CityTruckStripSource): number {
  const photoFirst = Number(Boolean(b.photo_url)) - Number(Boolean(a.photo_url));
  return photoFirst || (b.data_quality_score ?? 0) - (a.data_quality_score ?? 0);
}

export function pickCityTruckStrip(
  catalog: readonly CityTruckStripSource[],
  cityName: string,
  stateName: string,
  size = CITY_TRUCK_STRIP_SIZE,
): CityTruckStrip {
  const inCity = filterTrucksInCity(catalog, cityName, stateName);
  const trucks = inCity
    .filter((row) => Boolean(row.slug))
    .toSorted(stripOrder)
    .slice(0, size)
    .map((row) => toStripItem(row));
  return { trucks, totalInCity: inCity.length };
}
