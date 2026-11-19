// Define specific types for food truck data
export interface ContactInfo {
  phone?: string;
  email?: string;
  website?: string;
}

export interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

export interface CurrentLocation {
  address?: string;
  lat?: number;
  lng?: number;
}

export interface OperatingHours {
  monday?: { open: string; close: string; closed: boolean };
  tuesday?: { open: string; close: string; closed: boolean };
  wednesday?: { open: string; close: string; closed: boolean };
  thursday?: { open: string; close: string; closed: boolean };
  friday?: { open: string; close: string; closed: boolean };
  saturday?: { open: string; close: string; closed: boolean };
  sunday?: { open: string; close: string; closed: boolean };
  [key: string]: { open: string; close: string; closed: boolean } | undefined;
}

// Export the CUISINE_TYPES array
export const CUISINE_TYPES = [
  'American',
  'Asian',
  'BBQ',
  'Burgers',
  'Chinese',
  'Desserts',
  'Ethiopian',
  'Filipino',
  'French',
  'German',
  'Greek',
  'Indian',
  'Italian',
  'Japanese',
  'Korean',
  'Latin American',
  'Lebanese',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Pizza',
  'Sandwiches',
  'Seafood',
  'Southern',
  'Spanish',
  'Thai',
  'Vegan',
  'Vegetarian',
  'Vietnamese',
];
