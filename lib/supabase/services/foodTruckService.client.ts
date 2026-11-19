import type { FoodTruckDomain } from '@/lib/types';
import { handleSupabaseError } from '../utils/client.ts';
import { fromPublicViewToDomain } from '@/lib/mappers/publicView';
import type { PostgrestError } from '@supabase/supabase-js';
import type { FoodTruckPublicView } from '@/lib/types/foodTruckPublicView';
import type { Database } from '@/lib/database.remote.types';
import { fromFoodTruckRow } from '@/lib/mappers/domain';
import { logError } from '@/lib/logging';
import {
  buildCurrentDaySchedule,
  previousDateKey,
  addDaysToDateKey,
  type CurrentDayScheduleOverride,
} from '@/lib/services/currentDaySchedule';
import {
  currentDayRecurrenceKey,
  type PublicScheduleRecurrencesResponse,
} from '@/lib/services/publicScheduleRecurrence';
import { fetchSchedulesViaApi, type PublicSchedules } from '@/lib/services/truckScheduleQueries';
import { type NearbySeed, seedCoversSearch } from '@/lib/filters/nearbyLoadPlan';
import { narrowToRadius } from '@/lib/api/trucks/nearbyCells';

const CURRENT_SCHEDULES_ENDPOINT = '/api/trucks/current-schedules';
const PUBLIC_TRUCK_LIST_ENDPOINT = '/api/trucks/public';
const UPCOMING_OVERRIDE_DAYS = 7;

async function enrichTrucksWithCurrentDaySchedule(
  trucks: FoodTruckDomain[],
): Promise<FoodTruckDomain[]> {
  const now = new Date();
  const serviceDates = new Map<string, string>();
  const previousServiceDates = new Map<string, string>();
  const upcomingRanges = new Map<string, { from: string; to: string }>();
  for (const truck of trucks) {
    const current = buildCurrentDaySchedule(truck, now, null);
    if (current) {
      serviceDates.set(truck.id, current.serviceDate);
      const previous = previousDateKey(current.serviceDate);
      if (previous) previousServiceDates.set(truck.id, previous);
      const to = addDaysToDateKey(current.serviceDate, UPCOMING_OVERRIDE_DAYS - 1);
      if (to) upcomingRanges.set(truck.id, { from: current.serviceDate, to });
    }
  }

  if (serviceDates.size === 0) return trucks;

  const allServiceDates = [...new Set([...serviceDates.values(), ...previousServiceDates.values()])];
  const upcomingFrom = [...upcomingRanges.values()].map((range) => range.from).sort()[0];
  const upcomingTo = [...upcomingRanges.values()]
    .map((range) => range.to)
    .sort()
    .at(-1);
  const schedules = await fetchCurrentDaySchedules(
    [...serviceDates.keys()],
    allServiceDates,
    upcomingTo,
  );
  const currentDates = new Set(allServiceDates);
  const overrides = schedules.overrides.filter((override) =>
    currentDates.has(override.service_date),
  );
  const upcomingOverrides =
    upcomingFrom && upcomingTo
      ? schedules.overrides.filter(
          (override) =>
            override.service_date >= upcomingFrom && override.service_date <= upcomingTo,
        )
      : [];
  const { recurrences } = schedules;
  const overridesByTruckDate = new Map(
    overrides.map((override) => [`${override.food_truck_id}:${override.service_date}`, override]),
  );
  const upcomingByTruck = new Map<string, CurrentDayScheduleOverride[]>();
  for (const override of upcomingOverrides) {
    const list = upcomingByTruck.get(override.food_truck_id) ?? [];
    list.push(override);
    upcomingByTruck.set(override.food_truck_id, list);
  }

  return trucks.map((truck) => {
    const serviceDate = serviceDates.get(truck.id);
    if (!serviceDate) return truck;
    const previousServiceDate = previousServiceDates.get(truck.id);
    const current = buildCurrentDaySchedule(
      truck,
      now,
      overridesByTruckDate.get(`${truck.id}:${serviceDate}`) ?? null,
      previousServiceDate
        ? (overridesByTruckDate.get(`${truck.id}:${previousServiceDate}`) ?? null)
        : null,
      recurrences[currentDayRecurrenceKey(truck.id, serviceDate)] ?? null,
      previousServiceDate
        ? (recurrences[currentDayRecurrenceKey(truck.id, previousServiceDate)] ?? null)
        : null,
    );
    const upcoming = upcomingByTruck.get(truck.id) ?? [];
    if (!current) return truck;
    // Preserve words-only dated locations for display; consumers independently
    // require coordinates before relocating the map marker.
    const dayLocation = current.location;
    const currentDayLocation = dayLocation
      ? {
          lat: dayLocation.lat,
          lng: dayLocation.lng,
          address: dayLocation.address,
          city: dayLocation.city,
          state: dayLocation.state,
        }
      : null;
    return {
      ...truck,
      current_day_hours: current.hours,
      current_day_service_date: current.hoursServiceDate,
      current_day_location: currentDayLocation,
      upcoming_overrides: upcoming,
    };
  });
}

async function fetchCurrentDaySchedules(
  truckIds: string[],
  serviceDates: string[],
  overridesToDate: string | undefined,
): Promise<PublicSchedules> {
  const sortedDates = [...serviceDates].sort();
  const fromDate = sortedDates[0];
  if (truckIds.length === 0 || !fromDate) return { recurrences: {}, overrides: [] };
  const toDate = sortedDates.at(-1) ?? fromDate;
  try {
    return await fetchSchedulesViaApi(
      async (request) => {
        const response = await fetch(CURRENT_SCHEDULES_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        if (!response.ok) throw new Error(`Current schedules API returned ${response.status}`);
        return (await response.json()) as PublicScheduleRecurrencesResponse;
      },
      truckIds,
      fromDate,
      toDate,
      overridesToDate && overridesToDate > toDate ? overridesToDate : toDate,
    );
  } catch (error) {
    logError('Current-day schedule enrichment failed; preserving recurring hours', error);
    return { recurrences: {}, overrides: [] };
  }
}

/**
 * Client-side Food Truck Service
 * This service is safe to use in client components as it only imports client modules
 */
export class FoodTruckServiceClient {
  /**
   * Helper method to fetch public trucks from the database
   */
  private static async _fetchPublicTrucks(limit: number, offset: number) {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    const response = await fetch(`${PUBLIC_TRUCK_LIST_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      throw new Error(`Public truck list API returned ${response.status}`);
    }
    const body = (await response.json()) as { trucks?: FoodTruckPublicView[] };
    const trucks = (body.trucks ?? []).map((item) => fromPublicViewToDomain(item));

    const withCurrentDaySchedule = await enrichTrucksWithCurrentDaySchedule(trucks);
    return { trucks: withCurrentDaySchedule, totalCount: withCurrentDaySchedule.length };
  }

  /**
   * Get public food trucks with pagination
   */
  static async getPublicTrucks(limit: number = 500, offset: number = 0) {
    try {
      return await this._fetchPublicTrucks(limit, offset);
    } catch (error) {
      return this._handleSupabaseError(error, 'getPublicTrucks');
    }
  }

  /**
   * Get food trucks by location using PostGIS via API route
   */
  private static _rowsFromSeed(
    seed: NearbySeed,
    lat: number,
    lng: number,
    radiusMiles: number,
  ): { rows: unknown[]; totalCount: number } {
    const rows = narrowToRadius(seed.trucks, { lat, lng }, radiusMiles);
    return { rows, totalCount: rows.length };
  }

  private static async _fetchNearbyRows(
    lat: number,
    lng: number,
    radiusMiles: number,
  ): Promise<{ rows: unknown[]; totalCount: number }> {
    const response = await fetch('/api/trucks/nearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lat,
        lng,
        radiusMiles,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logError(`❌ API route error: ${response.status}`, errorText);
      throw new Error(`API route error: ${response.status} ${response.statusText}`);
    }

    const result: { error?: string; trucks?: FoodTruckDomain[]; totalCount?: number } =
      await response.json();

    if (result.error) {
      logError('❌ API route returned error:', result.error);
      throw new Error(
        typeof result.error === 'string' ? result.error : 'API route returned an error',
      );
    }

    return { rows: result.trucks ?? [], totalCount: result.totalCount ?? 0 };
  }

  static async getTrucksByLocation(
    lat: number,
    lng: number,
    radiusMiles: number = 10,
    seed?: NearbySeed,
  ) {
    try {
      const { rows, totalCount } = seedCoversSearch(seed, { lat, lng }, radiusMiles)
        ? this._rowsFromSeed(seed, lat, lng, radiusMiles)
        : await this._fetchNearbyRows(lat, lng, radiusMiles);

      const trucks = rows.map((t: unknown) =>
        fromFoodTruckRow(t as Database['public']['Tables']['food_trucks']['Row']),
      );
      const withCurrentDaySchedule = await enrichTrucksWithCurrentDaySchedule(trucks);
      return {
        trucks: withCurrentDaySchedule,
        totalCount,
      };
    } catch (error) {
      logError('💥 Error in getTrucksByLocation:', error);
      throw error;
    }
  }

  /**
   * Shared error handling method
   */
  private static _handleSupabaseError(error: unknown, operation: string) {
    handleSupabaseError(error as PostgrestError | Error, operation);
    return {
      trucks: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : ('Unknown error' as string),
    };
  }

  /**
   * Increment view count for a truck
   */
  static async incrementView(truckId: string): Promise<void> {
    if (!truckId) return;

    // Fire and forget - don't await result
    fetch(`/api/trucks/${truckId}/view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true, // Ensures request completes even if page unloads
    }).catch((error) => {
      // Silent fail for analytics
      console.error('Failed to increment view:', error);
    });
  }
}

/**
 * Alias for FoodTruckServiceClient - backward compatibility export
 * @deprecated Use FoodTruckServiceClient instead
 */
export const FoodTruckService = FoodTruckServiceClient;
