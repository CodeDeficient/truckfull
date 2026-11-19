import { logError, logMessage } from '@/lib/logging';
import { EXTERNAL_API_TIMEOUT_MS } from '@/lib/supabase/fetchWithTimeout';

export const MAX_RETRIES = 2;
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const MAX_ALERTS_PER_WINDOW = 10;
export const MAX_PIPELINE_ALERTS_PER_WINDOW = 25;

export type AlertPriority = 'normal' | 'pipeline';

export interface SlackMessage {
  text: string;
  attachments?: SlackAttachment[];
}

export interface SlackAttachment {
  color?: 'good' | 'warning' | 'danger' | string;
  title?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

interface AlertEvent {
  timestamp: number;
}

let alertHistory: AlertEvent[] = [];
let pipelineAlertHistory: AlertEvent[] = [];

function isRateLimited(priority: AlertPriority): boolean {
  const now = Date.now();
  if (priority === 'pipeline') {
    pipelineAlertHistory = pipelineAlertHistory.filter(
      (e) => now - e.timestamp < RATE_LIMIT_WINDOW_MS,
    );
    return pipelineAlertHistory.length >= MAX_PIPELINE_ALERTS_PER_WINDOW;
  }
  alertHistory = alertHistory.filter((e) => now - e.timestamp < RATE_LIMIT_WINDOW_MS);
  return alertHistory.length >= MAX_ALERTS_PER_WINDOW;
}

function recordAlert(priority: AlertPriority): void {
  const entry = { timestamp: Date.now() };
  if (priority === 'pipeline') {
    pipelineAlertHistory.push(entry);
  } else {
    alertHistory.push(entry);
  }
}

export function getSlackWebhookUrl(): string {
  return process.env.SLACK_WEBHOOK_URL ?? '';
}

export async function postToSlack(
  payload: SlackMessage,
  options: { priority?: AlertPriority } = {},
): Promise<boolean> {
  const priority = options.priority ?? 'normal';
  const webhookUrl = getSlackWebhookUrl();
  if (!webhookUrl) {
    logMessage('Slack webhook URL not configured, skipping alert');
    return false;
  }

  if (isRateLimited(priority)) {
    logMessage(`Slack ${priority} alert rate limited, skipping`);
    return false;
  }

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        recordAlert(priority);
        return true;
      }

      if (response.status === 429) {
        lastError = new Error(
          `Slack 429: retry after ${response.headers.get('Retry-After') ?? '5'}s`,
        );
        const retryAfter = Number.parseInt(String(response.headers.get('Retry-After') ?? '5'), 10);
        await new Promise((resolve) =>
          setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : 5000),
        );
        continue;
      }

      lastError = new Error(`Slack API responded with ${response.status}`);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown fetch error');
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  logError('Failed to send Slack alert', lastError);
  return false;
}

export function resetAlertHistoryForTesting(): void {
  alertHistory = [];
  pipelineAlertHistory = [];
}
