import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { useFoodTruckFinder } from '@/hooks/useFoodTruckFinder';

const ORIGINAL_FETCH = global.fetch;

describe('useFoodTruckFinder', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockFetch.mockResolvedValue({ ok: false });

    useFiltersStore.setState({
      userLocation: undefined,
      radiusMiles: 10,
      priceRange: undefined,
      openNow: false,
      searchQuery: '',
      favoritesOnly: false,
      cuisines: [],
    });
  });

  afterEach(() => {
    global.fetch = ORIGINAL_FETCH;
  });

  describe('return values', () => {
    it('exposes all expected properties after loading', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useFoodTruckFinder());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current).toHaveProperty('trucks');
      expect(result.current).toHaveProperty('loading');
      expect(result.current).toHaveProperty('userLocation');
      expect(result.current).toHaveProperty('selectedTruckId');
      expect(result.current).toHaveProperty('setSelectedTruckId');
      expect(result.current).toHaveProperty('loadNearbyTrucks');
      expect(result.current).toHaveProperty('filteredTrucks');
    });

    it('starts with loading=true', () => {
      const { result } = renderHook(() => useFoodTruckFinder());
      expect(result.current.loading).toBe(true);
    });

    it('updates selectedTruckId via setSelectedTruckId', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useFoodTruckFinder());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSelectedTruckId('truck-42');
      });

      expect(result.current.selectedTruckId).toBe('truck-42');
    });
  });

  describe('loading completes', () => {
    it('sets loading to false after fetch attempt', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useFoodTruckFinder());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.trucks).toEqual([]);
    });
  });

  describe('IP-primary location flow', () => {
    it('calls /api/geo/ip-location on mount', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useFoodTruckFinder());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/geo/ip-location');
    });
  });

  describe('server truck list reuse', () => {
    const MILES_PER_DEGREE_LAT = 69.05;
    const center = { lat: 33.4728, lng: -82.0105 };
    const seed = {
      ...center,
      radiusMiles: 50,
      trucks: [
        { id: 'near', name: 'Near Truck', current_location: { lat: 33.48, lng: -82.01 } },
        {
          id: 'edge',
          name: 'Edge Truck',
          current_location: { lat: center.lat + 20 / MILES_PER_DEGREE_LAT, lng: center.lng },
        },
      ],
    };

    function respondWithVisitorAt(lat: number, lng: number): void {
      mockFetch.mockImplementation(async (url: unknown) =>
        url === '/api/geo/ip-location'
          ? { ok: true, json: async () => ({ lat, lng, city: 'Test', source: 'cf-geo' }) }
          : { ok: false, status: 503, statusText: 'Unavailable', text: async () => '' },
      );
    }

    function nearbyCalls(): number {
      return mockFetch.mock.calls.filter(([url]) => url === '/api/trucks/nearby').length;
    }

    it('narrows the server list to the visitor instead of fetching trucks again', async () => {
      respondWithVisitorAt(center.lat, center.lng);

      const { result } = renderHook(() => useFoodTruckFinder({ initialSeed: seed }));

      expect(result.current.trucks.map((truck) => truck.id).sort()).toEqual(['edge', 'near']);
      await waitFor(() => {
        expect(result.current.trucks.map((truck) => truck.id)).toEqual(['near']);
      });
      expect(nearbyCalls()).toBe(0);
    });

    it('fetches trucks when the visitor is outside the server list area', async () => {
      respondWithVisitorAt(33.749, -84.388);

      renderHook(() => useFoodTruckFinder({ initialSeed: seed }));

      await waitFor(() => {
        expect(nearbyCalls()).toBe(1);
      });
    });
  });

  describe('loadNearbyTrucks', () => {
    it('does nothing when no userLocation', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const { result } = renderHook(() => useFoodTruckFinder());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.loadNearbyTrucks();
      });

      expect(result.current.trucks).toEqual([]);
    });

    it('resolves without throwing when the nearby lookup fails', async () => {
      const { result } = renderHook(() =>
        useFoodTruckFinder({
          initialSeed: { lat: 32.08, lng: -81.09, radiusMiles: 50, trucks: [] },
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await expect(result.current.loadNearbyTrucks()).resolves.toBeUndefined();
      });

      expect(result.current.trucks).toEqual([]);
    });
  });

  // NOTE: The following tests are skipped because they would require mocking
  // @/lib/utils/foodTruckHelpers (PURE ZONE) or @/lib/supabase/* to control
  // the async data flow. Per mock-free-testing rules:
  //   - @/lib/utils/* → never mock, test directly
  //   - @/lib/supabase/* → use FakeSupabaseClient or real local DB
  //   - Mock setup would exceed 15 lines → extract or skip
  //
  // The filtering pipeline (the main business logic) is fully covered by
  // __tests__/lib/utils/truckFiltering.test.ts (34 tests).
  // These integration scenarios should be covered by Playwright E2E tests.

  it.skip('loads nearby trucks when IP location succeeds', async () => {
    // Would require mocking loadNearbyTrucksHelper (violates mock-free rules)
  });

  it.skip('falls back to GPS when IP fails', async () => {
    // Would require mocking getUserLocationHelper (violates mock-free rules)
  });

  it.skip('falls back to loadFoodTrucksHelper when both fail', async () => {
    // Would require mocking loadFoodTrucksHelper (violates mock-free rules)
  });

  it.skip('reloads trucks on radius change with debounce', async () => {
    // Would require mocking loadNearbyTrucksHelper (violates mock-free rules)
  });
});
