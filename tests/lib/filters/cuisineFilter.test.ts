import { describe, it, expect } from '@jest/globals';
import {
  applyCuisineFilter,
  getUniqueCuisines,
  applyAllFilters,
} from '@/lib/filters/cuisineFilter';
import type { FoodTruck } from '@/lib/types';

// Mock food truck data for testing
const mockTrucks = [
  {
    id: '1',
    name: 'Taco Express',
    cuisine_type: ['Mexican', 'Tacos'],
    description: 'Authentic Mexican tacos',
    specialties: ['Carnitas', 'Al Pastor'],
  },
  {
    id: '2',
    name: 'Pizza Palace',
    cuisine_type: ['Italian', 'Pizza'],
    description: 'Wood-fired pizzas',
    specialties: ['Margherita', 'Pepperoni'],
  },
  {
    id: '3',
    name: 'Burger Beast',
    cuisine_type: ['American', 'Burgers'],
    description: 'Gourmet burgers',
    specialties: ['Bacon Burger', 'Veggie Burger'],
  },
  {
    id: '4',
    name: 'Sushi Stop',
    cuisine_type: ['Japanese', 'Asian', 'Seafood'],
    description: 'Fresh sushi rolls',
    specialties: ['California Roll', 'Salmon Nigiri'],
  },
  {
    id: '5',
    name: 'Vegan Vibes',
    cuisine_type: ['Vegan', 'Vegetarian', 'Healthy'],
    description: 'Plant-based delights',
    specialties: ['Buddha Bowl', 'Quinoa Salad'],
  },
  {
    id: '6',
    name: 'No Cuisine Truck',
    // No cuisine_type defined
    description: 'Mystery food',
    specialties: [],
  },
] as unknown as FoodTruck[];

describe('applyCuisineFilter', () => {
  it('should return all trucks when no cuisines are selected', () => {
    const result = applyCuisineFilter(mockTrucks, []);
    expect(result).toEqual(mockTrucks);
  });

  it('should filter trucks by single cuisine', () => {
    const result = applyCuisineFilter(mockTrucks, ['Mexican']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Taco Express');
  });

  it('should filter trucks by multiple cuisines (OR logic)', () => {
    const result = applyCuisineFilter(mockTrucks, ['Mexican', 'Italian']);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name)).toEqual(['Taco Express', 'Pizza Palace']);
  });

  it('should perform case-insensitive matching', () => {
    const result = applyCuisineFilter(mockTrucks, ['mexican', 'ITALIAN']);
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name)).toEqual(['Taco Express', 'Pizza Palace']);
  });

  it('should handle trucks with multiple matching cuisines', () => {
    const result = applyCuisineFilter(mockTrucks, ['Asian']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sushi Stop');
  });

  it('should exclude trucks without cuisine_type defined', () => {
    const result = applyCuisineFilter(mockTrucks, ['Mexican']);
    expect(result.find((t) => t.name === 'No Cuisine Truck')).toBeUndefined();
  });

  it('should return empty array when no trucks match selected cuisines', () => {
    const result = applyCuisineFilter(mockTrucks, ['French', 'Greek']);
    expect(result).toHaveLength(0);
  });

  it('should handle empty cuisine array in trucks', () => {
    const trucksWithEmpty = [
      ...mockTrucks,
      { id: '7', name: 'Empty Cuisine', cuisine_type: [] } as unknown as FoodTruck,
    ];
    const result = applyCuisineFilter(trucksWithEmpty, ['Mexican']);
    expect(result.find((t) => t.name === 'Empty Cuisine')).toBeUndefined();
  });
});

describe('getUniqueCuisines', () => {
  it('should return sorted unique cuisines from all trucks', () => {
    const result = getUniqueCuisines(mockTrucks);
    expect(result).toEqual([
      'American',
      'Asian',
      'Burgers',
      'Healthy',
      'Italian',
      'Japanese',
      'Mexican',
      'Pizza',
      'Seafood',
      'Tacos',
      'Vegan',
      'Vegetarian',
    ]);
  });

  it('should handle empty trucks array', () => {
    const result = getUniqueCuisines([]);
    expect(result).toEqual([]);
  });

  it('should handle trucks without cuisine_type', () => {
    const trucksNoCuisine = [
      { id: '1', name: 'Truck 1' },
      { id: '2', name: 'Truck 2', cuisine_type: null },
    ] as unknown as FoodTruck[];
    const result = getUniqueCuisines(trucksNoCuisine);
    expect(result).toEqual([]);
  });

  it('should trim whitespace from cuisines', () => {
    const trucksWithWhitespace = [
      { id: '1', name: 'Truck 1', cuisine_type: ['  Mexican  ', 'Italian'] },
    ] as FoodTruck[];
    const result = getUniqueCuisines(trucksWithWhitespace);
    expect(result).toEqual(['Italian', 'Mexican']);
  });

  it('should filter out empty cuisine strings', () => {
    const trucksWithEmpty = [
      { id: '1', name: 'Truck 1', cuisine_type: ['Mexican', '', '  ', 'Italian'] },
    ] as FoodTruck[];
    const result = getUniqueCuisines(trucksWithEmpty);
    expect(result).toEqual(['Italian', 'Mexican']);
  });
});

describe('applyAllFilters', () => {
  it('should apply cuisine filter correctly', () => {
    const result = applyAllFilters(mockTrucks, {
      cuisines: ['Mexican', 'Italian'],
    });
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.name)).toEqual(['Taco Express', 'Pizza Palace']);
  });

  it('should apply search query filter correctly', () => {
    const result = applyAllFilters(mockTrucks, {
      searchQuery: 'burger',
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Burger Beast');
  });

  it('should search in multiple fields', () => {
    const result = applyAllFilters(mockTrucks, {
      searchQuery: 'fresh',
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sushi Stop');
  });

  it('should apply multiple filters together', () => {
    const result = applyAllFilters(mockTrucks, {
      cuisines: ['Asian', 'Vegan'],
      searchQuery: 'sushi',
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Sushi Stop');
  });

  it('should handle empty filters object', () => {
    const result = applyAllFilters(mockTrucks, {});
    expect(result).toEqual(mockTrucks);
  });

  it('should be case-insensitive for search query', () => {
    const result = applyAllFilters(mockTrucks, {
      searchQuery: 'TACOS',
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Taco Express');
  });

  it('should search in specialties', () => {
    const result = applyAllFilters(mockTrucks, {
      searchQuery: 'carnitas',
    });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Taco Express');
  });

  it('should return empty array when no matches found', () => {
    const result = applyAllFilters(mockTrucks, {
      cuisines: ['French'],
      searchQuery: 'croissant',
    });
    expect(result).toHaveLength(0);
  });

  it('should handle null/undefined filter values gracefully', () => {
    const result = applyAllFilters(mockTrucks, {
      cuisines: undefined,
      searchQuery: undefined,
      openNow: undefined,
    });
    expect(result).toEqual(mockTrucks);
  });
});
