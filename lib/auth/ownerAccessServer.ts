import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { computeEntitlementActive, decideOwnerAccess } from '@/lib/auth/ownerAccess';
import { logError } from '@/lib/logging';

/**
 * Server-only capability guard for owner-dashboard pages.
 *
 * Distinguishes four outcomes so pages can redirect appropriately:
 * - unauthenticated: no session → send to auth
 * - authenticated_without_access: free customer → send to Billing (upgrade offer)
 * - allowed_by_role: owner/admin — current behavior preserved
 * - allowed_by_entitlement: active trial, paid Pro, or comped enterprise
 */
export type OwnerAccessResult =
  | { outcome: 'unauthenticated' }
  | { outcome: 'authenticated_without_access' }
  | {
      outcome: 'allowed_by_role' | 'allowed_by_entitlement';
      userId: string;
      role: string;
    };

/** Only the fields the entitlement rule needs — no subscription_history query. */
interface OwnerProfileFields {
  role: string;
  subscription_tier: string;
  stripe_subscription_id: string | null;
  subscription_ends_at: string | null;
}

export async function verifyOwnerAccessFromCookies(): Promise<OwnerAccessResult> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error != undefined || user == undefined) {
      return { outcome: 'unauthenticated' };
    }

    // Admin client to bypass RLS on profiles, matching verifyRoleFromCookies.
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .select('role, subscription_tier, stripe_subscription_id, subscription_ends_at')
      .eq('id', user.id)
      .single<OwnerProfileFields>();

    if (profileError != undefined || profile == undefined) {
      return { outcome: 'unauthenticated' };
    }

    const entitlementActive = computeEntitlementActive(
      {
        subscriptionTier: profile.subscription_tier,
        stripeSubscriptionId: profile.stripe_subscription_id,
        subscriptionEndsAt: profile.subscription_ends_at,
      },
      new Date(),
    );

    const decision = decideOwnerAccess(profile.role, entitlementActive);

    if (!decision.allowed) {
      return { outcome: 'authenticated_without_access' };
    }

    return {
      outcome: decision.reason === 'entitlement' ? 'allowed_by_entitlement' : 'allowed_by_role',
      userId: user.id,
      role: profile.role,
    };
  } catch (error) {
    logError('Error in verifyOwnerAccessFromCookies:', error);
    return { outcome: 'unauthenticated' };
  }
}