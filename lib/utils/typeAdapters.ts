import type { FoodTruck } from '@/lib/types';

// Minimal shape used across admin detail components to avoid `any` propagation
export type ComponentTruck = {
  id: string;
  name: string;
  description?: string;
  cuisine_type?: string[];
  price_range?: string;
  specialties?: string[];
  data_quality_score?: number;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
  current_location?: { address?: string; lat?: number; lng?: number; timestamp?: string };
};

// Narrow unknown Json current_location into a safe shape
function parseCurrentLocation(input: unknown): ComponentTruck['current_location'] {
  if (input == undefined || typeof input !== 'object') return undefined;
  const rec = input as Record<string, unknown>;
  const address = typeof rec.address === 'string' ? rec.address : undefined;
  const lat = typeof rec.lat === 'number' ? rec.lat : undefined;
  const lng = typeof rec.lng === 'number' ? rec.lng : undefined;
  const timestamp = typeof rec.timestamp === 'string' ? rec.timestamp : undefined;
  if (address == undefined && lat == undefined && lng == undefined && timestamp == undefined)
    return undefined;
  return { address, lat, lng, timestamp };
}

/**
 * Adapts a FoodTruck object from database types (using null) to component types (using undefined)
 * This resolves the TypeScript error where string | null is not assignable to string | undefined
 */
export function adaptFoodTruckForComponents(truck: FoodTruck): ComponentTruck {
  return {
    id: truck.id,
    name: truck.name,
    description: truck.description ?? undefined,
    cuisine_type: truck.cuisine_type ?? undefined,
    price_range: undefined,
    specialties: undefined,
    data_quality_score: truck.data_quality_score ?? undefined,
    verification_status: truck.verification_status ?? undefined,
    created_at: truck.created_at ?? undefined,
    updated_at: truck.updated_at ?? undefined,
    current_location: parseCurrentLocation(truck.current_location as unknown),
  };
}

/**
 * Converts null values to undefined for better compatibility with React component props
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}
