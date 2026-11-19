import { describe, expect, it } from '@jest/globals';
import {
  countTrucksByCity,
  filterTrucksInCity,
  filterTrucksWithCuisine,
} from '@/lib/services/publicTruckFilters';

const trucks = [
  { id: 'a', city: 'Augusta', state: 'GA', cuisine_type: ['Mexican', 'American'] },
  { id: 'b', city: 'augusta', state: 'GA', cuisine_type: ['BBQ'] },
  { id: 'c', city: 'Augusta', state: 'SC', cuisine_type: null },
  { id: 'd', city: 'Atlanta', state: 'GA', cuisine_type: ['mexican'] },
  { id: 'e', city: null, state: 'GA', cuisine_type: ['Mexican'] },
  { id: 'f', city: 'Atlanta', state: null, cuisine_type: ['Coffee'] },
  { id: 'g', city: 'Atlanta', state: 'GA', cuisine_type: [] },
] as const;

describe('filterTrucksInCity', () => {
  it('matches the city case-insensitively and the state exactly', () => {
    expect(filterTrucksInCity(trucks, 'AUGUSTA', 'GA').map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('does not match a city in a different state or a missing city', () => {
    expect(filterTrucksInCity(trucks, 'Augusta', 'SC').map((t) => t.id)).toEqual(['c']);
    expect(filterTrucksInCity(trucks, 'Augusta', 'ga')).toEqual([]);
  });

  it('matches stored names with hyphens or periods to the name parsed from the page slug', () => {
    const punctuated = [
      { id: 'w', city: 'Winston-Salem', state: 'NC' },
      { id: 's', city: 'St. Simons Island', state: 'GA' },
      { id: 'x', city: 'Winston', state: 'NC' },
    ];
    expect(filterTrucksInCity(punctuated, 'Winston Salem', 'NC').map((t) => t.id)).toEqual(['w']);
    expect(filterTrucksInCity(punctuated, 'St Simons Island', 'GA').map((t) => t.id)).toEqual([
      's',
    ]);
  });
});

describe('countTrucksByCity', () => {
  it('counts every truck with both a city and a state, grouped by exact city and state', () => {
    expect(countTrucksByCity(trucks)).toEqual([
      { city: 'Augusta', state: 'GA', count: 1 },
      { city: 'augusta', state: 'GA', count: 1 },
      { city: 'Augusta', state: 'SC', count: 1 },
      { city: 'Atlanta', state: 'GA', count: 2 },
    ]);
  });

  it('limits to one state and excludes a city case-insensitively', () => {
    expect(countTrucksByCity(trucks, { state: 'GA', excludeCity: 'AUGUSTA' })).toEqual([
      { city: 'Atlanta', state: 'GA', count: 2 },
    ]);
  });
});

describe('filterTrucksWithCuisine', () => {
  it('matches an exact cuisine name inside the cuisine list', () => {
    expect(filterTrucksWithCuisine(trucks, 'Mexican').map((t) => t.id)).toEqual(['a', 'e']);
  });

  it('ignores trucks with no cuisine list and is case-sensitive like the array contains filter', () => {
    expect(filterTrucksWithCuisine(trucks, 'Coffee').map((t) => t.id)).toEqual(['f']);
    expect(filterTrucksWithCuisine(trucks, 'MEXICAN')).toEqual([]);
  });
});
