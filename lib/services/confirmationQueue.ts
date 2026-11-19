/**
 * Confirmation Queue Service
 * Manages pending confirmations for low-confidence updates
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendConfirmationNotifications } from './notificationService';
import { logMessage, logError } from '@/lib/logging';
import type { Json } from '@/lib/database.remote.types';
import type { Times } from '@/lib/ai/parseFacebookPost';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

export interface ConfirmationData {
  food_items?: string[];
  location?: {
    address?: string;
    fuzzy?: boolean;
  };
  times?: Times;
  classification?: string;
  confidence?: number;
  [key: string]: unknown;
}

export type UpdateType = 'menu' | 'location' | 'schedule' | 'both';

export interface ConfirmationRecord {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  update_type: string;
  proposed_data: ConfirmationData;
  low_confidence_reason: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

interface PostRecord {
  id: string;
}

const CLAIM_STALE_MS = 10 * 60 * 1000;

export async function queueForConfirmation(
  truckId: string,
  facebookPostId: string,
  updateType: UpdateType,
  proposedData: ConfirmationData,
  lowConfidenceReason: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: postRecord, error: postError } = await supabase
      .from('facebook_posts')
      .select('id')
      .eq('facebook_post_id', facebookPostId)
      .eq('truck_id', truckId)
      .single();

    if (postError || !postRecord) {
      logError('Failed to find facebook_post for confirmation queue', {
        truckId,
        facebookPostId,
        error: postError?.message,
      });
      return { success: false, error: 'Failed to find facebook_post' };
    }

    const { error: insertError } = await supabase.from('facebook_post_confirmations').insert({
      truck_id: truckId,
      facebook_post_id: (postRecord as PostRecord).id,
      update_type: updateType,
      proposed_data: proposedData as Json,
      low_confidence_reason: lowConfidenceReason,
      status: 'pending',
      expires_at: expiresAt,
    });

    if (insertError) {
      logError('Failed to insert confirmation record', {
        truckId,
        facebookPostId,
        error: insertError.message,
      });

      if (insertError.code === '23505') {
        return { success: false, error: 'Confirmation already exists' };
      }
      return { success: false, error: 'Failed to insert confirmation' };
    }

    logMessage('Confirmation queued', {
      truckId,
      facebookPostId,
      updateType,
      expiresAt,
    });

    await sendConfirmationNotifications(truckId, updateType, proposedData);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error queueing confirmation', { truckId, facebookPostId, error });
    return { success: false, error: errorMessage };
  }
}

export async function getPendingConfirmations(
  truckId?: string,
  supabase?: AdminClient,
): Promise<ConfirmationRecord[]> {
  try {
    const client = supabase ?? getSupabaseAdmin();
    const staleThreshold = new Date(Date.now() - CLAIM_STALE_MS).toISOString();

    let query = client
      .from('facebook_post_confirmations')
      .select(
        `
        id,
        truck_id,
        facebook_post_id,
        update_type,
        proposed_data,
        low_confidence_reason,
        status,
        expires_at,
        created_at
      `,
      )
      .gt('expires_at', new Date().toISOString())
      .or(`status.eq.pending,and(status.eq.applying,updated_at.lt.${staleThreshold})`)
      .order('created_at', { ascending: false });

    if (truckId) {
      query = query.eq('truck_id', truckId);
    }

    const { data, error } = await query;

    if (error) {
      logError('Failed to fetch pending confirmations', { truckId, error: error.message });
      return [];
    }

    return (data as ConfirmationRecord[]) || [];
  } catch (error) {
    logError('Error fetching pending confirmations', { truckId, error });
    return [];
  }
}

/**
 * Atomically claims a pending confirmation for application.
 * Pending confirmations are claimed immediately; confirmations stuck in
 * 'applying' for longer than CLAIM_STALE_MS (crashed worker) are reclaimable
 * so the queue never deadlocks on an abandoned claim. The stale-applying
 * reclaim arm intentionally has NO expires_at guard: the cron only expires
 * 'pending' rows, so an 'applying' row past its expiry would otherwise be
 * reclaimable by nothing and permanently stuck. The conditional update
 * prevents a double-apply when two confirm requests race. When a resolution
 * payload is supplied, the owner's answer is durably captured in
 * proposed_data.resolution by the SAME conditional update — the successful
 * claimant is the only writer, and there is no crash window between claim
 * acquisition and resolution persistence. A losing racer writes nothing.
 */
export interface ClaimResolutionPayload {
  /** Submitted owner resolution; persisted at proposed_data.resolution. */
  resolution: unknown;
  /** The persisted Stage B proposal as fetched by the caller. */
  proposedData: Record<string, unknown>;
}

export async function claimConfirmationForApply(
  confirmationId: string,
  supabaseOrOptions?: AdminClient | (ClaimResolutionPayload & { supabase?: AdminClient }),
): Promise<{ success: boolean; error?: string }> {
  try {
    const arg = supabaseOrOptions as
      | AdminClient
      | (ClaimResolutionPayload & { supabase?: AdminClient })
      | undefined;
    const options =
      arg && typeof arg === 'object' && 'from' in arg
        ? { supabase: arg as AdminClient }
        : arg && typeof arg === 'object'
          ? (arg as ClaimResolutionPayload & { supabase?: AdminClient })
          : { supabase: undefined };
    const client = options.supabase ?? getSupabaseAdmin();
    const staleThreshold = new Date(Date.now() - CLAIM_STALE_MS).toISOString();

    const updatePayload: Record<string, unknown> = {
      status: 'applying',
      updated_at: new Date().toISOString(),
    };
    const resolutionOptions = options as ClaimResolutionPayload | undefined;
    if (resolutionOptions?.resolution !== undefined) {
      updatePayload.proposed_data = {
        ...resolutionOptions.proposedData,
        resolution: resolutionOptions.resolution,
      };
    }

    const nowIso = new Date().toISOString();
    const claimFilter = `and(status.eq.pending,expires_at.gt.${nowIso}),and(status.eq.applying,updated_at.lt.${staleThreshold})`;
    const { data: confirmation, error: updateError } = await client
      .from('facebook_post_confirmations')
      .update(updatePayload)
      .eq('id', confirmationId)
      .or(claimFilter)
      .select('id')
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return { success: false, error: await currentClaimStatus(client, confirmationId) };
      }
      return { success: false, error: updateError.message };
    }

    if (!confirmation?.id) {
      return { success: false, error: 'Confirmation is not pending' };
    }

    logMessage('Confirmation claimed for application', { confirmationId });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error claiming confirmation for application', {
      confirmationId,
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}

async function currentClaimStatus(supabase: AdminClient, confirmationId: string): Promise<string> {
  const { data: row } = await supabase
    .from('facebook_post_confirmations')
    .select('status, expires_at')
    .eq('id', confirmationId)
    .maybeSingle();

  const status = row?.status;
  if (!status) return 'Confirmation not found';

  // A row past its expiry but not yet cron-expired reports expiry rather
  // than its raw status. For a pending row the claim's expires_at guard is
  // what refused it; for a fresh (non-stale) applying row the stale
  // updated_at window refused it — either way the row is expired and the
  // owner-facing message is the same.
  const expiresAt = (row as { expires_at?: string }).expires_at;
  if (
    (status === 'pending' || status === 'applying') &&
    expiresAt &&
    new Date(expiresAt).getTime() <= Date.now()
  ) {
    return 'Confirmation expired';
  }

  return `Confirmation already ${status}`;
}

/**
 * Releases a confirmation claim back to 'pending' when application fails.
 * Only claims still in 'applying' are released, so a concurrent
 * application cannot be reverted by a stale release.
 */
export async function releaseConfirmationClaim(
  confirmationId: string,
  supabase?: AdminClient,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = supabase ?? getSupabaseAdmin();

    const { error: updateError } = await client
      .from('facebook_post_confirmations')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', confirmationId)
      .eq('status', 'applying')
      .select('id')
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    logMessage('Confirmation claim released after failed application', { confirmationId });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error releasing confirmation claim', { confirmationId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

export async function confirmUpdate(
  confirmationId: string,
  supabase?: AdminClient,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = supabase ?? getSupabaseAdmin();

    const { data: confirmation, error: fetchError } = await client
      .from('facebook_post_confirmations')
      .select('id, truck_id, update_type, proposed_data, status')
      .eq('id', confirmationId)
      .single();

    if (fetchError || !confirmation) {
      return { success: false, error: 'Confirmation not found' };
    }

    if (confirmation.status !== 'applying') {
      return {
        success: false,
        error: `Confirmation is not applying (status: ${confirmation.status})`,
      };
    }

    const { data: confirmed, error: updateError } = await client
      .from('facebook_post_confirmations')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', confirmationId)
      .eq('status', 'applying')
      .select('id')
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return { success: false, error: await currentClaimStatus(client, confirmationId) };
      }
      return { success: false, error: updateError.message };
    }

    if (!confirmed?.id) {
      return { success: false, error: await currentClaimStatus(client, confirmationId) };
    }

    logMessage('Update confirmed', { confirmationId, truckId: confirmation.truck_id });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error confirming update', { confirmationId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

export async function rejectUpdate(
  confirmationId: string,
  supabase?: AdminClient,
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = supabase ?? getSupabaseAdmin();
    const staleThreshold = new Date(Date.now() - CLAIM_STALE_MS).toISOString();
    const now = new Date().toISOString();

    const { data: rejected, error: updateError } = await client
      .from('facebook_post_confirmations')
      .update({
        status: 'rejected',
        confirmed_at: now,
        updated_at: now,
      })
      .eq('id', confirmationId)
      .or(`status.eq.pending,and(status.eq.applying,updated_at.lt.${staleThreshold})`)
      .select('id')
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return { success: false, error: await currentClaimStatus(client, confirmationId) };
      }
      return { success: false, error: updateError.message };
    }

    if (!rejected?.id) {
      return { success: false, error: await currentClaimStatus(client, confirmationId) };
    }

    logMessage('Update rejected', { confirmationId });
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error rejecting update', { confirmationId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}
