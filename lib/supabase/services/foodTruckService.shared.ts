import type { TimezoneAwareEvent, FoodTruckDomain, FoodTruckDomainWithEvents } from '../../types';
import type { RawMenuItemFromDB, FoodTruck } from '../types';
import { groupMenuItems, buildMenuByTruck } from '../utils/index';
import { logError } from '@/lib/logging';

/**
 * Shared helper function to fetch events for multiple trucks
 */
export async function fetchEventsForTrucks(
  supabaseClient: ReturnType<typeof import('../client').getSupabase>,
  truckIds: string[],
): Promise<Record<string, TimezoneAwareEvent[]>> {
  if (truckIds.length === 0) {
    return {};
  }

  try {
    const { data: events, error } = await supabaseClient
      .from('events')
      .select('*')
      .in('food_truck_id', truckIds)
      .order('date', { ascending: true })
      .order('time', { ascending: true });

    if (error) {
      logError('Error fetching events:', error);
      return {};
    }

    const eventsByTruck = initializeEventsByTruckMap(truckIds);

    const timezoneAwareEvents = (events ?? []).map((row: Record<string, unknown>) =>
      transformEventRowToTimezoneAwareEvent(row),
    );

    return groupEventsByTruckId(timezoneAwareEvents, eventsByTruck);
  } catch (error) {
    logError('Error in fetchEventsForTrucks:', error);
    return {};
  }
}

/**
 * Shared function to fetch menu items for trucks
 * @deprecated Menu data now comes from food_trucks.menu JSONB column, not separate table
 */
export async function fetchMenuItemsForTrucks(
  _supabaseClient: ReturnType<typeof import('../client').getSupabase>,
  _truckIds: string[],
): Promise<RawMenuItemFromDB[]> {
  // Menu data is now in food_trucks.menu JSONB column, returned directly by PostGIS
  // The menu_items table has been removed
  return [];
}

/**
 * Pure function to initialize events map with truck IDs
 */
export function initializeEventsByTruckMap(truckIds: string[]): Record<string, TimezoneAwareEvent[]> {
  const eventsByTruck: Record<string, TimezoneAwareEvent[]> = {};
  for (const id of truckIds) {
    eventsByTruck[id] = [];
  }
  return eventsByTruck;
}

/**
 * Pure function to transform raw event row to TimezoneAwareEvent
 */
export function transformEventRowToTimezoneAwareEvent(
  row: Record<string, unknown>,
): TimezoneAwareEvent {
  return {
    id: row.id as string,
    food_truck_id: row.food_truck_id as string,
    title: (row.title as string | null) ?? (row.location as string) ?? '',
    description: (row.description as string | null) ?? '',
    start_time: (row.time as string | null) ?? '',
    end_time: (row.end_time as string | null) ?? '',
    timezone: 'America/New_York',
    location: {
      address: (row.location as string | null) ?? '',
      lat: (row.location_lat as number | null) ?? 0,
      lng: (row.location_lng as number | null) ?? 0,
    },
    is_recurring: false,
    recurrence_pattern: '',
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

/**
 * Pure function to group events by truck ID
 */
export function groupEventsByTruckId(
  events: TimezoneAwareEvent[],
  eventsByTruck: Record<string, TimezoneAwareEvent[]>,
): Record<string, TimezoneAwareEvent[]> {
  const result = { ...eventsByTruck };
  for (const event of events) {
    const truckId = event.food_truck_id;
    if (truckId && result[truckId]) {
      result[truckId].push(event);
    } else if (truckId) {
      result[truckId] = [event];
    }
  }
  return result;
}

/**
 * Shared function to build trucks with menu for FoodTruckDomain
 */
export function buildTrucksWithMenu(
  trucks: Array<FoodTruckDomain>,
  menuItems: RawMenuItemFromDB[],
): Array<FoodTruckDomain> {
  const menuByTruck = buildMenuByTruck(menuItems);
  return trucks.map((truck) => {
    const menu = groupMenuItems(menuByTruck[truck.id] ?? []);
    return {
      ...truck,
      menu,
    };
  });
}

/**
 * Shared function to build trucks with menu for FoodTruck (server-side type)
 */
export function buildTrucksWithMenuForFoodTruck(
  trucks: Array<FoodTruck>,
  menuItems: RawMenuItemFromDB[],
): Array<FoodTruck> {
  const menuByTruck = buildMenuByTruck(menuItems);
  // Enhanced version with explicit handling of menu assignment
  return trucks.map((truck) => {
    const truckMenu = groupMenuItems(menuByTruck[truck.id] ?? []);
    return {
      ...truck,
      menu: truckMenu,
    };
  });
}

/**
 * Shared function to combine trucks with their events
 */
export function combineTrucksWithEvents(
  trucks: FoodTruckDomain[],
  eventsByTruck: Record<string, TimezoneAwareEvent[]>,
): FoodTruckDomainWithEvents[] {
  return trucks.map((truck) => ({
    ...truck,
    events: eventsByTruck[truck.id] || [],
  })) as FoodTruckDomainWithEvents[];
}

/**
 * Shared function to build trucks with menu from PostGIS data (handles untyped raw object data)
 */
export function buildTrucksWithMenuFromPostgis(
  postgisData: Array<{ id: string; [key: string]: unknown }>,
  menuItems: RawMenuItemFromDB[],
): Array<{ id: string; menu: unknown; [key: string]: unknown }> {
  return postgisData.map((truck) => {
    const menu = groupMenuItems(menuItems.filter((item) => item.food_truck_id === truck.id));
    return {
      ...truck,
      menu,
    };
  });
}
