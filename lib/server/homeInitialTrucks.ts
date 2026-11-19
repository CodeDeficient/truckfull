import 'server-only';
import { cache } from 'react';
import { REGION_FALLBACK } from '@/lib/utils/geocoding';
import { searchNearbyTrucks } from '@/lib/api/trucks/cachedNearbySearch';
import type { TruckFromRPC } from '@/lib/api/trucks/fetchNearbyTrucks';
import { ANONYMOUS_MAX_RADIUS_MILES } from '@/lib/api/trucks/radiusLimits';
import { logError } from '@/lib/logging';

export const HOME_SEED_RADIUS_MILES = ANONYMOUS_MAX_RADIUS_MILES;

const FIELDS_UNREAD_BY_FINDER = ['specialties'] as const;

export function toHomeSeedRow(truck: TruckFromRPC): TruckFromRPC {
  const row: TruckFromRPC = { ...truck };
  for (const field of FIELDS_UNREAD_BY_FINDER) delete row[field];
  return row;
}

export interface HomeInitialData {
  readonly lat: number;
  readonly lng: number;
  readonly radiusMiles: number;
  readonly trucks: TruckFromRPC[];
}

async function loadHomeInitialData(): Promise<HomeInitialData> {
  const { lat, lng } = REGION_FALLBACK;
  try {
    const trucks = await searchNearbyTrucks(lat, lng, HOME_SEED_RADIUS_MILES);
    return {
      lat,
      lng,
      radiusMiles: HOME_SEED_RADIUS_MILES,
      trucks: trucks.map((truck) => toHomeSeedRow(truck)),
    };
  } catch (error) {
    logError('getHomeInitialData', error);
    return { lat, lng, radiusMiles: HOME_SEED_RADIUS_MILES, trucks: [] };
  }
}

export const getHomeInitialData = cache(loadHomeInitialData);
