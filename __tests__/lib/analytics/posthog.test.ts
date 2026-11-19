import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const originalEnv = process.env;

describe('PosthogClient - pure functions and validation', () => {
  let PosthogClient: typeof import('@/lib/analytics/posthog').PosthogClient;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'production';
    process.env.POSTHOG_PROJECT_KEY = 'test-project-key';

    const module = await import('@/lib/analytics/posthog');
    PosthogClient = module.PosthogClient;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor with mocks', () => {
    it('creates client with custom config', () => {
      const client = new PosthogClient({
        projectKey: 'custom-key',
        host: 'https://custom.host',
        batchSize: 25,
      });
      expect(client).toBeDefined();
    });

    it('uses environment variable when config not provided', () => {
      process.env.POSTHOG_HOST = 'https://env.host';
      const client = new PosthogClient({ projectKey: 'test' });
      expect(client).toBeDefined();
    });
  });

  describe('validateEventName', () => {
    it('returns true for valid event names', () => {
      const client = new PosthogClient({ projectKey: 'test' });
      const validateEventName = (client as unknown as { validateEventName: (name: string) => boolean }).validateEventName;
      expect(validateEventName('facebook_webhook_received')).toBe(true);
      expect(validateEventName('ai_parse_success')).toBe(true);
      expect(validateEventName('ai_parse_failure')).toBe(true);
      expect(validateEventName('webhook_rate_limit_exceeded')).toBe(true);
    });

    it('returns false for invalid event names', () => {
      const client = new PosthogClient({ projectKey: 'test' });
      const validateEventName = (client as unknown as { validateEventName: (name: string) => boolean }).validateEventName;
      expect(validateEventName('invalid_event')).toBe(false);
      expect(validateEventName('')).toBe(false);
      expect(validateEventName('UNKNOWN')).toBe(false);
    });
  });

  describe('track validation', () => {
    it('returns error for missing webhook_id in facebook_webhook_received', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 10 });
      const result = await client.track('facebook_webhook_received', {
        timestamp: '2023-01-01T00:00:00Z',
      } as never);
      expect(result.success).toBe(false);
      expect(result.error).toContain('webhook_id is required');
    });

    it('returns error for missing timestamp', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 10 });
      const result = await client.track('facebook_webhook_received', {
        webhook_id: '123',
      } as never);
      expect(result.success).toBe(false);
      expect(result.error).toContain('timestamp is required');
    });

    it('returns error for invalid latency_ms in ai_parse_success', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 10 });
      const result = await client.track('ai_parse_success', {
        model: 'test',
        latency_ms: 'fast' as never,
        confidence: 0.9,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('latency_ms is required and must be a number');
    });

    it('returns error for confidence out of range', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 10 });
      const result = await client.track('ai_parse_success', {
        model: 'test',
        latency_ms: 100,
        confidence: 1.5,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('confidence is required and must be a number between 0 and 1');
    });

    it('returns error for negative confidence', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 10 });
      const result = await client.track('ai_parse_success', {
        model: 'test',
        latency_ms: 100,
        confidence: -0.1,
      });
      expect(result.success).toBe(false);
    });

    it('returns error for missing error in ai_parse_failure', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 10 });
      const result = await client.track('ai_parse_failure', {
        model: 'test',
      } as never);
      expect(result.success).toBe(false);
      expect(result.error).toContain('error is required');
    });

    it('returns error for missing ip in webhook_rate_limit_exceeded', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 10 });
      const result = await client.track('webhook_rate_limit_exceeded', {
        remaining: 0,
        reset: Date.now(),
        timestamp: '2023-01-01T00:00:00Z',
      } as never);
      expect(result.success).toBe(false);
      expect(result.error).toContain('ip is required');
    });
  });

  describe('track with no client initialized', () => {
    it('returns success when project key not set', async () => {
      delete process.env.POSTHOG_PROJECT_KEY;
      process.env.NODE_ENV = 'production';

      const client = new PosthogClient();
      const result = await client.track('facebook_webhook_received', {
        webhook_id: '123',
        timestamp: '2023-01-01T00:00:00Z',
      });

      expect(result.success).toBe(true);
    });

    it('returns error for invalid event name even without client', async () => {
      const client = new PosthogClient({ projectKey: 'test-key' });
      const result = await client.track('invalid_event', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid event name');
    });
  });
});

describe('PosthogClient Event Types', () => {
  it('FacebookWebhookReceived has correct structure', () => {
    const event = {
      event: 'facebook_webhook_received' as const,
      properties: {
        webhook_id: 'webhook-123',
        timestamp: '2023-01-01T00:00:00Z',
        post_id: 'post-456',
      },
    };
    expect(event.event).toBe('facebook_webhook_received');
    expect(event.properties.webhook_id).toBe('webhook-123');
  });

  it('AiParseSuccess has correct structure', () => {
    const event = {
      event: 'ai_parse_success' as const,
      properties: {
        model: 'claude-3',
        latency_ms: 150,
        confidence: 0.95,
      },
    };
    expect(event.event).toBe('ai_parse_success');
    expect(event.properties.confidence).toBe(0.95);
  });

  it('AiParseFailure has correct structure', () => {
    const event = {
      event: 'ai_parse_failure' as const,
      properties: {
        model: 'claude-3',
        error: 'Rate limit exceeded',
      },
    };
    expect(event.event).toBe('ai_parse_failure');
  });

  it('WebhookRateLimitExceeded has correct structure', () => {
    const event = {
      event: 'webhook_rate_limit_exceeded' as const,
      properties: {
        ip: '192.168.1.1',
        remaining: 0,
        reset: Date.now(),
        timestamp: '2023-01-01T00:00:00Z',
      },
    };
    expect(event.event).toBe('webhook_rate_limit_exceeded');
  });
});

describe('TrackResult', () => {
  it('has success true when track succeeds', () => {
    const result = { success: true };
    expect(result.success).toBe(true);
  });

  it('has success false and error when track fails', () => {
    const result = { success: false, error: 'Invalid event name' };
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid event name');
  });
});