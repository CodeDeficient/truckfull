// Type definitions for food truck data model
export type FoodTruck = {
  id: string;
  name: string;
  description?: string;
  cuisine_type: string[];
  menu?: MenuCategory[];
  current_location?: FoodTruckLocation;
  contact_info?: ContactInfo;
  operating_hours?: OperatingHours;
  data_quality_score?: number;
};

export type MenuCategory = {
  category: string;
  description?: string;
  items: MenuItem[];
};

export type MenuItem = {
  name: string;
  description?: string;
  price?: number;
  dietary_tags?: string[];
  is_popular?: boolean;
};

export type FoodTruckLocation = {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  parking_details?: string;
};

export type ContactInfo = {
  phone?: string;
  email?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
};

export type OperatingHours = {
  monday?: DailyOperatingHours;
  tuesday?: DailyOperatingHours;
  wednesday?: DailyOperatingHours;
  thursday?: DailyOperatingHours;
  friday?: DailyOperatingHours;
  saturday?: DailyOperatingHours;
  sunday?: DailyOperatingHours;
};

export type DailyOperatingHours = {
  open: string;
  close: string;
  closed?: boolean;
};

// Security types
export type SecurityEvent = {
  event_type: 'access_denied' | 'rate_limit_exceeded' | 'invalid_token';
  severity: 'low' | 'medium' | 'high';
};

// Data cleanup types
export type CleanupOperation = {
  type: 'remove_duplicates' | 'fix_placeholders' | 'validate_coordinates' | 'normalize_contact';
  options?: Record<string, unknown>;
};

// Metrics types
export type RealtimeMetrics = {
  active_connections: number;
  events_per_second: number;
  avg_response_time_ms: number;
  error_rate: number;
  last_updated: string;
};

// Service types
export type APIService = 'tavily';
