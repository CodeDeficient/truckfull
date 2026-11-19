import { z } from 'zod';

const STATE_CODE = /^[A-Z]{2}$/;
const HTTP_PROTOCOL = /^https?:\/\//i;

export const TRUCK_LISTING_SUBMISSION_STATUSES = [
  'new',
  'reviewing',
  'needs_info',
  'ready',
  'created',
  'declined',
  'duplicate',
] as const;

export type TruckListingSubmissionStatus = (typeof TRUCK_LISTING_SUBMISSION_STATUSES)[number];

export const TRUCK_LISTING_SOURCE = 'claim_your_truck_form' as const;

export const SUBMISSION_MAX_MENU_TEXT_LENGTH = 5000;
export const SUBMISSION_MAX_NOTES_LENGTH = 2000;
export const SUBMISSION_MAX_NAME_LENGTH = 120;
export const SUBMISSION_MAX_CONTACT_NAME_LENGTH = 120;
export const SUBMISSION_MAX_PHONE_LENGTH = 30;
export const SUBMISSION_MAX_CITY_LENGTH = 120;
export const SUBMISSION_MAX_STATE_LENGTH = 2;
export const SUBMISSION_MAX_URL_LENGTH = 500;
export const SUBMISSION_MAX_FILE_SIZE = 3 * 1024 * 1024;
export const SUBMISSION_MAX_TOTAL_UPLOAD_SIZE = 4 * 1024 * 1024;
// Accepted input formats for both logo and menu assets. PDF uploads are
// intentionally disabled for this interim flow: sanitizing documents would
// require a document-sanitization subsystem. GIF/SVG/HEIC/AVIF are not
// accepted. The server re-encodes everything to WebP via Sharp; these MIME
// checks are a first gate only and never trusted on their own.
export const SUBMISSION_ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

export function parseSubmissionState(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '') {
    return '';
  }
  const normalized = trimmed.toUpperCase();
  if (STATE_CODE.test(normalized)) {
    return normalized;
  }
  return US_STATE_ABBREVIATIONS[trimmed.toLowerCase()] ?? trimmed;
}

export function parseSubmissionUrl(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (trimmed === '') {
    return '';
  }
  if (!HTTP_PROTOCOL.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

const optionalUrl = z
  .string()
  .trim()
  .transform(parseSubmissionUrl)
  .pipe(
    z
      .string()
      .max(SUBMISSION_MAX_URL_LENGTH, 'That link is too long.')
      .url('Enter a valid URL (include https://).')
      .or(z.literal('')),
  )
  .optional();

export const TruckListingSubmissionSchema = z.object({
  truckName: z
    .string()
    .trim()
    .min(1, 'Truck name is required.')
    .max(SUBMISSION_MAX_NAME_LENGTH, 'Truck name is too long.'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required.')
    .max(254, 'Email is too long.')
    .email('Enter a valid email address.'),
  contactName: z
    .string()
    .trim()
    .max(SUBMISSION_MAX_CONTACT_NAME_LENGTH, 'Contact name is too long.')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(SUBMISSION_MAX_PHONE_LENGTH, 'Phone number is too long.')
    .optional()
    .or(z.literal('')),
  city: z
    .string()
    .trim()
    .max(SUBMISSION_MAX_CITY_LENGTH, 'City is too long.')
    .optional()
    .or(z.literal('')),
  state: z
    .string()
    .trim()
    .transform(parseSubmissionState)
    .pipe(z.string().max(SUBMISSION_MAX_STATE_LENGTH, 'Use a 2-letter state code.').or(z.literal('')))
    .optional(),
  website: optionalUrl,
  instagram: optionalUrl,
  facebook: optionalUrl,
  menuText: z
    .string()
    .trim()
    .max(SUBMISSION_MAX_MENU_TEXT_LENGTH, 'Menu text is too long.')
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .trim()
    .max(SUBMISSION_MAX_NOTES_LENGTH, 'Notes are too long.')
    .optional()
    .or(z.literal('')),
  website_hp: z.string().optional(),
});

export type TruckListingSubmissionInput = z.infer<typeof TruckListingSubmissionSchema>;

export interface ValidatedTruckListingSubmission {
  truckName: string;
  email: string;
  contactName: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  menuText: string | null;
  notes: string | null;
  isSpam: boolean;
}

export function emptyToNull(s: string | undefined): string | null {
  return s === '' ? null : (s ?? null);
}

export function validateTruckListingSubmission(input: unknown): {
  success: boolean;
  data?: ValidatedTruckListingSubmission;
  errors?: string[];
} {
  const result = TruckListingSubmissionSchema.safeParse(input);

  if (!result.success) {
    return { success: false, errors: result.error.issues.map((issue) => issue.message) };
  }

  const value = result.data;

  return {
    success: true,
    data: {
      truckName: value.truckName,
      email: value.email,
      contactName: emptyToNull(value.contactName),
      phone: emptyToNull(value.phone),
      city: emptyToNull(value.city),
      state: emptyToNull(value.state),
      website: emptyToNull(value.website),
      instagram: emptyToNull(value.instagram),
      facebook: emptyToNull(value.facebook),
      menuText: emptyToNull(value.menuText),
      notes: emptyToNull(value.notes),
      isSpam: Boolean(value.website_hp && value.website_hp.length > 0),
    },
  };
}

export function isSubmissionFileAllowed(file: {
  type: string;
  size: number;
}): boolean {
  return SUBMISSION_ALLOWED_IMAGE_TYPES.includes(file.type) && file.size <= SUBMISSION_MAX_FILE_SIZE;
}

export function isSubmissionTotalUploadAllowed(files: ReadonlyArray<{ size: number }>): boolean {
  return files.reduce((total, file) => total + file.size, 0) <= SUBMISSION_MAX_TOTAL_UPLOAD_SIZE;
}

export const SUBMISSION_STATUS_LABELS: Record<TruckListingSubmissionStatus, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  needs_info: 'Needs Info',
  ready: 'Ready',
  created: 'Created',
  declined: 'Declined',
  duplicate: 'Duplicate',
};
