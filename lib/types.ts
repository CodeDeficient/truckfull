import { Database } from './database.types.consolidated';
import type { Json } from './database.remote.types';

// Extended types for JSON fields with more specific typing
export interface FoodTruckContactInfo {
  phone?: string;
  email?: string;
  website?: string;
  [key: string]: unknown;
}

export interface FoodTruckSocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  photo_url?: string; // Add photo_url field to social media
  [key: string]: unknown;
}

export interface FoodTruckCurrentLocation {
  lat?: number;
  lng?: number;
  address?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface DailyOperatingHours {
  open?: string; // e.g., "09:00"
  close?: string; // e.g., "17:00"
  closed?: boolean;
  [key: string]: unknown;
}

export interface UpcomingScheduleOverride {
  service_date: string;
  is_closed: boolean;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  ends_next_day: boolean;
  timezone: string;
  location_data?: {
    address?: string;
    city?: string;
    state?: string;
    fuzzy?: boolean;
    lat?: number;
    lng?: number;
  } | null;
}

export interface FoodTruckOperatingHours {
  monday?: DailyOperatingHours;
  tuesday?: DailyOperatingHours;
  wednesday?: DailyOperatingHours;
  thursday?: DailyOperatingHours;
  friday?: DailyOperatingHours;
  saturday?: DailyOperatingHours;
  sunday?: DailyOperatingHours;
  [key: string]: DailyOperatingHours | undefined;
}

// Compatibility alias requested by multiple modules
export type OperatingHours = FoodTruckOperatingHours;

export interface MenuItem {
  id?: string;
  name: string; // Name is required as per database schema
  description?: string;
  price?: number;
  category?: string;
  dietary_info?: string[];
  dietary_tags?: string[];
  photo_url?: string;
  is_popular?: boolean;
  truck_id?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Some mappers/schema use a grouped menu structure
export interface MenuCategory {
  name: string;
  items: MenuItem[];
}

// Internal fields that should never reach client
export const INTERNAL_TRUCK_FIELDS = [
  'verification_documents',
  'verification_notes',
  'verified_by',
  'owner_id',
  'location_geog',
  'user_id',
  'claimed_by',
  'claim_verification_method',
  'menu_updated_by',
  'location_updated_by',
  'schedule_updated_by',
  'facebook_page_id',
  'facebook_page_name',
  'facebook_webhook_enabled',
  'facebook_last_sync',
  'facebook_auto_updates_enabled',
] as const;

type InternalFields = (typeof INTERNAL_TRUCK_FIELDS)[number];

type FoodTruckRow = Database['public']['Tables']['food_trucks']['Row'];

type OptionalInternalTruckFields = Partial<
  Pick<FoodTruckRow, Extract<InternalFields, keyof FoodTruckRow>>
>;

// Enhanced FoodTruck type with more specific JSON field types
export type FoodTruck = Omit<
  Database['public']['Tables']['food_trucks']['Row'],
  | 'contact_info'
  | 'social_media'
  | 'current_location'
  | 'operating_hours'
  | 'menu_items'
  | 'menu'
  | 'average_rating'
  | 'owner_id'
  | 'location_geog'
  | 'verification_documents'
  | 'verification_notes'
  | 'verification_requested_at'
  | 'verified_at'
  | 'verified_by'
  | 'status'
  | 'default_location'
  | 'live_location'
  | InternalFields
> & {
  contact_info: FoodTruckContactInfo;
  social_media: FoodTruckSocialMedia;
  current_location?: FoodTruckCurrentLocation | null;
  timezone?: string | null;
  operating_hours?: FoodTruckOperatingHours | null;
  current_day_hours?: DailyOperatingHours | null;
  current_day_service_date?: string | null;
  current_day_location?: FoodTruckCurrentLocation | null;
  upcoming_overrides?: UpcomingScheduleOverride[] | null;
  menu_items?: MenuItem[] | null;
  scheduled_locations?: unknown[]; // Optional array for scheduled locations
  menu?: MenuCategory[]; // Optional menu array for compatibility
  price_range?: string; // Optional price range for compatibility
  specialties?: string[]; // Optional specialties for compatibility
  source_url?: string; // Source URL for the food truck data
  last_synced_at?: string | null; // Last synced timestamp
  average_rating?: number | null; // Average rating for the food truck
  // Additional location variants referenced by helpers
  exact_location?: FoodTruckCurrentLocation | null;
  city_location?: FoodTruckCurrentLocation | null;
  // Go Live / Close Shop feature fields
  status?: 'offline' | 'live' | 'break' | 'closed' | null;
  default_location?: FoodTruckCurrentLocation | null; // Manual/home address
  live_location?: FoodTruckCurrentLocation | null; // GPS snapshot when live
  // Compatibility fields occasionally referenced directly on FoodTruck
  phone_number?: string;
  email?: string;
  website?: string;
  instagram_handle?: string;
  facebook_handle?: string;
  twitter_handle?: string;
  // Claim status fields
  is_claimed?: boolean | null;
  claimed_at?: string | null;
  claimed_by?: string | null;
  claim_verification_method?: string | null;
  // Scheduling info sometimes expected by quality scorers/UIs
  schedule?: FoodTruckSchedule[];
  is_active?: boolean;
  verification_documents?: Json | null;
  verification_notes?: string | null;
  verification_requested_at?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  owner_id?: string | null;
  location_geog?: unknown;
  // Properties expected by mobile components
  image_url?: string; // Derived from source_url or other image sources
  is_open?: boolean; // Calculated from operating hours
  events?: FoodTruckEvent[]; // Optional events array for food trucks
  distance_miles?: number; // Distance from user location (returned by PostGIS)
  distance_meters?: number; // Distance from user location in meters (returned by PostGIS)
  subscription_tier?: string; // Enriched subscription tier for badge display
  slug: string; // SEO-friendly URL slug (e.g., "sample-vegan") - REQUIRED for all trucks
  review_status?: 'pending' | 'approved' | 'rejected' | null; // Review moderation status
  view_count?: number; // Total views for the truck
  has_menu?: boolean; // Whether truck has menu data (menu lazy-loaded via /api/trucks/[id]/menu)
  menu_keywords?: string[]; // Lowercased menu item names + categories for search filtering
} & OptionalInternalTruckFields;

// Public-facing type for client components
export type PublicFoodTruck = Omit<FoodTruck, InternalFields>;

// Explicit alias for server-side only usage to distinguish from PublicFoodTruck
// This makes the intent clear in function signatures and documentation
// eslint-disable-next-line sonarjs/redundant-type-aliases
export type InternalFoodTruck = FoodTruck;

export type UserFavorite = Database['public']['Tables']['user_favorites']['Row'];
export type UserProfile = Database['public']['Tables']['profiles']['Row'];

// User metadata compatibility (used by ProfileModal and others)
export interface UserMetadata {
  [key: string]: unknown;
  full_name?: string;
  email?: string;
}

// SocialMedia alias for compatibility with older imports
export type SocialMedia = FoodTruckSocialMedia;

// Additional types that were referenced but missing
export interface FoodTruckEvent {
  id: string;
  food_truck_id: string;
  title: string;
  description?: string;
  date?: string; // Keep the original 'date' field for compatibility
  event_date?: string; // Also add the event_date for compatibility
  start_time?: string; // Added to match TimezoneAwareEvent
  end_time?: string; // Added to match TimezoneAwareEvent
  time?: string; // Keep original 'time' for compatibility
  timezone?: string; // Added to match TimezoneAwareEvent
  location_address?: string; // Added to match TimezoneAwareEvent
  location?: FoodTruckCurrentLocation;
  subscription_tier?: string; // Added for verification overrides
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

// Alias for backward compatibility - some modules import 'Event' instead of 'FoodTruckEvent'
export type Event = FoodTruckEvent;

export interface Special {
  id: string;
  food_truck_id: string;
  name: string;
  description: string;
  valid_until: string;
  created_at?: string;
  updated_at?: string;
}

export interface FoodTruckSchedule {
  id: string;
  food_truck_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  created_at?: string;
  updated_at?: string;
}

export interface DataQualityStats {
  total_trucks: number;
  avg_quality_score: number;
  critical_issues: number;
  warning_issues: number;
  resolved_issues: number;
}

export interface ValidationLogEntry {
  id?: string;
  error_id: string;
  code: string;
  message: string;
  path: string[];
  severity: 'error' | 'warn';
  context?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  timestamp: string;
  expires_at: string;
  metadata?: Json;
}

export interface ApiUsage {
  id?: string;
  service_name: string;
  usage_date: string;
  requests_count: number;
  tokens_used: number;
  created_at?: string;
}

// EventFull types
export interface EventOrganizer {
  id: string;
  user_id: string;
  business_name: string;
  contact_email?: string;
  contact_phone?: string;
  verification_status: 'unverified' | 'verified' | 'shadowbanned';
  verified_at?: string;
  rating_avg: number;
  rating_count: number;
  created_at: string;
}

export interface EventFullEvent {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  location_data?: Json;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'published' | 'cancelled';
  vendor_fee?: number;
  max_vendors?: number;
  created_at: string;
}

export interface EventApplication {
  id: string;
  event_id: string; // References eventfull_events table
  truck_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'waitlisted';
  created_at: string;
  cover_letter?: string;
  proposed_menu?: Json;
  payment_disclaimer_accepted: boolean;
}

export interface EventDocument {
  id: string;
  event_id: string;
  document_type: 'permit' | 'insurance' | 'fire_marshal' | 'other';
  file_url?: string;
  uploaded_at: string;
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export interface OrganizerReview {
  id: string;
  organizer_id: string;
  reviewer_id: string;
  rating: number; // 1-5
  comment?: string;
  created_at: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  coordinates?: { lat: number; lng: number };
}

export interface EnhancedFoodTruckData extends FoodTruck {
  menu_items: MenuItem[] | null;
  operating_hours_parsed?: FoodTruckOperatingHours;
  contact_info_parsed?: FoodTruckContactInfo;
  social_media_parsed?: FoodTruckSocialMedia;
  current_location_parsed?: FoodTruckCurrentLocation;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  keywords: string[];
  summary: string;
}

export interface RealtimeMetrics {
  active_connections: number;
  events_per_second: number;
  avg_response_time_ms: number;
  error_rate: number;
  last_updated: string;
}

export type LatestMetrics = RealtimeMetrics;

export interface TruckRating {
  id: string;
  truck_id: string;
  user_id: string;
  rating: number;
  review?: string;
  created_at?: string;
}

// Domain-layer types (UI-friendly)
export interface FoodTruckDomain {
  id: string;
  distance_miles?: number;
  distance_meters?: number;
  name: string;
  slug?: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  current_location: FoodTruckCurrentLocation | null;
  operating_hours: FoodTruckOperatingHours | null;
  timezone?: string | null;
  current_day_hours?: DailyOperatingHours | null;
  current_day_service_date?: string | null;
  current_day_location?: FoodTruckCurrentLocation | null;
  upcoming_overrides?: UpcomingScheduleOverride[] | null;
  menu_items: MenuItem[];
  has_menu?: boolean;
  menu_keywords?: string[];
  cuisine_type: string[];
  price_range?: string;
  specialties?: string[];
  data_quality_score?: number;
  verification_status?: string;
  source_url?: string;
  last_synced_at?: string;
  average_rating: number;
  review_count?: number;
  contact_info: FoodTruckContactInfo;
  social_media: FoodTruckSocialMedia;
  is_active?: boolean | null;
  image_url?: string; // Derived from source_url or other image sources
  is_open?: boolean; // Calculated from operating hours
  events?: TimezoneAwareEvent[]; // Optional events array for food trucks
  // Dedicated address fields (permanent, never overwritten by GPS)
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  default_lat?: number | null;
  default_lng?: number | null;
  // Dedicated GPS fields (temporary, captured when going live)
  live_gps_lat?: number | null;
  live_gps_lng?: number | null;
  live_gps_accuracy?: number | null;
  live_gps_timestamp?: string | null;
  status?: 'live' | 'offline' | 'closed' | 'break' | null;
  // Claim status fields
  is_claimed?: boolean | null;
  claimed_at?: string | null;
  claimed_by?: string | null;
  claim_verification_method?: string | null;
  owner_id?: string | null;
  subscription_tier?: string; // Added for verification override
  view_count?: number;
  // Discriminant property to distinguish from PublicFoodTruck
  _type?: 'domain';
}

export interface TimezoneAwareEvent {
  id: string;
  food_truck_id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  timezone?: string;
  location?: FoodTruckCurrentLocation;
  is_recurring?: boolean;
  recurrence_pattern?: string;
  created_at?: string;
  updated_at?: string;
  date?: string; // Add for compatibility with Event
  event_date?: string; // Add for compatibility with Event
  time?: string; // Add for compatibility with Event
  location_address?: string; // Add for compatibility with Event
  [key: string]: unknown;
}

export interface FoodTruckDomainWithEvents extends FoodTruckDomain {
  events: TimezoneAwareEvent[];
}

export interface UserProfileDomain {
  id: string;
  email: string;
  full_name?: string;
  role?: string;
  subscription_tier?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface RealtimeMetricsDomain {
  active_connections: number;
  events_per_second: number;
  avg_response_time_ms: number;
  error_rate: number;
  last_updated: string;
}

export interface PipelineEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  status: string;
  message: string;
  timestamp: string;
  metadata?: unknown;
}

export interface UserCoordinates {
  lat: number;
  lng: number;
}

// Additional enums/aliases for compatibility
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

// Owner dashboard types
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface RecurringSchedule {
  id: string;
  food_truck_id: string;
  name: string;
  description?: string;
  recurrence_pattern: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: DayOfWeek[];
    interval?: number;
    endDate?: string;
  };
  start_time: string;
  end_time: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  exceptions?: string[];
}

export interface SpecialEvent {
  id: string;
  food_truck_id: string;
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location_address: string;
  location_lat: number;
  location_lng: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Utility types
export interface FavoriteTruckLite {
  id: string;
  name: string;
  cuisine_type?: string[] | null;
  current_location?: FoodTruckCurrentLocation | null; // Allow null to match database schema
  average_rating?: number | null;
  image_url?: string;
  is_open?: boolean; // Calculated from operating hours
  // Properties needed for favorites functionality
  favorite_id: string;
  favorited_at?: string;
  operating_hours?: FoodTruckOperatingHours | null; // Allow null to match database schema
  total_reviews?: number;
  contact_info?: {
    phone?: string;
    website?: string;
  };
  description?: string;
  owner_id?: string | null;
  is_claimed?: boolean | null;
  subscription_tier?: string;
}

export interface CleanupOperation {
  type: string;
  description: string;
  affected_fields: string[];
  // Compatibility fields used by reports/UI
  affectedCount?: number;
  successCount?: number;
  errorCount?: number;
  errors?: string[];
}

export interface BatchCleanupResult {
  total_processed: number;
  successes: number;
  failures: number;
  details: unknown[];
  // Compatibility fields referenced by handlers/UI
  summary?: unknown;
  operations?: CleanupOperation[];
  duration?: number;
  totalProcessed?: number;
}

export interface CleanupOperationType {
  id: string;
  name: string;
  description: string;
  is_dry_run: boolean;
}

// Type guards
export function isContactInfo(obj: unknown): obj is FoodTruckContactInfo {
  if (obj == undefined || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.phone === 'string' || typeof o.email === 'string' || typeof o.website === 'string'
  );
}

export function isCurrentLocation(obj: unknown): obj is FoodTruckCurrentLocation {
  if (obj == undefined || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return typeof o.lat === 'number' || typeof o.lng === 'number' || typeof o.address === 'string';
}

export function isSocialMedia(obj: unknown): obj is FoodTruckSocialMedia {
  if (obj == undefined || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.facebook === 'string' ||
    typeof o.instagram === 'string' ||
    typeof o.twitter === 'string'
  );
}

// Re-export Database for modules importing from './types'
export type { Database as _Database } from './database.remote.types';
