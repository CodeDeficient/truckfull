/**
 * Truck Verification Service
 *
 * Provides multiple methods for verifying truck ownership and preventing fraudulent claims.
 *
 * Current implementations:
 * 1. Email verification - Matches user's email to truck's email on file
 * 2. Manual verification - Support-assisted verification
 *
 * @module lib/services/truckVerificationService
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logDebug, logError, logWarning } from '@/lib/logging';

/**
 * Verification method types
 */
export type VerificationMethod = 'email' | 'manual';

/**
 * Verification result with detailed status
 */
export interface VerificationResult {
  success: boolean;
  message: string;
  verifiedBy?: VerificationMethod;
  requiresManualReview?: boolean;
}

/**
 * Truck verification status
 */
export interface TruckVerificationStatus {
  truckId: string;
  truckName: string;
  isClaimed: boolean;
  claimedBy: string | null;
  claimedAt: string | null;
  verificationMethod: string | null;
}

/**
 * Verify truck ownership via email match
 *
 * Checks if the user's email matches the truck's contact email on file.
 * This works when we have accurate truck data with email information.
 *
 * @param truckId - The truck ID being claimed
 * @param userId - The user ID claiming the truck
 * @returns Verification result
 */
export async function verifyTruckViaEmail(
  truckId: string,
  userId: string,
): Promise<VerificationResult> {
  try {
    const supabase = getSupabaseAdmin();

    // Get truck contact information
    const { data: truck, error: truckError } = await supabase
      .from('food_trucks')
      .select('id, name, contact_info, owner_id, claimed_by, is_claimed')
      .eq('id', truckId)
      .single();

    if (truckError || !truck) {
      logDebug(`[TruckVerification] Truck ${truckId} not found`);
      return {
        success: false,
        message: 'Truck not found',
      };
    }

    // Check if truck is already claimed
    if (truck.is_claimed && truck.claimed_by) {
      logDebug(`[TruckVerification] Truck ${truckId} already claimed by ${truck.claimed_by}`);
      return {
        success: false,
        message: 'This truck has already been claimed',
      };
    }

    // Get user's email from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      logDebug(`[TruckVerification] User profile ${userId} not found`);
      return {
        success: false,
        message: 'User profile not found',
      };
    }

    // Check if user's email matches truck's contact email
    // Allow case-insensitive match and trim whitespace
    const truckContactEmail = (truck.contact_info as { email?: string } | null)?.email;
    if (!truckContactEmail) {
      logWarning(`[TruckVerification] Truck ${truckId} has no contact email on file`);
      return {
        success: false,
        message: 'Truck email not on file. Please contact support for manual verification.',
        requiresManualReview: true,
      };
    }

    if (!profile.email) {
      logDebug(`[TruckVerification] User ${userId} has no email on file`);
      return {
        success: false,
        message: 'Your email is not on file. Please contact support for manual verification.',
        requiresManualReview: true,
      };
    }

    const normalizedTruckEmail = truckContactEmail.trim().toLowerCase();
    const normalizedUserEmail = profile.email.trim().toLowerCase();

    if (normalizedTruckEmail !== normalizedUserEmail) {
      logDebug(
        `[TruckVerification] Email mismatch: truck=${normalizedTruckEmail}, user=${normalizedUserEmail}`,
      );
      return {
        success: false,
        message:
          'Email does not match truck records. Please contact support for manual verification.',
        requiresManualReview: true,
      };
    }

    // Email matches - verification successful
    logDebug(
      `[TruckVerification] Email verification passed for truck ${truckId} by user ${userId}`,
    );
    return {
      success: true,
      message: 'Truck verified via email match',
      verifiedBy: 'email',
    };
  } catch (error) {
    logError('[TruckVerification] Email verification error:', error);
    return {
      success: false,
      message: 'Verification failed. Please try again or contact support.',
    };
  }
}

/**
 * Main truck verification function that routes to appropriate method
 *
 * Automatically selects the best verification method based on available data:
 * 1. Email verification
 *
 * @param truckId - The truck ID being claimed
 * @param userId - The user ID claiming the truck
 * @returns Verification result
 */
export async function verifyTruckOwnership(
  truckId: string,
  userId: string,
): Promise<VerificationResult> {
  logDebug(`[TruckVerification] Starting verification for truck ${truckId} by user ${userId}`);

  // Try email verification
  const emailResult = await verifyTruckViaEmail(truckId, userId);

  if (emailResult.success) {
    return emailResult;
  }

  // Email verification failed - return result to show user to contact support
  logWarning(`[TruckVerification] Email verification failed, returning manual review instruction`);
  return emailResult;
}

/**
 * Get verification status for a truck
 *
 * @param truckId - The truck ID
 * @returns Current verification status or null if truck not found
 */
export async function getTruckVerificationStatus(
  truckId: string,
): Promise<TruckVerificationStatus | null> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: truck, error } = await supabase
      .from('food_trucks')
      .select('id, name, is_claimed, claimed_by, claimed_at, claim_verification_method')
      .eq('id', truckId)
      .single();

    if (error || !truck) {
      return null;
    }

    return {
      truckId: truck.id,
      truckName: truck.name,
      isClaimed: truck.is_claimed ?? false,
      claimedBy: truck.claimed_by,
      claimedAt: truck.claimed_at,
      verificationMethod: truck.claim_verification_method,
    };
  } catch (error) {
    logError('[TruckVerification] Failed to get verification status:', error);
    return null;
  }
}
