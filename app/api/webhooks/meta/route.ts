/**
 * Meta Webhook Handler
 * Phase 4: GET and POST handlers for Facebook/Meta webhooks
 *
 * Security:
 * - HMAC signature verification for all POST requests
 * - Whitelist check (bypasses rate limit for trusted sources)
 * - Rate limiting (1000 req/min) — applied BEFORE JSON repair to prevent DoS
 * - Webhook verification via GET challenge-response
 *
 * Processing order: Signature → Whitelist → Rate Limit → JSON Repair → Parse → Process
 *
 * JSON Repair:
 * - Malformed payloads are repaired via jsonrepair (deterministic)
 * - Repair metadata tracked in PostHog and stored in DB
 */

import crypto from 'node:crypto';
import { after, NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/webhooks/verifySignature';
import { webhookLimiter, getClientIp } from '@/lib/middleware/rateLimit';
import { queuePostForProcessing } from '@/lib/webhooks/queueProcessor';
import {
  awaitDurableQueue,
  hasDurableReceiptFailure,
  hasInvalidTimestampReceiptFailure,
  hasPermanentReceiptFailure,
  hasTransientReceiptFailure,
  hasUnregisteredPageReceiptFailure,
} from '@/lib/webhooks/webhookLifecycle';
import { repairWebhookJson } from '@/lib/utils/repairWebhookJson';
import { logMessage, logWarning, logError } from '@/lib/logging';
import { getPosthogClient } from '@/lib/analytics/posthog';

export const maxDuration = 60;
const DURABLE_RECEIPT_TIMEOUT_MS = 10_000;

export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    logMessage('Webhook verified successfully');
    return new Response(challenge, { status: 200 });
  }

  logError('Webhook verification failed', { mode, token });
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest): Promise<Response> {
  const startTime = Date.now();
  const webhookId = `wh_${crypto.randomUUID()}`;

  try {
    // --- Signature verification ---
    const signature = request.headers.get('x-hub-signature-256');
    const rawBody = await request.text();

    if (!signature) {
      logError('Missing signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const isValid = await verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      logError('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    // --- Rate limiting (before repair to prevent CPU DoS) ---
    const clientIp = getClientIp(request);
    const posthog = getPosthogClient();
    const rateLimitResult = await applyRateLimit(clientIp, posthog);
    if (rateLimitResult) {
      return rateLimitResult;
    }

    // --- JSON Repair ---
    const repairResult = repairWebhookJson(rawBody);

    if (repairResult.wasMalformed) {
      await trackJsonRepaired(posthog, webhookId, repairResult);
    }

    // --- Parse payload ---
    let payload: WebhookPayload;
    try {
      payload = JSON.parse(repairResult.repaired) as WebhookPayload;
    } catch (parseError) {
      await trackJsonParseFailed(posthog, webhookId, repairResult, parseError);
      // Accept webhook but skip processing — don't make Meta retry
      return NextResponse.json({ status: 'accepted', repair_status: 'failed' }, { status: 200 });
    }

    // --- Handle test payloads from Meta Developer Console ---
    const testPayload = payload as unknown as TestWebhookPayload;
    if (testPayload.sample?.field === 'feed') {
      logMessage('Received test webhook from Meta dashboard', {
        item: testPayload.sample.value?.item,
        postId: testPayload.sample.value?.post_id,
      });
      await posthog.track('facebook_webhook_test_received', {
        webhook_id: webhookId,
        item: testPayload.sample.value?.item,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json({ status: 'test_ok' }, { status: 200 });
    }

    // --- Filter non-page objects ---
    if (payload.object !== 'page') {
      logMessage('Ignoring non-page webhook', { object: payload.object });
      return NextResponse.json({ status: 'ok' }, { status: 200 });
    }

    // --- Process entries (parallel to avoid timeout) ---
    const entries: WebhookEntry[] = (payload.entry as WebhookEntry[] | undefined) ?? [];
    const tasks: Promise<unknown>[] = [];
    let postChangeCount = 0;
    for (const entry of entries) {
      const changes: WebhookChange[] = (entry.changes as WebhookChange[] | undefined) ?? [];
      for (const change of changes) {
        logMessage('Webhook change entry', {
          entryId: entry.id,
          field: change.field,
          item: change.value.item,
          verb: change.value.verb,
          postId: change.value.post_id,
        });
        if (change.field === 'feed') {
          const isPost = change.value.item === 'post';
          const isStatusAdd = change.value.item === 'status' && change.value.verb === 'add';
          if (!isPost && !isStatusAdd) {
            continue;
          }
          const post_id = change.value.post_id;
          if (!post_id) {
            logWarning('Skipping change without post_id');
            continue;
          }
          postChangeCount++;

          tasks.push(
            queuePostForProcessing(entry.id, change.value, {
              repairStatus: repairResult.repairMetadata.repairStatus,
              issuesFound: repairResult.issuesFound,
              repairTimeMs: repairResult.repairMetadata.repairTimeMs,
            }),
          );
        }
      }
    }
    console.info('[webhook]', JSON.stringify({
      event: 'entries_processed',
      webhookId,
      entryCount: entries.length,
      postChangeCount,
      taskCount: tasks.length,
    }));
    const durableReceipt = await awaitDurableQueue(tasks, DURABLE_RECEIPT_TIMEOUT_MS);
    after(
      trackWebhookProcessing(tasks, posthog, webhookId, startTime).catch((error: unknown) => {
        logError('Webhook background tracking failed', {
          webhookId,
          error: error instanceof Error ? error.message : 'unknown',
        });
      }),
    );

    const receiptFailed = hasDurableReceiptFailure(durableReceipt.settledResults);
    if (durableReceipt.timedOut || (receiptFailed && hasTransientReceiptFailure(durableReceipt.settledResults))) {
      return NextResponse.json({ error: 'Durable webhook receipt timed out' }, { status: 503 });
    }
    if (receiptFailed && hasInvalidTimestampReceiptFailure(durableReceipt.settledResults)) {
      if (hasUnregisteredPageReceiptFailure(durableReceipt.settledResults)) {
        return NextResponse.json({ status: 'ignored', reason: 'permanent_failure' }, { status: 200 });
      }
      return NextResponse.json({ status: 'ignored', reason: 'invalid_created_time' }, { status: 200 });
    }
    if (receiptFailed && hasPermanentReceiptFailure(durableReceipt.settledResults)) {
      return NextResponse.json({ status: 'ignored', reason: 'unregistered_page' }, { status: 200 });
    }

    return NextResponse.json(
      {
        status: 'ok',
        repair_status: repairResult.repairMetadata.repairStatus,
      },
      { status: 202 },
    );
  } catch (error) {
    logError('Webhook processing error', { error, webhookId });
    try {
      const posthog = getPosthogClient();
      await posthog.track('facebook_webhook_error', {
        webhook_id: webhookId,
        error: error instanceof Error ? error.message : 'unknown',
        timestamp: new Date().toISOString(),
      });
    } catch {
      // PostHog tracking in error path is best-effort
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

async function trackWebhookProcessing(
  tasks: Promise<unknown>[],
  posthog: ReturnType<typeof getPosthogClient>,
  webhookId: string,
  startTime: number,
): Promise<void> {
  const settledResults = await Promise.allSettled(tasks);
  const succeeded = settledResults.filter((r) => r.status === 'fulfilled').length;
  const failed = settledResults.filter((r) => r.status === 'rejected').length;
  if (failed > 0) {
    console.warn('[webhook]', JSON.stringify({ event: 'tasks_failed', webhookId, succeeded, failed }));
  }

  await posthog.track('facebook_webhook_received', {
    webhook_id: webhookId,
    processing_time_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });
  try {
    await posthog.flush();
  } catch (flushError) {
    logError('PostHog flush error (non-fatal)', {
      webhookId,
      error: flushError instanceof Error ? flushError.message : 'unknown',
    });
  }
}

// --- Helper types ---

interface WebhookPayload {
  object: string;
  entry?: WebhookEntry[];
}

interface TestWebhookPayload {
  sample?: {
    field: string;
    value?: {
      item?: string;
      post_id?: string;
      message?: string;
    };
  };
}

interface WebhookEntry {
  id: string;
  time: number;
  changes?: WebhookChange[];
}

interface WebhookChange {
  field: string;
  value: { item: string; post_id: string; verb?: string; [key: string]: unknown };
}

// --- Helper functions (extracted to stay under 50-line limit) ---

async function trackJsonRepaired(
  posthog: ReturnType<typeof getPosthogClient>,
  webhookId: string,
  repairResult: ReturnType<typeof repairWebhookJson>,
): Promise<void> {
  logMessage('JSON payload repaired', {
    webhookId,
    issuesFound: repairResult.issuesFound,
  });
  await posthog.track('json_repaired', {
    webhook_id: webhookId,
    issues_found: repairResult.issuesFound,
    repair_type: 'malformed_repaired',
    payload_size_bytes: repairResult.repairMetadata.payloadSizeBytes,
    repair_time_ms: repairResult.repairMetadata.repairTimeMs,
    timestamp: new Date().toISOString(),
  });
}

async function trackJsonParseFailed(
  posthog: ReturnType<typeof getPosthogClient>,
  webhookId: string,
  repairResult: ReturnType<typeof repairWebhookJson>,
  parseError: unknown,
): Promise<void> {
  logError('JSON parse failed after repair', {
    webhookId,
    parseError,
  });
  await posthog.track('json_parse_failed_after_repair', {
    webhook_id: webhookId,
    was_malformed: repairResult.wasMalformed,
    error: parseError instanceof Error ? parseError.message : 'unknown',
    timestamp: new Date().toISOString(),
  });
}

async function applyRateLimit(
  clientIp: string,
  posthog: ReturnType<typeof getPosthogClient>,
): Promise<Response | undefined> {
  const enableRateLimit = process.env.ENABLE_WEBHOOK_RATE_LIMIT !== 'false';
  if (!enableRateLimit) {
    return undefined;
  }

  try {
    const result = await webhookLimiter.limit(clientIp);
    if (!result.success) {
      logError('Rate limit exceeded', {
        clientIp,
        remaining: result.remaining,
        reset: result.reset,
      });
      await posthog.track('webhook_rate_limit_exceeded', {
        ip: clientIp,
        remaining: result.remaining,
        reset: result.reset,
        timestamp: new Date().toISOString(),
      });
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(result.reset),
          },
        },
      );
    }

    logMessage('Rate limit check passed', { clientIp, remaining: result.remaining });
    return undefined;
  } catch (error) {
    logError('Rate limiter error, allowing webhook to proceed', { error, clientIp });
    return undefined;
  }
}
