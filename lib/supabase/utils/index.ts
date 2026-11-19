import { type PostgrestError } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../admin';
import type {
  FoodTruck,
  FoodTruckLocation,
  MenuCategory,
  MenuItem,
  RawMenuItemFromDB,
} from '../types';

import { isMenuItem } from './typeGuards';
import { logError, logWarning } from '@/lib/logging';

function handleSupabaseError(error: PostgrestError | Error, context: string) {
  logWarning(`Error in ${context}: ${error.message}`);
}

function buildCurrentLocation(loc: Partial<FoodTruckLocation> | undefined): FoodTruckLocation {
  const fallback: FoodTruckLocation = {
    lat: 0,
    lng: 0,
    address: 'Unknown',
    timestamp: new Date().toISOString(),
  };
  const lat = typeof loc?.lat === 'number' ? loc.lat : 0;
  const lng = typeof loc?.lng === 'number' ? loc.lng : 0;
  const address =
    typeof loc?.address === 'string' && loc.address !== '' ? loc.address : fallback.address;
  const timestamp =
    typeof loc?.timestamp === 'string' && loc.timestamp !== '' ? loc.timestamp : fallback.timestamp;
  if (lat === 0 || lng === 0) {
    return { ...fallback, address };
  }
  return { lat, lng, address, timestamp };
}

function pickFirstLocation(truck: FoodTruck): Partial<FoodTruckLocation> | undefined {
  if (truck.exact_location) return truck.exact_location;
  if (truck.current_location) return truck.current_location;
  if (truck.city_location) return truck.city_location;
  // Fall back to default_lat/lng columns (commonly used for truck base location)
  if (truck.default_lat && truck.default_lng) {
    return { lat: truck.default_lat, lng: truck.default_lng };
  }
  return undefined;
}

function normalizeTruckLocation(truck: FoodTruck): FoodTruck {
  const loc = pickFirstLocation(truck);
  truck.current_location = buildCurrentLocation(loc) as unknown as FoodTruck['current_location'];
  return truck;
}

function isValidCategory(candidate: unknown): candidate is MenuCategory {
  return (
    typeof candidate === 'object' &&
    candidate != undefined &&
    'name' in (candidate as Record<string, unknown>) &&
    'items' in (candidate as Record<string, unknown>) &&
    Array.isArray((candidate as { items?: unknown[] }).items)
  );
}

function toMenuItem(truckId: string, categoryName: string, item: unknown): MenuItem | undefined {
  if (isMenuItem(item)) {
    const name = typeof item.name === 'string' && item.name !== '' ? item.name : 'Unknown Item';
    const description =
      typeof item.description === 'string' && item.description !== ''
        ? item.description
        : undefined;
    const price =
      typeof item.price === 'number' && !Number.isNaN(item.price) ? item.price : undefined;
    const dietaryTags = Array.isArray(item.dietary_tags) ? item.dietary_tags : [];
    const cat = categoryName === '' ? 'Uncategorized' : categoryName;
    return {
      food_truck_id: truckId,
      category: cat,
      name,
      description,
      price,
      dietary_tags: dietaryTags,
    };
  }
  logWarning(`Skipping invalid menu item: ${JSON.stringify(item)}`);
  return undefined;
}

function prepareMenuItemsForInsert(
  truckId: string,
  menuData: MenuCategory[] | unknown[] | undefined,
) {
  if (!Array.isArray(menuData) || menuData.length === 0) {
    return [] as MenuItem[];
  }

  const categories = (menuData as unknown[]).filter((c): c is MenuCategory => isValidCategory(c));

  const results: MenuItem[] = [];
  for (const category of categories) {
    const items = Array.isArray(category.items) ? category.items : [];
    for (const item of items) {
      const normalized = toMenuItem(
        truckId,
        typeof category.name === 'string' ? category.name : 'Uncategorized',
        item,
      );
      if (normalized) results.push(normalized);
    }
  }
  return results;
}

async function insertMenuItems(truckId: string, menuData: MenuCategory[] | unknown[] | undefined) {
  const supabaseAdmin = getSupabaseAdmin();
  const menuItems = prepareMenuItemsForInsert(truckId, menuData);
  if (menuItems.length === 0) return;
  // Update food_trucks.menu JSONB column instead of separate table
  const { error: menuError } = await supabaseAdmin
    .from('food_trucks')
    .update({ menu: menuItems } as unknown as Record<string, unknown>)
    .eq('id', truckId);
  if (menuError) {
    logError(`Error updating menu for truck ${truckId}`, menuError);
  }
}

// Move these functions here to avoid circular dependencies
function buildMenuByTruck(menuItems: RawMenuItemFromDB[]): Record<string, RawMenuItemFromDB[]> {
  const menuByTruck: Record<string, RawMenuItemFromDB[]> = {};
  for (const item of menuItems) {
    if (typeof item.food_truck_id === 'string' && item.food_truck_id.trim() !== '') {
      menuByTruck[item.food_truck_id] ??= [];
      menuByTruck[item.food_truck_id].push(item);
    }
  }
  return menuByTruck;
}

function groupMenuItems(rawItems: RawMenuItemFromDB[]): MenuCategory[] {
  const byCategory: Record<string, MenuItem[]> = {};
  for (const rawItem of rawItems) {
    const categoryName: string = rawItem.category ?? 'Uncategorized';
    byCategory[categoryName] ??= [];
    const menuItem: MenuItem = {
      name: rawItem.name,
      description: rawItem.description ?? undefined,
      price: rawItem.price ?? undefined,
      dietary_tags: (rawItem.dietary_tags as string[]) ?? [],
    };
    byCategory[categoryName].push(menuItem);
  }
  return Object.entries(byCategory).map(([categoryName, itemsList]: [string, MenuItem[]]) => ({
    name: categoryName,
    items: itemsList,
  }));
}

export {
  handleSupabaseError,
  normalizeTruckLocation,
  prepareMenuItemsForInsert,
  insertMenuItems,
  buildMenuByTruck,
  groupMenuItems,
};

export {
  uploadTruckPhoto,
  deleteTruckPhoto,
  updateTruckWithPhoto,
  removeTruckPhoto,
} from './truckPhotoService';
export { calculateDistance } from '@/lib/utils/geoUtils';
