import { PostHog } from 'posthog-node';
import { randomBytes } from 'node:crypto';

export interface PosthogEventProperties {
  [key: string]: unknown;
}

export interface PosthogClientConfig {
  projectKey?: string;
  host?: string;
  batchSize?: number;
}

export interface TrackResult {
  success: boolean;
  error?: string;
}

export type FacebookWebhookReceived = {
  readonly event: 'facebook_webhook_received';
  readonly properties: {
    readonly webhook_id: string;
    readonly timestamp: string;
    readonly post_id?: string;
  };
};

export type AiParseSuccess = {
  readonly event: 'ai_parse_success';
  readonly properties: {
    readonly model: string;
    readonly latency_ms: number;
    readonly confidence: number;
  };
};

export type AiParseFailure = {
  readonly event: 'ai_parse_failure';
  readonly properties: { readonly model: string; readonly error: string };
};

export type WebhookRateLimitExceeded = {
  readonly event: 'webhook_rate_limit_exceeded';
  readonly properties: {
    readonly ip: string;
    readonly remaining: number;
    readonly reset: number;
    readonly timestamp: string;
  };
};

export type TrialStarted = {
  readonly event: 'trial_started';
  readonly properties: { readonly source: string; readonly user_id: string };
};

export type CheckoutStarted = {
  readonly event: 'checkout_started';
  readonly properties: {
    readonly tier: string;
    readonly interval: string;
    readonly founding: boolean;
    readonly user_id: string;
  };
};

export type SubscriptionActivated = {
  readonly event: 'subscription_activated';
  readonly properties: {
    readonly tier: string;
    readonly from_tier: string | null;
    readonly user_id: string;
    readonly $insert_id: string;
  };
};

export type PosthogEvent =
  | FacebookWebhookReceived
  | AiParseSuccess
  | AiParseFailure
  | WebhookRateLimitExceeded
  | TrialStarted
  | CheckoutStarted
  | SubscriptionActivated;

export class PosthogClient {
  private client: PostHog | null = null;
  private config: Required<PosthogClientConfig>;
  private batchedEvents: Array<{ event: string; properties: PosthogEventProperties }> = [];

  constructor(config: PosthogClientConfig = {}) {
    this.config = {
      projectKey:
        config.projectKey ||
        process.env.POSTHOG_PROJECT_KEY ||
        process.env.NEXT_PUBLIC_POSTHOG_KEY ||
        '',
      host: config.host || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      batchSize: config.batchSize || 10,
    };

    // Only initialize PostHog in production to avoid console noise in development
    if (this.config.projectKey && process.env.NODE_ENV === 'production') {
      this.client = new PostHog(this.config.projectKey, {
        host: this.config.host,
      });
    }
  }

  private validateEventName(eventName: string): boolean {
    const validEvents = [
      'facebook_webhook_received',
      'ai_parse_success',
      'ai_parse_failure',
      'webhook_rate_limit_exceeded',
      'trial_started',
      'checkout_started',
      'subscription_activated',
    ];
    return validEvents.includes(eventName);
  }

  private validateProperties(eventName: string, properties: PosthogEventProperties): void {
    switch (eventName) {
      case 'facebook_webhook_received': {
        if (!properties.webhook_id || typeof properties.webhook_id !== 'string') {
          throw new Error('webhook_id is required and must be a string');
        }
        if (!properties.timestamp || typeof properties.timestamp !== 'string') {
          throw new Error('timestamp is required and must be a string');
        }
        break;
      }
      case 'ai_parse_success': {
        if (!properties.model || typeof properties.model !== 'string') {
          throw new Error('model is required and must be a string');
        }
        if (
          properties.latency_ms === undefined ||
          typeof properties.latency_ms !== 'number' ||
          !Number.isFinite(properties.latency_ms)
        ) {
          throw new Error('latency_ms is required and must be a number');
        }
        if (
          properties.confidence === undefined ||
          typeof properties.confidence !== 'number' ||
          properties.confidence < 0 ||
          properties.confidence > 1
        ) {
          throw new Error('confidence is required and must be a number between 0 and 1');
        }
        break;
      }
      case 'ai_parse_failure': {
        if (!properties.model || typeof properties.model !== 'string') {
          throw new Error('model is required and must be a string');
        }
        if (!properties.error || typeof properties.error !== 'string') {
          throw new Error('error is required and must be a string');
        }
        break;
      }
      case 'webhook_rate_limit_exceeded': {
        if (!properties.ip || typeof properties.ip !== 'string') {
          throw new Error('ip is required and must be a string');
        }
        if (
          properties.remaining === undefined ||
          typeof properties.remaining !== 'number' ||
          !Number.isFinite(properties.remaining)
        ) {
          throw new Error('remaining is required and must be a number');
        }
        if (
          properties.reset === undefined ||
          typeof properties.reset !== 'number' ||
          !Number.isFinite(properties.reset)
        ) {
          throw new Error('reset is required and must be a number');
        }
        if (!properties.timestamp || typeof properties.timestamp !== 'string') {
          throw new Error('timestamp is required and must be a string');
        }
        break;
      }
      case 'trial_started': {
        if (!properties.source || typeof properties.source !== 'string') {
          throw new Error('source is required and must be a string');
        }
        if (!properties.user_id || typeof properties.user_id !== 'string') {
          throw new Error('user_id is required and must be a string');
        }
        break;
      }
      case 'checkout_started': {
        if (!properties.tier || typeof properties.tier !== 'string') {
          throw new Error('tier is required and must be a string');
        }
        if (!properties.interval || typeof properties.interval !== 'string') {
          throw new Error('interval is required and must be a string');
        }
        if (typeof properties.founding !== 'boolean') {
          throw new TypeError('founding is required and must be a boolean');
        }
        if (!properties.user_id || typeof properties.user_id !== 'string') {
          throw new Error('user_id is required and must be a string');
        }
        break;
      }
      case 'subscription_activated': {
        if (!properties.tier || typeof properties.tier !== 'string') {
          throw new Error('tier is required and must be a string');
        }
        if (!properties.user_id || typeof properties.user_id !== 'string') {
          throw new Error('user_id is required and must be a string');
        }
        if (!properties.$insert_id || typeof properties.$insert_id !== 'string') {
          throw new Error('$insert_id is required and must be a string');
        }
        break;
      }
      default: {
        throw new Error(`Invalid event name: ${eventName}`);
      }
    }
  }

  async track(eventName: string, properties: PosthogEventProperties): Promise<TrackResult> {
    try {
      if (!this.client) {
        console.warn('PostHog client not initialized. Skipping event tracking.');
        return { success: true };
      }

      if (!this.validateEventName(eventName)) {
        return { success: false, error: 'Invalid event name' };
      }

      this.validateProperties(eventName, properties);

      this.batchedEvents.push({ event: eventName, properties });

      if (this.batchedEvents.length >= this.config.batchSize) {
        await this.flush();
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      console.error(`PostHog tracking error: ${message}`);
      return { success: false, error: message };
    }
  }

  async flush(): Promise<void> {
    if (!this.client || this.batchedEvents.length === 0) {
      return;
    }

    const events = this.batchedEvents;
    this.batchedEvents = [];

    try {
      for (const event of events) {
        this.client.capture({
          distinctId: getDistinctIdForEvent(event.event, event.properties),
          event: event.event,
          properties: event.properties,
        });
      }

      await this.client.flush();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      console.error(`PostHog flush error: ${message}`);
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    if (this.client) {
      this.client.shutdown();
    }
  }
}

export function getDistinctIdForEvent(
  eventName: string,
  properties: PosthogEventProperties,
): string {
  if (eventName === 'facebook_webhook_received') {
    return (properties.webhook_id as string) || 'server';
  }
  if (eventName === 'ai_parse_success' || eventName === 'ai_parse_failure') {
    const model = (properties.model as string) || 'unknown';
    const randomValue = randomBytes(8).toString('hex').slice(0, 9);
    return `${model}_${Date.now()}_${randomValue}`;
  }
  if (eventName === 'webhook_rate_limit_exceeded') {
    return (properties.ip as string) || 'server';
  }
  if (
    eventName === 'trial_started' ||
    eventName === 'checkout_started' ||
    eventName === 'subscription_activated'
  ) {
    return (properties.user_id as string) || 'server';
  }
  return 'server';
}

let posthogClientInstance: PosthogClient | null = null;

export function getPosthogClient(): PosthogClient {
  if (!posthogClientInstance) {
    posthogClientInstance = new PosthogClient();
  }
  return posthogClientInstance;
}

// Re-export webhook stats from dedicated module (split to avoid bundling posthog-node in client)
export { getWebhookStats } from '@/lib/analytics/webhookStats';
export type { WebhookStats, ModelStats } from '@/lib/analytics/webhookStats';
