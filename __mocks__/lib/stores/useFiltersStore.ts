const mockLoadFromURL = jest.fn();
const mockToURLSearchParams = jest.fn(() => new URLSearchParams());
const mockResetFilters = jest.fn();

const state = {
  loadFromURL: mockLoadFromURL,
  toURLSearchParams: mockToURLSearchParams,
};

export const useFiltersStore = jest.fn((selector?: (state: typeof state) => unknown) => {
  if (selector) {
    return selector(state);
  }
  return state;
});

useFiltersStore.getState = jest.fn(() => ({
  resetFilters: mockResetFilters,
}));

useFiltersStore.subscribe = jest.fn(() => jest.fn());
useFiltersStore.destroy = jest.fn();

export { mockLoadFromURL, mockToURLSearchParams, mockResetFilters };
