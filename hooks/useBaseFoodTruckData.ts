import { useState, useEffect } from 'react';

// Base options interface
interface BaseOptions<T> {
  mockData?: T[];
  limit?: number;
  offset?: number;
}

// Options for hooks that include events
interface WithEventsOptions {
  includeEvents?: boolean;
}

// Options for location-based hooks
interface LocationOptions {
  lat?: number;
  lng?: number;
  radius?: number;
}

// Base result interface
interface BaseResult<T> {
  trucks: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Function type for fetching data
type FetchFunction<T> = () => Promise<{
  trucks: T[];
  error?: string | null;
}>;

// Combined options type for location-based fetch
interface LocationFetchOptions {
  lat?: number;
  lng?: number;
  radius?: number;
  includeEvents?: boolean;
}

// Internal shared function for data fetching logic
const internalFetchData = async <T>(
  mockData: T[] | undefined,
  fetchDataFn: () => Promise<{ trucks: T[]; error?: string | null }>,
  setTrucks: React.Dispatch<React.SetStateAction<T[]>>,
  setLoading: React.Dispatch<React.SetStateAction<boolean>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  validateParams?: () => { valid: boolean; error?: string },
): Promise<void> => {
  // If validation function is provided, check params first
  if (validateParams) {
    const validation = validateParams();
    if (!validation.valid) {
      setError(validation.error ?? 'Invalid parameters');
      setLoading(false);
      return;
    }
  }

  try {
    setLoading(true);
    setError(null);

    // If mock data is provided, use it instead of making a real API call
    if (mockData && mockData.length > 0) {
      setTrucks(mockData);
    } else {
      // Fetch data using the provided function
      const result = await fetchDataFn();

      if (result.error) {
        setError(result.error);
        setTrucks([]);
      } else {
        setTrucks(result.trucks);
      }
    }
  } catch (error_) {
    setError(
      error_ instanceof Error
        ? (error_.message ?? 'Failed to fetch food trucks')
        : 'Failed to fetch food trucks',
    );
    setTrucks([]);
  } finally {
    setLoading(false);
  }
};

// Create the base hook
export const useBaseFoodTruckData = <
  T,
  O extends BaseOptions<T> & WithEventsOptions & LocationOptions,
>(
  options: O,
  fetchDataFn: FetchFunction<T>,
  dependencies: React.DependencyList,
  validateParams?: () => { valid: boolean; error?: string },
): BaseResult<T> => {
  const { mockData } = options;

  const [trucks, setTrucks] = useState<T[]>(mockData ?? []);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    await internalFetchData(mockData, fetchDataFn, setTrucks, setLoading, setError, validateParams);
  };

  // Run the fetch
  useEffect(() => {
    void fetchData();
  }, dependencies);

  return {
    trucks,
    loading,
    error,
    refetch: () => {
      // If validation function is provided, check params before refetching
      if (validateParams) {
        const validation = validateParams();
        if (validation.valid) {
          void fetchData();
        }
      } else {
        void fetchData();
      }
    },
  };
};

// Specific implementation for location-based validation
export const useBaseFoodTruckDataWithLocationValidation = <
  T,
  O extends BaseOptions<T> & WithEventsOptions & LocationOptions,
>(
  options: O,
  fetchDataFn: (locationOpts: LocationFetchOptions) => Promise<{
    trucks: T[];
    error?: string | null;
  }>,
  dependencies: React.DependencyList,
): BaseResult<T> => {
  const { mockData, includeEvents = true, lat, lng, radius = 10 } = options;

  const [trucks, setTrucks] = useState<T[]>(mockData ?? []);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const validateParams = () => {
    const isValid = typeof lat === 'number' && typeof lng === 'number';
    return {
      valid: isValid,
      error: isValid ? undefined : 'Valid latitude and longitude are required',
    };
  };

  const fetchData = async () => {
    await internalFetchData(
      mockData,
      () => fetchDataFn({ lat, lng, radius, includeEvents }), // Call fetchDataFn with location options
      setTrucks,
      setLoading,
      setError,
      validateParams,
    );
  };

  // Run the fetch, only when lat and lng are valid
  useEffect(() => {
    if (typeof lat === 'number' && typeof lng === 'number') {
      void fetchData();
    } else {
      setLoading(false);
    }
  }, dependencies);

  return {
    trucks,
    loading,
    error,
    refetch: () => {
      if (typeof lat === 'number' && typeof lng === 'number') {
        void fetchData();
      }
    },
  };
};
