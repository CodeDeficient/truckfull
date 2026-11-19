import { act, renderHook } from '@testing-library/react';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { DEFAULT_FILTERS } from '@/lib/filters/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useFiltersStore', () => {
  beforeEach(() => {
    // Reset store and localStorage before each test
    localStorageMock.clear();
    useFiltersStore.setState(DEFAULT_FILTERS);
  });

  describe('Initial State', () => {
    it('should have default filters on initialization', () => {
      const { result } = renderHook(() => useFiltersStore());

      expect(result.current.favoritesOnly).toBe(false);
      expect(result.current.cuisines).toEqual([]);
      expect(result.current.radiusMiles).toBe(20);
      expect(result.current.userLocation).toBeUndefined();
      expect(result.current.searchQuery).toBeUndefined();
      expect(result.current.openNow).toBe(false);
    });
  });

  describe('Set and Reset Actions', () => {
    it('should set a single filter', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setFilter('favoritesOnly', true);
      });

      expect(result.current.favoritesOnly).toBe(true);
    });

    it('should set multiple filters at once', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setFilters({
          favoritesOnly: true,
          radiusMiles: 10,
          openNow: true,
        });
      });

      expect(result.current.favoritesOnly).toBe(true);
      expect(result.current.radiusMiles).toBe(10);
      expect(result.current.openNow).toBe(true);
    });

    it('should reset all filters to defaults', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setFilters({
          favoritesOnly: true,
          cuisines: ['Mexican', 'Italian'],
          radiusMiles: 30,
        });
      });

      act(() => {
        result.current.resetFilters();
      });

      expect(result.current.favoritesOnly).toBe(false);
      expect(result.current.cuisines).toEqual([]);
      expect(result.current.radiusMiles).toBe(20);
    });
  });

  describe('Toggle Actions', () => {
    it('should toggle favorites only', () => {
      const { result } = renderHook(() => useFiltersStore());

      expect(result.current.favoritesOnly).toBe(false);

      act(() => {
        result.current.toggleFavoritesOnly();
      });
      expect(result.current.favoritesOnly).toBe(true);

      act(() => {
        result.current.toggleFavoritesOnly();
      });
      expect(result.current.favoritesOnly).toBe(false);
    });

    it('should toggle open now', () => {
      const { result } = renderHook(() => useFiltersStore());

      expect(result.current.openNow).toBe(false);

      act(() => {
        result.current.toggleOpenNow();
      });
      expect(result.current.openNow).toBe(true);

      act(() => {
        result.current.toggleOpenNow();
      });
      expect(result.current.openNow).toBe(false);
    });
  });

  describe('Cuisine Actions', () => {
    it('should add a cuisine', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.addCuisine('Mexican');
      });

      expect(result.current.cuisines).toEqual(['Mexican']);
    });

    it('should not add duplicate cuisines', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.addCuisine('Mexican');
        result.current.addCuisine('Mexican');
      });

      expect(result.current.cuisines).toEqual(['Mexican']);
    });

    it('should remove a cuisine', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setFilters({ cuisines: ['Mexican', 'Italian', 'Asian'] });
      });

      act(() => {
        result.current.removeCuisine('Italian');
      });

      expect(result.current.cuisines).toEqual(['Mexican', 'Asian']);
    });

    it('should toggle a cuisine', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.toggleCuisine('Mexican');
      });
      expect(result.current.cuisines).toEqual(['Mexican']);

      act(() => {
        result.current.toggleCuisine('Mexican');
      });
      expect(result.current.cuisines).toEqual([]);
    });

    it('should clear all cuisines', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setFilters({ cuisines: ['Mexican', 'Italian', 'Asian'] });
      });

      act(() => {
        result.current.clearCuisines();
      });

      expect(result.current.cuisines).toEqual([]);
    });
  });

  describe('Location Actions', () => {
    it('should set user location', () => {
      const { result } = renderHook(() => useFiltersStore());

      const location = { lat: 37.7749, lng: -122.4194 };

      act(() => {
        result.current.setUserLocation(location);
      });

      expect(result.current.userLocation).toEqual(location);
    });

    it('should clear user location', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setUserLocation({ lat: 37.7749, lng: -122.4194 });
      });

      act(() => {
        result.current.setUserLocation(undefined);
      });

      expect(result.current.userLocation).toBeUndefined();
    });
  });

  describe('URL Synchronization', () => {
    it('should load filters from URL search params', () => {
      const { result } = renderHook(() => useFiltersStore());

      const params = new URLSearchParams({
        favorites: '1',
        cuisines: 'Mexican,Italian',
        radius: '15',
        lat: '37.7749',
        lng: '-122.4194',
        q: 'tacos',
        openNow: '1',
      });

      act(() => {
        result.current.loadFromURL(params);
      });

      expect(result.current.favoritesOnly).toBe(true);
      expect(result.current.cuisines).toEqual(['Mexican', 'Italian']);
      expect(result.current.radiusMiles).toBe(15);
      expect(result.current.userLocation).toEqual({ lat: 37.7749, lng: -122.4194 });
      expect(result.current.searchQuery).toBe('tacos');
      expect(result.current.openNow).toBe(true);
    });

    it('should handle partial URL params', () => {
      const { result } = renderHook(() => useFiltersStore());

      const params = new URLSearchParams({
        cuisines: 'Mexican',
        radius: '10',
      });

      act(() => {
        result.current.loadFromURL(params);
      });

      expect(result.current.cuisines).toEqual(['Mexican']);
      expect(result.current.radiusMiles).toBe(10);
      expect(result.current.favoritesOnly).toBe(false);
    });

    it('should convert filter state to URL search params', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setFilters({
          favoritesOnly: true,
          cuisines: ['Mexican', 'Italian'],
          radiusMiles: 15,
          userLocation: { lat: 37.7749, lng: -122.4194 },
          searchQuery: 'pizza',
          openNow: true,
        });
      });

      const params = result.current.toURLSearchParams();

      expect(params.get('favorites')).toBe('1');
      expect(params.get('cuisines')).toBe('Mexican,Italian');
      expect(params.get('radius')).toBe('15');
      expect(params.get('lat')).toBe('37.7749');
      expect(params.get('lng')).toBe('-122.4194');
      expect(params.get('q')).toBe('pizza');
      expect(params.get('openNow')).toBe('1');
    });

    it('should only include non-default values in URL params', () => {
      const { result } = renderHook(() => useFiltersStore());

      act(() => {
        result.current.setFilters({
          favoritesOnly: false,
          cuisines: [],
          radiusMiles: 20, // default value
          openNow: false,
        });
      });

      const params = result.current.toURLSearchParams();

      expect(params.has('favorites')).toBe(false);
      expect(params.has('cuisines')).toBe(false);
      expect(params.has('radius')).toBe(false);
      expect(params.has('openNow')).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid radius values', () => {
      const { result } = renderHook(() => useFiltersStore());

      const params = new URLSearchParams({
        radius: 'invalid',
      });

      act(() => {
        result.current.loadFromURL(params);
      });

      expect(result.current.radiusMiles).toBe(20); // Should keep default
    });

    it('should handle invalid location values', () => {
      const { result } = renderHook(() => useFiltersStore());

      const params = new URLSearchParams({
        lat: 'invalid',
        lng: 'invalid',
      });

      act(() => {
        result.current.loadFromURL(params);
      });

      expect(result.current.userLocation).toBeUndefined();
    });

    it('should handle empty cuisine list in URL', () => {
      const { result } = renderHook(() => useFiltersStore());

      const params = new URLSearchParams({
        cuisines: '',
      });

      act(() => {
        result.current.loadFromURL(params);
      });

      expect(result.current.cuisines).toEqual([]);
    });
  });
});
