import { getSupabase } from '../client';
import { getSupabaseAdmin } from '../admin';
import type { FoodTruck } from '../types';
import type { FoodTruckDomain, FoodTruckDomainWithEvents } from '../../types';
import { handleSupabaseError, normalizeTruckLocation, insertMenuItems } from '../utils/index';
import { updateTruckData, updateTruckMenu } from '../utils/menuUtils';

import type { Database, Json } from '../../database.remote.types';
import { fromFoodTruckRow } from '../../mappers/domain';
import { fetchEventsForTrucks as sharedFetchEventsForTrucks } from './foodTruckService.shared';
import {
  _getRawTrucks,
  _getPublicTrucks,
  enrichWithSubscriptionTiers,
  fetchTrucksWithMenu,
  fetchDomainTrucksWithMenu,
  handleTruckListServiceError,
  handleTruckDomainListServiceError,
  fetchTruckByIdWithMenu,
  fetchTruckByIdWithEventsBase,
} from './foodTruckService.helpers';
import { logWarning, logError } from '@/lib/logging';

/**
 * Helper function to check if an owner has exceeded their truck ownership limit
 * Note: Database trigger enforces this atomically. This function provides early
 * validation and user-friendly error messages before the insert/update attempt.
 * @param ownerId - The owner's user ID
 * @param errorContextSuffix - Optional suffix for error messages (e.g., "for new owner")
 * @returns Error object if limit exceeded, null otherwise
 */
async function checkTruckOwnershipLimit(
  ownerId: string,
  errorContextSuffix: string = '',
): Promise<{ error: string } | null> {
  const suffix = errorContextSuffix ? ` ${errorContextSuffix}` : '';
  const supabaseAdmin = getSupabaseAdmin();

  // Get owner's profile to check subscription tier
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', ownerId)
    .single();

  if (profileError) {
    return { error: `Failed to verify subscription tier${suffix}.` };
  }

  // Get current count of trucks owned by this user
  const { count, error: countError } = await supabaseAdmin
    .from('food_trucks')
    .select('*', { count: 'exact', head: true })
    .eq('owner_id', ownerId);

  if (countError) {
    return { error: `Failed to check truck limit${suffix}.` };
  }

  // Import tier check utilities to get max trucks allowed
  const { getMaxTrucks } = await import('@/lib/auth/tierCheck');
  const tier = (profile.subscription_tier ||
    'free') as import('@/lib/auth/tierCheck').SubscriptionTier;
  const maxTrucks = getMaxTrucks(tier);

  // Check if the user has exceeded their truck limit
  if (typeof maxTrucks === 'number' && count !== null && count >= maxTrucks) {
    return {
      error: `Truck limit exceeded${suffix}. ${tier} tier allows ${maxTrucks} truck${maxTrucks === 1 ? '' : 's'}.`,
    };
  }

  return null;
}

export const FoodTruckService = {
  async getAllTrucks(
    limit = 5000,
    offset = 0,
  ): Promise<{ trucks: FoodTruck[]; total: number; error?: string }> {
    try {
      return await fetchTrucksWithMenu(limit, offset);
    } catch (error) {
      return handleTruckListServiceError(error, 'getAllTrucks');
    }
  },

  // Public read: query food_trucks directly, enrich subscription_tier from profiles
  async getPublicTrucks(
    limit = 5000,
    offset = 0,
  ): Promise<{ trucks: FoodTruck[]; total: number; error?: string }> {
    try {
      const { data, error, count } = await _getPublicTrucks(limit, offset);
      if (error) throw error as Error;
      const trucks: FoodTruck[] = ((data ?? []) as unknown as FoodTruck[]).map((t) =>
        normalizeTruckLocation(t),
      );
      const enriched = await enrichWithSubscriptionTiers(trucks, getSupabaseAdmin());
      return { trucks: enriched, total: count ?? enriched.length };
    } catch (error) {
      handleSupabaseError(error as Error, 'getPublicTrucks');
      return { trucks: [], total: 0, error: "That didn't work, please try again later." };
    }
  },
  async getPublicTrucksWithEvents(
    limit = 5000,
    offset = 0,
  ): Promise<{ trucks: FoodTruckDomainWithEvents[]; total: number; error?: string }> {
    try {
      const result = await this.getPublicTrucks(limit, offset);
      if ('error' in result) {
        return result as { trucks: FoodTruckDomainWithEvents[]; total: number; error?: string };
      }

      const truckIds = result.trucks.map((truck) => truck.id);
      const eventsByTruck = await sharedFetchEventsForTrucks(getSupabase(), truckIds);

      const trucksWithEvents = result.trucks.map((truck) => ({
        ...truck,
        events: eventsByTruck[truck.id] || [],
      })) as FoodTruckDomainWithEvents[];

      return { trucks: trucksWithEvents, total: result.total };
    } catch (error) {
      handleSupabaseError(error as Error, 'getPublicTrucksWithEvents');
      return { trucks: [], total: 0, error: "That didn't work, please try again later." };
    }
  },
  async getTruckById(id: string): Promise<FoodTruck | { error: string }> {
    return await fetchTruckByIdWithMenu(id, getSupabaseAdmin);
  },

  async createTruck(truckData: Partial<FoodTruck>): Promise<FoodTruck | { error: string }> {
    // Check truck limit for owner if owner_id is provided
    if (truckData.owner_id) {
      const limitError = await checkTruckOwnershipLimit(truckData.owner_id as string);
      if (limitError) {
        return limitError;
      }
    }

    const { menu: menuData, ...truckDataWithoutMenu } = truckData as Partial<FoodTruck> & {
      menu?: unknown;
    };
    const truckDataWithoutMenuTyped =
      truckDataWithoutMenu as unknown as Database['public']['Tables']['food_trucks']['Insert'];
    const { data: truck, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .insert([truckDataWithoutMenuTyped])
      .select()
      .single();
    if (error) {
      handleSupabaseError(error, 'createTruck');
      return { error: 'Failed to create truck.' };
    }
    await insertMenuItems(truck.id, menuData);
    return truck as unknown as FoodTruck;
  },

  async upsert(truckData: Partial<FoodTruck>): Promise<FoodTruck | { error: string }> {
    if (truckData.id) {
      // This is an update operation, check if owner is changing and validate limits
      if (truckData.owner_id) {
        // Get the existing truck to see if the owner is changing
        const { data: existingTruck, error: fetchError } = await getSupabaseAdmin()
          .from('food_trucks')
          .select('owner_id')
          .eq('id', truckData.id)
          .single();

        if (!fetchError && existingTruck && existingTruck.owner_id !== truckData.owner_id) {
          // Owner is changing, validate the new owner's limit
          const limitError = await checkTruckOwnershipLimit(
            truckData.owner_id as string,
            'for new owner',
          );
          if (limitError) {
            return limitError;
          }
        }
      }
    } else {
      // This is a create operation, check truck limit
      if (truckData.owner_id) {
        const limitError = await checkTruckOwnershipLimit(truckData.owner_id as string);
        if (limitError) {
          return limitError;
        }
      }
    }

    const {
      menu: menuData,
      social_media: socialMediaData,
      ...truckDataWithoutMenuAndSocial
    } = truckData;
    // Convert the social_media to Json type for database operations
    const { social_media, ...truckInsertData } = truckDataWithoutMenuAndSocial as unknown as Partial<Database['public']['Tables']['food_trucks']['Insert']>;
    const truckDataWithoutMenuAndSocialTyped = {
      ...truckInsertData,
      social_media: social_media, // Properly typed as Json
    } as Database['public']['Tables']['food_trucks']['Insert'];

    const { data: truck, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .upsert([truckDataWithoutMenuAndSocialTyped])
      .select()
      .single();

    if (error) {
      handleSupabaseError(error, 'upsert');
      return { error: 'Failed to upsert truck.' };
    }

    // Only update menu if menuData is provided
    if (menuData !== undefined) {
      await updateTruckMenu(truck.id, menuData);
    }

    // Only update social media if socialMediaData is provided
    if (socialMediaData !== undefined) {
      const { data: updatedTruck, error: updateError } = await getSupabaseAdmin()
        .from('food_trucks')
        .update({ social_media: socialMediaData as unknown as Json }) // Cast to Json type
        .eq('id', truck.id)
        .select()
        .single();

      if (updateError) {
        handleSupabaseError(updateError, 'upsertSocialMedia');
        return { error: 'Failed to update social media data.' };
      }

      return updatedTruck as unknown as FoodTruck;
    }

    return truck as unknown as FoodTruck;
  },

  async updateTruck(
    id: string,
    updates: Partial<FoodTruck>,
    options?: {
      expectedOperatingHours?: unknown;
    },
  ): Promise<FoodTruck | { error: string }> {
    // Check if owner is being changed and validate truck limit for new owner
    if (updates.owner_id) {
      // Get the existing truck to see if the owner is changing
      const { data: existingTruck, error: fetchError } = await getSupabaseAdmin()
        .from('food_trucks')
        .select('owner_id')
        .eq('id', id)
        .single();

      if (!fetchError && existingTruck && existingTruck.owner_id !== updates.owner_id) {
        const limitError = await checkTruckOwnershipLimit(
          updates.owner_id as string,
          'for new owner',
        );
        if (limitError) {
          return limitError;
        }
      }
    }

    const menuData = updates.menu;
    const updatesWithoutMenu = { ...updates };
    delete updatesWithoutMenu.menu;

    // Handle photo URL - if it exists in social_media, we'll update it properly
    const socialMedia = updatesWithoutMenu.social_media;
    if (socialMedia && typeof socialMedia === 'object' && 'photo_url' in socialMedia) {
      // Make sure other social media fields are preserved
      updatesWithoutMenu.social_media = {
        ...socialMedia,
        photo_url: socialMedia.photo_url,
      };
    }

    const truckResult: FoodTruck | { error: string } = await updateTruckData(
      id,
      updatesWithoutMenu,
      options,
    );
    if ('error' in truckResult) {
      return truckResult;
    }
    if (menuData != undefined) {
      await updateTruckMenu(id, menuData);
    }
    return truckResult;
  },

  async updateTruckLocation(
    id: string,
    lat?: number,
    lng?: number,
    operation: string = 'update',
    address?: string,
    accuracy?: number,
  ): Promise<FoodTruck | { error: string }> {
    try {
      const updates: Record<string, unknown> = {};
      const timestamp = new Date().toISOString();

      // Handle different operations
      switch (operation) {
        case 'go_live': {
          // Set live GPS coordinates (DO NOT overwrite address fields)
          if (lat === undefined || lng === undefined) {
            return { error: 'Coordinates required for go_live operation' };
          }

          // Update dedicated GPS fields
          updates.live_gps_lat = lat;
          updates.live_gps_lng = lng;
          updates.live_gps_accuracy = accuracy;
          updates.live_gps_timestamp = timestamp;
          updates.status = 'live';

          // Update legacy JSONB fields for backwards compatibility
          updates.live_location = {
            lat,
            lng,
            timestamp,
            ...(accuracy && { accuracy }),
          };
          updates.current_location = {
            lat,
            lng,
            timestamp,
            ...(accuracy && { accuracy }),
          };
          break;
        }

        case 'close_shop': {
          // Change status to offline and revert to default location
          updates.status = 'offline';

          // Fetch truck's default location to revert current_location
          const { data: truckData, error: fetchError } = await getSupabaseAdmin()
            .from('food_trucks')
            .select('default_location, street_address, city, state, zip, default_lat, default_lng')
            .eq('id', id)
            .single();

          if (fetchError || !truckData) {
            return { error: 'Failed to fetch truck default location' };
          }

          // Cast to unknown since types don't include new columns yet
          const truck = truckData as unknown as Record<string, unknown>;

          // Revert current_location to default_location (FIX: This was missing!)
          if (truck.default_location && Object.keys(truck.default_location).length > 0) {
            updates.current_location = truck.default_location;
          } else if (truck.default_lat && truck.default_lng) {
            // Use dedicated fields if JSONB is empty
            updates.current_location = {
              lat: truck.default_lat,
              lng: truck.default_lng,
              address:
                [truck.street_address, truck.city, truck.state, truck.zip]
                  .filter(Boolean)
                  .join(', ') || undefined,
            };
          }
          break;
        }

        case 'set_default': {
          // Update default location (manual address entry)
          // IMPORTANT: This should accept address components, not just coordinates
          if (lat === undefined || lng === undefined) {
            return { error: 'Coordinates required for set_default operation' };
          }

          // Update dedicated address fields (if address provided)
          if (address) {
            updates.street_address = address;
          }

          // Update dedicated default coordinate fields
          updates.default_lat = lat;
          updates.default_lng = lng;

          // Update legacy JSONB fields for backwards compatibility
          updates.default_location = {
            lat,
            lng,
            ...(address && { address }),
            timestamp,
          };
          updates.current_location = updates.default_location;
          break;
        }

        default: {
          // Legacy update - updates current_location only
          if (lat === undefined || lng === undefined) {
            return { error: 'Coordinates required for update operation' };
          }
          updates.current_location = {
            lat,
            lng,
            ...(address && { address }),
            timestamp,
          };
          break;
        }
      }

      // Use the existing updateTruck method to update the record
      const result = await FoodTruckService.updateTruck(id, updates);

      if ('error' in result) {
        return result;
      }

      return result;
    } catch (error) {
      logError('updateTruckLocation', error);
      return { error: 'Failed to update truck location' };
    }
  },

  async getDataQualityStats(): Promise<{
    total_trucks: number;
    avg_quality_score: number;
    high_quality_count: number;
    medium_quality_count: number;
    low_quality_count: number;
    verified_count: number;
    pending_count: number;
    flagged_count: number;
  }> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .rpc('get_data_quality_stats' as unknown as never)
        .single();
      if (error) throw error;
      const safe = (data ?? {}) as Partial<{
        total_trucks: number;
        avg_quality_score: number;
        high_quality_count: number;
        medium_quality_count: number;
        low_quality_count: number;
        verified_count: number;
        pending_count: number;
        flagged_count: number;
      }>;
      return {
        total_trucks: typeof safe.total_trucks === 'number' ? safe.total_trucks : 0,
        avg_quality_score: typeof safe.avg_quality_score === 'number' ? safe.avg_quality_score : 0,
        high_quality_count:
          typeof safe.high_quality_count === 'number' ? safe.high_quality_count : 0,
        medium_quality_count:
          typeof safe.medium_quality_count === 'number' ? safe.medium_quality_count : 0,
        low_quality_count: typeof safe.low_quality_count === 'number' ? safe.low_quality_count : 0,
        verified_count: typeof safe.verified_count === 'number' ? safe.verified_count : 0,
        pending_count: typeof safe.pending_count === 'number' ? safe.pending_count : 0,
        flagged_count: typeof safe.flagged_count === 'number' ? safe.flagged_count : 0,
      };
    } catch (error: unknown) {
      logWarning(`Error fetching data quality stats: ${String(error)}`);
      return {
        total_trucks: 0,
        avg_quality_score: 0,
        high_quality_count: 0,
        medium_quality_count: 0,
        low_quality_count: 0,
        verified_count: 0,
        pending_count: 0,
        flagged_count: 0,
      };
    }
  },
  // Domain-level variants
  async getAllTrucksDomain(
    limit = 5000,
    offset = 0,
  ): Promise<{ trucks: FoodTruckDomain[]; total: number; error?: string }> {
    try {
      const { data, error, count } = await _getRawTrucks(limit, offset);
      if (error) throw error;
      const domain = (data ?? []).map((row) =>
        fromFoodTruckRow(row as Database['public']['Tables']['food_trucks']['Row']),
      );
      return { trucks: domain, total: count ?? 0 };
    } catch (error) {
      handleSupabaseError(error as Error, 'getAllTrucksDomain');
      return { trucks: [], total: 0, error: "That didn't work, please try again later." };
    }
  },

  // Domain-level variants with events
  async getAllTrucksDomainWithEvents(
    limit = 5000,
    offset = 0,
  ): Promise<{ trucks: FoodTruckDomainWithEvents[]; total: number; error?: string }> {
    try {
      return await fetchDomainTrucksWithMenu(limit, offset);
    } catch (error) {
      return handleTruckDomainListServiceError(error, 'getAllTrucksDomainWithEvents');
    }
  },

  async getTruckByIdDomain(id: string): Promise<FoodTruckDomain | { error: string }> {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from('food_trucks')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      const row = (data ?? undefined) as
        | Database['public']['Tables']['food_trucks']['Row']
        | undefined;
      if (row == undefined) return { error: "That didn't work, please try again later." };
      return fromFoodTruckRow(row);
    } catch (error) {
      handleSupabaseError(error as Error, 'getTruckByIdDomain');
      return { error: "That didn't work, please try again later." };
    }
  },

  async getTruckByIdDomainWithEvents(
    id: string,
  ): Promise<FoodTruckDomainWithEvents | { error: string }> {
    try {
      const result = await fetchTruckByIdWithEventsBase(
        getSupabaseAdmin(),
        id,
        'food_trucks',
        (data) => fromFoodTruckRow(data as Database['public']['Tables']['food_trucks']['Row']),
      );

      // If result has an error property, return it as is
      if ('error' in result) {
        return result;
      }

      return result.data as unknown as FoodTruckDomainWithEvents;
    } catch (error) {
      handleSupabaseError(error as Error, 'getTruckByIdDomainWithEvents');
      return { error: "That didn't work, please try again later." };
    }
  },
};
