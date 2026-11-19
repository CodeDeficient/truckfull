/**
 * Subscription Tier Checking Utilities
 *
 * Purpose: Centralized feature access control based on subscription tiers
 * Tiers: free, pro, enterprise
 */

import type { SubscriptionTier, ActiveSubscriptionTier } from '@/lib/types/tier';

export type { SubscriptionTier, ActiveSubscriptionTier as ActiveTier } from '@/lib/types/tier';

type ActiveTier = ActiveSubscriptionTier;

export const DEPRECATED_TIERS: readonly SubscriptionTier[] = ['starter'];

export function isActiveTier(tier: SubscriptionTier): boolean {
  return !DEPRECATED_TIERS.includes(tier);
}

export function getEffectiveTier(tier: SubscriptionTier): 'free' | 'pro' {
  if (tier === 'pro' || tier === 'enterprise') return 'pro';
  return 'free';
}

export function normalizeTier(tier: SubscriptionTier): ActiveTier {
  if (isActiveTier(tier)) return tier as ActiveTier;
  return getEffectiveTier(tier);
}

/**
 * Feature flags for each subscription tier
 */
export const TIER_FEATURES = {
  free: {
    maxTrucks: 1,
    autoUpdates: false,
    autoUpdateFrequency: null,
    basicAnalytics: true,
    advancedAnalytics: true,
    eventTracking: false,
    exportReports: false,
    featuredDishes: 0,
  },
  pro: {
    maxTrucks: Infinity,
    autoUpdates: true,
    autoUpdateFrequency: 'daily',
    basicAnalytics: true,
    advancedAnalytics: true,
    eventTracking: true,
    exportReports: true,
    featuredDishes: 3,
  },
  enterprise: {
    maxTrucks: Infinity,
    autoUpdates: true,
    autoUpdateFrequency: 'hourly',
    basicAnalytics: true,
    advancedAnalytics: true,
    eventTracking: true,
    exportReports: true,
    featuredDishes: 10,
  },
} as const;

/**
 * Check if user tier allows access to a specific feature
 */
export function hasFeatureAccess(
  userTier: SubscriptionTier,
  feature: keyof typeof TIER_FEATURES.free,
): boolean {
  const tierConfig = TIER_FEATURES[normalizeTier(userTier)];
  const featureValue = tierConfig[feature];

  if (typeof featureValue === 'boolean') {
    return featureValue;
  }

  if (typeof featureValue === 'number') {
    return featureValue > 0;
  }

  return featureValue !== null;
}

/**
 * Get maximum number of trucks allowed for a tier
 */
export function getMaxTrucks(userTier: SubscriptionTier): number {
  return TIER_FEATURES[normalizeTier(userTier)].maxTrucks;
}

/**
 * Get auto-update frequency for a tier
 */
export function getAutoUpdateFrequency(userTier: SubscriptionTier): string | null {
  return TIER_FEATURES[normalizeTier(userTier)].autoUpdateFrequency;
}

/**
 * Check if user can access analytics
 */
export function canAccessAnalytics(userTier: SubscriptionTier): boolean {
  const features = TIER_FEATURES[normalizeTier(userTier)];
  return features.basicAnalytics || features.advancedAnalytics;
}

/**
 * Check if user can access advanced analytics (Pro+)
 */
export function canAccessAdvancedAnalytics(userTier: SubscriptionTier): boolean {
  return TIER_FEATURES[normalizeTier(userTier)].advancedAnalytics;
}

/**
 * Check if user can have auto-updates enabled
 */
export function canAccessAutoUpdates(userTier: SubscriptionTier): boolean {
  return TIER_FEATURES[normalizeTier(userTier)].autoUpdates;
}

/**
 * Check if user can export reports
 */
export function canExportReports(userTier: SubscriptionTier): boolean {
  return TIER_FEATURES[normalizeTier(userTier)].exportReports;
}

/**
 * Get tier display information
 */
export function getTierDisplayInfo(tier: SubscriptionTier): {
  name: string;
  displayName: string;
  color: string;
  badge: string;
  price: string;
} {
  const tierInfo: Record<ActiveTier, {
    name: string;
    displayName: string;
    color: string;
    badge: string;
    price: string;
  }> = {
    free: {
      name: 'free',
      displayName: 'Free',
      color: 'text-gray-600',
      badge: '💚 Free',
      price: '$0/mo',
    },
    pro: {
      name: 'pro',
      displayName: 'Pro',
      color: 'text-amber-500',
      badge: '👑 Pro',
      price: '$50/mo',
    },
    enterprise: {
      name: 'enterprise',
      displayName: 'Enterprise',
      color: 'text-indigo-600',
      badge: '🏢 Enterprise',
      price: 'Custom',
    },
  };

  return tierInfo[normalizeTier(tier)];
}

/**
 * Get upgrade path for a tier (what tier should they upgrade to?)
 */
export function getUpgradePath(currentTier: SubscriptionTier): SubscriptionTier | null {
  if (currentTier === 'enterprise') return null;
  if (currentTier === 'pro') return 'enterprise';
  return 'pro';
}

/**
 * Get feature comparison for upgrade prompts
 */
export function getFeatureComparison(
  currentTier: SubscriptionTier,
  targetTier: SubscriptionTier,
): Array<{ feature: string; current: string; target: string }> {
  const current = TIER_FEATURES[normalizeTier(currentTier)];
  const target = TIER_FEATURES[normalizeTier(targetTier)];

  return [
    {
      feature: 'Trucks',
      current: current.maxTrucks === Infinity ? 'Unlimited' : String(current.maxTrucks),
      target: target.maxTrucks === Infinity ? 'Unlimited' : String(target.maxTrucks),
    },
    {
      feature: 'Auto-Updates',
      current: current.autoUpdateFrequency ?? 'None',
      target: target.autoUpdateFrequency ?? 'None',
    },
    {
      feature: 'Analytics',
      current: (() => {
        if (current.advancedAnalytics) return 'Advanced';
        if (current.basicAnalytics) return 'Basic';
        return 'None';
      })(),
      target: (() => {
        if (target.advancedAnalytics) return 'Advanced';
        if (target.basicAnalytics) return 'Basic';
        return 'None';
      })(),
    },
    {
      feature: 'Featured Dishes',
      current: String(current.featuredDishes),
      target: String(target.featuredDishes),
    },
  ];
}