// lib/mappers/domain.ts
import type { Database } from '@/lib/database.remote.types';
import type { PublicTruckRow } from '@/lib/services/publicTruckPage';
import type {
  FoodTruckDomain,
  FoodTruckCurrentLocation,
  FoodTruckOperatingHours,
  FoodTruckContactInfo,
  FoodTruckSocialMedia,
  MenuItem,
  MenuCategory,
  FoodTruck,
  UserProfileDomain,
} from '@/lib/types';
import { generateSlug } from '@/lib/utils/slug';
import { transformPhotoUrl } from '@/lib/utils/photoTransform';
import { flattenMenuItems } from '@/lib/utils/menuLazyLoad';

type FoodTruckRow = Database['public']['Tables']['food_trucks']['Row'];

export type FoodTruckMapperInput = PublicTruckRow &
  Partial<FoodTruckRow> & {
    distance_miles?: number;
    distance_meters?: number;
  };

// Enhanced mappers for domain-layer types (UI-friendly)
function readMenuKeywords(row: FoodTruckMapperInput): string[] | undefined {
  const keywords = (row as unknown as Record<string, unknown>).menu_keywords;
  if (!Array.isArray(keywords)) return undefined;
  return keywords.filter((keyword): keyword is string => typeof keyword === 'string');
}

export function fromFoodTruckRow(row: FoodTruckMapperInput): FoodTruckDomain {
  const rawMenu =
    (row as unknown as Record<string, unknown>).menu ??
    (row as unknown as Record<string, unknown>).menu_items ??
    [];
  const flattenedMenu = flattenMenuItems(rawMenu) as MenuItem[];
  return {
    id: row.id,
    distance_miles: row.distance_miles,
    distance_meters: row.distance_meters,
    default_lat: row.default_lat,
    default_lng: row.default_lng,
    live_gps_lat: row.live_gps_lat,
    live_gps_lng: row.live_gps_lng,
    status: normalizeTruckStatus(row.status),
    name: row.name,
    slug: row.slug ?? undefined,
    description: row.description ?? '',
    created_at: row.created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
    current_location: row.current_location as FoodTruckCurrentLocation | null,
    operating_hours: row.operating_hours as FoodTruckOperatingHours | null,
    timezone: row.timezone ?? null,
    current_day_hours: row.current_day_hours as FoodTruckDomain['current_day_hours'],
    current_day_service_date: row.current_day_service_date ?? null,
    menu_items: flattenedMenu,
    has_menu:
      (row as unknown as Record<string, unknown>).has_menu === true || flattenedMenu.length > 0,
    menu_keywords: readMenuKeywords(row),
    cuisine_type: row.cuisine_type ?? [],
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    price_range: row.price_range ?? undefined,
    specialties: [], // Default value since this column doesn't exist in FoodTruckDomain
    data_quality_score: row.data_quality_score ?? 0,
    verification_status: row.verification_status ?? 'pending',
    source_url: (row as unknown as Record<string, string>).source_url ?? '',
    last_synced_at: row.last_synced_at ?? new Date().toISOString(),
    average_rating: row.average_rating ?? 0,
    review_count: row.review_count ?? 0,
    contact_info: (row.contact_info ?? {}) as FoodTruckContactInfo,
    social_media: (() => {
      const sm = (row.social_media ?? {}) as FoodTruckSocialMedia;
      if (sm.photo_url) {
        return { ...sm, photo_url: transformPhotoUrl(sm.photo_url) ?? '' };
      }
      return sm;
    })(),
    is_active: row.is_active ?? true,
    owner_id: row.owner_id,
    is_claimed: (row as unknown as Record<string, boolean | null>).is_claimed ?? null,
    subscription_tier:
      (row as unknown as Record<string, string | undefined>).subscription_tier || undefined,
    view_count: row.view_count ?? 0, // Ensure view_count is passed through
  };
}

export function fromUserProfileRow(
  row: Database['public']['Tables']['profiles']['Row'],
): UserProfileDomain {
  return {
    id: row.id,
    email: row.email ?? '',
    full_name: row.full_name ?? '',
    role: row.role ?? 'customer',
    subscription_tier: (row as unknown as Record<string, string>).subscription_tier ?? 'free',
    created_at: (row as unknown as Record<string, string>).created_at ?? new Date().toISOString(),
    updated_at: row.updated_at ?? new Date().toISOString(),
  };
}

function normalizeTruckStatus(status: string | null | undefined): FoodTruckDomain['status'] {
  return status === 'live' || status === 'offline' || status === 'closed' || status === 'break'
    ? status
    : null;
}

// Alias for backward compatibility with code that imported from normalize.ts
export { fromUserProfileRow as fromProfileRow };

// Helper function to convert flat menu_items array to grouped MenuCategory array
// Also handles case where menu is already in grouped format
function groupMenuItemsByCategory(items: MenuItem[]): MenuCategory[] {
  if (!items?.length) return [];

  // Check if the data is already in grouped format: [{name: "Category", items: [...]}]
  const firstItem = items[0] as Record<string, unknown>;
  if (Array.isArray(firstItem?.items)) {
    // Already in grouped format - return as-is
    return items as unknown as MenuCategory[];
  }

  // Flat format - group items by category
  const categoryMap = new Map<string, MenuItem[]>();

  for (const item of items) {
    const category = item.category ?? 'Other';
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(item);
  }

  // Convert map to MenuCategory array
  return [...categoryMap.entries()].map(([name, categoryItems]) => ({
    name,
    items: [...categoryItems],
  }));
}

export function fromDomainToFoodTruck(domain: FoodTruckDomain): FoodTruck {
  return {
    id: domain.id,
    distance_miles: domain.distance_miles,
    distance_meters: domain.distance_meters,
    name: domain.name,
    description: domain.description,
    created_at: domain.created_at ?? null,
    updated_at: domain.updated_at ?? null,
    current_location: domain.current_location,
    operating_hours: domain.operating_hours,
    timezone: domain.timezone ?? null,
    current_day_hours: domain.current_day_hours ?? null,
    current_day_service_date: domain.current_day_service_date ?? null,
    current_day_location: domain.current_day_location ?? null,
    upcoming_overrides: domain.upcoming_overrides ?? null,
    menu_items: domain.menu_items,
    has_menu: domain.has_menu ?? false,
    menu_keywords: domain.menu_keywords,
    cuisine_type: domain.cuisine_type,
    data_quality_score: domain.data_quality_score ?? null,
    verification_status: domain.verification_status ?? '',
    source_url: domain.source_url ?? '',
    last_synced_at: domain.last_synced_at ?? new Date().toISOString(),
    average_rating: domain.average_rating ?? null,
    review_count: domain.review_count ?? null,
    contact_info: domain.contact_info,
    social_media: (() => {
      const sm = domain.social_media;
      if (sm && sm.photo_url) {
        const transformed = transformPhotoUrl(sm.photo_url);
        if (transformed !== sm.photo_url) {
          return { ...sm, photo_url: transformed };
        }
      }
      return sm;
    })(),
    is_active: domain.is_active ?? false,
    price_range: domain.price_range ?? '',
    specialties: domain.specialties ?? [],
    source_urls: [],
    menu: groupMenuItemsByCategory(domain.menu_items), // Convert flat menu_items to grouped MenuCategory array
    schedule: [],
    scheduled_locations: [],
    owner_id: domain.owner_id ?? null,
    location_geog: null,
    verification_documents: null,
    verification_notes: null,
    verification_requested_at: null,
    verified_at: null,
    verified_by: null,
    city_location: null,
    exact_location: null,
    is_claimed: domain.is_claimed ?? null,
    claimed_at: domain.claimed_at ?? null,
    claimed_by: domain.claimed_by ?? null,
    claim_verification_method: domain.claim_verification_method ?? null,
    // Add missing properties required by FoodTruck type
    street_address: domain.street_address ?? null,
    city: domain.city ?? null,
    state: domain.state ?? null,
    zip: domain.zip ?? null,
    default_lat: domain.default_lat ?? null,
    default_lng: domain.default_lng ?? null,
    live_gps_lat: domain.live_gps_lat ?? null,
    live_gps_lng: domain.live_gps_lng ?? null,
    live_gps_accuracy: domain.live_gps_accuracy ?? null,
    live_gps_timestamp: domain.live_gps_timestamp ?? null,
    status: domain.status ?? 'offline',
    live_location: null,
    last_updated_at: null,
    user_id: null,
    subscription_tier: domain.subscription_tier,
    view_count: domain.view_count ?? 0,
    review_status: null,
    slug:
      domain.slug?.trim() ||
      generateSlug(domain.name || 'unknown-truck') ||
      domain.id ||
      'unknown-truck',
  };
}
