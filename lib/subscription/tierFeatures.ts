import type { SubscriptionTier } from '@/lib/types/tier';

type Tier = SubscriptionTier;

export interface TierFeatures {
  canViewVettingResearch: boolean;
  canViewTrafficHotspots: boolean;
  canApplyToEvents: boolean;
  canSaveLeads: boolean;
  maxEventsApplyCount: number;
  maxSavedLeads: number;
  canViewExternalEvents: boolean;
  canCreateHotspots: boolean;
}

type BooleanTierFeature = {
  [K in keyof TierFeatures as TierFeatures[K] extends boolean ? K : never]: TierFeatures[K];
};

type ActiveTier = Exclude<Tier, 'starter'>;

const ACTIVE_TIER_FEATURES: Record<ActiveTier, TierFeatures> = {
  free: {
    canViewVettingResearch: false,
    canViewTrafficHotspots: false,
    canApplyToEvents: true,
    canSaveLeads: true,
    maxEventsApplyCount: 3,
    maxSavedLeads: 5,
    canViewExternalEvents: true,
    canCreateHotspots: false,
  },
  pro: {
    canViewVettingResearch: true,
    canViewTrafficHotspots: true,
    canApplyToEvents: true,
    canSaveLeads: true,
    maxEventsApplyCount: -1,
    maxSavedLeads: -1,
    canViewExternalEvents: true,
    canCreateHotspots: true,
  },
  enterprise: {
    canViewVettingResearch: true,
    canViewTrafficHotspots: true,
    canApplyToEvents: true,
    canSaveLeads: true,
    maxEventsApplyCount: -1,
    maxSavedLeads: -1,
    canViewExternalEvents: true,
    canCreateHotspots: true,
  },
};

/** @deprecated Use ActiveTier instead */
export const TIER_FEATURES: Record<Tier, TierFeatures> = {
  ...ACTIVE_TIER_FEATURES,
  starter: ACTIVE_TIER_FEATURES.free,
};

function normalizeTier(tier: Tier): ActiveTier {
  return tier === 'starter' ? 'free' : tier;
}

export function hasFeature(tier: Tier, feature: keyof BooleanTierFeature): boolean {
  return ACTIVE_TIER_FEATURES[normalizeTier(tier)][feature] as boolean;
}

export function getMaxLeads(tier: Tier): number {
  return ACTIVE_TIER_FEATURES[normalizeTier(tier)].maxSavedLeads;
}