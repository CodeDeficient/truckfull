/**
 * Post Processor Service
 * Orchestrates the processing of Facebook posts for truck data updates
 */

import { ocrImage } from '@/lib/ai/ocrImage';
import { detectPostComposition, type FacebookPost } from './postAnalyzer';
import {
  extractDateReferences,
  hasRecurringScheduleIndicator,
  hasUnsupportedDateRange,
  hasUnsupportedScheduleCadence,
  extractTextBasedData,
  extractAmbiguousTimeAlternatives,
  hasFoodSignal,
  detectMultiServiceSlots,
  hasAmbiguousMeridiemRange,
  AMBIGUOUS_MERIDIEM_RANGE,
  MULTI_STOP_UNSUPPORTED,
  type TextBasedData,
  type TimeAlternative,
} from './textExtractor';
import { classifyPost } from './postClassifier';
import { shouldUpdateData, type ValidationResult } from './postValidator';
import {
  buildReviewProposal,
  validateReviewProposal,
  type ReviewAction,
  type ReviewProposal,
} from './reviewProposal';
import { updateTruckData } from './truckUpdater';
import { isFacebookAutoUpdateEnabled } from './sourceTracker';
import { queueForConfirmation } from './confirmationQueue';
import { decideOwnerAction } from './confirmationPolicy';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { logMessage, logError } from '@/lib/logging';
import { parseFacebookPost, type ParsedPost } from '@/lib/ai/parseFacebookPost';
import type { Classification } from './postClassifier';
import type { Json } from '@/lib/database.remote.types';

const CLOCK_TIME = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i;

function toJson<T>(value: T): Json {
  return structuredClone(value) as unknown as Json;
}

export interface PostData {
  post_id: string;
  message?: string;
  full_picture?: string;
  attachments?: FacebookPost['attachments'];
  created_time?: string;
  [key: string]: unknown;
}

export interface ProcessResult {
  success: boolean;
  status: 'processed' | 'rejected' | 'pending_confirmation' | 'pending_review' | 'failed';
  reason?: string;
  updatedFields?: string[];
}

export interface PostProcessorDependencies {
  readonly supabase: ReturnType<typeof getSupabaseAdmin>;
  readonly queueForConfirmation?: typeof queueForConfirmation;
}

/**
 * Atomically claims a post for processing before any side effects run.
 * Only posts with status 'pending' may be claimed; the conditional update
 * prevents two workers from processing the same post concurrently.
 *
 * State machine (exhaustive):
 * - pending -> processing: the only transition this claim performs.
 * - failed -> pending: performed exclusively by requeueFailedPost, invoked
 *   from the owner manual-retry route after an explicit retry request.
 * - pending_confirmation / pending_review: owner-action states, resolved
 *   only via the confirmation UI; never reclaimable by the processor.
 * - processing: owned by an active run; abandoned claims are recovered by
 *   the stale-processing cron (recoverStuckPosts).
 * - processed / rejected: terminal; reprocessing is not supported.
 */
export async function claimPostForProcessing(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  truckId: string,
  facebookPostId: string,
): Promise<{ success: boolean; reason?: string }> {
  const { data: postRow, error: rowError } = await supabase
    .from('facebook_posts')
    .select('id')
    .eq('facebook_post_id', facebookPostId)
    .eq('truck_id', truckId)
    .maybeSingle();

  if (rowError || !postRow?.id) {
    return { success: false, reason: 'Post not found' };
  }

  const { error: claimError } = await supabase
    .from('facebook_posts')
    .update({
      status: 'processing',
      processing_started_at: new Date().toISOString(),
    })
    .eq('id', postRow.id)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (claimError) {
    if (claimError.code === 'PGRST116') {
      return { success: false, reason: 'Post is not claimable for processing' };
    }
    logError('Failed to claim post for processing', {
      facebookPostId,
      error: claimError.message,
    });
    return { success: false, reason: 'Failed to claim post for processing' };
  }

  return { success: true };
}

/**
 * Atomically requeues a failed post back to 'pending' so the canonical
 * processor can claim it. Only posts with status 'failed' may be requeued;
 * the conditional update (.eq('status', 'failed')) makes losing a race a
 * no-op and can never disturb owner-action, processing, or terminal rows.
 * The caller is responsible for invoking processFacebookPost afterwards;
 * ownership (truck/post binding) must be verified before calling this.
 */
export async function requeueFailedPost(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  truckId: string,
  facebookPostId: string,
): Promise<{ success: boolean; reason?: string }> {
  const { data: postRow, error: rowError } = await supabase
    .from('facebook_posts')
    .select('id')
    .eq('facebook_post_id', facebookPostId)
    .eq('truck_id', truckId)
    .maybeSingle();

  if (rowError || !postRow?.id) {
    return { success: false, reason: 'Post not found' };
  }

  const { error: requeueError } = await supabase
    .from('facebook_posts')
    .update({
      status: 'pending',
      processing_started_at: null,
      processed_reason: null,
    })
    .eq('id', postRow.id)
    .eq('truck_id', truckId)
    .eq('status', 'failed')
    .select('id')
    .single();

  if (requeueError) {
    if (requeueError.code === 'PGRST116') {
      return { success: false, reason: 'Post is not retryable' };
    }
    logError('Failed to requeue failed post', {
      facebookPostId,
      error: requeueError.message,
    });
    return { success: false, reason: 'Failed to requeue post' };
  }

  return { success: true };
}

interface ConfirmationContext {
  readonly supabase: ReturnType<typeof getSupabaseAdmin>;
  readonly truckId: string;
  readonly facebookPostId: string;
  readonly classification: Classification;
  readonly mergedOcrResult: ParsedPost;
  readonly validation: ValidationResult;
  readonly queue: typeof queueForConfirmation;
}

interface PostProcessingContext extends Omit<ConfirmationContext, 'validation'> {
  readonly scheduleContext: { createdAt?: string; timezone?: string };
}

export function buildRegexParsedPost(textData: TextBasedData): ParsedPost {
  return {
    food_items: textData.food_items || [],
    location: textData.location
      ? {
          address: textData.location.address,
          city: undefined,
          state: undefined,
          fuzzy: textData.location.fuzzy,
        }
      : undefined,
    times: textData.times
      ? {
          start: textData.times.start,
          end: textData.times.end,
          days: textData.times.days,
          dateReference: textData.times.dateReference,
          dateReferences: textData.times.dateReferences,
          scope: textData.times.scope,
        }
      : undefined,
    confidence: 0.6,
  };
}

export function buildConfirmationProposedData(
  mergedOcrResult: ParsedPost,
  classification: Classification,
  validation: ValidationResult,
): Record<string, unknown> {
  const proposedData: Record<string, unknown> = {
    food_items: mergedOcrResult.food_items,
    location: mergedOcrResult.location,
    classification: classification.type,
    confidence: classification.confidence,
  };

  if (mergedOcrResult.times) proposedData.times = mergedOcrResult.times;
  if (validation.resolvedServiceDate) proposedData.serviceDate = validation.resolvedServiceDate;

  return proposedData;
}

function getUpdateType(classification: Classification): 'menu' | 'location' | 'schedule' | 'both' {
  if (classification.type === 'menu') {
    return 'menu';
  }
  if (classification.type === 'location') {
    return 'location';
  }
  if (classification.type === 'schedule') {
    return 'schedule';
  }
  return 'both';
}

function normalizePreferredClock(value?: string): string | null {
  const match = value?.trim().match(CLOCK_TIME);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || hour > (meridiem ? 12 : 23) || (meridiem && hour < 1)) return null;
  if (meridiem === 'am') hour %= 12;
  if (meridiem === 'pm') hour = (hour % 12) + 12;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function orderTimeAlternatives(
  alternatives: TimeAlternative[],
  preferredTimes?: ParsedPost['times'],
): [TimeAlternative, TimeAlternative] | null {
  if (alternatives.length !== 2) return null;
  const ordered = [...alternatives] as [TimeAlternative, TimeAlternative];
  const preferredStart = normalizePreferredClock(preferredTimes?.start);
  const preferredEnd = normalizePreferredClock(preferredTimes?.end);
  if (preferredStart === ordered[1].start && preferredEnd === ordered[1].end) {
    ordered.reverse();
  }
  return ordered;
}

export async function processFacebookPost(
  truckId: string,
  facebookPostId: string,
  postData: PostData,
  dependencies?: PostProcessorDependencies,
): Promise<ProcessResult> {
  const supabase = dependencies?.supabase ?? getSupabaseAdmin();

  try {
    const claim = await claimPostForProcessing(supabase, truckId, facebookPostId);
    if (!claim.success) {
      return {
        success: false,
        status: 'failed',
        reason: claim.reason ?? 'Failed to claim post for processing',
      };
    }

    const composition = detectPostComposition(postData as FacebookPost);
    const message = postData.message || '';
    const textData = extractTextBasedData(message);
    const textDateReferences = extractDateReferences(message);
    const textDateReference = textDateReferences[0];
    const ambiguousTimeAlternatives = hasAmbiguousMeridiemRange(message, textData.times)
      ? extractAmbiguousTimeAlternatives(message)
      : [];

    // Pre-Meta blocker: a post carrying multiple distinct service slots
    // (time ranges / locations) cannot be represented losslessly by the
    // single-slot ParsedPost contract. Detection must happen here, on the
    // original text, before extraction collapses to the first slot —
    // selecting the first slot and discarding the rest is a wrong write by
    // omission. Fail closed: terminal reject with an explicit diagnostic;
    // the durable receipt keeps the raw post for audit.
    if (detectMultiServiceSlots(postData.message || '')) {
      await updatePostStatus(
        supabase,
        truckId,
        facebookPostId,
        'rejected',
        MULTI_STOP_UNSUPPORTED,
      );
      return { success: false, status: 'rejected', reason: MULTI_STOP_UNSUPPORTED };
    }

    // Check if we have text to process
    if (!composition.hasImage && !composition.hasText) {
      await updatePostStatus(
        supabase,
        truckId,
        facebookPostId,
        'rejected',
        'No content to process',
      );
      return { success: false, status: 'rejected', reason: 'No content to process' };
    }

    // Start with regex-based extraction
    const regexResult = buildRegexParsedPost(textData);

    const mergedOcrResult: ParsedPost = { ...regexResult };
    let aiTimePreference: ParsedPost['times'];

    // Use AI if:
    // 1. We have an image (OCR needed)
    // 2. OR regex didn't extract location
    // 3. OR regex didn't extract times
    // 4. OR text contains food/menu language but regex didn't extract items
    const needsAiForLocation = !mergedOcrResult.location?.address;
    const needsAiForTimes =
      ambiguousTimeAlternatives.length !== 2 &&
      (!mergedOcrResult.times?.start || !mergedOcrResult.times?.end);
    const hasFoodLanguage = hasFoodSignal(postData.message ?? '');
    const needsAiForFood = hasFoodLanguage && (mergedOcrResult.food_items?.length ?? 0) === 0;

    const shouldUseAi =
      composition.hasImage || needsAiForLocation || needsAiForTimes || needsAiForFood;

    if (shouldUseAi) {
      logMessage('Using AI for incomplete extraction', {
        facebookPostId,
        needsAiForLocation,
        needsAiForTimes,
        needsAiForFood,
        hasImage: composition.hasImage,
      });

      if (composition.hasImage) {
        const imageResult = await processAllImages(composition.imageUrls, facebookPostId);
        // Merge AI image results
        if (imageResult.food_items?.length) {
          mergedOcrResult.food_items = [
            ...(mergedOcrResult.food_items || []),
            ...imageResult.food_items,
          ];
        }
        if (imageResult.location && !mergedOcrResult.location?.address) {
          mergedOcrResult.location = imageResult.location;
        }
        if (imageResult.times && !mergedOcrResult.times?.start) {
          aiTimePreference = imageResult.times;
          const extractedDateReference = textDateReference ?? mergedOcrResult.times?.dateReference;
          let extractedScope = mergedOcrResult.times?.scope;
          if (
            hasUnsupportedScheduleCadence(postData.message || '') ||
            hasUnsupportedDateRange(postData.message || '')
          ) {
            extractedScope = 'one_off_unsupported';
          } else if (textDateReference && !hasRecurringScheduleIndicator(postData.message || '')) {
            extractedScope = 'one_off_date';
          }
          mergedOcrResult.times = imageResult.times;
          if (extractedDateReference) mergedOcrResult.times.dateReference = extractedDateReference;
          if (textDateReferences.length > 0)
            mergedOcrResult.times.dateReferences = textDateReferences;
          if (extractedScope) mergedOcrResult.times.scope = extractedScope;
        }
        if (imageResult.confidence > mergedOcrResult.confidence) {
          mergedOcrResult.confidence = imageResult.confidence;
        }
      }

      // If we still need AI for location, times, or food items, try text parsing
      if (needsAiForLocation || needsAiForTimes || needsAiForFood) {
        const aiResult = await parseFacebookPostWithFallback(postData.message || '');
        if (aiResult.times?.start && aiResult.times.end) aiTimePreference = aiResult.times;

        if (
          needsAiForLocation &&
          aiResult.location?.address &&
          !mergedOcrResult.location?.address
        ) {
          mergedOcrResult.location = aiResult.location;
        }
        if (
          needsAiForTimes &&
          aiResult.times?.start &&
          aiResult.times?.end &&
          !mergedOcrResult.times?.start
        ) {
          const extractedDateReference = textDateReference ?? mergedOcrResult.times?.dateReference;
          let extractedScope = mergedOcrResult.times?.scope;
          if (
            hasUnsupportedScheduleCadence(postData.message || '') ||
            hasUnsupportedDateRange(postData.message || '')
          ) {
            extractedScope = 'one_off_unsupported';
          } else if (textDateReference && !hasRecurringScheduleIndicator(postData.message || '')) {
            extractedScope = 'one_off_date';
          }
          mergedOcrResult.times = aiResult.times;
          if (extractedDateReference) mergedOcrResult.times.dateReference = extractedDateReference;
          if (textDateReferences.length > 0)
            mergedOcrResult.times.dateReferences = textDateReferences;
          if (extractedScope) mergedOcrResult.times.scope = extractedScope;
        }
        if (
          needsAiForFood &&
          aiResult.food_items?.length &&
          (mergedOcrResult.food_items?.length ?? 0) === 0
        ) {
          mergedOcrResult.food_items = [
            ...(mergedOcrResult.food_items || []),
            ...aiResult.food_items,
          ];
        }
        if (aiResult.confidence > mergedOcrResult.confidence) {
          mergedOcrResult.confidence = aiResult.confidence;
        }
      }
    }

    const orderedAlternatives = orderTimeAlternatives(
      ambiguousTimeAlternatives,
      aiTimePreference ?? mergedOcrResult.times,
    );
    if (orderedAlternatives) {
      const [preferred] = orderedAlternatives;
      const scope =
        hasUnsupportedScheduleCadence(message) || hasUnsupportedDateRange(message)
          ? 'one_off_unsupported'
          : textDateReferences.length > 0 && !hasRecurringScheduleIndicator(message)
            ? 'one_off_date'
            : mergedOcrResult.times?.scope;
      mergedOcrResult.times = {
        ...mergedOcrResult.times,
        start: preferred.start,
        end: preferred.end,
        ...(textDateReference ? { dateReference: textDateReference } : {}),
        ...(textDateReferences.length > 1 ? { dateReferences: textDateReferences } : {}),
        ...(scope ? { scope } : {}),
      };
    }

    const classification = classifyPost(mergedOcrResult, textData, postData.message);

    logMessage('Post classified', {
      facebookPostId,
      type: classification.type,
      confidence: classification.confidence,
      reason: classification.reason,
    });

    let timezone: string | undefined;
    if (mergedOcrResult.times?.scope === 'one_off_date') {
      const { data: truck, error } = await supabase
        .from('food_trucks')
        .select('timezone')
        .eq('id', truckId)
        .single();

      if (error) {
        logError('Failed to read truck timezone for dated schedule validation', {
          truckId,
          error: error.message,
        });
      } else if (typeof truck?.timezone === 'string') {
        timezone = truck.timezone;
      }
    }

    const context: PostProcessingContext = {
      supabase,
      truckId,
      facebookPostId,
      classification,
      mergedOcrResult,
      scheduleContext: { createdAt: postData.created_time, timezone },
      queue: dependencies?.queueForConfirmation ?? queueForConfirmation,
    };

    if (orderedAlternatives) {
      const validation = shouldUpdateData(mergedOcrResult, classification, context.scheduleContext);
      return queueAmbiguousTimeReview(context, validation, orderedAlternatives);
    }

    return await handlePostProcessing(context);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error processing Facebook post', { truckId, facebookPostId, error: errorMessage });

    try {
      const released = await releasePostProcessingClaim(supabase, truckId, facebookPostId);
      if (released) {
        await updatePostStatus(supabase, truckId, facebookPostId, 'failed', errorMessage);
      }
    } catch {
      // Ignore status update failures
    }

    return { success: false, status: 'failed', reason: errorMessage };
  }
}

/**
 * Releases a processing claim back to 'pending' for retry.
 * Only releases claims that still belong to this run (status = processing),
 * so a concurrent recovery worker cannot steal active work.
 */
export async function releasePostProcessingClaim(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  truckId: string,
  facebookPostId: string,
): Promise<boolean> {
  const { error: releaseError } = await supabase
    .from('facebook_posts')
    .update({ status: 'pending', processing_started_at: null })
    .eq('facebook_post_id', facebookPostId)
    .eq('truck_id', truckId)
    .eq('status', 'processing')
    .select('id')
    .single();

  if (releaseError) {
    logError('Failed to release post processing claim', {
      facebookPostId,
      error: releaseError.message,
    });
    return false;
  }

  return true;
}

async function processAllImages(imageUrls: string[], facebookPostId: string): Promise<ParsedPost> {
  const result: ParsedPost = { food_items: [], confidence: 0 };

  for (const imageUrl of imageUrls) {
    try {
      const ocrResult = await ocrImage(imageUrl, 'photo');

      if (ocrResult.food_items && ocrResult.food_items.length > 0) {
        result.food_items = [...result.food_items, ...ocrResult.food_items];
      }

      if (ocrResult.location && !result.location) {
        result.location = ocrResult.location;
      }

      if (ocrResult.times && !result.times) {
        result.times = ocrResult.times;
      }

      if (ocrResult.confidence > result.confidence) {
        result.confidence = ocrResult.confidence;
      }

      logMessage('OCR processed image', {
        facebookPostId,
        imageUrl: imageUrl.slice(0, 50),
        foodItems: ocrResult.food_items?.length || 0,
        confidence: ocrResult.confidence,
      });
    } catch (error) {
      logError('Failed to process image with OCR', { facebookPostId, imageUrl, error });
    }
  }

  result.food_items = [...new Set(result.food_items)];
  return result;
}

async function persistParsedPost(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  truckId: string,
  facebookPostId: string,
  parsedResult: ParsedPost,
): Promise<void> {
  const { data: postRecord, error: selectError } = await supabase
    .from('facebook_posts')
    .select('id')
    .eq('facebook_post_id', facebookPostId)
    .eq('truck_id', truckId)
    .single();

  if (selectError || !postRecord) {
    if (selectError) {
      logError('Failed to look up post for parsed data persistence', {
        facebookPostId,
        error: selectError.message,
      });
    }
    return;
  }

  const { error } = await supabase.from('parsed_facebook_posts').upsert(
    {
      facebook_post_id: postRecord.id,
      food_items: toJson(parsedResult.food_items ?? []),
      location_data: parsedResult.location ? toJson(parsedResult.location) : {},
      time_data: parsedResult.times ? toJson(parsedResult.times) : null,
      confidence: parsedResult.confidence,
      model_used: 'primary',
      parsing_time_ms: 0,
    },
    { onConflict: 'facebook_post_id' },
  );

  if (error) {
    logError('Failed to persist parsed post', { facebookPostId, error: error.message });
  }
}

async function queueConfirmation(context: ConfirmationContext): Promise<ProcessResult> {
  const { supabase, truckId, facebookPostId, classification, mergedOcrResult, validation, queue } =
    context;
  const updateType = getUpdateType(classification);
  const proposedData = buildConfirmationProposedData(mergedOcrResult, classification, validation);

  const confirmationResult = await queue(
    truckId,
    facebookPostId,
    updateType,
    proposedData,
    validation.reason || classification.reason,
  );

  if (!confirmationResult.success) {
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', confirmationResult.error);
    return { success: false, status: 'rejected', reason: confirmationResult.error };
  }

  const statusReason = validation.reason || validation.warning || '';
  await updatePostStatus(supabase, truckId, facebookPostId, 'pending_confirmation', statusReason);
  return { success: true, status: 'pending_confirmation', reason: statusReason };
}

async function handlePostProcessing(context: PostProcessingContext): Promise<ProcessResult> {
  const { supabase, truckId, facebookPostId, classification, mergedOcrResult, scheduleContext } =
    context;

  // Pre-Meta blocker: menu automation is outside the frozen Pre-Meta scope
  // (schedule + service location only). A MENU-only post carries no service
  // evidence, so it terminally rejects — no customer-visible menu mutation,
  // no owner action. Raw evidence stays on the durable receipt.
  if (classification.type === 'menu') {
    const reason = 'MENU_AUTOMATION_DISABLED_PREMETA';
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', reason);
    return { success: false, status: 'rejected', reason };
  }

  const validation = shouldUpdateData(mergedOcrResult, classification, scheduleContext);

  if (!validation.shouldUpdate) {
    if (classification.type === 'schedule' && mergedOcrResult.times) {
      await persistParsedPost(supabase, truckId, facebookPostId, mergedOcrResult);
    }

    if (validation.reviewRequired) {
      return queueReview(context, validation);
    }

    if (validation.requiresConfirmation) {
      return queueConfirmation({ ...context, validation });
    }

    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', validation.reason);
    return { success: false, status: 'rejected', reason: validation.reason };
  }

  if (validation.requiresConfirmation) {
    return queueConfirmation({ ...context, validation });
  }

  if (validation.resolvedServiceDate) {
    // The dated branch writes only a schedule override (with override
    // location_data) and optionally the menu — never the permanent
    // food_trucks.location or recurring operating_hours. The permanent-
    // location and recurring-schedule source gates do not apply here.
    //
    // The global facebook_auto_updates_enabled toggle is checked
    // independently because the per-type source list below may be empty
    // (e.g. SCHEDULE-only posts), which must not bypass the toggle.
    const toggleCheck = await isFacebookAutoUpdateEnabled(truckId, supabase);
    if (!toggleCheck.allowUpdate) {
      await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', toggleCheck.reason);
      return { success: false, status: 'rejected', reason: toggleCheck.reason };
    }

    // Pre-Meta: menu automation is disabled. The menu source check and the
    // menuUpdateAllowed deferral are removed; food_items in a dated/mixed
    // post stay on the durable receipt and never mutate the menu.
    const updateResult = await updateTruckData(
      truckId,
      classification,
      mergedOcrResult,
      validation,
      { facebookPostId, sourcePostCreatedAt: scheduleContext.createdAt },
      { supabase },
    );

    if (!updateResult.success) {
      await updatePostStatus(supabase, truckId, facebookPostId, 'failed', updateResult.error);
      return { success: false, status: 'failed', reason: updateResult.error };
    }

    await updatePostStatus(supabase, truckId, facebookPostId, 'processed');
    return { success: true, status: 'processed', updatedFields: updateResult.updatedFields };
  }

  // Pre-Meta: truck-wide 7-day freshness gates are removed. Recurring
  // arbitration is per-day, per-unit in truckUpdater.updateSchedule, keyed on
  // the canonical post created_time. Only the global toggle remains here.
  const toggleCheck = await isFacebookAutoUpdateEnabled(truckId, supabase);
  if (!toggleCheck.allowUpdate) {
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', toggleCheck.reason);
    return { success: false, status: 'rejected', reason: toggleCheck.reason };
  }

  const updateResult = await updateTruckData(
    truckId,
    classification,
    mergedOcrResult,
    validation,
    undefined,
    { supabase, fbActionAt: scheduleContext.createdAt },
  );

  if (updateResult.success) {
    await updatePostStatus(supabase, truckId, facebookPostId, 'processed');
    return { success: true, status: 'processed', updatedFields: updateResult.updatedFields };
  }

  if (updateResult.queued) {
    await updatePostStatus(
      supabase,
      truckId,
      facebookPostId,
      'pending_confirmation',
      updateResult.error,
    );
    return { success: true, status: 'pending_confirmation', reason: updateResult.error };
  }

  // Deterministic policy diagnostics can never apply on retry, so they are
  // terminal rejections rather than retryable processing failures —
  // requeueFailedPost must not replay them indefinitely. The recurring
  // arbitration codes are deterministic because they compare canonical
  // Facebook created_time against persisted owner-action times, neither of
  // which changes between retries.
  const POLICY_TERMINAL_DIAGNOSTICS = new Set([
    'LOCATION_ONLY_REQUIRES_SCHEDULE_PREMETA',
    'RECURRING_FB_ACTION_TIME_MISSING',
    'RECURRING_SCHEDULE_STALE_OWNER_ACTION',
    'RECURRING_LOCATION_STALE_OWNER_ACTION',
  ]);
  const errorText = updateResult.error ?? '';
  if (POLICY_TERMINAL_DIAGNOSTICS.has(errorText) || POLICY_TERMINAL_DIAGNOSTICS.has(errorText.split(': ')[0] ?? '')) {
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', updateResult.error);
    return { success: false, status: 'rejected', reason: updateResult.error };
  }

  await updatePostStatus(supabase, truckId, facebookPostId, 'failed', updateResult.error);
  return { success: false, status: 'failed', reason: updateResult.error };
}

async function queueReview(
  context: PostProcessingContext,
  validation: ValidationResult,
): Promise<ProcessResult> {
  const { supabase, truckId, facebookPostId, classification, mergedOcrResult, queue } = context;
  const decision = decideOwnerAction(mergedOcrResult, classification, validation);
  const built = buildReviewProposedData(
    mergedOcrResult,
    validation,
    decision.reviewAction,
    decision.reason,
    classification.type,
  );

  if (!built) {
    // Fail closed: never create a hollow owner-action-required state. The
    // proposal lacked the durable context its reviewAction requires.
    const reason = 'Insufficient service context for owner review';
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', reason);
    return { success: false, status: 'rejected', reason };
  }

  if (built.invalidReason) {
    const reason = `Insufficient service context for owner review: ${built.invalidReason}`;
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', reason);
    return { success: false, status: 'rejected', reason };
  }

  const proposedData = built.proposal as unknown as Parameters<typeof queue>[3];

  const reviewResult = await queue(
    truckId,
    facebookPostId,
    decision.updateType,
    proposedData,
    decision.reason,
  );

  if (!reviewResult.success) {
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', reviewResult.error);
    return { success: false, status: 'rejected', reason: reviewResult.error };
  }

  const statusReason = validation.reason ?? decision.reason;
  await updatePostStatus(supabase, truckId, facebookPostId, 'pending_review', statusReason);
  return { success: true, status: 'pending_review', reason: statusReason };
}

async function queueAmbiguousTimeReview(
  context: PostProcessingContext,
  validation: ValidationResult,
  timeAlternatives: [TimeAlternative, TimeAlternative],
): Promise<ProcessResult> {
  const { supabase, truckId, facebookPostId, classification, mergedOcrResult, queue } = context;
  const proposal = buildReviewProposal({
    reviewAction: 'ambiguous_time',
    parsed: mergedOcrResult,
    validation,
    classificationType: classification.type,
    timeAlternatives,
  });
  const proposalValidation = proposal ? validateReviewProposal(proposal) : null;

  if (!proposal || !proposalValidation?.valid) {
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', AMBIGUOUS_MERIDIEM_RANGE);
    return { success: false, status: 'rejected', reason: AMBIGUOUS_MERIDIEM_RANGE };
  }

  const queued = await queue(
    truckId,
    facebookPostId,
    'schedule',
    proposal as unknown as Parameters<typeof queue>[3],
    AMBIGUOUS_MERIDIEM_RANGE,
  );
  if (!queued.success) {
    await updatePostStatus(supabase, truckId, facebookPostId, 'rejected', queued.error);
    return { success: false, status: 'rejected', reason: queued.error };
  }

  await updatePostStatus(
    supabase,
    truckId,
    facebookPostId,
    'pending_review',
    AMBIGUOUS_MERIDIEM_RANGE,
  );
  return { success: true, status: 'pending_review', reason: AMBIGUOUS_MERIDIEM_RANGE };
}

function buildReviewProposedData(
  mergedOcrResult: ParsedPost,
  validation: ValidationResult,
  reviewAction: ReviewAction | undefined,
  unresolvedReason: string,
  classificationType: string,
): { proposal: ReviewProposal; invalidReason?: string } | null {
  if (!reviewAction) return null;
  const proposal = buildReviewProposal({
    reviewAction,
    parsed: mergedOcrResult,
    validation,
    unresolvedReason,
    classificationType,
  });
  if (!proposal) return null;
  const sufficiency = validateReviewProposal(proposal);
  return sufficiency.valid ? { proposal } : { proposal, invalidReason: sufficiency.reason };
}

async function updatePostStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  truckId: string,
  facebookPostId: string,
  status: string,
  reason?: string,
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    processed_at: new Date().toISOString(),
  };

  if (reason) {
    updateData.processed_reason = reason;
  }

  const { error } = await supabase
    .from('facebook_posts')
    .update(updateData)
    .eq('facebook_post_id', facebookPostId)
    .eq('truck_id', truckId);

  if (error) {
    logError('Failed to update post status', { facebookPostId, error: error.message });
  }
}

async function parseFacebookPostWithFallback(postText: string): Promise<ParsedPost> {
  try {
    return await parseFacebookPost(postText);
  } catch (error) {
    logError('AI parsing failed, using regex-only result', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { food_items: [], confidence: 0 };
  }
}
