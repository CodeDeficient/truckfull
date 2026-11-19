import { escapeIlike } from '@/lib/claim/escapeIlike';

const WHITESPACE_RUNS = /\s+/g;

export const CLAIM_SEARCH_MIN_QUERY_LENGTH = 2;
export const CLAIM_SEARCH_DEFAULT_LIMIT = 8;
export const CLAIM_SEARCH_MAX_LIMIT = 20;

export interface PublicTruckSearchRow {
  id: string;
  name: string | null;
  cuisine_type: string[] | null;
  city: string | null;
  state: string | null;
  description: string | null;
  slug: string | null;
  price_range: string | null;
  social_media?: Record<string, unknown> | null;
}

export interface PublicTruckSearchResult {
  id: string;
  name: string;
  cuisineTypes: string[];
  city: string | null;
  state: string | null;
  description: string | null;
  slug: string | null;
  priceRange: string | null;
  photoUrl: string | null;
  locationLabel: string;
}

export function normalizeClaimSearchQuery(query: string): string {
  return query.trim().replaceAll(WHITESPACE_RUNS, ' ');
}

export function getClaimSearchLimit(limit: string | null): number {
  if (limit === null) {
    return CLAIM_SEARCH_DEFAULT_LIMIT;
  }

  const parsedLimit = Number(limit);

  if (!Number.isFinite(parsedLimit)) {
    return CLAIM_SEARCH_DEFAULT_LIMIT;
  }

  return Math.min(Math.max(parsedLimit, 1), CLAIM_SEARCH_MAX_LIMIT);
}

export function buildClaimSearchPattern(query: string): string {
  return `%${escapeIlike(normalizeClaimSearchQuery(query))}%`;
}

export function mapClaimSearchRow(row: PublicTruckSearchRow): PublicTruckSearchResult {
  const city = row.city?.trim() || null;
  const state = row.state?.trim() || null;
  const locationLabel = [city, state].filter(Boolean).join(', ');
  const sm = (row.social_media ?? {}) as Record<string, unknown>;

  return {
    id: row.id,
    name: row.name?.trim() || 'Unknown Truck',
    cuisineTypes: row.cuisine_type ?? [],
    city,
    state,
    description: row.description,
    slug: row.slug,
    priceRange: row.price_range,
    photoUrl: (sm.photo_url as string) ?? null,
    locationLabel: locationLabel || 'Location unavailable',
  };
}
