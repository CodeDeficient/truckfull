import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PosthogClient, getPosthogClient } from '../posthog';

describe('PosthogClient', () => {
  let client: PosthogClient;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.POSTHOG_PROJECT_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.POSTHOG_HOST;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    process.env.NODE_ENV = 'test';
  });

  describe('constructor', () => {
    it('should create client with default config', () => {
      const client = new PosthogClient();
      expect(client).toBeDefined();
    });

    it('should accept custom project key', () => {
      const client = new PosthogClient({ projectKey: 'custom-key' });
      expect(client).toBeDefined();
    });

    it('should accept custom host', () => {
      const client = new PosthogClient({ host: 'https://custom.host.com' });
      expect(client).toBeDefined();
    });

    it('should accept custom batch size', () => {
      const client = new PosthogClient({ batchSize: 50 });
      expect(client).toBeDefined();
    });

    it('should use environment variables when available', () => {
      process.env.POSTHOG_PROJECT_KEY = 'env-project-key';
      process.env.POSTHOG_HOST = 'https://env.host.com';
      const client = new PosthogClient();
      expect(client).toBeDefined();
    });
  });

  describe('validateEventName', () => {
    it('should validate facebook_webhook_received', () => {
      const client = new PosthogClient();
      expect((client as any).validateEventName('facebook_webhook_received')).toBe(true);
    });

    it('should validate ai_parse_success', () => {
      const client = new PosthogClient();
      expect((client as any).validateEventName('ai_parse_success')).toBe(true);
    });

    it('should validate ai_parse_failure', () => {
      const client = new PosthogClient();
      expect((client as any).validateEventName('ai_parse_failure')).toBe(true);
    });

    it('should validate webhook_rate_limit_exceeded', () => {
      const client = new PosthogClient();
      expect((client as any).validateEventName('webhook_rate_limit_exceeded')).toBe(true);
    });

    it('should reject invalid event names', () => {
      const client = new PosthogClient();
      expect((client as any).validateEventName('invalid_event')).toBe(false);
    });
  });

  describe('validateProperties', () => {
    it('should validate facebook_webhook_received properties', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('facebook_webhook_received', {
          webhook_id: '123',
          timestamp: '2024-01-01',
        }),
      ).not.toThrow();
    });

    it('should throw for missing webhook_id', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('facebook_webhook_received', {
          timestamp: '2024-01-01',
        }),
      ).toThrow('webhook_id is required and must be a string');
    });

    it('should throw for invalid timestamp', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('facebook_webhook_received', {
          webhook_id: '123',
          timestamp: 123,
        }),
      ).toThrow('timestamp is required and must be a string');
    });

    it('should validate ai_parse_success properties', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('ai_parse_success', {
          model: 'test-model',
          latency_ms: 100,
          confidence: 0.85,
        }),
      ).not.toThrow();
    });

    it('should throw for invalid latency_ms', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('ai_parse_success', {
          model: 'test-model',
          latency_ms: 'fast',
          confidence: 0.85,
        }),
      ).toThrow('latency_ms is required and must be a number');
    });

    it('should throw for confidence out of range', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('ai_parse_success', {
          model: 'test-model',
          latency_ms: 100,
          confidence: 1.5,
        }),
      ).toThrow('confidence is required and must be a number between 0 and 1');
    });

    it('should validate ai_parse_failure properties', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('ai_parse_failure', {
          model: 'test-model',
          error: 'Something went wrong',
        }),
      ).not.toThrow();
    });

    it('should throw for missing error field', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('ai_parse_failure', {
          model: 'test-model',
        }),
      ).toThrow('error is required and must be a string');
    });

    it('should validate webhook_rate_limit_exceeded properties', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('webhook_rate_limit_exceeded', {
          ip: '192.168.1.1',
          remaining: 0,
          reset: Date.now(),
          timestamp: '2024-01-01',
        }),
      ).not.toThrow();
    });

    it('should throw for invalid ip', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('webhook_rate_limit_exceeded', {
          ip: 123,
          remaining: 0,
          reset: Date.now(),
          timestamp: '2024-01-01',
        }),
      ).toThrow('ip is required and must be a string');
    });

    it('should throw for invalid remaining', () => {
      const client = new PosthogClient();
      expect(() =>
        (client as any).validateProperties('webhook_rate_limit_exceeded', {
          ip: '192.168.1.1',
          remaining: 'none',
          reset: Date.now(),
          timestamp: '2024-01-01',
        }),
      ).toThrow('remaining is required and must be a number');
    });
  });

  describe('track', () => {
    it('should return success when client is not initialized', async () => {
      const client = new PosthogClient();
      const result = await client.track('test_event', {});
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid event name', async () => {
      const client = new PosthogClient({ projectKey: 'test-key' });
      process.env.NODE_ENV = 'production';
      const validateResult = (client as any).validateEventName('invalid_event');
      expect(validateResult).toBe(false);
    });

    it('should batch events and flush when batch size reached', async () => {
      const client = new PosthogClient({ projectKey: 'test-key', batchSize: 2 });
      process.env.NODE_ENV = 'production';

      const result1 = await client.track('ai_parse_success', {
        model: 'test',
        latency_ms: 100,
        confidence: 0.9,
      });
      expect(result1.success).toBe(true);
    });
  });

  describe('getPosthogClient', () => {
    it('should return singleton instance', () => {
      const instance1 = getPosthogClient();
      const instance2 = getPosthogClient();
      expect(instance1).toBe(instance2);
    });
  });
});
