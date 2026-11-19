import { z } from 'zod';

/**
 * Schema for menu item validation
 */
export const MenuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required'),
  price: z.number().nonnegative().optional().nullable(),
  description: z.string().optional().nullable(),
});

/**
 * Schema for menu category validation
 */
export const MenuCategorySchema = z.object({
  category: z.string().min(1, 'Category name is required'),
  items: z.array(MenuItemSchema).min(1, 'Category must have at least one item'),
});

/**
 * Schema for contact information validation
 */
export const ContactInfoSchema = z
  .object({
    email: z.string().email('Invalid email format').optional().nullable(),
    phone: z.string().optional().nullable(),
    website: z.string().url('Invalid URL format').optional().nullable(),
  })
  .optional();

/**
 * Schema for social media links validation
 */
export const SocialMediaSchema = z
  .object({
    facebook: z.string().url('Invalid Facebook URL').optional().nullable(),
    instagram: z.string().optional().nullable(),
  })
  .optional();

/**
 * Schema for operating hours validation
 * Each day can be either an hours object { open, close } or null if hours unknown
 */
export const OperatingHoursSchema = z
  .record(
    z.string(),
    z
      .object({
        // Accept H:MM or HH:MM format (e.g., "5:00", "05:00", "17:00")
        open: z
          .string()
          .regex(/^\d{1,2}:\d{2}$/, 'Time must be in H:MM or HH:MM format')
          .optional()
          .nullable(),
        close: z
          .string()
          .regex(/^\d{1,2}:\d{2}$/, 'Time must be in H:MM or HH:MM format')
          .optional()
          .nullable(),
      })
      .nullable(), // Allow null for days with unknown hours
  )
  .optional();

/**
 * Schema for location validation
 */
export const LocationSchema = z
  .object({
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
  })
  .optional();

/**
 * Main schema for parsed truck data validation
 */
export const ParsedTruckDataSchema = z.object({
  name: z.string().min(2, 'Truck name must be at least 2 characters'),
  profile_image: z.string().url('Invalid image URL').optional().nullable(),
  cuisine_type: z.array(z.string()).optional().default([]),
  description: z.string().optional().nullable(),
  contact_info: ContactInfoSchema,
  social_media: SocialMediaSchema,
  menu: z.array(MenuCategorySchema).optional().default([]),
  operating_hours: OperatingHoursSchema,
  current_location: LocationSchema,
});

export type ParsedTruckData = z.infer<typeof ParsedTruckDataSchema>;

interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validate parsed truck data and return structured errors
 */
export function validateTruckData(data: unknown): {
  success: boolean;
  data?: ParsedTruckData;
  errors?: ValidationError[];
} {
  const result = ParsedTruckDataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return { success: false, errors };
}

/**
 * Lenient validation for preview (allows partial data)
 */
export const PartialTruckDataSchema = ParsedTruckDataSchema.partial().extend({
  name: z.string().optional(), // Name optional for preview
});

export function validatePartialTruckData(data: unknown): {
  success: boolean;
  data?: Partial<ParsedTruckData>;
  warnings?: Array<{ path: string; message: string }>;
} {
  const result = PartialTruckDataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const warnings: ValidationError[] = result.error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));

  return { success: false, warnings };
}
