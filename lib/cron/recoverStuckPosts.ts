/**
 * Cron Job: Recover Stuck Posts
 * Reprocesses facebook posts stuck in 'pending' status for >1 hour
 * Also resets posts stuck in 'processing' status (>2 hours) back to 'pending'
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { processFacebookPost } from '@/lib/services/postProcessor';
import { reconstructPostData } from '@/lib/webhooks/manualPostData';
import { logMessage, logError } from '@/lib/logging';

const STUCK_THRESHOLD_HOURS = 1;
const PROCESSING_THRESHOLD_HOURS = 2;

export interface StuckPost {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  message: string | null;
  raw_text: string | null;
  created_time: string;
  raw_payload: string | null;
}

export interface RecoveryResult {
  found: number;
  reprocessed: number;
  failed: number;
  reset: number;
  error?: string;
}

/**
 * Reset posts stuck in 'processing' status back to 'pending'
 * This handles cases where processing crashed before completing
 */
async function resetStuckProcessingPosts(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const threshold = new Date(
    Date.now() - PROCESSING_THRESHOLD_HOURS * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from('facebook_posts')
    .update({
      status: 'pending',
      processing_started_at: null,
    })
    .eq('status', 'processing')
    .lt('processing_started_at', threshold)
    .select('id');

  if (error) {
    logError('Failed to reset stuck processing posts', { error: error.message });
    return 0;
  }

  const resetCount = data?.length || 0;
  if (resetCount > 0) {
    logMessage(`Reset ${resetCount} stuck processing posts to pending`);
  }

  return resetCount;
}

export async function recoverStuckPosts(): Promise<RecoveryResult> {
  try {
    const supabase = getSupabaseAdmin();

    // First, reset any posts stuck in 'processing' status
    const resetCount = await resetStuckProcessingPosts();

    const threshold = new Date(Date.now() - STUCK_THRESHOLD_HOURS * 60 * 60 * 1000).toISOString();

    const { data: stuckPosts, error: fetchError } = await supabase
      .from('facebook_posts')
      .select('id, truck_id, facebook_post_id, message, raw_text, created_time, raw_payload')
      .eq('status', 'pending')
      .lt('created_at', threshold)
      .limit(50);

    if (fetchError) {
      logError('Failed to fetch stuck posts', { error: fetchError.message });
      return { found: 0, reprocessed: 0, failed: 0, reset: resetCount, error: fetchError.message };
    }

    if (!stuckPosts || stuckPosts.length === 0) {
      return { found: 0, reprocessed: 0, failed: 0, reset: resetCount };
    }

    logMessage(`Found ${stuckPosts.length} stuck posts to recover`);

    let reprocessed = 0;
    let failed = 0;

    for (const post of stuckPosts as StuckPost[]) {
      try {
        const postData = reconstructPostData(post);
        const result = await processFacebookPost(post.truck_id, post.facebook_post_id, postData);

        if (result.success) {
          reprocessed++;
          logMessage('Successfully reprocessed stuck post', {
            postId: post.facebook_post_id,
            truckId: post.truck_id,
            status: result.status,
          });
        } else {
          failed++;
          logError('Failed to reprocess stuck post', {
            postId: post.facebook_post_id,
            truckId: post.truck_id,
            error: result.reason,
          });
        }
      } catch (error) {
        failed++;
        logError('Error reprocessing stuck post', {
          postId: post.facebook_post_id,
          truckId: post.truck_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { found: stuckPosts.length, reprocessed, failed, reset: resetCount };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error recovering stuck posts', { error: errorMessage });
    return { found: 0, reprocessed: 0, failed: 0, reset: 0, error: errorMessage };
  }
}
