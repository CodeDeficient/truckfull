const COMBINING_DIACRITICS = /[\u0300-\u036F]/g;
const NON_SLUG_CHARS = /[^a-z0-9\s-]/g;
const WHITESPACE_RUNS = /\s+/g;
const DASH_RUNS = /-+/g;
const EDGE_DASH = /(^-)|(-$)/g;
const SHORT_ID = /^[a-z0-9]{4}$/;
const EDGE_DASHES = /^-|-$/g;
const NON_ALPHANUMERIC_RUNS = /[^a-z0-9]+/g;

/**
 * Utility functions for generating SEO-friendly slugs
 */

export const RESERVED_SLUGS = new Set([
  'about',
  'account-deleted',
  'admin',
  'api',
  'auth',
  'best',
  'blog',
  'city',
  'claim-your-truck',
  'contact',
  'cuisine',
  'discover',
  'discover_food_trucks',
  'event-research',
  'favorites',
  'features',
  'food-truck-event-research',
  'food-truck-live-location',
  'food-truck-traffic-data',
  'for-organizers',
  'for-owners',
  'live-location',
  'login',
  'maintenance',
  'offline',
  'organizer',
  'owner-dashboard',
  'partnerships',
  'privacy',
  'profile',
  'settings',
  'signup',
  'takedown',
  'terms',
  'trucks',
  'traffic-data',
  'unauthorized',
  'user-dashboard',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',
]);

export function isAllowedTruckSlug(slug: string): boolean {
  if (!isValidSlug(slug)) return false;
  return !RESERVED_SLUGS.has(slug.toLowerCase());
}

const SLUG_MAX_LENGTH = 200;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,198}[a-z0-9]$|^[a-z0-9]{2,200}$/;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/;

export function isValidSlug(slug: string): boolean {
  if (slug.length < 2 || slug.length > SLUG_MAX_LENGTH) return false;
  if (CONTROL_CHAR_PATTERN.test(slug)) return false;
  return SLUG_PATTERN.test(slug);
}

/**
 * Generate a URL-safe slug from a truck name
 * @param name - The truck's display name
 * @returns A lowercase, hyphenated slug
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(COMBINING_DIACRITICS, '')
    .replaceAll(NON_SLUG_CHARS, '')
    .replaceAll(WHITESPACE_RUNS, '-')
    .replaceAll(DASH_RUNS, '-')
    .replaceAll(EDGE_DASH, '');
}

/**
 * Generate a unique truck slug
 * Uses name-only format by default, adds 4-char UUID suffix if duplicate exists
 *
 * @param name - The truck's display name
 * @param id - The truck's UUID (used for disambiguation if needed)
 * @param existingSlugs - Set of slugs already in use (for duplicate detection)
 * @returns A unique slug like "sample-vegan" or "joes-tacos-a1b2"
 */
export function generateTruckSlug(name: string, id: string, existingSlugs?: Set<string>): string {
  const baseSlug = slugify(name);

  if (!existingSlugs || !existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  const shortId = id.replaceAll('-', '').slice(0, 4);
  return `${baseSlug}-${shortId}`;
}

/**
 * Extract the short ID from a slug (if present)
 * @param slug - A truck slug like "sample-vegan" or "joes-tacos-a1b2"
 * @returns The short ID suffix or null if not present
 */
export function extractShortIdFromSlug(slug: string): string | null {
  const parts = slug.split('-');
  const lastPart = parts.at(-1);

  if (lastPart && SHORT_ID.test(lastPart)) {
    return lastPart;
  }

  return null;
}

const US_STATE_ABBREVIATIONS = new Set([
  'al','ar','az','ca','co','ct','dc','de','fl','ga',
  'hi','ia','id','il','in','ks','ky','la','ma','md',
  'me','mi','mn','mo','ms','mt','nc','nd','ne','nh',
  'nj','nm','nv','ny','oh','ok','or','pa','ri','sc',
  'sd','tn','tx','ut','va','vt','wa','wi','wv','wy',
]);

/**
 * Check if a slug matches the city-slug pattern (ends with a US state abbreviation
 * like -ga, -sc, -nc, etc.). Used to prevent city-shaped slugs from resolving as truck pages.
 */
export function isCitySlugPattern(slug: string): boolean {
  const lastDash = slug.lastIndexOf('-');
  if (lastDash < 1) return false;
  const suffix = slug.slice(lastDash + 1);
  if (!US_STATE_ABBREVIATIONS.has(suffix)) return false;
  return slug.split('-').length === 2;
}

/**
 * Generate a URL-safe slug from a city name and state abbreviation
 * Format: "augusta-ga", "charleston-sc", "winston-salem-nc"
 */
export function slugifyCity(city: string, state: string): string {
  return `${city}-${state}`
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(COMBINING_DIACRITICS, '')
    .replaceAll(NON_SLUG_CHARS, '')
    .replaceAll(WHITESPACE_RUNS, '-')
    .replaceAll(DASH_RUNS, '-')
    .replaceAll(EDGE_DASHES, '');
}

export function citySlugMatchesName(
  storedCity: string,
  storedState: string,
  parsedCity: string,
  parsedState = storedState,
): boolean {
  return slugifyCity(storedCity, storedState) === slugifyCity(parsedCity, parsedState);
}

/**
 * Parse a city slug back into city name and state abbreviation
 * Inverse of slugifyCity — uses lastIndexOf('-', ...) to handle
 * city names containing hyphens (e.g. "winston-salem-nc")
 */
export function parseCitySlug(slug: string): { cityName: string; stateName: string } | null {
  const lastDash = slug.lastIndexOf('-');
  if (lastDash < 1) return null;

  const stateAbbr = slug.slice(lastDash + 1).toUpperCase();
  const cityNamePart = slug.slice(0, lastDash);

  if (stateAbbr.length !== 2) return null;

  const cityName = cityNamePart
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return { cityName, stateName: stateAbbr };
}

/**
 * Generate a URL-safe slug from a cuisine name
 * Format: "bbq", "tacos", "soul-food"
 */
export function slugifyCuisine(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replaceAll(COMBINING_DIACRITICS, '')
    .replaceAll(NON_ALPHANUMERIC_RUNS, '-')
    .replaceAll(EDGE_DASHES, '');
}
