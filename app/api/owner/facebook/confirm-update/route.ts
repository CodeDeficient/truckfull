/**
 * Confirmation Endpoint
 * Allows owners to confirm or reject pending Facebook post updates
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import {
  getPendingConfirmations,
  confirmUpdate,
  rejectUpdate,
  claimConfirmationForApply,
  releaseConfirmationClaim,
  type ConfirmationRecord,
} from '@/lib/services/confirmationQueue';
import { isFacebookAutoUpdateEnabled } from '@/lib/services/sourceTracker';
import { updateTruckData } from '@/lib/services/truckUpdater';
import { classifyPost } from '@/lib/services/postClassifier';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  resolveConfirmation,
  applyResolvedConfirmationAndInvalidate,
  expireIfDueAndSyncParent,
} from '@/lib/services/confirmationResolutionService';
import { logMessage, logError, logWarning } from '@/lib/logging';
import type { Times } from '@/lib/ai/parseFacebookPost';
import {
  isOvernightTimeRange,
  isValidTimezone,
  writeScheduleOverride,
} from '@/lib/services/scheduleOverride';
import {
  assessConfirmationApplication,
  deriveExpectedServiceOperationUnits,
  getLocationReviewDiagnostic,
  hasNonScheduleData,
  isUnresolvedDatedProposal,
  requiresAtomicDatedApplication,
} from '@/lib/services/confirmationPolicy';
import { getScheduleValidationDiagnostic } from '@/lib/services/scheduleSemantics';
import {
  invalidatePublicTruckBySlug,
  invalidatePublicTruckSearchCaches,
} from '@/lib/services/publicTruckPage';
import type { Database } from '@/lib/database.remote.types';

type ScheduleOverrideSnapshot =
  Database['public']['Tables']['food_truck_schedule_overrides']['Row'];

interface ConfirmRequest {
  confirmationId: string;
  action: 'confirm' | 'reject' | 'resolve';
  resolution?: unknown;
}

interface ConfirmationWithPost {
  id: string;
  truck_id: string;
  update_type: string;
  proposed_data: {
    food_items?: string[];
    location?: { address?: string; city?: string; state?: string; fuzzy?: boolean };
    times?: Times;
    serviceDate?: string;
    timezone?: string;
    classification?: string;
    confidence?: number;
    reviewAction?:
      | 'ambiguous_location'
      | 'ambiguous_time'
      | 'missing_location'
      | 'unresolved_schedule';
  };
  low_confidence_reason: string | null;
  status: string;
  facebook_posts?: {
    id: string;
    created_time: string;
  };
}

interface DatedScheduleProposal {
  serviceDate: string;
  startTime: string;
  endTime: string;
  location: { address?: string; city?: string; state?: string; fuzzy?: boolean };
  timezone?: string;
}

function getDatedScheduleProposal(
  proposedData: ConfirmationWithPost['proposed_data'],
): DatedScheduleProposal | null {
  const { serviceDate, times } = proposedData;
  if (!serviceDate || !times?.start || !times.end) return null;
  return {
    serviceDate,
    startTime: times.start,
    endTime: times.end,
    location: proposedData.location ?? {},
    timezone: proposedData.timezone,
  };
}

async function verifyTruckOwnership(
  truckId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: truck, error: truckError } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('id, owner_id')
    .eq('id', truckId)
    .single();

  if (truckError || !truck) {
    return { success: false, error: 'Truck not found' };
  }

  if (truck.owner_id !== userId) {
    return { success: false, error: 'Access denied' };
  }

  return { success: true };
}

async function fetchConfirmation(
  confirmationId: string,
): Promise<{ data?: ConfirmationWithPost; error?: string }> {
  const admin = getSupabaseAdmin();

  const { data: confirmation, error: fetchError } = await admin
    .from('facebook_post_confirmations')
    .select(
      `
      id,
      truck_id,
      update_type,
      proposed_data,
      low_confidence_reason,
      status,
       facebook_posts (
         id,
         created_time
      )
    `,
    )
    .eq('id', confirmationId)
    .single();

  if (fetchError || !confirmation) {
    return { error: 'Confirmation not found' };
  }

  return { data: confirmation as unknown as ConfirmationWithPost };
}

function prepareClassificationData(proposedData: ConfirmationWithPost['proposed_data']): {
  ocrResult: {
    food_items: string[];
    confidence: number;
    location?: { address: string; fuzzy: boolean };
    times?: Times;
  };
  textData: {
    mentions: never[];
    hashtags: never[];
    location?: { address: string; fuzzy: boolean };
  };
} {
  return {
    ocrResult: {
      food_items: proposedData.food_items ?? [],
      confidence: proposedData.confidence ?? 0,
      location: proposedData.location
        ? {
            address: proposedData.location.address ?? '',
            fuzzy: proposedData.location.fuzzy ?? false,
          }
        : undefined,
      times: proposedData.times,
    },
    textData: {
      mentions: [],
      hashtags: [],
      location: proposedData.location
        ? {
            address: proposedData.location.address ?? '',
            fuzzy: proposedData.location.fuzzy ?? false,
          }
        : undefined,
    },
  };
}

async function updateFacebookPostStatus(facebookPostId: string, status: string): Promise<void> {
  if (!facebookPostId) {
    logWarning('updateFacebookPostStatus: Facebook post ID is required');
    return;
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from('facebook_posts')
    .update({
      status,
      processed_at: new Date().toISOString(),
    })
    .eq('id', facebookPostId);

  if (error) {
    logError('Failed to update facebook post status', { facebookPostId, error: error.message });
  }
}

async function applyConfirmedDatedSchedule(
  confirmationData: ConfirmationWithPost,
  proposal: DatedScheduleProposal,
): Promise<{ success: boolean; error?: string; slug?: string; updatedAt?: string }> {
  const sourcePost = confirmationData.facebook_posts;
  if (!sourcePost) return { success: false, error: 'Facebook post not found' };

  const admin = getSupabaseAdmin();
  const { data: truck, error: truckError } = await admin
    .from('food_trucks')
    .select('timezone, slug')
    .eq('id', confirmationData.truck_id)
    .single();

  if (truckError || !truck?.timezone || !isValidTimezone(truck.timezone)) {
    return { success: false, error: 'Truck timezone not found' };
  }

  const timezone = proposal.timezone ?? truck.timezone;
  if (!isValidTimezone(timezone))
    return { success: false, error: 'A valid IANA timezone is required' };

  const updatedAt = new Date().toISOString();
  // Attach map coordinates to the dated stop when the proposal carries a
  // concrete address; failure keeps the words-only value and never blocks.
  const { enrichOverrideLocation } = await import('@/lib/services/overrideLocationEnrichment');
  const { geocodeAddress } = await import('@/lib/utils/geocoding');
  const enrichedLocation = proposal.location
    ? await enrichOverrideLocation(proposal.location, geocodeAddress)
    : null;
  const result = await writeScheduleOverride(admin, {
    truckId: confirmationData.truck_id,
    shape: {
      serviceDate: proposal.serviceDate,
      isClosed: false,
      isAllDay: false,
      startTime: proposal.startTime,
      endTime: proposal.endTime,
      endsNextDay: isOvernightTimeRange(proposal.startTime, proposal.endTime),
      location: enrichedLocation,
    },
    source: 'facebook',
    sourcePostId: sourcePost.id,
    timezone,
    now: updatedAt,
    sourcePostCreatedAt: sourcePost.created_time,
  });

  return result.success
    ? { success: true, slug: truck.slug ?? undefined, updatedAt: result.updatedAt ?? updatedAt }
    : { success: false, error: result.error };
}

async function readDatedScheduleSnapshot(
  truckId: string,
  serviceDate: string,
): Promise<{ snapshot: ScheduleOverrideSnapshot | null; error?: string }> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_truck_schedule_overrides')
    .select('*')
    .eq('food_truck_id', truckId)
    .eq('service_date', serviceDate)
    .maybeSingle();
  return error ? { snapshot: null, error: error.message } : { snapshot: data };
}

async function rollbackDatedSchedule(
  truckId: string,
  serviceDate: string,
  sourcePostId: string,
  updatedAt: string,
  snapshot: ScheduleOverrideSnapshot | null,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!snapshot) {
    const { data, error } = await admin
      .from('food_truck_schedule_overrides')
      .delete()
      .eq('food_truck_id', truckId)
      .eq('service_date', serviceDate)
      .eq('source_post_id', sourcePostId)
      .eq('updated_at', updatedAt)
      .select('id');
    return !error && (data?.length ?? 0) === 1;
  }

  const { data, error } = await admin
    .from('food_truck_schedule_overrides')
    .update({
      end_time: snapshot.end_time,
      ends_next_day: snapshot.ends_next_day,
      is_all_day: snapshot.is_all_day,
      is_closed: snapshot.is_closed,
      location_data: snapshot.location_data,
      source_post_created_at: snapshot.source_post_created_at,
      source_post_id: snapshot.source_post_id,
      source_type: snapshot.source_type,
      start_time: snapshot.start_time,
      timezone: snapshot.timezone,
      updated_at: snapshot.updated_at,
    })
    .eq('id', snapshot.id)
    .eq('source_post_id', sourcePostId)
    .eq('updated_at', updatedAt)
    .select('id');
  return !error && (data?.length ?? 0) === 1;
}

async function handleConfirmAction(
  confirmationData: ConfirmationWithPost,
  confirmationId: string,
  userId: string,
): Promise<NextResponse> {
  const proposedData = confirmationData.proposed_data;
  const datedSchedule = getDatedScheduleProposal(proposedData);

  // A persisted owner resolution (captured by a prior successful resolve
  // claim) makes the proposal complete: the reviewAction gate passes and
  // applyResolvedConfirmation handles the schedule/location-only application.
  // Canonical retry after a failed apply is confirm-consuming-the-resolution.
  if (proposedData.reviewAction) {
    const hasPersistedResolution = Boolean((proposedData as { resolution?: unknown }).resolution);
    if (!hasPersistedResolution) {
      return NextResponse.json(
        {
          error:
            'This update requires owner input to resolve its schedule or location and cannot be confirmed as-is',
        },
        { status: 400 },
      );
    }
    const applyResult = await applyResolvedConfirmationAndInvalidate(confirmationId, {
      supabase: getSupabaseAdmin(),
    });
    if (!applyResult.success) {
      logError('Failed to apply resolved confirmation on retry', {
        confirmationId,
        truckId: confirmationData.truck_id,
        error: applyResult.error,
      });
      return NextResponse.json(
        { error: applyResult.error || 'Failed to apply update' },
        { status: 500 },
      );
    }
    const application = assessConfirmationApplication(
      applyResult.expectedUnits,
      applyResult.updatedFields,
    );
    if (!application.success) {
      logError('APPLY_EXPECTED_UNIT_MISSING', {
        confirmationId,
        missingUnits: application.missingUnits,
      });
      return NextResponse.json(
        { error: application.code, missingUnits: application.missingUnits },
        { status: 422 },
      );
    }

    const result = await confirmUpdate(confirmationId);
    if (!result.success) {
      // The POST caller releases the claim for any >= 400 confirmResponse;
      // do not double-release here.
      logError('Failed to finalize resolved confirmation on retry', {
        confirmationId,
        error: result.error,
      });
      return NextResponse.json(
        { error: result.error || 'Failed to confirm update' },
        { status: 500 },
      );
    }

    await updateFacebookPostStatus(confirmationData.facebook_posts?.id ?? '', 'processed');
    logMessage('Persisted owner resolution applied on confirm retry', {
      confirmationId,
      truckId: confirmationData.truck_id,
      userId,
      updatedFields: applyResult.updatedFields,
    });
    return NextResponse.json({
      success: true,
      action: 'confirmed',
      updatedFields: applyResult.updatedFields,
    });
  }

  const policyData = datedSchedule ? { ...proposedData, location: undefined } : proposedData;

  if (isUnresolvedDatedProposal(proposedData)) {
    return NextResponse.json(
      {
        error: 'This date-specific schedule could not be resolved and remains pending confirmation',
      },
      { status: 422 },
    );
  }

  if (requiresAtomicDatedApplication(policyData)) {
    return NextResponse.json(
      { error: 'Mixed date-specific confirmations are not supported; no changes were made' },
      { status: 409 },
    );
  }

  const locationDiagnostic = getLocationReviewDiagnostic(proposedData);
  if (locationDiagnostic) {
    logWarning(locationDiagnostic, { confirmationId, truckId: confirmationData.truck_id });
    return NextResponse.json({ error: locationDiagnostic }, { status: 422 });
  }

  const scheduleDiagnostic = getScheduleValidationDiagnostic(proposedData.times);
  const recurringProposal =
    proposedData.times?.scope === 'recurring_weekly' ||
    proposedData.times?.scope === 'scope_missing' ||
    (!proposedData.times?.scope && proposedData.times?.days !== undefined);
  if (
    scheduleDiagnostic === 'DEGENERATE_TIMES_REJECTED' ||
    (scheduleDiagnostic === 'NONCANONICAL_DAYSET_REJECTED' && recurringProposal)
  ) {
    logWarning(scheduleDiagnostic, { confirmationId, truckId: confirmationData.truck_id });
    return NextResponse.json({ error: scheduleDiagnostic }, { status: 422 });
  }

  const expectedUnits = deriveExpectedServiceOperationUnits(proposedData, datedSchedule !== null);

  // Pre-Meta: menu automation is disabled. Menu evidence in a proposal
  // never creates a menu expectation or a menu write; scope the source
  // gate and the update to the service operation only.
  const serviceUnits = expectedUnits.filter((unit) => unit !== 'menu');

  if (serviceUnits.length === 0) {
    return NextResponse.json({ error: 'No data to update' }, { status: 400 });
  }

  // Pre-Meta blocker: a proposal whose only service unit is a non-dated
  // location can never be applied — the permanent/default address is not a
  // Facebook write target and no effective-hours inheritance exists. Fail
  // closed with a proposal-level 4xx so the owner is not stuck retrying a
  // 500. getLocationReviewDiagnostic above already handles the
  // ambiguous/fuzzy variants.
  if (serviceUnits.length === 1 && serviceUnits[0] === 'location' && !datedSchedule) {
    logWarning('LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA', {
      confirmationId,
      truckId: confirmationData.truck_id,
    });
    return NextResponse.json(
      { error: 'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA' },
      { status: 422 },
    );
  }

  // The global facebook_auto_updates_enabled toggle gates this direct-apply
  // path: confirming a proposal is an automatic Facebook-sourced write, so a
  // truck with auto-updates off must not be mutated here. (The legacy
  // shouldAllowUpdate loop enforced this as a side effect; the toggle-only
  // check is what remains after the 7-day freshness gates were removed.)
  const toggleCheck = await isFacebookAutoUpdateEnabled(confirmationData.truck_id);
  if (!toggleCheck.allowUpdate) {
    await rejectUpdate(confirmationId);
    return NextResponse.json(
      { success: false, error: toggleCheck.reason || 'Update not allowed' },
      { status: 409 },
    );
  }

  const applicationData = datedSchedule
    ? { ...proposedData, times: undefined, location: undefined }
    : proposedData;
  const { ocrResult, textData } = prepareClassificationData(applicationData);
  const classification = classifyPost(ocrResult, textData);
  const updatedFields: string[] = [];
  let scheduleSnapshot: ScheduleOverrideSnapshot | null = null;
  let scheduleUpdatedAt: string | null = null;

  if (!datedSchedule || hasNonScheduleData(applicationData)) {
    const updateResult = await updateTruckData(
      confirmationData.truck_id,
      classification,
      {
        food_items: applicationData.food_items ?? [],
        location: applicationData.location,
        times: applicationData.times,
        confidence: applicationData.confidence ?? 0,
      },
      { shouldUpdate: true, requiresConfirmation: false },
      undefined,
      { fbActionAt: confirmationData.facebook_posts?.created_time },
    );

    if (!updateResult.success) {
      // Pre-Meta fail-closed diagnostics are proposal-level policy
      // rejections, not infrastructure failures: the owner can never apply
      // this proposal, so answer 4xx instead of a retryable 500.
      if (
        updateResult.error === 'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA' ||
        updateResult.error === 'MENU_AUTOMATION_DISABLED_PREMETA'
      ) {
        logWarning(updateResult.error, { confirmationId, truckId: confirmationData.truck_id });
        return NextResponse.json({ error: updateResult.error }, { status: 422 });
      }
      logError('Failed to apply confirmed update', {
        confirmationId,
        truckId: confirmationData.truck_id,
        error: updateResult.error,
      });
      return NextResponse.json(
        { error: updateResult.error || 'Failed to apply update' },
        { status: 500 },
      );
    }
    updatedFields.push(...updateResult.updatedFields);
  }

  if (datedSchedule) {
    const snapshotResult = await readDatedScheduleSnapshot(
      confirmationData.truck_id,
      datedSchedule.serviceDate,
    );
    if (snapshotResult.error) {
      return NextResponse.json({ error: snapshotResult.error }, { status: 500 });
    }
    scheduleSnapshot = snapshotResult.snapshot;

    const scheduleResult = await applyConfirmedDatedSchedule(confirmationData, datedSchedule);
    if (!scheduleResult.success) {
      return NextResponse.json(
        { error: scheduleResult.error || 'Failed to apply dated schedule' },
        { status: 500 },
      );
    }
    if (scheduleResult.slug) {
      invalidatePublicTruckBySlug(scheduleResult.slug);
    }
    invalidatePublicTruckSearchCaches();
    scheduleUpdatedAt = scheduleResult.updatedAt ?? null;
    updatedFields.push('schedule');
  }

  const application = assessConfirmationApplication(serviceUnits, updatedFields);
  if (!application.success) {
    logError('APPLY_EXPECTED_UNIT_MISSING', {
      confirmationId,
      truckId: confirmationData.truck_id,
      expectedUnits: serviceUnits,
      updatedFields,
      missingUnits: application.missingUnits,
    });
    return NextResponse.json(
      { error: application.code, missingUnits: application.missingUnits },
      { status: 422 },
    );
  }

  const result = await confirmUpdate(confirmationId);

  if (!result.success) {
    if (datedSchedule) {
      const rollbackSucceeded = await rollbackDatedSchedule(
        confirmationData.truck_id,
        datedSchedule.serviceDate,
        confirmationData.facebook_posts?.id ?? '',
        scheduleUpdatedAt ?? '',
        scheduleSnapshot,
      );
      if (!rollbackSucceeded) {
        logError('Failed to roll back dated schedule after confirmation failure', {
          confirmationId,
          truckId: confirmationData.truck_id,
        });
      }
    }
    logError('Failed to mark confirmation as confirmed', {
      confirmationId,
      error: result.error,
    });
    return NextResponse.json(
      { error: result.error || 'Failed to confirm update' },
      { status: 500 },
    );
  }

  await updateFacebookPostStatus(confirmationData.facebook_posts?.id ?? '', 'processed');

  logMessage('Update confirmed and applied by owner', {
    confirmationId,
    truckId: confirmationData.truck_id,
    userId,
    updatedFields,
  });

  return NextResponse.json({
    success: true,
    action: 'confirmed',
    updatedFields,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const truckId = searchParams.get('truckId');

  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  if (truckId) {
    const ownershipCheck = await verifyTruckOwnership(truckId, user.id);
    if (!ownershipCheck.success) {
      return NextResponse.json({ error: ownershipCheck.error }, { status: 403 });
    }
  }

  const confirmations = await getPendingConfirmations(truckId ?? undefined);

  if (confirmations.length === 0) {
    return NextResponse.json({ confirmations: [] });
  }

  const { data: userTrucks } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('id')
    .eq('owner_id', user.id);

  const userTruckIds = userTrucks?.map((t) => t.id) ?? [];
  const ownedConfirmations = confirmations.filter((c) => userTruckIds.includes(c.truck_id));

  if (ownedConfirmations.length === 0) {
    return NextResponse.json({ confirmations: [] });
  }

  const admin = getSupabaseAdmin();
  const truckIds = [...new Set(ownedConfirmations.map((c) => c.truck_id))];

  const { data: truckNames } = await admin
    .from('food_trucks')
    .select('id, name')
    .in('id', truckIds);

  const nameMap = Object.fromEntries(
    (truckNames as { id: string; name: string }[] | undefined)?.map((t) => [t.id, t.name]) ?? [],
  );

  const enrichedConfirmations = ownedConfirmations.map((c: ConfirmationRecord) => ({
    ...c,
    truck_name: nameMap[c.truck_id] || 'Unknown Truck',
  }));

  return NextResponse.json({ confirmations: enrichedConfirmations });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = (await request.json()) as ConfirmRequest;
    const { confirmationId, action } = body;

    if (!confirmationId || !action) {
      return NextResponse.json(
        { error: 'confirmationId and action are required' },
        { status: 400 },
      );
    }

    if (action !== 'confirm' && action !== 'reject' && action !== 'resolve') {
      return NextResponse.json(
        { error: 'action must be "confirm", "reject", or "resolve"' },
        { status: 400 },
      );
    }

    if (action === 'resolve' && (!body.resolution || typeof body.resolution !== 'object')) {
      return NextResponse.json({ error: 'resolve requires a resolution payload' }, { status: 400 });
    }

    const { data: confirmationData, error: fetchError } = await fetchConfirmation(confirmationId);

    if (fetchError || !confirmationData) {
      return NextResponse.json({ error: fetchError || 'Confirmation not found' }, { status: 404 });
    }

    const ownershipCheck = await verifyTruckOwnership(confirmationData.truck_id, user.id);
    if (!ownershipCheck.success) {
      return NextResponse.json({ error: ownershipCheck.error }, { status: 403 });
    }

    const isActionable =
      confirmationData.status === 'pending' || confirmationData.status === 'applying';
    if (!isActionable) {
      return NextResponse.json(
        { error: `Confirmation already ${confirmationData.status}` },
        { status: 400 },
      );
    }

    // Shared action-time expiry preflight (confirm/reject/resolve, plain
    // and review proposals alike): a pending row past its expiry is
    // expired here — before any action-specific handling — and its parent
    // post is synchronized out of the owner-action state when no other
    // actionable confirmation remains. Expired rows are never claimable.
    const expiryPreflight = await expireIfDueAndSyncParent(confirmationId, {
      supabase: getSupabaseAdmin(),
    });
    if (expiryPreflight.expired) {
      return NextResponse.json(
        { error: 'Confirmation expired' },
        { status: 409 },
      );
    }

    if (action === 'reject') {
      const result = await rejectUpdate(confirmationId);

      if (!result.success) {
        const status = result.error?.startsWith('Confirmation already') ? 409 : 500;
        return NextResponse.json({ error: result.error }, { status });
      }

      await updateFacebookPostStatus(confirmationData.facebook_posts?.id ?? '', 'rejected');

      logMessage('Update rejected by owner', {
        confirmationId,
        truckId: confirmationData.truck_id,
        userId: user.id,
      });

      return NextResponse.json({ success: true, action: 'rejected' });
    }

    if (action === 'resolve') {
      // Validate → atomically claim (pending → applying) WITH the resolution
      // captured in the same conditional update. A losing racer writes
      // nothing and never releases a claim it does not own.
      const resolveResult = await resolveConfirmation(confirmationId, body.resolution, {
        supabase: getSupabaseAdmin(),
      });
      if (!resolveResult.success) {
        const status =
          resolveResult.code === 'invalid'
            ? 400
            : resolveResult.code === 'expired'
              ? 409
              : resolveResult.code === 'not_actionable'
                ? 404
                : 409;
        return NextResponse.json({ error: resolveResult.reason }, { status });
      }

      // Apply schedule/location from the persisted proposal + captured
      // resolution. On failure: preserve the resolution, release the claim
      // to pending — canonical retry is action: 'confirm'.
      const applyResult = await applyResolvedConfirmationAndInvalidate(confirmationId, {
        supabase: getSupabaseAdmin(),
      });
      if (!applyResult.success) {
        const released = await releaseConfirmationClaim(confirmationId);
        if (!released.success) {
          logError('Failed to release confirmation claim after failed resolution apply', {
            confirmationId,
            error: released.error,
          });
        }
        return NextResponse.json({ error: applyResult.error }, { status: 500 });
      }
      const application = assessConfirmationApplication(
        applyResult.expectedUnits,
        applyResult.updatedFields,
      );
      if (!application.success) {
        logError('APPLY_EXPECTED_UNIT_MISSING', {
          confirmationId,
          missingUnits: application.missingUnits,
        });
        const released = await releaseConfirmationClaim(confirmationId);
        if (!released.success) {
          logError('Failed to release confirmation claim after incomplete resolution apply', {
            confirmationId,
            error: released.error,
          });
        }
        return NextResponse.json(
          { error: application.code, missingUnits: application.missingUnits },
          { status: 422 },
        );
      }

      const confirmResult = await confirmUpdate(confirmationId);
      if (!confirmResult.success) {
        logError('Failed to finalize resolved confirmation', {
          confirmationId,
          error: confirmResult.error,
        });
        const released = await releaseConfirmationClaim(confirmationId);
        if (!released.success) {
          logError('Failed to release confirmation claim after finalize failure', {
            confirmationId,
            error: released.error,
          });
        }
        return NextResponse.json(
          { error: confirmResult.error || 'Failed to confirm update' },
          { status: 500 },
        );
      }

      await updateFacebookPostStatus(confirmationData.facebook_posts?.id ?? '', 'processed');

      logMessage('Owner resolution applied', {
        confirmationId,
        truckId: confirmationData.truck_id,
        userId: user.id,
        updatedFields: applyResult.updatedFields,
      });

      return NextResponse.json({
        success: true,
        action: 'resolved',
        updatedFields: applyResult.updatedFields,
      });
    }

    const claimResult = await claimConfirmationForApply(confirmationId);
    if (!claimResult.success) {
      return NextResponse.json(
        { error: claimResult.error || 'Confirmation is not pending' },
        { status: 409 },
      );
    }

    const confirmResponse = await handleConfirmAction(confirmationData, confirmationId, user.id);

    if (confirmResponse.status >= 400) {
      const released = await releaseConfirmationClaim(confirmationId);
      if (!released.success) {
        logError('Failed to release confirmation claim after failed application', {
          confirmationId,
          error: released.error,
        });
      }
    }

    return confirmResponse;
  } catch (error) {
    logError('Error in confirmation endpoint', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
