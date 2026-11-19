/**
 * Price range utility functions
 * Maps numeric and string values to standardized price range representations
 */

// Define the price range type
export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

// Define possible input types for price ranges
export type PriceRangeInput = number | string;

/**
 * Maps numeric values to price range symbols
 * $: 1, $$: 2, $$$: 3, $$$$: 4
 */
const numericToPriceRange: Record<number, PriceRange> = {
  1: '$',
  2: '$$',
  3: '$$$',
  4: '$$$$',
};

/**
 * Maps string values to price range symbols
 * Handles common textual representations and symbols
 */
const stringToPriceRange: Record<string, PriceRange> = {
  // Numeric strings
  '1': '$',
  '2': '$$',
  '3': '$$$',
  '4': '$$$$',

  // Textual representations
  cheap: '$',
  inexpensive: '$',
  budget: '$',
  affordable: '$',
  low: '$',

  moderate: '$$',
  medium: '$$',
  average: '$$',
  mid: '$$',

  expensive: '$$$',
  high: '$$$',
  premium: '$$$',
  upscale: '$$$',

  luxury: '$$$$',
  'very expensive': '$$$$',
  'ultra premium': '$$$$',
  'high end': '$$$$',
};

/**
 * Formats a price range from a numeric input
 * @param value - Numeric price range value (1-4)
 * @returns Price range symbol ($ to $$$$)
 */
export function formatPriceRange(value: number): PriceRange | null {
  if (typeof value !== 'number' || value < 1 || value > 4) {
    return null;
  }

  return numericToPriceRange[value] || null;
}

/**
 * Formats a price range from a string input
 * @param value - String representation of price range
 * @returns Price range symbol ($ to $$$$)
 */
export function formatPriceRangeFromString(value: string): PriceRange | null {
  if (typeof value !== 'string') {
    return null;
  }

  // Normalize the input string (lowercase and trim)
  const normalizedValue = value.toLowerCase().trim();

  // Check if the normalized value exists in our mapping
  if (stringToPriceRange[normalizedValue]) {
    return stringToPriceRange[normalizedValue];
  }

  // If direct mapping doesn't exist, try to parse as number
  const numericValue = Number.parseInt(normalizedValue, 10);
  if (!Number.isNaN(numericValue)) {
    return formatPriceRange(numericValue);
  }

  return null;
}

/**
 * Gets all available price range symbols
 * @returns Array of all valid price range symbols
 */
export function getAllPriceRanges(): PriceRange[] {
  return Object.values(numericToPriceRange);
}

/**
 * Validates if a given value is a valid price range
 * @param value - Value to validate
 * @returns Boolean indicating if the value is a valid price range
 */
export function isValidPriceRange(value: unknown): value is PriceRange {
  return getAllPriceRanges().includes(value as PriceRange);
}

/**
 * Gets the numeric value corresponding to a price range symbol
 * @param priceRange - Price range symbol ($ to $$$$)
 * @returns Numeric value (1-4) or null if invalid
 */
export function getPriceRangeValue(priceRange: PriceRange): number | null {
  const entries = Object.entries(numericToPriceRange);
  const foundEntry = entries.find(([_, symbol]) => symbol === priceRange);

  return foundEntry ? Number.parseInt(foundEntry[0], 10) : null;
}
