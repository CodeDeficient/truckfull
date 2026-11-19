import { z } from 'zod';
import {
  PriceRangeSchema,
  ContactInfoSchema,
  SocialMediaSchema,
  OperatingHoursSchema,
  toJSON,
} from './common';
import { SecurityValidationSchemas } from '@/lib/validation/securitySchemas';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Menu item schema
export const MenuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Menu item name is required'),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  category: z.string().optional(),
  dietary_info: z.array(z.string()).optional(),
  dietary_tags: z.array(z.string()).optional(),
  photo_url: z.string().optional(),
  is_popular: z.boolean().optional(),
  truck_id: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Menu category schema
export const MenuCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  items: z.array(MenuItemSchema).default([]),
});

// Location schemas
export const CurrentLocationSchema = z.object({
  lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  address: z.string().optional(),
  timestamp: z
    .string()
    .optional()
    .default(() => new Date().toISOString()),
});

export const ScheduledLocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  timestamp: z.string(),
  start_time: z.string(),
  end_time: z.string(),
});

// Food truck creation schema
export const CreateFoodTruckSchema = z.object({
  name: z
    .string()
    .min(2, 'Field cannot be empty')
    .max(200, 'Field exceeds maximum length of 200 characters'),
  description: z
    .string()
    .min(1, 'Field cannot be empty')
    .max(5000, 'Field exceeds maximum length of 5000 characters')
    .optional(),
  current_location: CurrentLocationSchema.optional(),
  scheduled_locations: z.array(ScheduledLocationSchema).optional().default([]),
  operating_hours: OperatingHoursSchema.optional().default({
    monday: { closed: true },
    tuesday: { closed: true },
    wednesday: { closed: true },
    thursday: { closed: true },
    friday: { closed: true },
    saturday: { closed: true },
    sunday: { closed: true },
  }),
  menu: z.array(MenuCategorySchema).optional().default([]),
  contact_info: ContactInfoSchema.optional(),
  social_media: SocialMediaSchema.optional().default({}),
  data_quality_score: z.number().min(0).max(1).optional().default(0.5),
  verification_status: z.enum(['pending', 'verified', 'rejected']).optional().default('pending'),
  cuisine_type: z
    .array(z.string().max(50))
    .max(10, { message: 'Maximum 10 cuisine types allowed' })
    .optional()
    .default([]),
  price_range: PriceRangeSchema,
  specialties: z
    .array(z.string().max(100))
    .max(20, { message: 'Maximum 20 specialties allowed' })
    .optional()
    .default([]),
});

// Food truck update schema
export const UpdateFoodTruckSchema = CreateFoodTruckSchema.partial().extend({
  id: z
    .string()
    .min(1, 'ID is required')
    .refine((val) => {
      return UUID_PATTERN.test(val);
    }, 'Must be a valid UUID'),
});

// Data cleanup schemas
export const DataCleanupSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  options: z
    .object({
      batchSize: z.number().min(1).max(1000).optional().default(100),
      dryRun: z.boolean().optional().default(false),
      operations: z.array(z.string()).optional(),
      truckData: z.record(z.string(), z.unknown()).optional(),
      targetId: z.string().optional(),
      sourceId: z.string().optional(),
    })
    .optional()
    .default({ batchSize: 100, dryRun: false }),
});

// Search query schema
export const SearchQuerySchema = z.object({
  q: SecurityValidationSchemas.SafeSearchQuery().optional(),
  cuisine: z
    .string()
    .min(1, 'Field cannot be empty')
    .max(50, 'Field exceeds maximum length of 50 characters')
    .optional(),
  openNow: z
    .preprocess((val) => val === 'true' || val === true, z.boolean())
    .optional()
    .default(false),
  lat: z
    .preprocess(
      (val) => (typeof val === 'string' ? Number.parseFloat(val) : val),
      z.number().min(-90).max(90),
    )
    .optional(),
  lng: z
    .preprocess(
      (val) => (typeof val === 'string' ? Number.parseFloat(val) : val),
      z.number().min(-180).max(180),
    )
    .optional(),
  radius: z
    .preprocess(
      (val) => (typeof val === 'string' ? Number.parseFloat(val) : val),
      z.number().min(0).max(50),
    )
    .optional()
    .default(5),
});

// Generic request schemas
export const PostRequestSchema = z.object({
  action: z.string().min(1, 'Action is required'),
  data: z.record(z.string(), z.unknown()).optional(),
});

export const PutRequestSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .refine((val) => {
      return UUID_PATTERN.test(val);
    }, 'Must be a valid UUID'),
  updates: z
    .record(z.string(), z.unknown())
    .refine((obj) => Object.keys(obj).length > 0, { message: 'Updates object cannot be empty' }),
});

// Tavily request schema
export const TavilyRequestSchema = z.object({
  query: SecurityValidationSchemas.SafeSearchQuery().min(1, { message: 'Query is required' }),
  searchDepth: z.enum(['basic', 'advanced']).optional().default('basic'),
  includeImages: z.boolean().optional().default(false),
  includeAnswer: z.boolean().optional().default(false),
  maxResults: z.number().min(1).max(20).optional().default(10),
});

// Analytics/Web Vitals schema
export const WebVitalsSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  name: z.string().min(1, 'Name is required'),
  value: z.number().min(0, 'Value must be non-negative'),
  label: z.string().optional(),
  url: z.string().optional(),
  userId: z.string().optional(),
});

// Common ID parameter validation
export const IdParamSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .refine((val) => {
      return UUID_PATTERN.test(val);
    }, 'Must be a valid UUID'),
});

// Pagination schema for query parameters
export const PaginationSchema = z.object({
  limit: z.preprocess(
    (val) => (typeof val === 'string' ? Number.parseInt(val, 10) : val),
    z.number().min(1).max(100).optional().default(50),
  ),
  offset: z.preprocess(
    (val) => (typeof val === 'string' ? Number.parseInt(val, 10) : val),
    z.number().min(0).optional().default(0),
  ),
});

// Location-based query schema
export const LocationQuerySchema = z.object({
  lat: z.preprocess(
    (val) => (typeof val === 'string' ? Number.parseFloat(val) : val),
    z.number().min(-90).max(90).optional(),
  ),
  lng: z.preprocess(
    (val) => (typeof val === 'string' ? Number.parseFloat(val) : val),
    z.number().min(-180).max(180).optional(),
  ),
  radius: z.preprocess(
    (val) => (typeof val === 'string' ? Number.parseFloat(val) : val),
    z.number().min(0).max(50).optional().default(5),
  ),
});

// Export JSON Schema versions for Supabase validation
export const APISchemasJSON = {
  MenuItem: toJSON(MenuItemSchema, 'MenuItem'),
  MenuCategory: toJSON(MenuCategorySchema, 'MenuCategory'),
  CurrentLocation: toJSON(CurrentLocationSchema, 'CurrentLocation'),
  ScheduledLocation: toJSON(ScheduledLocationSchema, 'ScheduledLocation'),
  CreateFoodTruck: toJSON(CreateFoodTruckSchema, 'CreateFoodTruck'),
  UpdateFoodTruck: toJSON(UpdateFoodTruckSchema, 'UpdateFoodTruck'),
  DataCleanup: toJSON(DataCleanupSchema, 'DataCleanup'),
  SearchQuery: toJSON(SearchQuerySchema, 'SearchQuery'),
  PostRequest: toJSON(PostRequestSchema, 'PostRequest'),
  PutRequest: toJSON(PutRequestSchema, 'PutRequest'),
  TavilyRequest: toJSON(TavilyRequestSchema, 'TavilyRequest'),
  WebVitals: toJSON(WebVitalsSchema, 'WebVitals'),
  IdParam: toJSON(IdParamSchema, 'IdParam'),
  Pagination: toJSON(PaginationSchema, 'Pagination'),
  LocationQuery: toJSON(LocationQuerySchema, 'LocationQuery'),
};

// Registry of schema names to schemas for dynamic lookup
export const SchemaRegistry = {
  MenuItem: MenuItemSchema,
  MenuCategory: MenuCategorySchema,
  CurrentLocation: CurrentLocationSchema,
  ScheduledLocation: ScheduledLocationSchema,
  CreateFoodTruck: CreateFoodTruckSchema,
  UpdateFoodTruck: UpdateFoodTruckSchema,
  DataCleanup: DataCleanupSchema,
  SearchQuery: SearchQuerySchema,
  PostRequest: PostRequestSchema,
  PutRequest: PutRequestSchema,
  TavilyRequest: TavilyRequestSchema,
  WebVitals: WebVitalsSchema,
  IdParam: IdParamSchema,
  Pagination: PaginationSchema,
  LocationQuery: LocationQuerySchema,
} as const;

// Type helper for schema names
export type SchemaName = keyof typeof SchemaRegistry;
