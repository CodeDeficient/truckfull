import { getSupabaseAdmin } from '@/lib/supabase/admin';

const RELEASED_CLAIM = {
  owner_id: null,
  is_claimed: false,
  claimed_at: null,
  claimed_by: null,
  claim_verification_method: null,
};

export async function releaseOwnedTrucks(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const claims = await admin
    .from('food_trucks')
    .update(RELEASED_CLAIM)
    .or(`owner_id.eq.${userId},claimed_by.eq.${userId}`);
  if (claims.error) throw new Error(`Releasing claimed trucks failed: ${claims.error.message}`);

  const legacy = await admin.from('food_trucks').update({ user_id: null }).eq('user_id', userId);
  if (legacy.error) throw new Error(`Releasing truck user links failed: ${legacy.error.message}`);

  const codes = await admin
    .from('claim_verification_codes')
    .update({ used_by: null })
    .eq('used_by', userId);
  if (codes.error) throw new Error(`Releasing claim codes failed: ${codes.error.message}`);
}
