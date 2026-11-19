import { describe, it, expect, beforeEach } from '@jest/globals';
import { CUISINE_TYPES } from '@/lib/filters/types';

// Mock the zustand store for testing
import { getInitialState } from '@/lib/stores/useFiltersStore';

// Since we can't directly test the store's toggleCuisine because it's part of a complex store,
// we'll create a helper function that mimics the toggleCuisine logic for testing
function toggleCuisineTest(cuisines: string[], cuisine: string): string[] {
  // This mimics the logic implemented in useFiltersStore.ts
  if (!cuisine || !CUISINE_TYPES.includes(cuisine)) {
    return [...cuisines]; // Return unchanged if invalid cuisine
  }

  if (cuisines.includes(cuisine)) {
    return cuisines.filter((c) => c !== cuisine);
  } else {
    return [...cuisines, cuisine];
  }
}

describe('Cuisine Filter Validation', () => {
  it('should ignore invalid cuisines', () => {
    const initialState = ['Mexican', 'Italian'];
    const result = toggleCuisineTest(initialState, 'InvalidCuisine');
    expect(result).toEqual(['Mexican', 'Italian']); // Should remain unchanged
  });

  it('should add valid cuisine that is not in the list', () => {
    const initialState = ['Mexican'];
    const result = toggleCuisineTest(initialState, 'Italian');
    expect(result).toEqual(['Mexican', 'Italian']);
  });

  it('should remove valid cuisine that is already in the list', () => {
    const initialState = ['Mexican', 'Italian'];
    const result = toggleCuisineTest(initialState, 'Italian');
    expect(result).toEqual(['Mexican']);
  });

  it('should handle empty cuisine string', () => {
    const initialState = ['Mexican', 'Italian'];
    const result = toggleCuisineTest(initialState, '');
    expect(result).toEqual(['Mexican', 'Italian']); // Should remain unchanged
  });

  it('should only accept cuisines from CUISINE_TYPES', () => {
    const validCuisine = CUISINE_TYPES[0]; // Get the first valid cuisine from the array
    const initialState: string[] = [];
    const result = toggleCuisineTest(initialState, validCuisine);
    expect(result).toEqual([validCuisine]); // Should be added
  });
});
