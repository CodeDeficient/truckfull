import type { Database } from '@/lib/database.remote.types';
import { escapeIlike } from '@/lib/claim/escapeIlike';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import { provisionFreeTrial } from '@/lib/subscription/trialProvisioning';

type ClaimTruckResult = {
  success: boolean;
  error_message: string;
  updated_truck_id: string | null;
};

export interface MatchingTruck {
  id: string;
  name: string;
  photo_url?: string | null;
  cuisine_type?: string[] | null;
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function buildAdminClaimUpdate(userId: string) {
  return {
    owner_id: userId,
    is_claimed: true,
    claimed_at: new Date().toISOString(),
    claimed_by: userId,
    claim_verification_method: 'admin',
  };
}

export function findMatchingTruckFromRows(
  rows: Array<{
    id: string;
    name: string | null;
    contact_info: unknown;
    cuisine_type: string[] | null;
  }>,
): MatchingTruck | null {
  if (rows.length === 0) return null;

  const truck = rows[0];
  const contactInfo = (truck.contact_info ?? {}) as Record<string, unknown>;

  return {
    id: truck.id,
    name: truck.name ?? 'Unknown Truck',
    photo_url: (contactInfo.photo_url as string) ?? null,
    cuisine_type: truck.cuisine_type,
  };
}

/**
 * Find an unclaimed truck matching the user's email address.
 * Uses Postgres ilike on contact_info->>email instead of client-side filtering,
 * so it works across all 200+ unclaimed trucks — not just the first 10.
 */
export async function findMatchingUnclaimedTruck(userEmail: string): Promise<MatchingTruck | null> {
  try {
    const supabase = getSupabaseAdmin();
    const normalizedEmail = normalizeEmail(userEmail);

    const { data: trucks, error } = await supabase
      .from('food_trucks')
      .select('id, name, contact_info, cuisine_type')
      .is('owner_id', null)
      .eq('is_claimed', false)
      .ilike('contact_info->>email', escapeIlike(normalizedEmail))
      .limit(1);

    if (error) {
      logError('Error finding matching truck:', error);
      return null;
    }

    return findMatchingTruckFromRows(trucks ?? []);
  } catch (error) {
    logError('Error in findMatchingUnclaimedTruck:', error);
    return null;
  }
}

/**
 * Claim a truck for a user via the atomic RPC (validates email match).
 * Use this when the user's email matches the truck's contact_info.email.
 */
export async function claimTruckForUser(
  truckId: string,
  userId: string,
  userEmail: string,
): Promise<{ success: boolean; error?: string; trialStarted?: boolean }> {
  try {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc('claim_truck_atomic' as string & keyof Database['public']['Functions'], {
      p_truck_id: truckId,
      p_user_id: userId,
      p_contact_email: userEmail,
    });

    if (error) {
      logError('Error claiming truck:', error);
      return { success: false, error: 'Failed to claim truck' };
    }

    const results = data as ClaimTruckResult[] | null;
    if (!results || results.length === 0) {
      return { success: false, error: 'Failed to claim truck' };
    }

    const result = results[0];
    if (!result.success) {
      return { success: false, error: result.error_message };
    }

    const trialResult = await provisionFreeTrial(userId, 'claim');
    if (!trialResult.success) {
      logError('Trial provisioning failed for user', userId);
    }

    return { success: true, trialStarted: trialResult.success ? trialResult.provisioned : false };
  } catch (error) {
    logError('Error in claimTruckForUser:', error);
    return { success: false, error: 'Failed to claim truck' };
  }
}

/**
 * Admin override: claim a truck for a user WITHOUT email validation.
 * Use when an admin authorizes the claim (e.g., invite flow, manual claim).
 * The claim_verification_method is set to 'admin' for audit trail.
 */
export async function claimTruckAdmin(
  truckId: string,
  userId: string,
): Promise<{ success: boolean; error?: string; trialStarted?: boolean }> {
  try {
    const supabase = getSupabaseAdmin();

    const update = buildAdminClaimUpdate(userId);

    const { data, error } = await supabase
      .from('food_trucks')
      .update(update)
      .eq('id', truckId)
      .is('owner_id', null)
      .eq('is_claimed', false)
      .select('id')
      .single();

    if (error) {
      logError('Error admin-claiming truck:', error);
      return { success: false, error: error.message };
    }

    if (!data) {
      return { success: false, error: 'Truck not found or already claimed' };
    }

    const trialAdminResult = await provisionFreeTrial(userId, 'claim');
    if (!trialAdminResult.success) {
      logError('Trial provisioning failed for user', userId);
    }

    return { success: true, trialStarted: trialAdminResult.success ? trialAdminResult.provisioned : false };
  } catch (error) {
    logError('Error in claimTruckAdmin:', error);
    return { success: false, error: 'Failed to claim truck' };
  }
}
