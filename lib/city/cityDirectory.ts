import type { CityStateCount } from '@/lib/services/publicTruckFilters';
import { STATE_NAME_TO_ABBREV } from '@/lib/utils/geocoding/stateConstants';
import { slugifyCity } from '@/lib/utils/slugify';

const WORD_STARTS = /\b\w/g;
const CONTROL_CHARS = /\p{C}/gu;
const WHITESPACE_RUNS = /\s+/g;

export interface StateCityGroup {
  readonly state: string;
  readonly stateName: string;
  readonly truckCount: number;
  readonly cities: readonly CityStateCount[];
}

const ABBREV_TO_NAME = new Map(
  Object.entries(STATE_NAME_TO_ABBREV).map(([name, abbrev]) => [
    abbrev,
    name.replaceAll(WORD_STARTS, (letter) => letter.toUpperCase()),
  ]),
);

export function stateDisplayName(state: string): string {
  return ABBREV_TO_NAME.get(state.toUpperCase()) ?? state;
}

function mergeBySlug(counts: readonly CityStateCount[]): CityStateCount[] {
  const merged = new Map<string, { city: string; state: string; count: number; top: number }>();
  for (const entry of counts) {
    const key = slugifyCity(entry.city, entry.state);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...entry, top: entry.count });
      continue;
    }
    existing.count += entry.count;
    if (entry.count > existing.top) Object.assign(existing, { city: entry.city, top: entry.count });
  }
  return [...merged.values()].map(({ city, state, count }) => ({ city, state, count }));
}

export function groupCitiesByState(counts: readonly CityStateCount[]): StateCityGroup[] {
  const groups = new Map<string, { truckCount: number; cities: CityStateCount[] }>();
  for (const entry of mergeBySlug(counts)) {
    const group = groups.get(entry.state) ?? { truckCount: 0, cities: [] };
    group.truckCount += entry.count;
    group.cities.push(entry);
    groups.set(entry.state, group);
  }
  return [...groups.entries()]
    .map(([state, group]) => ({
      state,
      stateName: stateDisplayName(state),
      truckCount: group.truckCount,
      cities: group.cities.sort((a, b) => b.count - a.count || a.city.localeCompare(b.city)),
    }))
    .sort((a, b) => b.truckCount - a.truckCount);
}

export interface TopCity {
  readonly city: string;
  readonly state: string;
  readonly count: number;
  readonly image: string;
}

export function pickTopCities(
  groups: readonly StateCityGroup[],
  imageFor: (city: string, state: string) => string,
  limit: number,
): TopCity[] {
  return groups
    .flatMap((group) => group.cities)
    .toSorted((a, b) => b.count - a.count || a.city.localeCompare(b.city))
    .slice(0, limit)
    .map((entry) => ({ ...entry, image: imageFor(entry.city, entry.state) }));
}

export function countCities(groups: readonly StateCityGroup[]): number {
  return groups.reduce((total, group) => total + group.cities.length, 0);
}

export const MAX_CITY_QUERY_LENGTH = 60;

export function normalizeCityQuery(query: string): string {
  return query
    .normalize('NFKC')
    .replaceAll(CONTROL_CHARS, '')
    .replaceAll(WHITESPACE_RUNS, ' ')
    .trim()
    .slice(0, MAX_CITY_QUERY_LENGTH)
    .toLowerCase();
}

export function filterCityGroups(
  groups: readonly StateCityGroup[],
  query: string,
): StateCityGroup[] {
  const needle = normalizeCityQuery(query);
  if (!needle) return [...groups];
  return groups
    .map((group) => {
      const cities = group.cities.filter((entry) => entry.city.toLowerCase().includes(needle));
      return {
        ...group,
        cities,
        truckCount: cities.reduce((total, entry) => total + entry.count, 0),
      };
    })
    .filter((group) => group.cities.length > 0);
}
