import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useSearchFiltersLogic } from '@/hooks/useSearchFiltersLogic';

describe('useSearchFiltersLogic', () => {
  const mockOnSearch = jest.fn<void, [{ query: string; cuisine: string; openNow: boolean; radius: number; priceRange?: number }]>();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default filters', () => {
    const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

    expect(result.current.filters.query).toBe('');
    expect(result.current.filters.cuisine).toBe('');
    expect(result.current.filters.openNow).toBe(false);
    expect(result.current.filters.radius).toBe(10);
    expect(result.current.filters.priceRange).toBeUndefined();
  });

  it('should initialize showAdvanced as false', () => {
    const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

    expect(result.current.showAdvanced).toBe(false);
  });

  it('should call onSearch with current filters when handleSearch is called', () => {
    const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

    act(() => {
      result.current.handleSearch();
    });

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: '',
      cuisine: '',
      openNow: false,
      radius: 10,
      priceRange: undefined,
    });
  });

  it('should update filters when setFilters is called with full filters', () => {
    const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

    act(() => {
      result.current.setFilters({
        query: 'tacos',
        cuisine: 'Mexican',
        openNow: true,
        radius: 5,
        priceRange: 2,
      });
    });

    expect(result.current.filters.query).toBe('tacos');
    expect(result.current.filters.cuisine).toBe('Mexican');
    expect(result.current.filters.openNow).toBe(true);
    expect(result.current.filters.radius).toBe(5);
    expect(result.current.filters.priceRange).toBe(2);
  });

  it('should call onSearch with initial filters when clearFilters is called', () => {
    const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

    act(() => {
      result.current.setFilters({
        query: 'burger',
        cuisine: 'American',
        openNow: true,
        radius: 15,
        priceRange: 1,
      });
    });

    mockOnSearch.mockClear();

    act(() => {
      result.current.clearFilters();
    });

    expect(mockOnSearch).toHaveBeenCalledWith({
      query: '',
      cuisine: '',
      openNow: false,
      radius: 10,
      priceRange: undefined,
    });
  });

  it('should reset filters to initial state when clearFilters is called', () => {
    const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

    act(() => {
      result.current.setFilters({
        query: 'burger',
        cuisine: 'American',
        openNow: true,
        radius: 15,
        priceRange: 1,
      });
    });

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters.query).toBe('');
    expect(result.current.filters.cuisine).toBe('');
    expect(result.current.filters.openNow).toBe(false);
    expect(result.current.filters.radius).toBe(10);
    expect(result.current.filters.priceRange).toBeUndefined();
  });

  it('should toggle showAdvanced', () => {
    const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

    expect(result.current.showAdvanced).toBe(false);

    act(() => {
      result.current.setShowAdvanced(true);
    });

    expect(result.current.showAdvanced).toBe(true);

    act(() => {
      result.current.setShowAdvanced(false);
    });

    expect(result.current.showAdvanced).toBe(false);
  });

  describe('activeFilterCount', () => {
    it('should return 0 when no filters are active', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should count query filter as active when non-empty', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: 'tacos',
          cuisine: '',
          openNow: false,
          radius: 10,
          priceRange: undefined,
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should count cuisine filter as active when non-empty', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: '',
          cuisine: 'Mexican',
          openNow: false,
          radius: 10,
          priceRange: undefined,
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should count openNow filter as active when true', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: '',
          cuisine: '',
          openNow: true,
          radius: 10,
          priceRange: undefined,
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should count priceRange filter as active when defined', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: '',
          cuisine: '',
          openNow: false,
          radius: 10,
          priceRange: 2,
        });
      });

      expect(result.current.activeFilterCount).toBe(1);
    });

    it('should not count openNow when false', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: '',
          cuisine: '',
          openNow: false,
          radius: 10,
          priceRange: undefined,
        });
      });

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should not count priceRange when undefined', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: '',
          cuisine: '',
          openNow: false,
          radius: 10,
          priceRange: undefined,
        });
      });

      expect(result.current.activeFilterCount).toBe(0);
    });

    it('should count multiple active filters', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: 'tacos',
          cuisine: 'Mexican',
          openNow: true,
          radius: 10,
          priceRange: 2,
        });
      });

      expect(result.current.activeFilterCount).toBe(4);
    });

    it('should not count radius as an active filter', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      act(() => {
        result.current.setFilters({
          query: '',
          cuisine: '',
          openNow: false,
          radius: 25,
          priceRange: undefined,
        });
      });

      expect(result.current.activeFilterCount).toBe(0);
    });
  });

  describe('cuisineTypes', () => {
    it('should return list of cuisine types', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      expect(result.current.cuisineTypes).toEqual([
        'Mexican',
        'American',
        'Asian',
        'Italian',
        'BBQ',
        'Burgers',
        'Tacos',
        'Pizza',
        'Sandwiches',
        'Desserts',
      ]);
    });

    it('should return cuisineTypes with 10 items', () => {
      const { result } = renderHook(() => useSearchFiltersLogic(mockOnSearch));

      expect(result.current.cuisineTypes.length).toBe(10);
    });
  });
});