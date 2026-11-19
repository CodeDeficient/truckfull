import type {
  FoodTruck,
  FoodTruckDomain,
  FoodTruckDomainWithEvents,
  PublicFoodTruck,
} from '@/lib/types';
import { transformPhotoUrl } from '@/lib/utils/photoTransform';

/**
 * Helper function to get common properties with default values
 */
const getCommonTruckProperties = (truck: FoodTruck | PublicFoodTruck) => {
  const sm = truck.social_media ?? {};
  const transformedSm = sm.photo_url
    ? { ...sm, photo_url: transformPhotoUrl(sm.photo_url) ?? '' }
    : sm;
  return {
    ...truck,
    description: truck.description ?? '',
    created_at: truck.created_at ?? undefined,
    updated_at: truck.updated_at ?? undefined,
    cuisine_type: Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [],
    current_location: truck.current_location ?? null,
    operating_hours: truck.operating_hours ?? null,
    menu_items: truck.menu_items ?? [],
    has_menu: truck.has_menu ?? false,
    data_quality_score: truck.data_quality_score ?? undefined,
    verification_status: truck.verification_status ?? undefined,
    last_synced_at: truck.last_synced_at ?? undefined,
    average_rating: truck.average_rating ?? 0,
    review_count: truck.review_count ?? undefined,
    contact_info: truck.contact_info ?? {},
    social_media: transformedSm,
    owner_id: 'owner_id' in truck ? (truck.owner_id ?? undefined) : undefined,
    subscription_tier: truck.subscription_tier || undefined,
  };
};

/**
 * Helper function to convert FoodTruck to FoodTruckDomain with default values
 */
export const convertToDomain = (truck: FoodTruck | PublicFoodTruck): FoodTruckDomain => {
  // Handle nullable fields and convert them to the expected format in FoodTruckDomain
  const commonProps = getCommonTruckProperties(truck);
  return {
    ...commonProps,
    // Explicitly preserve the menu property if it exists (for grouped menu display)
    // Note: FoodTruckDomain doesn't have a menu property, so we don't include it
    // Add discriminant property to distinguish from PublicFoodTruck
    _type: 'domain',
  } as FoodTruckDomain;
};

export const convertToDomainWithEvents = (truck: FoodTruck): FoodTruckDomainWithEvents => {
  // Convert FoodTruck to FoodTruckDomainWithEvents with events
  return {
    ...getCommonTruckProperties(truck),
    events: truck.events || [],
    // Add discriminant property to distinguish from PublicFoodTruck
    _type: 'domain',
  } as FoodTruckDomainWithEvents;
};

export const ensureTruckWithEvents = (truck: unknown): FoodTruckDomainWithEvents => {
  const t = truck as Record<string, unknown>;
  // Ensure the truck object has the proper events property with defaults
  return {
    ...t,
    description: t.description ?? '',
    created_at: t.created_at ?? '',
    updated_at: t.updated_at ?? '',
    cuisine_type: t.cuisine_type ?? [],
    events: t.events || [],
    _type: 'domain',
  } as FoodTruckDomainWithEvents;
};

export const mapTrucksWithEvents = (trucks: unknown[]): FoodTruckDomainWithEvents[] => {
  return trucks.map((truck) => ensureTruckWithEvents(truck));
};
