/**
 * Hotspot Reservation Tier Configuration
 *
 * Centralized tier configuration for enforcing hotspot reservation limits.
 * Used by hotspot reservation routes to validate tier-based restrictions.
 */

import type { ActiveHotspotTier } from '@/lib/types/tier';

export type { HotspotTier as Tier, ActiveHotspotTier as ActiveTier } from '@/lib/types/tier';

type ActiveTier = ActiveHotspotTier;

export interface TierLimits {
  canReserveHotspots: boolean;
  maxReservationDays: number | null;
  maxReservationsAtOnce: number;
  maxTrucks: number;
  features: string[];
}

const TIER_CONFIG: Record<ActiveTier, TierLimits> = {
  free: {
    canReserveHotspots: false,
    maxReservationDays: null,
    maxReservationsAtOnce: 0,
    maxTrucks: 1,
    features: ['Basic profile', 'View hotspots'],
  },
  pro: {
    canReserveHotspots: true,
    maxReservationDays: null,
    maxReservationsAtOnce: 5,
    maxTrucks: 10,
    features: ['Basic profile', 'View hotspots', 'Unlimited reservations', 'Multiple concurrent'],
  },
  admin: {
    canReserveHotspots: true,
    maxReservationDays: null,
    maxReservationsAtOnce: Infinity,
    maxTrucks: Infinity,
    features: ['All features', 'Unlimited access'],
  },
};

function normalizeTier(tier: string): ActiveTier {
  if (tier === 'starter') return 'free';
  if (tier in TIER_CONFIG) return tier as ActiveTier;
  return 'free';
}

export function getTierLimits(tier: string): TierLimits {
  const activeTier = normalizeTier(tier);
  return TIER_CONFIG[activeTier];
}

export function canReserveHotspot(tier: string, days: number): boolean {
  const limits = getTierLimits(tier);
  if (!limits.canReserveHotspots) {
    return false;
  }
  if (limits.maxReservationDays === null) {
    return true;
  }
  return days <= limits.maxReservationDays;
}

export function getTierDisplayName(tier: string): string {
  const displayNames: Record<ActiveTier, string> = {
    free: 'Free',
    pro: 'Pro',
    admin: 'Admin',
  };
  const activeTier = normalizeTier(tier);
  return displayNames[activeTier] || tier;
}

export default TIER_CONFIG;