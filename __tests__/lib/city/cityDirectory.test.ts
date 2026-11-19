import { describe, expect, it } from '@jest/globals';
import {
  countCities,
  filterCityGroups,
  groupCitiesByState,
  MAX_CITY_QUERY_LENGTH,
  normalizeCityQuery,
  pickTopCities,
  stateDisplayName,
} from '@/lib/city/cityDirectory';

describe('stateDisplayName', () => {
  it('turns an abbreviation into the full state name', () => {
    expect(stateDisplayName('SC')).toBe('South Carolina');
    expect(stateDisplayName('ga')).toBe('Georgia');
  });

  it('falls back to the raw value for unknown states', () => {
    expect(stateDisplayName('ZZ')).toBe('ZZ');
  });
});

describe('groupCitiesByState', () => {
  const counts = [
    { city: 'Augusta', state: 'GA', count: 40 },
    { city: 'Evans', state: 'GA', count: 2 },
    { city: 'Charleston', state: 'SC', count: 150 },
    { city: 'Aiken', state: 'SC', count: 5 },
    { city: 'Beaufort', state: 'SC', count: 5 },
    { city: 'Tiny', state: 'NC', count: 1 },
  ];

  it('groups by state, largest state first, keeping states with only small towns', () => {
    expect(groupCitiesByState(counts).map((g) => g.state)).toEqual(['SC', 'GA', 'NC']);
  });

  it('lists every town so the state total matches its cities', () => {
    const georgia = groupCitiesByState(counts).find((g) => g.state === 'GA');
    expect(georgia?.truckCount).toBe(42);
    expect(georgia?.cities.map((c) => c.city)).toEqual(['Augusta', 'Evans']);
  });

  it('sorts cities by truck count, then by name', () => {
    const carolina = groupCitiesByState(counts).find((g) => g.state === 'SC');
    expect(carolina?.cities.map((c) => c.city)).toEqual(['Charleston', 'Aiken', 'Beaufort']);
  });

  it('merges spellings that share one city page and keeps the most common name', () => {
    const merged = groupCitiesByState([
      { city: 'McDonough', state: 'GA', count: 7 },
      { city: 'Mcdonough', state: 'GA', count: 5 },
    ]);
    expect(merged[0]?.cities).toEqual([{ city: 'McDonough', state: 'GA', count: 12 }]);
  });
});

describe('pickTopCities', () => {
  const groups = groupCitiesByState([
    { city: 'Augusta', state: 'GA', count: 40 },
    { city: 'Evans', state: 'GA', count: 30 },
    { city: 'Charleston', state: 'SC', count: 150 },
    { city: 'Aiken', state: 'SC', count: 5 },
  ]);
  const imageFor = (city: string): string => (city === 'Evans' ? '' : `/img/${city}.webp`);

  it('ranks cities by truck count across states and keeps cities without an image', () => {
    expect(pickTopCities(groups, imageFor, 3)).toEqual([
      { city: 'Charleston', state: 'SC', count: 150, image: '/img/Charleston.webp' },
      { city: 'Augusta', state: 'GA', count: 40, image: '/img/Augusta.webp' },
      { city: 'Evans', state: 'GA', count: 30, image: '' },
    ]);
  });
});

describe('countCities', () => {
  it('counts every city across every state', () => {
    const groups = groupCitiesByState([
      { city: 'Augusta', state: 'GA', count: 40 },
      { city: 'Evans', state: 'GA', count: 2 },
      { city: 'Charleston', state: 'SC', count: 150 },
    ]);
    expect(countCities(groups)).toBe(3);
  });
});

describe('filterCityGroups', () => {
  const groups = groupCitiesByState([
    { city: 'Augusta', state: 'GA', count: 40 },
    { city: 'North Augusta', state: 'SC', count: 17 },
    { city: 'Charleston', state: 'SC', count: 150 },
  ]);

  it('returns every group for a blank query', () => {
    expect(filterCityGroups(groups, '  ')).toEqual(groups);
  });

  it('keeps only matching cities and drops states with none', () => {
    const result = filterCityGroups(groups, 'AUGUSTA');
    expect(result.map((group) => [group.state, group.cities.map((entry) => entry.city)])).toEqual([
      ['SC', ['North Augusta']],
      ['GA', ['Augusta']],
    ]);
  });

  it('totals only the matching cities while filtering', () => {
    expect(filterCityGroups(groups, 'charl')[0]?.truckCount).toBe(150);
    expect(filterCityGroups(groups, 'augusta').map((group) => group.truckCount)).toEqual([17, 40]);
  });

  it('treats markup, regex and control characters as plain text', () => {
    expect(filterCityGroups(groups, '<script>alert(1)</script>')).toEqual([]);
    expect(filterCityGroups(groups, '.*')).toEqual([]);
    expect(filterCityGroups(groups, 'aug\u0000usta').map((group) => group.state)).toEqual(['SC', 'GA']);
  });
});

describe('normalizeCityQuery', () => {
  it('folds width variants, strips control characters and collapses whitespace', () => {
    expect(normalizeCityQuery('  \uFF2E\uFF4F\uFF52\uFF54\uFF48 \u200B  Augusta\t ')).toBe('north augusta');
  });

  it('caps the query length', () => {
    expect(normalizeCityQuery('a'.repeat(5000))).toHaveLength(MAX_CITY_QUERY_LENGTH);
  });
});
