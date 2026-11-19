// Re-export all types from the centralized types file
export type {
  FoodTruck,
  MenuItem,
  MenuCategory,
  OperatingHours,
  DailyOperatingHours,
  PriceRange,
  ApiUsage,
  RealtimeMetrics,
  TruckRating,
  SentimentAnalysisResult,
  EnhancedFoodTruckData,
  LocationData,
  UserCoordinates,
} from '../../types';

// Supabase-specific types that don't exist in main types
export interface FoodTruckLocation {
  lat: number;
  lng: number;
  address?: string;
  timestamp: string;
}

export interface RawMenuItemFromDB {
  name: string;
  description?: string;
  price?: number;
  dietary_tags?: string[];
  category?: string;
  [key: string]: unknown;
}
