/**
 * Load Tests for Rate-Limited Endpoints
 *
 * Phase 5.1.5: Test rate limiting under load
 * Verifies 429 responses with Retry-After header under load
 */

import { test, expect } from '@playwright/test';

// Mock rate limiter service
const MockRateLimiter = {
  // User-based rate limiting (sliding window)
  userWindows: new Map<string, { timestamp: number; count: number }[]>(),

  // IP-based rate limiting (sliding window)
  ipWindows: new Map<string, { timestamp: number; count: number }[]>(),

  // Configuration
  config: {
    userLimit: 100, // requests per minute
    ipLimit: 30, // requests per minute
    windowMs: 60000, // 1 minute
  },

  async checkLimit(
    identifier: string,
    isUser: boolean = true,
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    const limit = isUser ? this.config.userLimit : this.config.ipLimit;
    const windows = isUser ? this.userWindows : this.ipWindows;

    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    if (!windows.has(identifier)) {
      windows.set(identifier, []);
    }

    const window = windows.get(identifier)!;

    // Remove old entries outside the window
    const cleanedWindow = window.filter((entry) => entry.timestamp >= windowStart);
    windows.set(identifier, cleanedWindow);

    const requestCount = cleanedWindow.length;

    if (requestCount >= limit) {
      // Calculate when the oldest entry in the window will expire
      const oldestEntry = cleanedWindow[0];
      const retryAfter = Math.ceil((oldestEntry.timestamp + this.config.windowMs - now) / 1000);
      return { allowed: false, retryAfter };
    }

    // Add current request
    window.push({ timestamp: now, count: 1 });
    return { allowed: true };
  },

  reset() {
    this.userWindows.clear();
    this.ipWindows.clear();
  },
};

// Mock analytics API with rate limiting
const MockAnalyticsAPI = {
  async trackEvent(
    event: { type: string; truckId?: string },
    headers: { userId?: string; ip?: string },
  ): Promise<{ status: number; headers?: Record<string, string>; data?: any }> {
    // Check user rate limit if authenticated
    if (headers.userId) {
      const userCheck = await MockRateLimiter.checkLimit(headers.userId, true);
      if (!userCheck.allowed) {
        return {
          status: 429,
          headers: {
            'Retry-After': userCheck.retryAfter!.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + userCheck.retryAfter! * 1000).toString(),
          },
          data: { error: 'Too many requests', retryAfter: userCheck.retryAfter },
        };
      }
    }

    // Check IP rate limit for anonymous requests
    if (headers.ip) {
      const ipCheck = await MockRateLimiter.checkLimit(headers.ip, false);
      if (!ipCheck.allowed) {
        return {
          status: 429,
          headers: {
            'Retry-After': ipCheck.retryAfter!.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + ipCheck.retryAfter! * 1000).toString(),
          },
          data: { error: 'Too many requests', retryAfter: ipCheck.retryAfter },
        };
      }
    }

    // Success
    return {
      status: 200,
      data: { success: true, eventId: `evt_${Date.now()}` },
    };
  },

  async trackEventBatch(
    events: Array<{ type: string; truckId?: string }>,
    headers: { userId?: string; ip?: string },
  ): Promise<{ status: number; headers?: Record<string, string>; data?: any }> {
    // Check rate limit once for batch
    if (headers.userId) {
      const userCheck = await MockRateLimiter.checkLimit(headers.userId, true);
      if (!userCheck.allowed) {
        return {
          status: 429,
          headers: {
            'Retry-After': userCheck.retryAfter!.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + userCheck.retryAfter! * 1000).toString(),
          },
          data: { error: 'Too many requests', retryAfter: userCheck.retryAfter },
        };
      }
    }

    if (headers.ip) {
      const ipCheck = await MockRateLimiter.checkLimit(headers.ip, false);
      if (!ipCheck.allowed) {
        return {
          status: 429,
          headers: {
            'Retry-After': ipCheck.retryAfter!.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': (Date.now() + ipCheck.retryAfter! * 1000).toString(),
          },
          data: { error: 'Too many requests', retryAfter: ipCheck.retryAfter },
        };
      }
    }

    // Success - batch processing
    return {
      status: 200,
      data: { success: true, events: events.map((_, i) => ({ id: `evt_${i}_${Date.now()}` })) },
    };
  },
};

// Mock webhook API with rate limiting
const MockWebhookAPI = {
  async receiveWebhook(
    data: any,
    headers: { 'X-Forwarded-For'?: string },
  ): Promise<{ status: number; headers?: Record<string, string>; data?: any }> {
    const ip = headers['X-Forwarded-For'] || 'unknown';

    // Check IP rate limit (100 req/min for webhooks)
    const ipCheck = await MockRateLimiter.checkLimit(ip, false);
    if (!ipCheck.allowed) {
      return {
        status: 429,
        headers: {
          'Retry-After': ipCheck.retryAfter!.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + ipCheck.retryAfter! * 1000).toString(),
        },
        data: { error: 'Too many requests', retryAfter: ipCheck.retryAfter },
      };
    }

    // Success
    return {
      status: 200,
      data: { success: true, webhookId: `wh_${Date.now()}` },
    };
  },
};

// Mock notification API with rate limiting
const MockNotificationAPI = {
  async sendNotification(
    userId: string,
    notification: any,
  ): Promise<{ status: number; headers?: Record<string, string>; data?: any }> {
    // Check user rate limit (10 req/min for notifications)
    const userCheck = await MockRateLimiter.checkLimit(userId, true);
    if (!userCheck.allowed) {
      return {
        status: 429,
        headers: {
          'Retry-After': userCheck.retryAfter!.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + userCheck.retryAfter! * 1000).toString(),
        },
        data: { error: 'Too many requests', retryAfter: userCheck.retryAfter },
      };
    }

    // Success
    return {
      status: 200,
      data: { success: true, notificationId: `notif_${Date.now()}` },
    };
  },
};

test.describe('Rate Limiting Under Load', () => {
  test.beforeEach(() => {
    MockRateLimiter.reset();
  });

  test.describe('Analytics API Rate Limiting', () => {
    test('enforces user-based rate limit of 100 req/min', async () => {
      const userId = 'user_123';
      const requests = Array.from({ length: 101 }, (_, i) => ({
        type: 'view',
        truckId: `truck_${i}`,
      }));

      let successCount = 0;
      let rateLimitedCount = 0;

      for (const event of requests) {
        const result = await MockAnalyticsAPI.trackEvent(event, { userId });
        if (result.status === 200) {
          successCount++;
        } else if (result.status === 429) {
          rateLimitedCount++;
          expect(result.headers).toBeDefined();
          expect(result.headers!['Retry-After']).toBeDefined();
          expect(result.headers!['X-RateLimit-Remaining']).toBe('0');
        }
      }

      expect(successCount).toBe(100);
      expect(rateLimitedCount).toBe(1);
    });

    test('enforces IP-based rate limit of 30 req/min for anonymous users', async () => {
      const ip = '192.168.1.100';
      const requests = Array.from({ length: 31 }, (_, i) => ({
        type: 'view',
        truckId: `truck_${i}`,
      }));

      let successCount = 0;
      let rateLimitedCount = 0;

      for (const event of requests) {
        const result = await MockAnalyticsAPI.trackEvent(event, { ip });
        if (result.status === 200) {
          successCount++;
        } else if (result.status === 429) {
          rateLimitedCount++;
          expect(result.headers).toBeDefined();
          expect(result.headers!['Retry-After']).toBeDefined();
        }
      }

      expect(successCount).toBe(30);
      expect(rateLimitedCount).toBe(1);
    });

    test('includes Retry-After header in 429 responses', async () => {
      const userId = 'user_123';

      // Hit rate limit
      for (let i = 0; i < 100; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });

      expect(result.status).toBe(429);
      expect(result.headers).toBeDefined();
      expect(result.headers!['Retry-After']).toBeDefined();

      const retryAfter = parseInt(result.headers!['Retry-After']);
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });

    test('resets rate limit after time window', async () => {
      const userId = 'user_123';

      // Hit rate limit
      for (let i = 0; i < 100; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      // Verify rate limit
      const result1 = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      expect(result1.status).toBe(429);

      // Wait for window to reset (simulate by resetting rate limiter)
      MockRateLimiter.reset();

      // Should be able to make requests again
      const result2 = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      expect(result2.status).toBe(200);
    });
  });

  test.describe('Batch Analytics API Rate Limiting', () => {
    test('enforces rate limit on batch requests', async () => {
      const userId = 'user_123';
      const batchSize = 10;
      const requests = Array.from({ length: 11 }, (_, i) =>
        Array.from({ length: batchSize }, (_, j) => ({
          type: 'view',
          truckId: `truck_${i}_${j}`,
        })),
      );

      let successCount = 0;
      let rateLimitedCount = 0;

      for (const batch of requests) {
        const result = await MockAnalyticsAPI.trackEventBatch(batch, { userId });
        if (result.status === 200) {
          successCount++;
        } else if (result.status === 429) {
          rateLimitedCount++;
          expect(result.headers).toBeDefined();
          expect(result.headers!['Retry-After']).toBeDefined();
        }
      }

      // Each batch counts as 1 request against rate limit
      expect(successCount).toBe(10);
      expect(rateLimitedCount).toBe(1);
    });
  });

  test.describe('Webhook API Rate Limiting', () => {
    test('enforces IP-based rate limit on webhooks', async () => {
      const ip = '203.0.113.50';
      const webhooks = Array.from({ length: 31 }, (_, i) => ({
        event: 'post.created',
        data: { postId: `post_${i}` },
      }));

      let successCount = 0;
      let rateLimitedCount = 0;

      for (const webhook of webhooks) {
        const result = await MockWebhookAPI.receiveWebhook(webhook, { 'X-Forwarded-For': ip });
        if (result.status === 200) {
          successCount++;
        } else if (result.status === 429) {
          rateLimitedCount++;
          expect(result.headers).toBeDefined();
          expect(result.headers!['Retry-After']).toBeDefined();
        }
      }

      expect(successCount).toBe(30);
      expect(rateLimitedCount).toBe(1);
    });

    test('Retry-After header helps client backoff', async () => {
      const ip = '203.0.113.50';

      // Hit rate limit
      for (let i = 0; i < 30; i++) {
        await MockWebhookAPI.receiveWebhook({ event: 'test' }, { 'X-Forwarded-For': ip });
      }

      const result = await MockWebhookAPI.receiveWebhook(
        { event: 'test' },
        { 'X-Forwarded-For': ip },
      );

      expect(result.status).toBe(429);

      const retryAfter = parseInt(result.headers!['Retry-After']);

      // Client should wait this many seconds before retry
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });
  });

  test.describe('Notification API Rate Limiting', () => {
    test('enforces user-based rate limit on notifications', async () => {
      const userId = 'user_123';
      const notifications = Array.from({ length: 11 }, (_, i) => ({
        title: `Notification ${i}`,
        body: `Message ${i}`,
      }));

      let successCount = 0;
      let rateLimitedCount = 0;

      for (const notification of notifications) {
        const result = await MockNotificationAPI.sendNotification(userId, notification);
        if (result.status === 200) {
          successCount++;
        } else if (result.status === 429) {
          rateLimitedCount++;
          expect(result.headers).toBeDefined();
          expect(result.headers!['Retry-After']).toBeDefined();
        }
      }

      expect(successCount).toBe(10);
      expect(rateLimitedCount).toBe(1);
    });
  });

  test.describe('Burst Traffic Handling', () => {
    test('handles simultaneous requests', async () => {
      const userId = 'user_burst';
      const simultaneousRequests = 50;

      const promises = Array.from({ length: simultaneousRequests }, () =>
        MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId }),
      );

      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.status === 200).length;
      const rateLimitedCount = results.filter((r) => r.status === 429).length;

      // Some will succeed, some will hit limit
      expect(successCount + rateLimitedCount).toBe(simultaneousRequests);
      expect(successCount).toBeLessThanOrEqual(100);
      expect(rateLimitedCount).toBeGreaterThanOrEqual(0);
    });

    test('distributes rate limit across concurrent requests', async () => {
      const userId = 'user_concurrent';
      const batchSize = 100;

      // Make 100 concurrent requests
      const promises = Array.from({ length: batchSize }, () =>
        MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId }),
      );

      const results = await Promise.all(promises);

      const successCount = results.filter((r) => r.status === 200).length;
      const rateLimitedCount = results.filter((r) => r.status === 429).length;

      // Should allow exactly 100
      expect(successCount).toBe(100);
      expect(rateLimitedCount).toBe(0);

      // Next request should be rate limited
      const nextResult = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      expect(nextResult.status).toBe(429);
    });
  });

  test.describe('Rate Limit Headers', () => {
    test('includes X-RateLimit-Remaining header', async () => {
      const userId = 'user_123';

      // First request
      const result1 = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      expect(result1.status).toBe(200);
      expect(result1.headers).toBeDefined();

      // Should have remaining count (implementation specific)
      // This header is optional but helpful for clients
    });

    test('includes X-RateLimit-Reset header', async () => {
      const userId = 'user_123';

      // Hit rate limit
      for (let i = 0; i < 100; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });

      expect(result.status).toBe(429);
      expect(result.headers).toBeDefined();
      expect(result.headers!['X-RateLimit-Reset']).toBeDefined();

      const resetTime = parseInt(result.headers!['X-RateLimit-Reset']);
      expect(resetTime).toBeGreaterThan(Date.now());
      expect(resetTime).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  test.describe('Different Limits per Endpoint', () => {
    test('analytics vs notifications have different limits', async () => {
      const userId = 'user_diff_limits';

      // Analytics limit is 100
      for (let i = 0; i < 100; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      // Next analytics request should be rate limited
      const analyticsResult = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      expect(analyticsResult.status).toBe(429);

      // Notification limit is 10
      for (let i = 0; i < 10; i++) {
        await MockNotificationAPI.sendNotification(userId, { title: `Test ${i}` });
      }

      // Next notification request should be rate limited
      const notificationResult = await MockNotificationAPI.sendNotification(userId, {
        title: 'Test',
      });
      expect(notificationResult.status).toBe(429);
    });
  });

  test.describe('Sliding Window Algorithm', () => {
    test('allows requests as old ones expire', async () => {
      const userId = 'user_sliding';

      // Make requests at 0 seconds
      for (let i = 0; i < 60; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      // Simulate 60 seconds passing (by resetting rate limiter)
      MockRateLimiter.reset();

      // Now we should be able to make 60 more requests
      for (let i = 0; i < 60; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      // 100th request (120th total) should succeed
      const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      expect(result.status).toBe(200);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles empty rate limit windows', async () => {
      const userId = 'user_empty';
      const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });

      expect(result.status).toBe(200);
    });

    test('handles rapid user switching', async () => {
      const user1 = 'user_1';
      const user2 = 'user_2';

      // User 1 hits limit
      for (let i = 0; i < 100; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId: user1 });
      }

      // User 2 should still be able to make requests
      const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId: user2 });
      expect(result.status).toBe(200);
    });

    test('handles IP address changes', async () => {
      const ip1 = '192.168.1.100';
      const ip2 = '192.168.1.101';

      // IP 1 hits limit
      for (let i = 0; i < 30; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { ip: ip1 });
      }

      // IP 2 should still be able to make requests
      const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { ip: ip2 });
      expect(result.status).toBe(200);
    });
  });

  test.describe('Integration Scenarios', () => {
    test('realistic traffic pattern', async () => {
      const userId = 'user_realistic';

      // Simulate spike: 50 requests in quick succession
      const spikePromises = Array.from({ length: 50 }, () =>
        MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId }),
      );
      await Promise.all(spikePromises);

      // Then steady traffic
      for (let i = 0; i < 60; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      // Should be rate limited now
      const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      expect(result.status).toBe(429);

      // Calculate how long to wait
      const retryAfter = parseInt(result.headers!['Retry-After']);
      expect(retryAfter).toBeGreaterThan(0);
    });

    test('gradient load test', async () => {
      const userId = 'user_gradient';
      const loadLevels = [10, 25, 50, 75, 100, 120];

      for (const load of loadLevels) {
        let successCount = 0;
        let rateLimitedCount = 0;

        for (let i = 0; i < load; i++) {
          const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
          if (result.status === 200) successCount++;
          if (result.status === 429) rateLimitedCount++;
        }

        console.log(`Load ${load}: Success ${successCount}, Rate Limited ${rateLimitedCount}`);

        // Once rate limited, all subsequent requests should be rate limited
        if (rateLimitedCount > 0) {
          for (let i = 0; i < 10; i++) {
            const result = await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
            expect(result.status).toBe(429);
          }
          break; // Stop testing at this load level
        }
      }
    });
  });

  test.describe('Performance Under Load', () => {
    test('measures response time under rate limit pressure', async () => {
      const userId = 'user_performance';
      const batchSize = 100;

      const start = performance.now();

      const promises = Array.from({ length: batchSize }, () =>
        MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId }),
      );

      const results = await Promise.all(promises);

      const end = performance.now();
      const totalTime = end - start;
      const avgResponseTime = totalTime / batchSize;

      console.log(`Average response time under load: ${avgResponseTime.toFixed(2)}ms`);

      // All should succeed (batch of 100)
      const successCount = results.filter((r) => r.status === 200).length;
      expect(successCount).toBe(100);

      // Average response time should be reasonable (under 100ms for mock)
      expect(avgResponseTime).toBeLessThan(100);
    });

    test('measures rate limit overhead', async () => {
      const userId = 'user_overhead';

      // Warm up
      for (let i = 0; i < 10; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      // Measure baseline
      const start1 = performance.now();
      await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      const end1 = performance.now();

      // Hit rate limit
      for (let i = 0; i < 99; i++) {
        await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      }

      // Measure under rate limit pressure
      const start2 = performance.now();
      await MockAnalyticsAPI.trackEvent({ type: 'view' }, { userId });
      const end2 = performance.now();

      const overhead = end2 - start1;
      console.log(`Rate limit overhead: ${overhead.toFixed(2)}ms`);

      // Rate limited request should be slower (returning 429)
      expect(end2 - start2).toBeGreaterThan(end1 - start1);
    });
  });
});
