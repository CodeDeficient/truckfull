import type { MenuCategory, FoodTruck } from '../types';
import { isMenuCategory, isMenuItem } from './typeGuards';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { handleSupabaseError } from './index';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { logDebug, logError, logWarning } from '@/lib/logging';

export interface UpdateTruckDataOptions {
  /**
   * Optimistic-concurrency snapshot of `operating_hours` taken before the
   * update was derived. When present, the write only lands if the stored
   * column still equals this value (structural JSON equality); zero matched
   * rows returns `OPERATING_HOURS_CONFLICT` instead of silently overwriting
   * a concurrent Facebook write.
   */
  expectedOperatingHours?: unknown;
}

export async function updateTruckData(
  id: string,
  updatesWithoutMenu: Partial<FoodTruck>,
  options?: UpdateTruckDataOptions,
): Promise<FoodTruck | { error: string }> {
  logDebug('🔍 updateTruckData - ID:', id);
  logDebug('🔍 updateTruckData - Updates:', JSON.stringify(updatesWithoutMenu, null, 2));

  const hasCasPredicate = 'expectedOperatingHours' in (options ?? {});
  const expected = options?.expectedOperatingHours;
  let query = getSupabaseAdmin()
    .from('food_trucks')
    .update(updatesWithoutMenu as Record<string, unknown>)
    .eq('id', id);
  if (hasCasPredicate) {
    query =
      expected === null || expected === undefined
        ? query.is('operating_hours', null)
        : query.filter('operating_hours', 'eq', JSON.stringify(expected));
  }
  // `.single()` errors on zero rows (PGRST116), which cannot distinguish a
  // lost concurrency race from a hard failure. `.maybeSingle()` returns
  // data: null + no error for zero matched rows, so the CAS path can report
  // the race as a conflict and let the caller re-derive and retry.
  const { data: truck, error }: PostgrestSingleResponse<FoodTruck | null> = await query
    .select()
    .maybeSingle();

  if (error) {
    logError('🔍 updateTruckData - ERROR:', error);
    logError('🔍 updateTruckData - Error code:', error.code);
    logError('🔍 updateTruckData - Error details:', error.details);
    logError('🔍 updateTruckData - Error hint:', error.hint);
    handleSupabaseError(error, 'updateTruckData');
    return { error: 'Failed to update truck data.' };
  }

  if (truck === null) {
    // Zero matched rows: under a CAS predicate this is a lost race; without
    // one it means the truck row vanished mid-request, which the caller
    // surfaces as a generic failure.
    if (hasCasPredicate) {
      return { error: 'OPERATING_HOURS_CONFLICT' };
    }
    return { error: 'Failed to update truck data.' };
  }

  logDebug('🔍 updateTruckData - SUCCESS, returned data:', truck ? 'has data' : 'null');
  logDebug('🔍 updateTruckData - Website in returned data:', truck?.contact_info);
  return truck;
}

export async function updateTruckMenu(
  id: string,
  menuData: MenuCategory[] | unknown[],
): Promise<void> {
  // Convert MenuCategory[] format to flat MenuItem[] format for JSONB storage
  const flatMenuItems = (menuData ?? []).flatMap((category: unknown) => {
    if (!isMenuCategory(category)) {
      logWarning(`Skipping invalid category in updateTruckMenu: ${JSON.stringify(category)}`);
      return [];
    }

    return (category.items ?? []).map((item: unknown) => {
      if (!isMenuItem(item)) {
        logWarning(`Skipping invalid menu item in updateTruckMenu: ${JSON.stringify(item)}`);
        return {
          category: category.name ?? 'Uncategorized',
          name: 'Unknown Item',
          description: undefined,
          price: undefined,
          dietary_info: [],
        };
      }

      return {
        category: category.name ?? 'Uncategorized',
        name: item.name ?? 'Unknown Item',
        description: item.description ?? undefined,
        price: typeof item.price === 'number' ? item.price : undefined,
        dietary_info: Array.isArray(item.dietary_tags) ? item.dietary_tags : [],
        is_popular: item.is_popular ?? false,
      };
    });
  });

  // Update the food_trucks.menu JSONB column directly
  const { error } = await getSupabaseAdmin()
    .from('food_trucks')
    .update({ menu: flatMenuItems } as unknown as Record<string, unknown>)
    .eq('id', id);

  if (error) {
    logError(`Error updating menu for truck ${id}`, error);
  }
}
