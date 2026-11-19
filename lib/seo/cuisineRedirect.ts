import { slugifyCuisine } from '@/lib/utils/slugify';
import { logError } from '@/lib/logging';
import { getCachedPublicTruckCatalog } from '@/lib/services/publicTruckData.server';
import { createTtlCache } from '@/lib/utils/createTtlCache';

/**
 * Pure function: check if a /best/ slug matches a known cuisine and should redirect.
 * Returns the redirect URL or null if no redirect is needed.
 */
export function shouldRedirectToCuisine(
  slug: string,
  knownCuisineSlugs: string[],
): string | null {
  if (!slug) return null;
  const slugified = slugifyCuisine(slug);
  if (!slugified) return null;
  return knownCuisineSlugs.includes(slugified) ? `/cuisine/${slugified}` : null;
}

interface CuisineTypeRow {
  cuisine_type: string[] | null;
}

/**
 * Collect unique cuisine slugs from a raw DB query result.
 * Used by /best/ redirect to build the known-cuisine allowlist.
 * Delegates to collectCuisineSlugsAndNames for the logic.
 */
export function collectCuisineSlugs(rows: CuisineTypeRow[] | null): string[] {
  return collectCuisineSlugsAndNames(rows).map((e) => e.slug);
}

export interface CuisineSlugEntry {
  slug: string;
  displayName: string;
}

/**
 * Collect unique cuisine slugs AND their original display names.
 * Preserves the first-seen display name for each slug.
 * Used by generateMetadata in /best/[slug] to produce correct cuisine metadata.
 */
export function collectCuisineSlugsAndNames(
  rows: CuisineTypeRow[] | null,
): CuisineSlugEntry[] {
  if (!rows) return [];
  const seen = new Map<string, string>();
  for (const row of rows) {
    if (Array.isArray(row.cuisine_type)) {
      for (const c of row.cuisine_type) {
        const s = slugifyCuisine(c);
        if (s && !seen.has(s)) {
          seen.set(s, c);
        }
      }
    }
  }
  return [...seen.entries()].map(([slug, displayName]) => ({
    slug,
    displayName,
  }));
}

export interface CuisineMetadataResult {
  title: string;
  description: string;
  canonicalUrl: string;
}

/**
 * Generate metadata for a cuisine slug (used by /best/[slug] generateMetadata).
 * Returns null if the slug isn't a known cuisine.
 */
export function cuisineMetadataForSlug(
  slug: string,
  knownCuisines: CuisineSlugEntry[],
): CuisineMetadataResult | null {
  if (!slug || knownCuisines.length === 0) return null;
  const slugified = slugifyCuisine(slug);
  if (!slugified) return null;
  const entry = knownCuisines.find((c) => c.slug === slugified);
  if (!entry) return null;

  const displayName = entry.displayName;
  const title = `${displayName} Food Trucks in Georgia & South Carolina | TruckFull`;
  const description = `Find ${displayName.toLowerCase()} food trucks in Georgia and South Carolina. Browse truck profiles, menus, hours, and event details on TruckFull.`;
  const canonicalUrl = `https://www.truckfull.food/cuisine/${slugified}`;

  return { title, description, canonicalUrl };
}

export { createTtlCache } from '@/lib/utils/createTtlCache';

export const getCachedCuisineTypes = createTtlCache(async () => {
  try {
    const catalog = await getCachedPublicTruckCatalog();
    return catalog
      .filter((truck) => truck.cuisine_type !== null)
      .map((truck) => ({ cuisine_type: truck.cuisine_type }));
  } catch (error) {
    logError('getCachedCuisineTypes: failed to fetch cuisine types', error);
    throw error;
  }
}, 30 * 60 * 1000);
