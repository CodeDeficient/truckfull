// lib/supabase/index.ts
// This file is intended to re-export services and types, not Supabase clients.
// Client and Server clients should be imported directly from their respective files.

export * from './config';

// Re-export services to fix import issues
export { FoodTruckService } from './services/foodTruckService';
export { FoodTruckServiceClient } from './services/foodTruckService.client';
export { APIUsageService } from './services/apiUsageService';
export { DataQualityService } from './services/dataQualityService';

// Re-export types to fix import issues
export * from './types/index';

// Export admin client for tests
export { getSupabaseAdmin } from './admin';
