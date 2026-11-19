/**
 * Confirmation Resolution Orchestration (Stage C1)
 *
 * Turns a durable Stage B pending_review proposal into an owner-resolved
 * service update. Ordering invariant: validate → atomically claim
 * (pending → applying) WITH the resolution captured in the same conditional
 * update → apply side effects → applying → confirmed. A losing concurrent
 * resolver writes nothing and never releases a claim it does not own.
 *
 * Scope: schedule/location only. food_items carried in the proposal never
 * reach menu mutation. The permanent/default truck location is never read
 * as a fallback and never mutated by a resolution.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isFacebookAutoUpdateEnabled } from './sourceTracker';
import {
  invalidatePublicTruckBySlug,
  invalidatePublicTruckSearchCaches,
} from './publicTruckPage';
import {
  validateReviewResolution,
  canResolve,
  mergeProposalWithResolution,
  type ReviewResolutionInput,
} from './reviewResolution';
import { logMessage, logError } from '@/lib/logging';
import {
  deriveExpectedServiceOperationUnits,
  type ConfirmationUpdateType,
} from './confirmationPolicy';

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

interface ProposalRow {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  status: string;
  expires_at: string;
  proposed_data: Record<string, unknown>;
  facebook_posts?: { id: string } | null;
}

export interface ResolveOptions {
  supabase?: AdminClient;
}

export type ResolveOutcome =
  | { success: true; confirmationId: string }
  | {
      success: false;
      reason: string;
      code: 'invalid' | 'not_actionable' | 'expired' | 'conflict' | 'error';
    };

async function fetchConfirmationRow(
  client: AdminClient,
  confirmationId: string,
): Promise<ProposalRow | null> {
  const { data } = await client
    .from('facebook_post_confirmations')
    .select(
      `
      id,
      truck_id,
      facebook_post_id,
      status,
      expires_at,
      proposed_data
    `,
    )
    .eq('id', confirmationId)
    .maybeSingle();
  return (data as ProposalRow | null) ?? null;
}

/**
 * Target-scoped expiry: transitions ONLY this confirmation
 * pending → expired (same status the cron uses), then synchronizes the
 * parent Facebook post out of owner-action states (pending_review or
 * pending_confirmation → terminal 'rejected' +
 * explicit reason) ONLY when no other actionable (pending|applying)
 * confirmation remains for the same post. The partial unique index only
 * bounds 'pending' siblings, so 'applying' siblings must be checked.
 */
async function expireTargetAndSyncParent(client: AdminClient, row: ProposalRow): Promise<void> {
  const { error } = await client
    .from('facebook_post_confirmations')
    .update({ status: 'expired', updated_at: new Date().toISOString() })
    .eq('id', row.id)
    .eq('status', 'pending')
    .select('id')
    .single();
  if (error) {
    logError('Failed to expire confirmation at action time', {
      confirmationId: row.id,
      error: error.message,
    });
    return;
  }

  const { data: siblings } = await client
    .from('facebook_post_confirmations')
    .select('id, status, expires_at')
    .eq('facebook_post_id', row.facebook_post_id)
    .in('status', ['pending', 'applying']);

  // Actionability mirrors the claim's own two-arm semantics
  // (claimConfirmationForApply): a pending sibling is actionable only
  // while unexpired, but ANY applying sibling remains actionable
  // regardless of expires_at — its claim may still complete, and the
  // stale-reclaim arm recovers it even past expiry.
  const nowMs = Date.now();
  const actionableSiblings = (siblings ?? []).filter((sibling) => {
    if (sibling.id === row.id) return false;
    if (sibling.status === 'applying') return true;
    if (sibling.status === 'pending') {
      return new Date((sibling as { expires_at: string }).expires_at).getTime() > nowMs;
    }
    return false;
  });
  if (actionableSiblings.length > 0) {
    logMessage(
      'Confirmation expired; parent post keeps owner-action status (actionable sibling exists)',
      {
        confirmationId: row.id,
        facebookPostId: row.facebook_post_id,
        siblingCount: actionableSiblings.length,
      },
    );
    return;
  }

  // facebook_post_confirmations.facebook_post_id is a FK to facebook_posts.id
  // (UUID) — the FK value IS the parent post's primary key.
  const facebookPostId = row.facebook_post_id;

  const { error: parentError } = await client
    .from('facebook_posts')
    .update({
      status: 'rejected',
      processed_reason: 'Confirmation expired',
      processed_at: new Date().toISOString(),
    })
    .eq('id', facebookPostId)
    .in('status', ['pending_review', 'pending_confirmation']);
  if (parentError) {
    logError('Failed to synchronize expired confirmation parent post', {
      confirmationId: row.id,
      facebookPostId,
      error: parentError.message,
    });
  }
}

/**
 * Shared action-time expiry preflight for ALL owner actions (confirm,
 * reject, resolve) on any confirmation kind (plain or review proposal).
 *
 * Canonical flow position: after authentication, fetch, ownership
 * verification, and the actionable-status check — BEFORE branching into
 * plain-confirm vs reviewAction/resolution handling. When the target is
 * pending and past its expiry, it is transitioned pending → expired and
 * the parent post is synchronized out of its owner-action state ONLY when
 * no other actionable confirmation remains (same semantics as
 * expireTargetAndSyncParent). Non-pending or unexpired rows are returned
 * untouched so the caller proceeds with its normal action flow.
 */
export async function expireIfDueAndSyncParent(
  confirmationId: string,
  options?: ResolveOptions,
): Promise<{ expired: boolean }> {
  const client = options?.supabase ?? getSupabaseAdmin();
  const row = await fetchConfirmationRow(client, confirmationId);
  if (!row) return { expired: false };
  if (row.status !== 'pending') return { expired: false };
  if (new Date(row.expires_at).getTime() > Date.now()) return { expired: false };
  await expireTargetAndSyncParent(client, row);
  return { expired: true };
}

export async function resolveConfirmation(
  confirmationId: string,
  resolution: unknown,
  options?: ResolveOptions,
): Promise<ResolveOutcome> {
  try {
    const client = options?.supabase ?? getSupabaseAdmin();

    // 1. Fetch the persisted proposal.
    const row = await fetchConfirmationRow(client, confirmationId);
    if (!row) {
      return { success: false, reason: 'Confirmation not found', code: 'not_actionable' };
    }

    // 2. Gate: only review proposals (Stage B) are owner-resolvable. Plain
    // (non-review) confirmations are handled by confirm/reject; applying
    // resolve to one would bypass the review contract and misapply its
    // proposal through the undefined-scope path.
    const proposal = row.proposed_data as unknown as Parameters<typeof validateReviewResolution>[0];
    if (!proposal || typeof proposal !== 'object' || !('reviewAction' in proposal)) {
      return {
        success: false,
        reason: 'Resolution is only available for review proposals',
        code: 'invalid',
      };
    }

    // 3. Validate the submitted resolution against the PERSISTED proposal.
    const validation = validateReviewResolution(proposal, resolution as never);
    if (!validation.valid) {
      return { success: false, reason: validation.reason, code: 'invalid' };
    }

    // 4. Merged-completeness gate: usable time + usable location + scope.
    const completeness = canResolve(proposal, resolution as never);
    if (!completeness.canResolve) {
      return { success: false, reason: completeness.reason, code: 'invalid' };
    }

    // 5. Expiry at action time via the shared preflight (target-scoped;
    // parent synced when no actionable sibling remains). Expired rows are
    // never claimable — the claim's conditional update also carries
    // expires_at > now.
    if (await expireIfDueAndSyncParent(confirmationId, { supabase: client }).then((r) => r.expired)) {
      return { success: false, reason: 'Confirmation expired', code: 'expired' };
    }

    // 6. Non-pending rows are not resolvable; 'applying' means another
    // actor owns the claim. No resolution write, no release.
    if (row.status !== 'pending') {
      return {
        success: false,
        reason: `Confirmation is ${row.status}`,
        code: 'conflict',
      };
    }

    // 7. Atomic claim + resolution capture (one conditional update).
    const claim = await claimWithResolution(client, confirmationId, row.proposed_data, resolution);
    if (!claim.success) {
      // Losing the race writes nothing. If the loss was expiry crossing the
      // deadline between pre-check and claim, the shared preflight
      // synchronizes the target.
      if (
        await expireIfDueAndSyncParent(confirmationId, { supabase: client }).then(
          (r) => r.expired,
        )
      ) {
        return { success: false, reason: 'Confirmation expired', code: 'expired' };
      }
      return {
        success: false,
        reason: claim.error ?? 'Confirmation is not pending',
        code: 'conflict',
      };
    }

    // 8. Application is Stage C1's follow-on step: the resolution is now
    // durably captured under the claim. The apply step (schedule/location
    // writers) is invoked by the route after this function returns success;
    // on apply failure the route releases the claim — resolution preserved.
    logMessage('Owner resolution captured with claim', {
      confirmationId,
      truckId: row.truck_id,
    });
    return { success: true, confirmationId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logError('Error resolving confirmation', { confirmationId, error: message });
    return { success: false, reason: message, code: 'error' };
  }
}

async function claimWithResolution(
  client: AdminClient,
  confirmationId: string,
  proposedData: Record<string, unknown>,
  resolution: unknown,
): Promise<{ success: boolean; error?: string }> {
  const { claimConfirmationForApply } = await import('./confirmationQueue');
  return claimConfirmationForApply(confirmationId, {
    resolution,
    proposedData,
    supabase: client,
  });
}

export interface ApplyResolvedOptions {
  supabase?: AdminClient;
}

export type ApplyResolvedOutcome =
  | {
      success: true;
      updatedFields: string[];
      expectedUnits: ConfirmationUpdateType[];
      slug?: string;
    }
  | { success: false; error: string };

/**
 * Applies the merged effective operation (persisted proposal + captured
 * resolution) after a successful claim. Schedule/location ONLY:
 * - one-off scope → one food_truck_schedule_overrides row (service date,
 *   hours, location_data); the permanent/default truck address is never
 *   read as a fallback and never mutated.
 * - recurring scope → operating_hours[day] entries with the per-day
 *   service location; updateLocation() is never called.
 * - menu is excluded unconditionally.
 */
export async function applyResolvedConfirmation(
  confirmationId: string,
  options?: ApplyResolvedOptions,
): Promise<ApplyResolvedOutcome> {
  try {
    const client = options?.supabase ?? getSupabaseAdmin();

    const { data: row } = await client
      .from('facebook_post_confirmations')
      .select('id, truck_id, update_type, status, proposed_data, facebook_post_id')
      .eq('id', confirmationId)
      .maybeSingle();
    const confirmation = row as unknown as {
      id: string;
      truck_id: string;
      update_type: string;
      status: string;
      proposed_data: Record<string, unknown>;
      facebook_post_id: string;
    } | null;

    if (!confirmation) {
      return { success: false, error: 'Confirmation not found' };
    }
    if (confirmation.status !== 'applying') {
      return { success: false, error: `Confirmation is ${confirmation.status}` };
    }

    const proposal = confirmation.proposed_data as unknown as Parameters<
      typeof mergeProposalWithResolution
    >[0];
    const resolution = (confirmation.proposed_data as { resolution?: ReviewResolutionInput })
      .resolution;
    if (!resolution) {
      return { success: false, error: 'No captured resolution on this confirmation' };
    }
    const effective = mergeProposalWithResolution(proposal, resolution);

    const toggleCheck = await isFacebookAutoUpdateEnabled(confirmation.truck_id, client);
    if (!toggleCheck.allowUpdate) {
      return { success: false, error: toggleCheck.reason ?? 'Update not allowed' };
    }

    const { data: truck } = await client
      .from('food_trucks')
      .select('timezone, slug')
      .eq('id', confirmation.truck_id)
      .single();
    const truckRow = truck as { timezone?: string; slug?: string } | null;
    if (!truckRow?.timezone) {
      return { success: false, error: 'Truck timezone not found' };
    }

    const now = new Date().toISOString();
    const updatedFields: string[] = [];

    const isDated =
      effective.serviceScope === 'one_off_date' ||
      (effective.serviceScope === 'unresolved_schedule' && Boolean(effective.serviceDate));
    const expectedUnits = deriveExpectedServiceOperationUnits(effective, isDated);

    // facebook_post_confirmations.facebook_post_id is a FK to
    // facebook_posts.id (UUID) — select the parent row directly by PK. Both
    // branches need the canonical created_time: the dated override uses it
    // for override arbitration, the recurring writer for per-unit
    // recurring arbitration.
    const { data: parentPost } = await client
      .from('facebook_posts')
      .select('id, created_time')
      .eq('id', confirmation.facebook_post_id)
      .maybeSingle();
    const postRow = parentPost as { id: string; created_time: string } | null;
    if (!postRow) {
      return { success: false, error: 'Facebook post not found' };
    }

    if (isDated) {
      const serviceDate = effective.serviceDate as string;
      const { writeScheduleOverride, isOvernightTimeRange } = await import('./scheduleOverride');
      const { enrichOverrideLocation } = await import('@/lib/services/overrideLocationEnrichment');
      const { geocodeAddress } = await import('@/lib/utils/geocoding');

      const location = effective.location
        ? await enrichOverrideLocation(
            {
              address: effective.location.address,
              city: effective.location.city,
              state: effective.location.state,
              fuzzy: effective.location.fuzzy,
            },
            geocodeAddress,
          )
        : null;

      const result = await writeScheduleOverride(client, {
        truckId: confirmation.truck_id,
        shape: {
          serviceDate,
          isClosed: false,
          isAllDay: false,
          startTime: effective.times.start,
          endTime: effective.times.end,
          endsNextDay: isOvernightTimeRange(effective.times.start, effective.times.end),
          location,
        },
        source: 'facebook',
        sourcePostId: postRow.id,
        timezone: truckRow.timezone,
        now,
        sourcePostCreatedAt: postRow.created_time,
      });
      if (!result.success) {
        return { success: false, error: result.error ?? 'Failed to apply dated schedule' };
      }
      updatedFields.push('schedule');
    } else {
      const { updateSchedule } = await import('./truckUpdater');
      const result = await updateSchedule({
        supabase: client,
        truckId: confirmation.truck_id,
        start: effective.times.start,
        end: effective.times.end,
        days: effective.times.days,
        now,
        location: effective.location?.address,
        fbActionAt: postRow.created_time,
      });
      if (!result.success) {
        return { success: false, error: result.error ?? 'Failed to apply recurring schedule' };
      }
      updatedFields.push('schedule');
    }

    logMessage('Owner-resolved update applied', {
      confirmationId,
      truckId: confirmation.truck_id,
      updatedFields,
      scope: effective.serviceScope,
    });
    return { success: true, updatedFields, expectedUnits, slug: truckRow.slug ?? undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logError('Error applying resolved confirmation', { confirmationId, error: message });
    return { success: false, error: message };
  }
}

export async function applyResolvedConfirmationAndInvalidate(
  confirmationId: string,
  options?: ApplyResolvedOptions,
): Promise<ApplyResolvedOutcome> {
  const result = await applyResolvedConfirmation(confirmationId, options);
  if (!result.success) return result;

  if (result.slug) {
    invalidatePublicTruckBySlug(result.slug);
  }
  invalidatePublicTruckSearchCaches();
  return result;
}
