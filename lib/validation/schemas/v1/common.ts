import { z } from 'zod';

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Basic reusable schemas for validation
export const EmailSchema = z
  .string()
  .min(1, 'Invalid email format')
  .refine((val) => {
    return EMAIL_PATTERN.test(val);
  }, 'Invalid email format');
export const PhoneSchema = z.string().min(1).optional();
export const UrlSchema = z
  .string()
  .min(1, 'Invalid URL')
  .refine((val) => {
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'Invalid URL');

export const CoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Accepts either a descriptive string (e.g., "$ - $$") or numeric tuple
export const PriceRangeSchema = z.union([
  z.string(),
  z.number(),
  z.tuple([z.number(), z.number()]),
]);

export const ContactInfoSchema = z
  .object({
    phone: PhoneSchema.optional(),
    email: EmailSchema.optional(),
    website: UrlSchema.optional(),
  })
  .optional();

export const SocialMediaSchema = z
  .object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    twitter: z.string().optional(),
  })
  .optional()
  .default({});

export const DailyOperatingHoursSchema = z.object({
  open: z.string().optional(),
  close: z.string().optional(),
  closed: z.boolean().optional().default(true),
});

export const OperatingHoursSchema = z.object({
  monday: DailyOperatingHoursSchema.optional().default({ closed: true }),
  tuesday: DailyOperatingHoursSchema.optional().default({ closed: true }),
  wednesday: DailyOperatingHoursSchema.optional().default({ closed: true }),
  thursday: DailyOperatingHoursSchema.optional().default({ closed: true }),
  friday: DailyOperatingHoursSchema.optional().default({ closed: true }),
  saturday: DailyOperatingHoursSchema.optional().default({ closed: true }),
  sunday: DailyOperatingHoursSchema.optional().default({ closed: true }),
});

// Minimal placeholder converter to JSON-like metadata for docs/introspection
export function toJSON(schema: z.ZodTypeAny, title?: string) {
  // Avoid relying on Zod internals; provide minimal metadata
  return {
    $schema: 'zod',
    title: title ?? 'Schema',
    type: 'unknown',
  };
}
