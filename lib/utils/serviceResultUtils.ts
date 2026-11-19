import type { FoodTruckDomainWithEvents } from '@/lib/types';

interface ServiceResult {
  trucks?: unknown[];
  error?: unknown;
}

export function normalizeServiceResult(result: ServiceResult): {
  trucks: FoodTruckDomainWithEvents[];
  error: string | null;
} {
  // Normalize the result to match expected format
  if ('error' in result) {
    const errorResult = result as { error: unknown };
    // Handle different error formats from different service methods
    let errorMessage: string;
    if (typeof errorResult.error === 'string') {
      errorMessage = errorResult.error;
    } else if (
      errorResult.error &&
      typeof errorResult.error === 'object' &&
      Object.keys(errorResult.error).length > 0
    ) {
      errorMessage = JSON.stringify(errorResult.error);
    } else {
      errorMessage = 'Unknown error';
    }
    return { trucks: [], error: errorMessage };
  }

  if (!result.trucks) {
    return { trucks: [], error: 'No trucks returned' };
  }

  // Transform the trucks to ensure non-nullable fields
  const normalizedTrucks = result.trucks.map((truck) => ({
    ...(truck as Record<string, unknown>),
    description: (truck as Record<string, unknown>).description ?? '',
    created_at: (truck as Record<string, unknown>).created_at ?? '',
    updated_at: (truck as Record<string, unknown>).updated_at ?? '',
    cuisine_type: (truck as Record<string, unknown>).cuisine_type ?? [],
  })) as FoodTruckDomainWithEvents[];

  return { trucks: normalizedTrucks, error: null };
}
