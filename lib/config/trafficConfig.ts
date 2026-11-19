/**
 * Traffic Layer Configuration
 *
 * SINGLE SOURCE OF TRUTH for all traffic-related limits.
 * Update these values here and they apply everywhere.
 */

export const TRAFFIC_CONFIG = {
  // Maximum nodes to fetch per request
  // This should match Supabase max_rows in config.toml and dashboard
  MAX_NODES_PRO: 40_000,

  // Tier-based distance limits (in miles)
  MAX_RADIUS_FREE: 0,
  MAX_RADIUS_PRO: 300,

  // Default values
  DEFAULT_RADIUS_METERS: 5000,
  DEFAULT_LIMIT: 50,
} as const;

export type TrafficTier = 'free' | 'pro';

/**
 * Get the limit for a given tier
 */
export function getNodeLimitForTier(tier: TrafficTier | null): number {
  if (tier === 'pro') return TRAFFIC_CONFIG.MAX_NODES_PRO;
  return 0;
}

/**
 * Get the max radius in miles for a given tier
 */
export function getMaxRadiusForTier(tier: TrafficTier | null): number {
  if (tier === 'pro') return TRAFFIC_CONFIG.MAX_RADIUS_PRO;
  return TRAFFIC_CONFIG.MAX_RADIUS_FREE;
}