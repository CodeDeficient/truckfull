import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseFacebookPost, type ParsedPost } from '@/lib/ai/parseFacebookPost';
import { ocrImage } from '@/lib/ai/ocrImage';
import { detectFalsePositive } from '@/lib/webhooks/falsePositiveDetection';
import { detectSpam } from '@/lib/webhooks/spamDetection';
import { detectConflicts } from '@/lib/webhooks/conflictDetection';
import { validateDataQuality } from '@/lib/webhooks/dataQuality';
import { calculateConfidence } from '@/lib/webhooks/confidenceScoring';
import { logMessage, logError } from '@/lib/logging';
import { WEBHOOK_ENABLED_COLUMN } from '@/lib/facebook/webhookColumn';
import type { ParsedPost as WebhookParsedPost, QualitySignals } from '@/lib/webhooks/types';
import type { Json } from '@/lib/database.remote.types';
import { invalidatePublicTruckBySlug } from '@/lib/services/publicTruckPage';

const TWELVE_HOUR_TIME = /^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i;

function normalizeTime(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const match = raw.match(TWELVE_HOUR_TIME);
  if (!match) return raw;
  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  const meridiem = match[3].toLowerCase();
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export interface PostToProcess {
  id: string;
  truck_id: string;
  facebook_post_id: string;
  message: string | null;
  raw_text: string | null;
  attachments: Array<{ type: string; url: string }> | null;
  created_time: string;
  status: string;
  confidence: number | null;
  source: string;
}

export interface ProcessingResultItem {
  postId: string;
  action: 'applied' | 'pending_review' | 'rejected' | 'skipped' | 'error';
  confidence: number;
  processingTimeMs: number;
  error?: string;
}

export interface ProcessingResult {
  processed: number;
  applied: number;
  pendingReview: number;
  rejected: number;
  skipped: number;
  errors: number;
  processingTimeMs: number;
  results: ProcessingResultItem[];
}

const BATCH_SIZE = 10;
const MAX_RETRIES = 2;

function convertToWebhookParsedPost(
  post: PostToProcess,
  parsedData: ParsedPost,
  truckName?: string,
): WebhookParsedPost {
  return {
    id: post.id,
    platform: 'facebook',
    post_url: `https://facebook.com/${post.facebook_post_id}`,
    content: post.message ?? '',
    timestamp: post.created_time,
    extracted_data: {
      truck_name: truckName,
      location: parsedData.location
        ? {
            address: parsedData.location.address,
            latitude: undefined,
            longitude: undefined,
          }
        : undefined,
      food_items: parsedData.food_items,
      cuisine_type: [],
      time: parsedData.times
        ? {
            start: normalizeTime(parsedData.times.start),
            end: normalizeTime(parsedData.times.end),
            date: undefined,
          }
        : undefined,
    },
  };
}

function hasAttachments(post: PostToProcess): boolean {
  return post.attachments !== null && post.attachments.length > 0;
}

function hasMessage(post: PostToProcess): boolean {
  return post.message !== null && post.message.trim().length > 0;
}

async function processWithRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      if (i < retries) {
        await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
      }
    }
  }
  throw lastError;
}

async function processSinglePost(
  post: PostToProcess,
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<ProcessingResultItem> {
  const startTime = Date.now();

  const { data: truck } = await supabase
    .from('food_trucks')
    .select(`id, owner_id, ${WEBHOOK_ENABLED_COLUMN}, name`)
    .eq('id', post.truck_id)
    .single();

  if (!truck || !(truck as Record<string, unknown>)[WEBHOOK_ENABLED_COLUMN]) {
    await updatePostStatus(supabase, post.id, 'rejected', 0);
    return {
      postId: post.id,
      action: 'rejected',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  if (!hasMessage(post) && !hasAttachments(post)) {
    await updatePostStatus(supabase, post.id, 'skipped', 0);
    return {
      postId: post.id,
      action: 'skipped',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
    };
  }

  let parsedData: ParsedPost = {
    food_items: [],
    confidence: 0,
  };

  if (hasMessage(post)) {
    parsedData = await processWithRetry(() => parseFacebookPost(post.message!));
  }

  if (hasAttachments(post)) {
    const attachmentPromises = post
      .attachments!.filter(
        (attachment) => attachment.type === 'photo' || attachment.type === 'story',
      )
      .map(async (attachment) => {
        try {
          return await processWithRetry(() =>
            ocrImage(attachment.url, attachment.type as 'photo' | 'story'),
          );
        } catch (error) {
          logError('OCR failed for attachment', {
            postId: post.id,
            attachmentUrl: attachment.url,
            error: error instanceof Error ? error.message : 'unknown',
          });
          return null;
        }
      });

    const ocrResults = await Promise.all(attachmentPromises);
    for (const ocrResult of ocrResults) {
      if (ocrResult) {
        parsedData = mergeParsedData(parsedData, ocrResult);
      }
    }
  }

  const webhookParsedPost = convertToWebhookParsedPost(post, parsedData, truck.name);

  const spamResult = detectSpam(webhookParsedPost);
  const falsePositiveResult = detectFalsePositive(webhookParsedPost);
  const conflictResult = await detectConflicts(webhookParsedPost, supabase);
  const dataQualityResult = validateDataQuality(webhookParsedPost);

  const qualitySignals: QualitySignals = {
    spam: spamResult,
    conflict: conflictResult,
    falsePositive: falsePositiveResult,
    dataQuality: dataQualityResult,
  };

  const confidenceResult = calculateConfidence(webhookParsedPost, qualitySignals);
  const confidence = confidenceResult.score;

  let action: 'applied' | 'pending_review' | 'rejected';

  if (confidenceResult.action === 'accept') {
    await insertParsedPost(supabase, post.id, parsedData);
    try {
      await applyPostUpdate(supabase, post, parsedData);
    } catch (updateError) {
      await supabase.from('parsed_facebook_posts').delete().eq('facebook_post_id', post.id);
      throw updateError;
    }
    await updatePostStatus(supabase, post.id, 'processed', confidence);
    action = 'applied';
  } else if (confidenceResult.action === 'review') {
    await insertParsedPost(supabase, post.id, parsedData);
    await updatePostStatus(supabase, post.id, 'pending_review', confidence);
    action = 'pending_review';
  } else {
    await updatePostStatus(supabase, post.id, 'rejected', confidence);
    action = 'rejected';
  }

  logMessage('Post processed', {
    postId: post.id,
    action,
    confidence,
    spamDetected: spamResult.isSpam,
    falsePositive: falsePositiveResult.isFalsePositive,
    hasConflicts: conflictResult.hasConflict,
    dataQualityValid: dataQualityResult.isValid,
  });

  return {
    postId: post.id,
    action,
    confidence,
    processingTimeMs: Date.now() - startTime,
  };
}

function mergeParsedData(primary: ParsedPost, secondary: ParsedPost): ParsedPost {
  const foodItems = [...new Set([...primary.food_items, ...secondary.food_items])];

  const location = secondary.location ?? primary.location;
  const times = secondary.times ?? primary.times;
  const prices = secondary.prices ?? primary.prices;
  const hashtags = [...new Set([...(primary.hashtags ?? []), ...(secondary.hashtags ?? [])])];

  const confidence = Math.max(primary.confidence, secondary.confidence);

  return {
    food_items: foodItems,
    location,
    times,
    prices,
    hashtags: hashtags.length > 0 ? hashtags : undefined,
    confidence,
  };
}

async function updatePostStatus(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  postId: string,
  status: string,
  confidence: number,
): Promise<void> {
  const { error } = await supabase
    .from('facebook_posts')
    .update({
      status,
      confidence,
      processed_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    logError('Failed to update post status', {
      postId,
      status,
      error: error.message,
    });
    throw error;
  }
}

const CANONICAL_WEEKDAYS: Record<string, string> = {
  sunday: 'sunday',
  sun: 'sunday',
  monday: 'monday',
  mon: 'monday',
  tuesday: 'tuesday',
  tue: 'tuesday',
  wednesday: 'wednesday',
  wed: 'wednesday',
  thursday: 'thursday',
  thu: 'thursday',
  friday: 'friday',
  fri: 'friday',
  saturday: 'saturday',
  sat: 'saturday',
};

export function buildOperatingHours(
  start: string,
  end: string,
  days?: string[],
): Record<string, { open: string; close: string }> {
  if (!days || days.length === 0) {
    return {};
  }

  const normalizedDays: string[] = [];
  for (const day of days) {
    const lower = day.toLowerCase();
    const canonical = CANONICAL_WEEKDAYS[lower];
    if (canonical) {
      normalizedDays.push(canonical);
    }
  }

  if (normalizedDays.length === 0) {
    return {};
  }

  const hours: Record<string, { open: string; close: string }> = {};
  for (const day of normalizedDays) {
    hours[day] = { open: start, close: end };
  }

  return hours;
}

export async function applyPostUpdate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  post: PostToProcess,
  parsedData: ParsedPost,
): Promise<void> {
  const updateData: Record<string, unknown> = {};

  if (parsedData.location?.address) {
    updateData.street_address = parsedData.location.address;
  }
  if (parsedData.location?.city) {
    updateData.city = parsedData.location.city;
  }
  if (parsedData.location?.state) {
    updateData.state = parsedData.location.state;
  }
  if (parsedData.times?.start && parsedData.times?.end) {
    const normalizedStart = normalizeTime(parsedData.times.start) ?? parsedData.times.start;
    const normalizedEnd = normalizeTime(parsedData.times.end) ?? parsedData.times.end;
    const newHours = buildOperatingHours(
      normalizedStart,
      normalizedEnd,
      parsedData.times.days,
    );

    if (Object.keys(newHours).length > 0) {
      const { data: existing, error: readError } = await supabase
        .from('food_trucks')
        .select('operating_hours')
        .eq('id', post.truck_id)
        .single();

      if (readError) {
        logError('Failed to read existing operating_hours for webhook schedule update', {
          postId: post.id,
          truckId: post.truck_id,
          error: readError.message,
        });
        throw readError;
      }

      const existingHours: Record<string, { open: string; close: string }> =
        existing?.operating_hours &&
        typeof existing.operating_hours === 'object' &&
        !Array.isArray(existing.operating_hours)
          ? (existing.operating_hours as Record<string, { open: string; close: string }>)
          : {};

      updateData.operating_hours = { ...existingHours, ...newHours } as unknown as Json;
    }
  }

  if (Object.keys(updateData).length === 0) {
    return;
  }

  updateData.facebook_last_sync = new Date().toISOString();

  const { data: updatedRow, error } = await supabase
    .from('food_trucks')
    .update(updateData)
    .eq('id', post.truck_id)
    .select('slug')
    .single();

  if (error) {
    logError('Failed to apply post update to truck', {
      postId: post.id,
      truckId: post.truck_id,
      error: error.message,
    });
    throw error;
  }

  if (updatedRow?.slug) {
    invalidatePublicTruckBySlug(updatedRow.slug);
  }

  logMessage('Applied post update to truck', {
    postId: post.id,
    truckId: post.truck_id,
    fieldsUpdated: Object.keys(updateData),
  });
}

async function insertParsedPost(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  facebookPostId: string,
  parsedData: ParsedPost,
): Promise<void> {
  const insertData = {
    facebook_post_id: facebookPostId,
    food_items: parsedData.food_items as Json,
    location_data: (parsedData.location ?? {}) as Json,
    time_data: (parsedData.times ?? null) as Json,
    prices: (parsedData.prices ?? null) as Json,
    confidence: parsedData.confidence,
    model_used: 'primary',
    parsing_time_ms: 0,
  };

  const { error } = await supabase
    .from('parsed_facebook_posts')
    .upsert(insertData, { onConflict: 'facebook_post_id' });

  if (error) {
    logError('Failed to upsert parsed post', {
      facebookPostId,
      error: error.message,
    });
    throw error;
  }
}

async function processPostSafely(
  post: PostToProcess,
  supabase: ReturnType<typeof getSupabaseAdmin>,
): Promise<ProcessingResultItem> {
  try {
    return await processSinglePost(post, supabase);
  } catch (error) {
    logError('Error processing post', {
      postId: post.id,
      error: error instanceof Error ? error.message : 'unknown',
    });

    try {
      await updatePostStatus(supabase, post.id, 'failed', 0);
    } catch (statusError) {
      logError('Failed to update post status to failed', {
        postId: post.id,
        error: statusError instanceof Error ? statusError.message : 'unknown',
      });
    }

    return {
      postId: post.id,
      action: 'error' as const,
      confidence: 0,
      processingTimeMs: 0,
      error: error instanceof Error ? error.message : 'unknown',
    };
  }
}

function hasValidTruckId(post: PostToProcess): boolean {
  return typeof post.truck_id === 'string' && post.truck_id.trim().length > 0;
}

export async function processPendingPosts(): Promise<ProcessingResult> {
  const batchStartTime = Date.now();
  const supabase = getSupabaseAdmin();

  const { data: pendingPosts, error: fetchError } = await supabase
    .from('facebook_posts')
    .select('*')
    .eq('status', 'pending')
    .limit(BATCH_SIZE);

  if (fetchError) {
    logError('Failed to fetch pending posts', { error: fetchError.message });
    return {
      processed: 0,
      applied: 0,
      pendingReview: 0,
      rejected: 0,
      skipped: 0,
      errors: 0,
      processingTimeMs: Date.now() - batchStartTime,
      results: [],
    };
  }

  if (!pendingPosts || pendingPosts.length === 0) {
    return {
      processed: 0,
      applied: 0,
      pendingReview: 0,
      rejected: 0,
      skipped: 0,
      errors: 0,
      processingTimeMs: Date.now() - batchStartTime,
      results: [],
    };
  }

  const CHUNK_SIZE = 3;
  const posts = pendingPosts as PostToProcess[];
  const results: ProcessingResultItem[] = [];

  for (let i = 0; i < posts.length; i += CHUNK_SIZE) {
    const chunk = posts.slice(i, i + CHUNK_SIZE);

    const truckGroups = new Map<string, PostToProcess[]>();
    const independentPosts: PostToProcess[] = [];

    for (const post of chunk) {
      if (hasValidTruckId(post)) {
        const group = truckGroups.get(post.truck_id);
        if (group) {
          group.push(post);
        } else {
          truckGroups.set(post.truck_id, [post]);
        }
      } else {
        independentPosts.push(post);
      }
    }

    const groupWorkers: Array<Promise<ProcessingResultItem[]>> = [];

    for (const [, group] of truckGroups) {
      groupWorkers.push(
        (async () => {
          const groupResults: ProcessingResultItem[] = [];
          for (const post of group) {
            groupResults.push(await processPostSafely(post, supabase));
          }
          return groupResults;
        })(),
      );
    }

    for (const post of independentPosts) {
      groupWorkers.push(
        (async () => {
          return [await processPostSafely(post, supabase)];
        })(),
      );
    }

    const settledResults = await Promise.allSettled(groupWorkers);

    for (const settled of settledResults) {
      if (settled.status === 'fulfilled') {
        results.push(...settled.value);
      }
    }
  }

  let applied = 0;
  let pendingReview = 0;
  let rejected = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    switch (result.action) {
      case 'applied': {
        applied++;
        break;
      }
      case 'pending_review': {
        pendingReview++;
        break;
      }
      case 'rejected': {
        rejected++;
        break;
      }
      case 'skipped': {
        skipped++;
        break;
      }
      case 'error': {
        errors++;
        break;
      }
    }
  }

  const processingTimeMs = Date.now() - batchStartTime;

  logMessage('Batch processing complete', {
    processed: pendingPosts.length,
    applied,
    pendingReview,
    rejected,
    skipped,
    errors,
    processingTimeMs,
  });

  return {
    processed: pendingPosts.length,
    applied,
    pendingReview,
    rejected,
    skipped,
    errors,
    processingTimeMs,
    results,
  };
}
