import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const SAFE_ID = /^[a-zA-Z0-9\-_]+$/;
const SAFE_SEARCH_QUERY = /^[\w.!@#$%&*(),\-:?^{}|`<> ~+]+$/;
const SAFE_FILENAME = /^[a-zA-Z0-9 _-]+\.[a-zA-Z0-9]+$/;

// Enhanced security validation schemas
export const BaseValidationSchemas = {
  // Sanitize string input with security considerations
  SafeString: (minLength: number = 1, maxLength: number = 500) =>
    z
      .string()
      .refine((val) => val.length >= minLength, { message: 'Field cannot be empty' })
      .refine((val) => val.length <= maxLength, {
        message: `Field exceeds maximum length of ${maxLength} characters`,
      })
      .transform((str) => {
        return sanitizeHtml(str, {
          allowedTags: [], // No HTML allowed in strings
          allowedAttributes: {},
        }).trim();
      }),

  // Sanitize text input with longer max length (allows basic formatting)
  SafeText: (minLength: number = 1, maxLength: number = 5000) =>
    z
      .string()
      .refine((val) => val.length >= minLength, { message: 'Field cannot be empty' })
      .refine((val) => val.length <= maxLength, {
        message: `Field exceeds maximum length of ${maxLength} characters`,
      })
      .transform((str) => {
        return sanitizeHtml(str, {
          allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
          allowedAttributes: { a: ['href', 'title', 'target'] },
          allowedSchemes: ['http', 'https', 'mailto'],
          allowProtocolRelative: false,
        }).trim();
      }),

  // UUID validation
  SafeUUID: () =>
    z
      .string()
      .min(1, 'Must be a valid UUID')
      .max(36, 'UUID exceeds maximum length')
      .refine((val) => {
        return UUID_PATTERN.test(val);
      }, 'Must be a valid UUID')
      .transform((str) => str.toLowerCase()),

  // Email validation with security considerations
  SafeEmail: () =>
    z
      .string()
      .min(1, 'Email is required')
      .max(254, 'Email exceeds maximum length')
      .refine((val) => {
        return EMAIL_PATTERN.test(val);
      }, 'Must be a valid email address')
      .transform((str) => str.toLowerCase().trim()),

  // URL validation with security considerations
  SafeURL: () =>
    z
      .string()
      .min(1, 'Must be a valid URL')
      .max(2048, 'URL exceeds maximum length')
      .refine((val) => {
        try {
          const parsed = new URL(val);
          // Prevent SSRF attacks by validating protocol
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      }, 'Must be a valid URL'),

  // Integer with security bounds
  SafeInteger: (min = -2_147_483_648, max = 2_147_483_647) =>
    z
      .number()
      .int('Must be an integer')
      .min(min, `Must be greater than or equal to ${min}`)
      .max(max, `Must be less than or equal to ${max}`)
      .transform((num) => Math.floor(num)),

  // Decimal with precision
  SafeDecimal: (min = -999_999_999.99, max = 999_999_999.99, precision = 2) =>
    z
      .number()
      .min(min, `Must be greater than or equal to ${min}`)
      .max(max, `Must be less than or equal to ${max}`)
      .transform((num) => Number(num.toFixed(precision))),
};

// Common food truck fields schema
const CommonFoodTruckFields = z.object({
  description: BaseValidationSchemas.SafeText().optional(),
  cuisine_type: z
    .array(z.string().max(50))
    .max(10, { message: 'Maximum 10 cuisine types allowed' })
    .optional(),
  current_location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      address: BaseValidationSchemas.SafeString(1, 300).optional(),
    })
    .optional()
    .nullable(),
  contact_info: z
    .object({
      phone: z.string().max(20).optional(),
      email: BaseValidationSchemas.SafeEmail().optional(),
      website: BaseValidationSchemas.SafeURL().optional(),
    })
    .optional()
    .nullable(),
  operating_hours: z.record(z.string(), z.any()).optional().nullable(),
  menu_items: z.array(z.any()).max(100, { message: 'Maximum 100 menu items allowed' }).optional(),
  social_media: z.record(z.string(), z.any()).optional().nullable(),
  source_url: BaseValidationSchemas.SafeURL().optional(),
});

// Food truck specific validation schema
export const FoodTruckValidationSchemas = {
  Create: CommonFoodTruckFields.extend({
    name: BaseValidationSchemas.SafeString(2, 200), // min 2 chars, max 200
  }),

  Update: CommonFoodTruckFields.extend({
    id: BaseValidationSchemas.SafeUUID(),
    name: BaseValidationSchemas.SafeString(2, 200).optional(), // min 2 chars, max 200
  }),
};

// User profile validation schema
export const UserProfileValidationSchemas = {
  Update: z.object({
    full_name: BaseValidationSchemas.SafeString(1, 100).optional(),
    email: BaseValidationSchemas.SafeEmail().optional(),
  }),

  Create: z.object({
    email: BaseValidationSchemas.SafeEmail(),
    full_name: BaseValidationSchemas.SafeString(1, 100).optional(),
    role: z.enum(['customer', 'food_truck_owner', 'admin', 'superadmin']).optional(),
  }),
};

// Menu item validation schema
export const MenuItemValidationSchemas = {
  Create: z.object({
    truck_id: BaseValidationSchemas.SafeUUID(),
    name: BaseValidationSchemas.SafeString(1, 200),
    description: BaseValidationSchemas.SafeText().optional(),
    price: BaseValidationSchemas.SafeDecimal(0, 999_999.99),
    category: BaseValidationSchemas.SafeString(1, 100).optional(),
    dietary_info: z.array(z.string().max(50)).max(20).optional(),
  }),

  Update: z.object({
    id: BaseValidationSchemas.SafeUUID(),
    name: BaseValidationSchemas.SafeString(1, 200).optional(),
    description: BaseValidationSchemas.SafeText().optional(),
    price: BaseValidationSchemas.SafeDecimal(0, 999_999.99).optional(),
    category: BaseValidationSchemas.SafeString(1, 100).optional(),
    dietary_info: z.array(z.string().max(50)).max(20).optional(),
  }),
};

// Order validation schema
export const OrderValidationSchemas = {
  Create: z.object({
    truck_id: BaseValidationSchemas.SafeUUID(),
    items: z
      .array(
        z.object({
          id: BaseValidationSchemas.SafeString(1, 100),
          name: BaseValidationSchemas.SafeString(1, 200),
          quantity: BaseValidationSchemas.SafeInteger(1, 100),
          price: BaseValidationSchemas.SafeDecimal(0, 9999.99),
        }),
      )
      .min(1)
      .max(50),
    total_amount: BaseValidationSchemas.SafeDecimal(0, 99_999.99),
    customer_name: BaseValidationSchemas.SafeString(1, 100),
    customer_email: BaseValidationSchemas.SafeEmail(),
    customer_phone: z.string().max(20).optional(),
    delivery_address: z
      .object({
        street: BaseValidationSchemas.SafeString(1, 200),
        city: BaseValidationSchemas.SafeString(1, 100),
        state: z.string().length(2),
        zip: z
          .string()
          .max(10)
          .regex(/^\d{5}(-\d{4})?$/, { message: 'Invalid ZIP code format' }),
      })
      .optional(),
    special_instructions: BaseValidationSchemas.SafeText(1, 1000).optional(),
  }),
};

// Review validation schema
export const ReviewValidationSchemas = {
  Create: z.object({
    truck_id: BaseValidationSchemas.SafeUUID(),
    rating: z.number().int().min(1).max(5),
    review_text: BaseValidationSchemas.SafeText(1, 1000).optional(),
  }),
};

// Search query validation schema
export const SearchValidationSchemas = {
  Query: z.object({
    q: BaseValidationSchemas.SafeString(1, 200).optional(),
    cuisine: BaseValidationSchemas.SafeString(1, 50).optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    radius: BaseValidationSchemas.SafeDecimal(0.1, 50).optional(), // miles
    limit: BaseValidationSchemas.SafeInteger(1, 100).optional(),
    offset: BaseValidationSchemas.SafeInteger(0, 10_000).optional(),
  }),
};

// OWASP Top 10 Security Validation Schemas
export const SecurityValidationSchemas = {
  // Prevent SQL injection by validating IDs and basic patterns
  SafeId: () =>
    z
      .string()
      .regex(SAFE_ID, 'Invalid ID format - only alphanumeric, hyphens, and underscores allowed')
      .max(100, 'ID exceeds maximum length'),

  // Safe search query to prevent injection
  SafeSearchQuery: () =>
    z
      .string()
      .max(200, 'Search query exceeds maximum length')
      .regex(SAFE_SEARCH_QUERY, 'Search query contains potentially dangerous characters'),

  // Safe filename validation
  SafeFilename: () =>
    z
      .string()
      .regex(SAFE_FILENAME, { message: 'Invalid filename format' })
      .max(255, { message: 'Filename exceeds maximum length' }),
};
