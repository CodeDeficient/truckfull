import { INTERNAL_TRUCK_FIELDS } from '@/lib/types';
import type { FoodTruck, FoodTruckDomain, PublicFoodTruck } from '@/lib/types';
import type { FoodTruckPublicView } from '@/lib/types/foodTruckPublicView';
import type { MenuItem } from '@/lib/types';
import { transformPhotoUrl } from '@/lib/utils/photoTransform';

/**
 * Convert a FoodTruck to a PublicFoodTruck by removing internal fields
 * This ensures that sensitive/internal fields are never exposed to client code
 */
export function toPublicFoodTruck(truck: FoodTruck): PublicFoodTruck {
  const publicTruck: Record<string, unknown> = { ...truck };
  for (const field of INTERNAL_TRUCK_FIELDS) {
    delete publicTruck[field];
  }
  return publicTruck as PublicFoodTruck;
}

/**
 * Convert data from the food_trucks table to a FoodTruckDomain object
 * This is a minimal conversion since the source only contains basic information
 */
export function fromPublicViewToDomain(viewData: FoodTruckPublicView): FoodTruckDomain {
  // Map all available data from the view (updated to include menu, hours, social_media, etc.)
  return {
    id: viewData.id,
    name: viewData.name,
    slug: viewData.slug,
    description: viewData.description ?? '',
    created_at: viewData.created_at,
    updated_at: viewData.updated_at,
    current_location: viewData.current_location,
    default_lat: viewData.default_lat,
    default_lng: viewData.default_lng,
    live_gps_lat: viewData.live_gps_lat,
    live_gps_lng: viewData.live_gps_lng,
    status: viewData.status,
    operating_hours: viewData.operating_hours ?? null,
    timezone: viewData.timezone ?? null,
    current_day_hours: viewData.current_day_hours ?? null,
    current_day_service_date: viewData.current_day_service_date ?? null,
    menu_items: (viewData.menu ?? []) as MenuItem[], // Note: DB field is 'menu', type expects 'menu_items'
    cuisine_type: viewData.cuisine_type ?? [],
    data_quality_score: viewData.data_quality_score,
    verification_status: viewData.verification_status,
    source_url: undefined,
    last_synced_at: viewData.last_synced_at,
    average_rating: viewData.average_rating ?? 0,
    review_count: viewData.review_count,
    contact_info: viewData.contact_info ?? {},
    social_media: (() => {
      const sm = viewData.social_media ?? {};
      return sm && sm.photo_url ? { ...sm, photo_url: transformPhotoUrl(sm.photo_url) ?? '' } : sm;
    })(),
    is_active: viewData.is_active ?? true,
    price_range: viewData.price_range,
    specialties: viewData.specialties,
    // Claim status fields - needed for claim banner visibility
    is_claimed: viewData.is_claimed ?? null,
    claimed_at: viewData.claimed_at ?? null,
    owner_id: viewData.owner_id ?? null,
    subscription_tier: viewData.subscription_tier || undefined, // From LEFT JOIN to profiles table
    view_count: viewData.view_count ?? 0,
  };
}
