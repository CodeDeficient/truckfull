/**
 * Event Access Tier Utility
 * WBS: 6.4.1, 6.4.2
 *
 * Centralized logic for tier-based event access.
 */

import type { SubscriptionTier } from '@/lib/types/tier';

export type { SubscriptionTier } from '@/lib/types/tier';

export interface EventAccessResult {
  canView: boolean;
  canApply: boolean;
  canSeeDocuments: boolean;
  canSeeFullDetails: boolean;
  restrictionReason?: string;
  upgradeTarget?: 'pro';
}

/**
 * Determines what a user can access for a given event based on their tier.
 *
 * Rules:
 * - Free: View public events, but cannot apply to paid events
 * - Pro: Apply to all events + priority placement + full document access
 */
export function getEventAccess(
  tier: SubscriptionTier,
  event: { vendor_fee: number | null; is_public?: boolean },
): EventAccessResult {
  const isPublic = event.is_public !== false;

  const result: EventAccessResult = {
    canView: true,
    canApply: true,
    canSeeDocuments: false,
    canSeeFullDetails: true,
  };

  const effectiveTier = tier === 'starter' ? 'free' : tier;

  if (!effectiveTier || effectiveTier === 'free') {
    if (!isPublic) {
      result.canView = false;
      result.restrictionReason = 'This event is not available on the free tier';
      result.upgradeTarget = 'pro';
    }
    result.canApply = false;
    result.restrictionReason = 'Upgrade to apply to events';
    result.upgradeTarget = 'pro';
    return result;
  }

  if (effectiveTier === 'pro') {
    result.canSeeDocuments = true;
    result.canSeeFullDetails = true;
    return result;
  }

  return result;
}

/**
 * Gets document visibility based on tier.
 */
export function getDocumentVisibility(tier: SubscriptionTier): {
  canSeeBadge: boolean;
  canSeeBasicDocs: boolean;
  canSeeAllDocs: boolean;
  canSeeReviews: boolean;
} {
  const effectiveTier = tier === 'starter' ? 'free' : tier;

  if (effectiveTier === 'pro') {
    return {
      canSeeBadge: true,
      canSeeBasicDocs: true,
      canSeeAllDocs: true,
      canSeeReviews: true,
    };
  }

  return {
    canSeeBadge: true,
    canSeeBasicDocs: false,
    canSeeAllDocs: false,
    canSeeReviews: false,
  };
}

/**
 * Gets the priority order for applications in organizer view.
 * All tiers get the same priority.
 */
export function getApplicationPriority(_tier: SubscriptionTier): number {
  return 1;
}