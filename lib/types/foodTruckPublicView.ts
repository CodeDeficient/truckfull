import type {
  FoodTruckDomain,
  FoodTruckCurrentLocation,
  OperatingHours,
  FoodTruckContactInfo,
  SocialMedia,
} from '@/lib/types';

export interface FoodTruckPublicView {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  current_location: FoodTruckCurrentLocation | null;
  default_lat?: number | null;
  default_lng?: number | null;
  live_gps_lat?: number | null;
  live_gps_lng?: number | null;
  status?: 'live' | 'offline' | 'closed' | 'break' | null;
  operating_hours?: OperatingHours | null;
  timezone?: string | null;
  current_day_hours?: FoodTruckDomain['current_day_hours'];
  current_day_service_date?: string | null;
  contact_info?: FoodTruckContactInfo;
  social_media?: SocialMedia;
  average_rating?: number;
  review_count?: number;
  data_quality_score?: number;
  verification_status?: string;
  created_at?: string;
  updated_at?: string;
  last_synced_at?: string;
  menu?: unknown[]; // JSONB array of menu items
  cuisine_type?: string[];
  price_range?: string;
  specialties?: string[];
  state?: string;
  location_geog?: unknown; // PostGIS geography
  lat?: number;
  lng?: number;
  // Claim status fields
  is_claimed?: boolean | null;
  claimed_at?: string | null;
  owner_id?: string | null;
  subscription_tier?: string | null;
  view_count?: number;
  is_active?: boolean;
}
