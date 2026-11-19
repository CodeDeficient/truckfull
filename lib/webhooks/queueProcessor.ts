/**
 * Webhook Queue Processor
 *
 * Receives Facebook post data from the webhook handler, looks up
 * the corresponding food truck by Facebook page ID, and inserts
 * the post into the facebook_posts table.
 *
 * Uses the service-role Supabase client to bypass RLS, since
 * webhooks run server-side without a user session.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { after } from 'next/server';
import { logMessage, logError } from '@/lib/logging';
import { processFacebookPost, type PostData } from '@/lib/services/postProcessor';
import { normalizeTimestamp } from '@/lib/webhooks/normalizeTimestamp';

export interface RepairInfo {
  repairStatus: 'none' | 'repaired' | 'failed' | 'skipped';
  issuesFound: number;
  repairTimeMs: number;
}

export interface QueueResult {
  success: boolean;
  truckId?: string;
  postId?: string;
  error?: string;
}

export interface QueueProcessingDependencies {
  readonly supabase: ReturnType<typeof getSupabaseAdmin>;
  readonly processPost?: typeof processFacebookPost;
  readonly register?: (promise: Promise<unknown>) => void;
}

export function registerPostProcessing<T>(
  register: (promise: Promise<unknown>) => void,
  processingPromise: Promise<T>,
  onComplete: (result: T) => void,
  onError: (error: unknown) => void,
): void {
  register(processingPromise.then(onComplete).catch(onError));
}

/**
 * Queue a Facebook post for processing.
 *
 * 1. Looks up the food truck by facebook_page_id
 * 2. Inserts into facebook_posts with truck_id and repair metadata
 * 3. Triggers async processing for OCR and data extraction
 * 4. Fails gracefully — logs errors but never throws
 *
 * @param pageId - Facebook Page ID from webhook entry.id
 * @param postData - The post value from the webhook change event
 * @param repairInfo - Metadata about JSON repair applied to the webhook payload
 * @returns QueueResult with success status and truck/post IDs
 */
export async function queuePostForProcessing(
  pageId: string,
  postData: PostData,
  repairInfo?: RepairInfo,
  dependencies?: QueueProcessingDependencies,
): Promise<QueueResult> {
  try {
    const supabase = dependencies?.supabase ?? getSupabaseAdmin();

    const { data: trucks, error: lookupError } = await supabase
      .from('food_trucks')
      .select('id')
      .eq('facebook_page_id', pageId)
      .limit(2);

    const truck = trucks?.length === 1 ? trucks[0] : null;
    if (lookupError || !truck || (trucks?.length ?? 0) > 1) {
      const truckNotFound = !lookupError && trucks?.length === 0;
      logError('No truck found for Facebook page', {
        pageId,
        postId: postData.post_id,
        error: lookupError?.message,
      });
      return { success: false, error: truckNotFound ? 'Truck not found' : 'Truck lookup failed' };
    }

    const normalizedCreatedTime = normalizeTimestamp(postData.created_time);
    if (!normalizedCreatedTime) {
      logError('Facebook post is missing a valid created_time', {
        pageId,
        postId: postData.post_id,
      });
      return { success: false, error: 'Missing or invalid Facebook post created_time' };
    }

    const processingPostData: PostData = {
      ...postData,
      created_time: normalizedCreatedTime,
    };

    const { error: insertError } = await supabase.from('facebook_posts').insert({
      truck_id: truck.id,
      facebook_post_id: postData.post_id,
      message: postData.message ?? null,
      raw_text: postData.message ?? null,
      created_time: normalizedCreatedTime,
      source: 'webhook' as const,
      status: 'pending' as const,
      raw_payload: JSON.stringify(postData),
      repair_status: repairInfo?.repairStatus ?? 'none',
      repair_metadata: repairInfo
        ? {
            issuesFound: repairInfo.issuesFound,
            repairTimeMs: repairInfo.repairTimeMs,
          }
        : null,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        logMessage('Duplicate post skipped', {
          postId: postData.post_id,
          pageId,
        });
        return { success: false, error: 'Duplicate post' };
      }

      logError('Failed to insert facebook post', {
        postId: postData.post_id,
        pageId,
        truckId: truck.id,
        error: insertError.message,
      });
      return { success: false, error: insertError.message };
    }

    console.info('[webhook]', JSON.stringify({
      event: 'post_queued',
      postId: postData.post_id,
      pageId,
      truckId: truck.id,
      repairStatus: repairInfo?.repairStatus ?? 'none',
    }));

    triggerAsyncProcessing(truck.id, postData.post_id, processingPostData, dependencies);

    return { success: true, truckId: truck.id, postId: postData.post_id };
  } catch (error) {
    logError('Queue processor unexpected error', {
      pageId,
      postId: postData.post_id,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return { success: false, error: 'Unexpected error' };
  }
}

/**
 * Triggers async processing without blocking the webhook response.
 * OCR operations can be slow, so we process in the background.
 */
function triggerAsyncProcessing(
  truckId: string,
  facebookPostId: string,
  postData: PostData,
  dependencies?: QueueProcessingDependencies,
): void {
  registerPostProcessing(
    dependencies?.register ?? after,
    (dependencies?.processPost ?? processFacebookPost)(truckId, facebookPostId, postData),
    (result) => {
      console.info('[webhook]', JSON.stringify({
        event: 'post_processing_completed',
        truckId,
        facebookPostId,
        status: result.status,
        updatedFields: result.updatedFields,
      }));
    },
    (error) => {
      logError('Post processing failed', {
        truckId,
        facebookPostId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    },
  );
}
