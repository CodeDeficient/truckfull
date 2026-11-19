/**
 * Source Tracker Service
 * Determines if updates should be allowed based on source and timing
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage } from '@/lib/logging';

export interface SourceTrackingResult {
  allowUpdate: boolean;
  reason?: string;
}
type UpdateType = 'menu' | 'location' | 'schedule';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function shouldAllowUpdate(
  truckId: string,
  updateType: UpdateType,
  supabase?: ReturnType<typeof getSupabaseAdmin>,
): Promise<SourceTrackingResult> {
  try {
    const client = supabase ?? getSupabaseAdmin();

    const { data: truck, error } = await client
      .from('food_trucks')
      .select(
        'id, menu_updated_by, menu_updated_at, location_updated_by, location_updated_at, schedule_updated_by, schedule_updated_at, facebook_auto_updates_enabled',
      )
      .eq('id', truckId)
      .single();

    if (error) {
      logMessage('Failed to fetch truck for source tracking', { truckId, error: error.message });
      return { allowUpdate: false, reason: 'Failed to fetch truck data' };
    }

    if (!truck) {
      return { allowUpdate: false, reason: 'Truck not found' };
    }

    if (truck.facebook_auto_updates_enabled === false) {
      return { allowUpdate: false, reason: 'Facebook auto-updates disabled for this truck' };
    }

    const now = new Date();

    switch (updateType) {
      case 'menu': {
        return checkMenuUpdate(truck, now);
      }

      case 'location': {
        // Truck-wide freshness gates removed: recurring FB arbitration is
        // per-day, per-unit in truckUpdater.updateSchedule.
        return { allowUpdate: true };
      }

      case 'schedule': {
        return { allowUpdate: true };
      }

      default: {
        return { allowUpdate: false, reason: 'Unknown update type' };
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMessage('Error in shouldAllowUpdate', { truckId, updateType, error: errorMessage });
    return { allowUpdate: false, reason: 'Internal error checking update permissions' };
  }
}

export async function isFacebookAutoUpdateEnabled(
  truckId: string,
  supabase?: ReturnType<typeof getSupabaseAdmin>,
): Promise<SourceTrackingResult> {
  try {
    const client = supabase ?? getSupabaseAdmin();

    const { data: truck, error } = await client
      .from('food_trucks')
      .select('id, facebook_auto_updates_enabled')
      .eq('id', truckId)
      .single();

    if (error) {
      logMessage('Failed to fetch truck for auto-update toggle check', { truckId, error: error.message });
      return { allowUpdate: false, reason: 'Failed to fetch truck data' };
    }

    if (!truck) {
      return { allowUpdate: false, reason: 'Truck not found' };
    }

    if (truck.facebook_auto_updates_enabled === false) {
      return { allowUpdate: false, reason: 'Facebook auto-updates disabled for this truck' };
    }

    return { allowUpdate: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logMessage('Error in isFacebookAutoUpdateEnabled', { truckId, error: errorMessage });
    return { allowUpdate: false, reason: 'Internal error checking update permissions' };
  }
}

function checkMenuUpdate(
  truck: {
    menu_updated_by: string | null;
    menu_updated_at: string | null;
    facebook_auto_updates_enabled: boolean | null;
  },
  now: Date,
): SourceTrackingResult {
  if (truck.menu_updated_by === 'manual' && truck.menu_updated_at) {
    const lastUpdate = new Date(truck.menu_updated_at);
    const msSinceUpdate = now.getTime() - lastUpdate.getTime();

    if (msSinceUpdate < SEVEN_DAYS_MS) {
      const daysSinceUpdate = Math.floor(msSinceUpdate / (24 * 60 * 60 * 1000));
      return {
        allowUpdate: false,
        reason: `Menu was manually updated ${daysSinceUpdate} days ago (within 7-day override window)`,
      };
    }
  }

  return { allowUpdate: true };
}
