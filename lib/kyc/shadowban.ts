/**
 * Shadowban Logic
 * WBS: 6.5.3
 *
 * Automatically restricts low-rated organizers.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage, logWarning } from '@/lib/logging';

const SHADOWBAN_THRESHOLD_RATING = 2;
const SHADOWBAN_MIN_REVIEWS = 3;

interface ShadowbanResult {
  shouldShadowban: boolean;
  currentRating: number;
  reviewCount: number;
  reason?: string;
}

/**
 * Checks if an organizer should be shadowbanned based on their ratings.
 *
 * Rules:
 * - rating_avg < 2.0 AND rating_count >= 3 → shadowban
 * - Shadowbanned organizers can only post free events
 */
export async function checkShadowbanStatus(organizerId: string): Promise<ShadowbanResult> {
  const adminClient = getSupabaseAdmin();

  const { data: organizer, error } = await adminClient
    .from('event_organizers')
    .select('rating_avg, rating_count, verification_status')
    .eq('id', organizerId)
    .single();

  if (error || !organizer) {
    return {
      shouldShadowban: false,
      currentRating: 0,
      reviewCount: 0,
      reason: 'Organizer not found',
    };
  }

  const rating = organizer.rating_avg ?? 5;
  const count = organizer.rating_count ?? 0;

  const shouldShadowban = rating < SHADOWBAN_THRESHOLD_RATING && count >= SHADOWBAN_MIN_REVIEWS;

  return {
    shouldShadowban,
    currentRating: rating,
    reviewCount: count,
    reason: shouldShadowban
      ? `Rating ${rating.toFixed(1)} below threshold with ${count} reviews`
      : undefined,
  };
}

/**
 * Applies shadowban to an organizer.
 * This restricts them to free events only.
 */
export async function applyShadowban(organizerId: string, reason: string): Promise<boolean> {
  const adminClient = getSupabaseAdmin();

  const { error } = await adminClient
    .from('event_organizers')
    .update({
      verification_status: 'shadowbanned',
    })
    .eq('id', organizerId);

  if (error) {
    logWarning(`Failed to shadowban organizer ${organizerId}:`, error);
    return false;
  }

  logMessage(`Organizer ${organizerId} shadowbanned: ${reason}`);
  return true;
}

/**
 * Checks and applies shadowban if needed.
 * Should be called after each review is submitted.
 */
export async function checkAndApplyShadowban(organizerId: string): Promise<{
  applied: boolean;
  reason?: string;
}> {
  const result = await checkShadowbanStatus(organizerId);

  if (!result.shouldShadowban) {
    return { applied: false };
  }

  const success = await applyShadowban(organizerId, result.reason!);

  return {
    applied: success,
    reason: result.reason,
  };
}

/**
 * Gets the restrictions for a shadowbanned organizer.
 */
export function getShadowbanRestrictions(verificationStatus: string) {
  if (verificationStatus !== 'shadowbanned') {
    return {
      isShadowbanned: false,
      canPostPaidEvents: true,
      canPostFreeEvents: true,
      restrictions: [],
    };
  }

  return {
    isShadowbanned: true,
    canPostPaidEvents: false,
    canPostFreeEvents: true,
    restrictions: [
      'Cannot create paid events',
      'Events receive lower visibility',
      'Must improve rating to lift restrictions',
    ],
  };
}

/**
 * Checks if an organizer can be un-shadowbanned.
 * Requires manual review + rating improvement.
 */
export async function canLiftShadowban(organizerId: string): Promise<{
  canLift: boolean;
  currentRating: number;
  requiredRating: number;
}> {
  const result = await checkShadowbanStatus(organizerId);

  return {
    canLift: result.currentRating >= 3 && result.reviewCount >= SHADOWBAN_MIN_REVIEWS + 2,
    currentRating: result.currentRating,
    requiredRating: 3,
  };
}
