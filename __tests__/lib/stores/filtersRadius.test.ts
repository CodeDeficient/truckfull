import { describe, it, expect, beforeEach } from '@jest/globals';
import { useFiltersStore } from '@/lib/stores/useFiltersStore';
import { DEFAULT_FILTERS, STORAGE_KEYS } from '@/lib/filters/types';

describe('filters store radius', () => {
  beforeEach(() => {
    localStorage.clear();
    useFiltersStore.setState({ ...DEFAULT_FILTERS });
  });

  it('defaults to 25 miles', () => {
    expect(DEFAULT_FILTERS.radiusMiles).toBe(25);
  });

  it('caps a URL radius at the signed-in maximum', () => {
    useFiltersStore.getState().loadFromURL(new URLSearchParams({ radius: '10000' }));
    expect(useFiltersStore.getState().radiusMiles).toBe(150);
  });

  it('keeps a URL radius under the maximum', () => {
    useFiltersStore.getState().loadFromURL(new URLSearchParams({ radius: '50' }));
    expect(useFiltersStore.getState().radiusMiles).toBe(50);
  });

  it('clearing filters restores the default radius and keeps the search location', async () => {
    const location = { lat: 33.47, lng: -82.01 };
    useFiltersStore.setState({ radiusMiles: 50, openNow: true, userLocation: location });
    await useFiltersStore.getState().resetFilters();
    const state = useFiltersStore.getState();
    expect(state.radiusMiles).toBe(DEFAULT_FILTERS.radiusMiles);
    expect(state.openNow).toBe(false);
    expect(state.userLocation).toEqual(location);
  });

  it('resets a saved radius from an older store version', async () => {
    localStorage.setItem(
      STORAGE_KEYS.FILTERS,
      JSON.stringify({ state: { radiusMiles: 300, openNow: true }, version: 0 }),
    );
    await useFiltersStore.persist.rehydrate();
    expect(useFiltersStore.getState().radiusMiles).toBe(25);
    expect(useFiltersStore.getState().openNow).toBe(true);
  });

  it('keeps a saved radius from the current store version', async () => {
    localStorage.setItem(
      STORAGE_KEYS.FILTERS,
      JSON.stringify({ state: { radiusMiles: 100 }, version: 1 }),
    );
    await useFiltersStore.persist.rehydrate();
    expect(useFiltersStore.getState().radiusMiles).toBe(100);
  });
});
