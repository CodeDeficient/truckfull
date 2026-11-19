import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

describe('useBaseFoodTruckData', () => {
  let useBaseFoodTruckData: typeof import('@/hooks/useBaseFoodTruckData').useBaseFoodTruckData;
  let useBaseFoodTruckDataWithLocationValidation: typeof import('@/hooks/useBaseFoodTruckData').useBaseFoodTruckDataWithLocationValidation;
  const mockFetchDataFn = jest.fn<
    () => Promise<{ trucks: MockTruck[]; error?: string | null }>
  >();

  interface MockTruck {
    id: string;
    name: string;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('@/hooks/useBaseFoodTruckData');
    useBaseFoodTruckData = module.useBaseFoodTruckData;
    useBaseFoodTruckDataWithLocationValidation = module.useBaseFoodTruckDataWithLocationValidation;
  });

  describe('initial state', () => {
    it('should initialize with empty trucks and loading true', async () => {
      mockFetchDataFn.mockResolvedValue({ trucks: [], error: null });

      const { result } = renderHook(() =>
        useBaseFoodTruckData<MockTruck, Record<string, unknown>>(
          {},
          mockFetchDataFn,
          [],
        ),
      );

      expect(result.current.trucks).toEqual([]);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should use mockData if provided', async () => {
      const mockData = [{ id: '1', name: 'Test Truck' }];

      const { result } = renderHook(() =>
        useBaseFoodTruckData<MockTruck, { mockData: MockTruck[] }>(
          { mockData },
          mockFetchDataFn,
          [],
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.trucks).toEqual(mockData);
      expect(mockFetchDataFn).not.toHaveBeenCalled();
    });
  });

  describe('data fetching', () => {
    it('should fetch data on mount', async () => {
      const trucks = [{ id: '1', name: 'Truck 1' }];
      mockFetchDataFn.mockResolvedValue({ trucks, error: null });

      const { result } = renderHook(() =>
        useBaseFoodTruckData<MockTruck, Record<string, unknown>>({}, mockFetchDataFn, []),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetchDataFn).toHaveBeenCalled();
      expect(result.current.trucks).toEqual(trucks);
    });

    it('should set error on fetch failure', async () => {
      mockFetchDataFn.mockResolvedValue({ trucks: [], error: 'Fetch failed' });

      const { result } = renderHook(() =>
        useBaseFoodTruckData<MockTruck, Record<string, unknown>>({}, mockFetchDataFn, []),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Fetch failed');
      expect(result.current.trucks).toEqual([]);
    });

    it('should handle unexpected errors', async () => {
      mockFetchDataFn.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() =>
        useBaseFoodTruckData<MockTruck, Record<string, unknown>>({}, mockFetchDataFn, []),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(result.current.error).toBe('Network error');
      expect(result.current.trucks).toEqual([]);
    });
  });

  describe('refetch', () => {
    it('should refetch data when refetch is called', async () => {
      const trucks1 = [{ id: '1', name: 'Truck 1' }];
      const trucks2 = [{ id: '2', name: 'Truck 2' }];
      mockFetchDataFn
        .mockResolvedValueOnce({ trucks: trucks1, error: null })
        .mockResolvedValueOnce({ trucks: trucks2, error: null });

      const { result } = renderHook(() =>
        useBaseFoodTruckData<MockTruck, Record<string, unknown>>({}, mockFetchDataFn, []),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.trucks).toEqual(trucks1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => expect(result.current.trucks).toEqual(trucks2));
    });

    it('should not refetch if validateParams returns invalid', async () => {
      const validateParams = jest.fn(() => ({ valid: false, error: 'Invalid params' }));

      const { result } = renderHook(() =>
        useBaseFoodTruckData<MockTruck, Record<string, unknown>>(
          {},
          mockFetchDataFn,
          [],
          validateParams,
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(validateParams).toHaveBeenCalled();
    });
  });
});

describe('useBaseFoodTruckDataWithLocationValidation', () => {
  let useBaseFoodTruckDataWithLocationValidation: typeof import('@/hooks/useBaseFoodTruckData').useBaseFoodTruckDataWithLocationValidation;
  const mockFetchDataFn = jest.fn<
    (opts: { lat?: number; lng?: number; radius?: number; includeEvents?: boolean }) => Promise<{
      trucks: MockTruck[];
      error?: string | null;
    }>
  >();

  interface MockTruck {
    id: string;
    name: string;
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('@/hooks/useBaseFoodTruckData');
    useBaseFoodTruckDataWithLocationValidation = module.useBaseFoodTruckDataWithLocationValidation;
  });

  describe('with valid location', () => {
    it('should fetch data when lat and lng are provided', async () => {
      const trucks = [{ id: '1', name: 'Truck 1' }];
      mockFetchDataFn.mockResolvedValue({ trucks, error: null });

      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lat: 40.7128, lng: -74.006, radius: 10 },
          mockFetchDataFn,
          [],
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetchDataFn).toHaveBeenCalledWith({
        lat: 40.7128,
        lng: -74.006,
        radius: 10,
        includeEvents: true,
      });
      expect(result.current.trucks).toEqual(trucks);
    });

    it('should use default radius of 10 if not provided', async () => {
      const trucks = [{ id: '1', name: 'Truck 1' }];
      mockFetchDataFn.mockResolvedValue({ trucks, error: null });

      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lat: 40.7128, lng: -74.006 },
          mockFetchDataFn,
          [],
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetchDataFn).toHaveBeenCalledWith(
        expect.objectContaining({ radius: 10 }),
      );
    });

    it('should use default includeEvents true if not provided', async () => {
      const trucks = [{ id: '1', name: 'Truck 1' }];
      mockFetchDataFn.mockResolvedValue({ trucks, error: null });

      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lat: 40.7128, lng: -74.006 },
          mockFetchDataFn,
          [],
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      expect(mockFetchDataFn).toHaveBeenCalledWith(
        expect.objectContaining({ includeEvents: true }),
      );
    });
  });

  describe('with invalid location', () => {
    it('should not fetch data when lat is missing', async () => {
      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lng: -74.006 },
          mockFetchDataFn,
          [],
        ),
      );

      expect(result.current.loading).toBe(false);
      expect(mockFetchDataFn).not.toHaveBeenCalled();
    });

    it('should not fetch data when lng is missing', async () => {
      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lat: 40.7128 },
          mockFetchDataFn,
          [],
        ),
      );

      expect(result.current.loading).toBe(false);
      expect(mockFetchDataFn).not.toHaveBeenCalled();
    });

    it('should set loading to false when lat or lng is invalid', async () => {
      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lat: 40.7128 },
          mockFetchDataFn,
          [],
        ),
      );

      expect(result.current.loading).toBe(false);
    });
  });

  describe('refetch', () => {
    it('should refetch when refetch is called with valid location', async () => {
      const trucks1 = [{ id: '1', name: 'Truck 1' }];
      const trucks2 = [{ id: '2', name: 'Truck 2' }];
      mockFetchDataFn
        .mockResolvedValueOnce({ trucks: trucks1, error: null })
        .mockResolvedValueOnce({ trucks: trucks2, error: null });

      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lat: 40.7128, lng: -74.006 },
          mockFetchDataFn,
          [],
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.trucks).toEqual(trucks1);

      act(() => {
        result.current.refetch();
      });

      await waitFor(() => expect(mockFetchDataFn).toHaveBeenCalledTimes(2));
    });

    it('should not refetch when location is invalid', async () => {
      const { result } = renderHook(() =>
        useBaseFoodTruckDataWithLocationValidation<MockTruck, Record<string, unknown>>(
          { lat: 40.7128 },
          mockFetchDataFn,
          [],
        ),
      );

      await waitFor(() => expect(result.current.loading).toBe(false));

      act(() => {
        result.current.refetch();
      });

      expect(mockFetchDataFn).not.toHaveBeenCalled();
    });
  });
});
