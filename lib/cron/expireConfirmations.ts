/**
 * Cron Job: Expire Pending Confirmations
 * Expires all pending confirmations past their expiration timestamp
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage, logError } from '@/lib/logging';
import type { SupabaseClient } from '@supabase/supabase-js';

type SupabaseClientWithRpc<T> = SupabaseClient<T> & {
  rpc: (fn: string) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function expireConfirmations(): Promise<{ expired: number; error?: string }> {
  try {
    const supabase = getSupabaseAdmin() as SupabaseClientWithRpc<never>;

    // RPC call to expire_pending_confirmations - function created in migration 20260317000000_add_facebook_update_tracking.sql
    // eslint-disable-next-line no-restricted-syntax
    const { data, error } = await supabase.rpc('expire_pending_confirmations');

    if (error) {
      logError('Failed to expire confirmations', { error: error.message });
      return { expired: 0, error: error.message };
    }

    const expiredCount = typeof data === 'number' ? data : 0;

    if (expiredCount > 0) {
      logMessage(`Expired ${expiredCount} pending confirmations`);
    }

    return { expired: expiredCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error expiring confirmations', { error: errorMessage });
    return { expired: 0, error: errorMessage };
  }
}
