import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PosthogClient } from '@/lib/analytics/posthog';

jest.mock('posthog-node', () => ({
  PostHog: jest.fn().mockImplementation(() => ({
    capture: jest.fn().mockResolvedValue(undefined),
    flush: jest.fn().mockResolvedValue(undefined),
    shutdown: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('PostHog Client (Server-Side)', () => {
  let posthogClient: PosthogClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Simulate production environment so PostHog client initializes
    process.env.NODE_ENV = 'production';
    posthogClient = new PosthogClient({
      projectKey: 'test_key',
      host: 'https://test.posthog.com',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('Event Tracking', () => {
    it('should track facebook_webhook_received event', async () => {
      const properties = {
        webhook_id: 'webhook_123',
        timestamp: '2026-02-09T12:00:00Z',
      };

      const result = await posthogClient.track('facebook_webhook_received', properties);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should track ai_parse_success event', async () => {
      const properties = {
        model: 'gpt-4',
        latency_ms: 150,
        confidence: 0.95,
      };

      const result = await posthogClient.track('ai_parse_success', properties);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should track ai_parse_failure event', async () => {
      const properties = {
        model: 'gpt-4',
        error: 'Invalid JSON response',
      };

      const result = await posthogClient.track('ai_parse_failure', properties);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate required properties for events', async () => {
      const result = await posthogClient.track('facebook_webhook_received', {} as any);

      expect(result.success).toBe(false);
      expect(result.error).toBe('webhook_id is required and must be a string');
    });

    it('should include optional properties when provided', async () => {
      const properties = {
        webhook_id: 'webhook_123',
        timestamp: '2026-02-09T12:00:00Z',
        post_id: 'post_456',
      };

      const result = await posthogClient.track('facebook_webhook_received', properties);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid property types', async () => {
      const result = await posthogClient.track('ai_parse_success', {
        model: 'gpt-4',
        latency_ms: 'invalid',
        confidence: 0.95,
      } as unknown as Record<string, unknown>);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid confidence values', async () => {
      const result = await posthogClient.track('ai_parse_success', {
        model: 'gpt-4',
        latency_ms: 150,
        confidence: 1.5,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('confidence');
    });

    it('should handle flush errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (posthogClient as any).client.flush = jest.fn().mockRejectedValue(new Error('Flush failed'));

      (posthogClient as any).batchedEvents = [
        {
          event: 'facebook_webhook_received',
          properties: { webhook_id: '123', timestamp: '2026-02-09T12:00:00Z' },
        },
      ];

      await expect(posthogClient.flush()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('PostHog flush error: Flush failed');
      consoleSpy.mockRestore();
    });

    it('should handle flush errors with non-Error objects', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (posthogClient as any).client.flush = jest.fn().mockRejectedValue('String error');

      (posthogClient as any).batchedEvents = [
        {
          event: 'facebook_webhook_received',
          properties: { webhook_id: '123', timestamp: '2026-02-09T12:00:00Z' },
        },
      ];

      await expect(posthogClient.flush()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('PostHog flush error: unknown_error');
      consoleSpy.mockRestore();
    });
  });

  describe('Event Batching', () => {
    it('should batch events when flush is called', async () => {
      const events = [
        {
          event: 'facebook_webhook_received',
          properties: { webhook_id: 'webhook_123', timestamp: '2026-02-09T12:00:00Z' },
        },
        {
          event: 'ai_parse_success',
          properties: { model: 'gpt-4', latency_ms: 150, confidence: 0.95 },
        },
        { event: 'ai_parse_failure', properties: { model: 'gpt-3.5', error: 'Parse error' } },
      ];

      for (const event of events) {
        await posthogClient.track(event.event, event.properties);
      }

      await expect(posthogClient.flush()).resolves.not.toThrow();
    });

    it('should flush events automatically when batch size limit is reached', async () => {
      const flushSpy = jest.spyOn(posthogClient, 'flush');

      const batchSize = 10;
      for (let i = 0; i < batchSize; i++) {
        await posthogClient.track('facebook_webhook_received', {
          webhook_id: `webhook_${i}`,
          timestamp: new Date().toISOString(),
        });
      }

      expect(flushSpy).toHaveBeenCalled();
    });

    it('should respect batch size configuration', async () => {
      const customBatchSize = 5;
      const client = new PosthogClient({
        batchSize: customBatchSize,
        projectKey: 'test',
        host: 'https://test.posthog.com',
      });
      const flushSpy = jest.spyOn(client, 'flush');

      for (let i = 0; i < customBatchSize - 1; i++) {
        await client.track('facebook_webhook_received', {
          webhook_id: `webhook_${i}`,
          timestamp: new Date().toISOString(),
        });
      }

      expect(flushSpy).not.toHaveBeenCalled();

      await client.track('facebook_webhook_received', {
        webhook_id: `webhook_${customBatchSize - 1}`,
        timestamp: new Date().toISOString(),
      });

      expect(flushSpy).toHaveBeenCalled();
    });

    it('should clear batched events after successful flush', async () => {
      const client = new PosthogClient({
        batchSize: 2,
        projectKey: 'test',
        host: 'https://test.posthog.com',
      });

      await client.track('facebook_webhook_received', {
        webhook_id: 'webhook_123',
        timestamp: new Date().toISOString(),
      });

      await client.track('ai_parse_success', {
        model: 'gpt-4',
        latency_ms: 150,
        confidence: 0.95,
      });

      await client.flush();

      const batchSize = (client as any).batchedEvents.length;
      expect(batchSize).toBe(0);
    });

    it('does not clear events tracked while another flush is in flight', async () => {
      let finishFlush: (() => void) | undefined;
      const client = new PosthogClient({
        projectKey: 'test',
        host: 'https://test.posthog.com',
      });
      (client as any).client.flush = jest.fn(
        () => new Promise<void>((resolve) => (finishFlush = resolve)),
      );

      await client.track('facebook_webhook_received', {
        webhook_id: 'first',
        timestamp: new Date().toISOString(),
      });
      const firstFlush = client.flush();

      await client.track('facebook_webhook_received', {
        webhook_id: 'second',
        timestamp: new Date().toISOString(),
      });
      expect((client as any).batchedEvents).toHaveLength(1);

      finishFlush?.();
      await firstFlush;
      expect((client as any).batchedEvents).toHaveLength(1);
    });

  });

  describe('Event Schema Validation', () => {
    it('should validate facebook_webhook_received schema', async () => {
      const result = await posthogClient.track('facebook_webhook_received', {
        webhook_id: 'webhook_123',
        timestamp: '2026-02-09T12:00:00Z',
      });

      expect(result.success).toBe(true);
    });

    it('should validate ai_parse_success schema', async () => {
      const result = await posthogClient.track('ai_parse_success', {
        model: 'gpt-4',
        latency_ms: 150,
        confidence: 0.95,
      });

      expect(result.success).toBe(true);
    });

    it('should validate ai_parse_failure schema', async () => {
      const result = await posthogClient.track('ai_parse_failure', {
        model: 'gpt-4',
        error: 'Invalid response',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid event names', async () => {
      const result = await posthogClient.track('invalid_event', {
        test: 'data',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid event name');
    });
  });

  describe('Owner funnel server events (#1323)', () => {
    it('accepts trial_started with a source and user_id', async () => {
      const result = await posthogClient.track('trial_started', { source: 'claim', user_id: 'u_1' });
      expect(result.success).toBe(true);
    });

    it('rejects trial_started missing user_id', async () => {
      const result = await posthogClient.track('trial_started', { source: 'claim' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('user_id');
    });

    it('accepts checkout_started with tier, interval, founding, user_id', async () => {
      const result = await posthogClient.track('checkout_started', {
        tier: 'pro',
        interval: 'month',
        founding: false,
        user_id: 'u_123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects checkout_started missing user_id', async () => {
      const result = await posthogClient.track('checkout_started', {
        tier: 'pro',
        interval: 'month',
        founding: false,
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('user_id');
    });

    it('accepts subscription_activated with tier, user_id, and insert ID', async () => {
      const result = await posthogClient.track('subscription_activated', {
        tier: 'pro',
        from_tier: 'free',
        user_id: 'u_123',
        $insert_id: 'evt_123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects subscription_activated missing insert ID', async () => {
      const result = await posthogClient.track('subscription_activated', {
        tier: 'pro',
        from_tier: 'free',
        user_id: 'u_123',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('$insert_id');
    });

    it('routes funnel events to the user_id distinct id', async () => {
      const { getDistinctIdForEvent } = await import('@/lib/analytics/posthog');
      expect(getDistinctIdForEvent('trial_started', { source: 'pricing', user_id: 'u_9' })).toBe(
        'u_9',
      );
      expect(
        getDistinctIdForEvent('subscription_activated', { tier: 'pro', from_tier: null, user_id: 'u_9' }),
      ).toBe('u_9');
      expect(getDistinctIdForEvent('owner_cta_clicked', {})).toBe('server');
    });
  });

  describe('Client Configuration', () => {
    it('should use custom PostHog host when provided', () => {
      const customHost = 'https://custom.posthog.com';
      const client = new PosthogClient({ host: customHost });

      expect((client as any).config.host).toBe(customHost);
    });

    it('should use custom project key when provided', () => {
      const customKey = 'phc_custom_key';
      const client = new PosthogClient({ projectKey: customKey });

      expect((client as any).config.projectKey).toBe(customKey);
    });

    it('should initialize with default configuration', () => {
      const client = new PosthogClient();

      expect((client as any).config.batchSize).toBe(10);
    });

    it('should respect custom batch size configuration', () => {
      const customBatchSize = 20;
      const client = new PosthogClient({ batchSize: customBatchSize });

      expect((client as any).config.batchSize).toBe(customBatchSize);
    });
  });
});
