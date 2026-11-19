import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logError } from '@/lib/logging';
import type { User } from '@supabase/auth-js';

export interface FindFacebookUserResult {
  user: User;
}

export async function findFacebookUser(
  facebookUserId: string,
): Promise<FindFacebookUserResult | null> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: userId, error: rpcError } = await supabaseAdmin.rpc('find_user_by_facebook_id', {
    p_facebook_user_id: facebookUserId,
  });

  if (rpcError) {
    logError('Failed to look up Facebook user via RPC', { error: rpcError, facebookUserId });
    return null;
  }

  if (!userId) {
    return null;
  }

  const {
    data: { user },
    error: getUserError,
  } = await supabaseAdmin.auth.admin.getUserById(userId);

  if (getUserError || !user) {
    logError('Failed to fetch user after Facebook ID lookup', {
      error: getUserError,
      userId,
      facebookUserId,
    });
    return null;
  }

  return { user };
}
