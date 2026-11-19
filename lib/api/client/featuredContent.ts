import { z } from 'zod';
import type { PublicFoodTruck } from '@/lib/types';

export interface FeaturedContentLocation {
  lat: number;
  lng: number;
}

export interface FeaturedContentRequest {
  readonly url: string;
}

export interface FeaturedContentResponse {
  featuredTrucks: Array<PublicFoodTruck & { score: number; rating?: number; image_url?: string }>;
  trendingItems: Array<{
    id: string;
    name: string;
    rank: number;
    image?: string;
    truck: PublicFoodTruck;
  }>;
}

function isPublicFoodTruck(value: unknown): value is PublicFoodTruck {
  if (typeof value !== 'object' || value === null) return false;
  const truck = value as Record<string, unknown>;
  return typeof truck.id === 'string' && typeof truck.name === 'string';
}

function isFeaturedTruck(value: unknown): boolean {
  if (!isPublicFoodTruck(value)) return false;
  const truck = value as Record<string, unknown>;
  return typeof truck.score === 'number';
}

function isTrendingItem(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.rank === 'number' &&
    isPublicFoodTruck(item.truck)
  );
}

const featuredContentResponseSchema = z.object({
  featuredTrucks: z.array(z.custom(isFeaturedTruck)),
  trendingItems: z.array(z.custom(isTrendingItem)),
});

export function buildFeaturedContentRequest(
  location: FeaturedContentLocation | undefined,
  radiusMiles: number,
): FeaturedContentRequest {
  const params = new URLSearchParams({ radius: String(radiusMiles) });
  if (location) {
    params.set('lat', String(location.lat));
    params.set('lng', String(location.lng));
  }

  return { url: `/api/featured-content?${params.toString()}` };
}

export async function fetchFeaturedContentData(
  location: FeaturedContentLocation | undefined,
  radiusMiles: number,
): Promise<FeaturedContentResponse> {
  const request = buildFeaturedContentRequest(location, radiusMiles);
  const response = await fetch(request.url);
  if (!response.ok) {
    throw new Error(`Featured content request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  return featuredContentResponseSchema.parse(payload) as FeaturedContentResponse;
}
