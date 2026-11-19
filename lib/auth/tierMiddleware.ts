/**
 * Subscription Tier Enforcement Middleware
 *
 * Provides utilities for enforcing subscription tier restrictions on API routes
 * and features. Prevents free users from accessing paid-tier features.
 *
 * @module lib/auth/tierMiddleware
 */

import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase/client';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logError, logWarning } from '@/lib/logging';
import type { SubscriptionTier } from '@/lib/types/tier';

export type { SubscriptionTier } from '@/lib/types/tier';

/**
 * Tier hierarchy for comparison
 * Higher number = higher tier
 */
const TIER_LEVELS: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 0,
  pro: 2,
  enterprise: 3,
};

/**
 * Feature flags mapped to required subscription tiers
 */
export const TIER_FEATURES = {
  // Free tier features (all users)
  manual_truck_editing: 'free' as SubscriptionTier,
  basic_menu_management: 'free' as SubscriptionTier,
  event_scheduling: 'free' as SubscriptionTier,
  photo_uploads: 'free' as SubscriptionTier,
  basic_analytics: 'free' as SubscriptionTier,

  // Pro tier features (formerly starter features now require pro)
  automated_updates: 'pro' as SubscriptionTier,
  favorites_tracking: 'pro' as SubscriptionTier,
  gps_location_updates: 'pro' as SubscriptionTier,

  // Pro tier features
  ai_event_research: 'pro' as SubscriptionTier,
  advanced_analytics: 'pro' as SubscriptionTier,
  event_recommendations: 'pro' as SubscriptionTier,
  foot_traffic_analysis: 'pro' as SubscriptionTier,
  revenue_optimization: 'pro' as SubscriptionTier,
};

/**
 * Get user's subscription tier from database
 *
 * @param userId - User ID to check
 * @returns User's subscription tier or 'free' if not found
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  try {
    const supabase = createServerSupabaseClient();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logWarning(`Failed to get tier for user ${userId}:`, error);
      return 'free'; // Default to free tier on error
    }

    return (profile.subscription_tier as SubscriptionTier) || 'free';
  } catch (error) {
    logError('Error getting user tier:', error);
    return 'free';
  }
}

/**
 * Check if user's tier meets the required tier
 *
 * @param userId - User ID to check
 * @param requiredTier - Minimum tier required
 * @returns True if user has required tier or higher
 */
export async function checkUserTier(
  userId: string,
  requiredTier: SubscriptionTier,
): Promise<boolean> {
  const userTier = await getUserTier(userId);
  return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
}

/**
 * Check if user has access to a specific feature
 *
 * @param userId - User ID to check
 * @param feature - Feature key from TIER_FEATURES
 * @returns True if user has access to the feature
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof typeof TIER_FEATURES,
): Promise<boolean> {
  const requiredTier = TIER_FEATURES[feature];
  return checkUserTier(userId, requiredTier);
}

/**
 * Wrapper for API routes that require a specific subscription tier
 *
 * @example
 * ```typescript
 * // app/api/advanced-analytics/route.ts
 * import { withTierProtection } from '@/lib/auth/tierMiddleware';
 *
 * async function handler(request: Request, userId: string) {
 *   // This only runs if user has 'pro' tier or higher
 *   return NextResponse.json({ analytics: 'data' });
 * }
 *
 * export const GET = withTierProtection(handler, 'pro');
 * ```
 *
 * @param handler - The API route handler function (receives request and userId)
 * @param requiredTier - Minimum subscription tier required
 * @returns Protected handler that checks tier before executing
 */
export function withTierProtection<T extends unknown[]>(
  handler: (request: Request, userId: string, ...args: T) => Promise<Response> | Response,
  requiredTier: SubscriptionTier,
): (request: Request, ...args: T) => Promise<Response> {
  return async (request: Request, ...args: T) => {
    // Extract user ID from request (assumes auth middleware has run)
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 },
      );
    }

    // Check if user has required tier OR is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = profile?.role === 'admin';
    const hasAccess = isAdmin || (await checkUserTier(user.id, requiredTier));

    if (!hasAccess) {
      const userTier = await getUserTier(user.id);

      return NextResponse.json(
        {
          error: 'Insufficient subscription tier',
          message: `This feature requires ${requiredTier} tier or higher. Your current tier: ${userTier}`,
          required_tier: requiredTier,
          current_tier: userTier,
          upgrade_url: '/owner-dashboard/billing',
        },
        { status: 403 },
      );
    }

    // User has access - execute handler
    return handler(request, user.id, ...args);
  };
}

/**
 * Get tier information for a user
 *
 * @param userId - User ID
 * @returns Tier details including features available
 */
export async function getTierInfo(userId: string): Promise<{
  tier: SubscriptionTier;
  tierLevel: number;
  availableFeatures: string[];
  upgradeRequired: string[];
}> {
  const userTier = await getUserTier(userId);
  const userTierLevel = TIER_LEVELS[userTier];

  const availableFeatures: string[] = [];
  const upgradeRequired: string[] = [];

  // Check each feature
  for (const [feature, requiredTier] of Object.entries(TIER_FEATURES)) {
    if (TIER_LEVELS[requiredTier] <= userTierLevel) {
      availableFeatures.push(feature);
    } else {
      upgradeRequired.push(feature);
    }
  }

  return {
    tier: userTier,
    tierLevel: userTierLevel,
    availableFeatures,
    upgradeRequired,
  };
}

/**
 * Helper to check tier in client-side code
 * Note: This uses client Supabase, so it should only be used for UI display,
 * NOT for security enforcement (always verify server-side)
 *
 * @param userId - User ID
 * @param requiredTier - Required tier
 * @returns True if user likely has access (client-side check only)
 */
export async function checkTierClientSide(
  userId: string,
  requiredTier: SubscriptionTier,
): Promise<boolean> {
  try {
    const supabase = getSupabase();

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    const userTier = (profile.subscription_tier as SubscriptionTier) || 'free';
    return TIER_LEVELS[userTier] >= TIER_LEVELS[requiredTier];
  } catch {
    return false;
  }
}

/**
 * Check tier access from a NextRequest
 * Returns tier info along with access check result
 *
 * @param _request - NextRequest object (not currently used, but kept for compatibility)
 * @param allowedTiers - Array of allowed tiers for this endpoint
 * @returns Object with allowed flag and tier info
 */
export async function checkTierAccess(
  _request: Request,
  allowedTiers: SubscriptionTier[],
): Promise<{
  allowed: boolean;
  tier: SubscriptionTier | null;
  userId: string | null;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { allowed: false, tier: null, userId: null };
    }

    const userTier = await getUserTier(user.id);

    // Check if user's tier is in the allowed list OR is higher than any allowed tier
    const minRequiredLevel = Math.min(...allowedTiers.map((t) => TIER_LEVELS[t]));
    const userLevel = TIER_LEVELS[userTier];

    return {
      allowed: userLevel >= minRequiredLevel,
      tier: userTier,
      userId: user.id,
    };
  } catch (error) {
    logError('checkTierAccess error:', error);
    return { allowed: false, tier: null, userId: null };
  }
}
