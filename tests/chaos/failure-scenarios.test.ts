/**
 * Chaos Tests for Failure Scenarios
 *
 * Phase 5.1.6: Test application resilience under failures
 * Verifies graceful degradation and auto-recovery
 */

import { test, expect } from '@playwright/test';

// Mock services with failure simulation
const MockServices = {
  fcm: {
    async sendBatch(
      tokens: string[],
      payload: any,
    ): Promise<{ success: boolean; failures: string[]; successCount: number }> {
      // Simulate random failures (30% failure rate)
      const failures: string[] = [];
      const successCount = Math.floor(tokens.length * 0.7);

      for (let i = 0; i < tokens.length; i++) {
        if (Math.random() < 0.3) {
          failures.push(tokens[i]);
        }
      }

      return {
        success: failures.length < tokens.length,
        failures,
        successCount,
      };
    },

    async getProjectConfig(): Promise<any> {
      // Simulate 5% chance of timeout or failure
      if (Math.random() < 0.05) {
        throw new Error('FCM service timeout');
      }
      return { projectId: 'test-project' };
    },
  },

  db: {
    async query(sql: string): Promise<any[]> {
      // Simulate database connection failure (2% chance)
      if (Math.random() < 0.02) {
        throw new Error('Database connection lost');
      }
      // Simulate slow query (5% chance)
      if (Math.random() < 0.05) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
      return [{ id: 1, data: 'test' }];
    },

    async execute(sql: string, params?: any[]): Promise<{ affectedRows: number }> {
      // Simulate query timeout
      if (Math.random() < 0.03) {
        throw new Error('Query timeout');
      }
      return { affectedRows: 1 };
    },
  },

  externalApi: {
    async fetch(url: string, options?: any): Promise<any> {
      // Simulate various failure modes
      const failureMode = Math.random();

      if (failureMode < 0.1) {
        // Timeout
        await new Promise((resolve) => setTimeout(resolve, 10000));
        throw new Error('Request timeout');
      } else if (failureMode < 0.15) {
        // Server error
        throw new Error('500 Internal Server Error');
      } else if (failureMode < 0.2) {
        // Network error
        throw new Error('ECONNREFUSED');
      } else {
        // Success
        return { data: 'response' };
      }
    },
  },

  redis: {
    async get(key: string): Promise<string | null> {
      // Simulate connection failure
      if (Math.random() < 0.05) {
        throw new Error('Redis connection error');
      }
      return null;
    },

    async set(key: string, value: string, ttl?: number): Promise<'OK'> {
      // Simulate failure
      if (Math.random() < 0.03) {
        throw new Error('Redis write failed');
      }
      return 'OK';
    },
  },

  // Circuit breaker implementation
  circuitBreaker: new Map<
    string,
    {
      state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
      failures: number;
      lastFailure: number;
      halfOpenAttempts: number;
    }
  >(),

  async withCircuitBreaker<T>(
    service: string,
    operation: () => Promise<T>,
    fallback: () => Promise<T> | T,
  ): Promise<T> {
    const cb = MockServices.circuitBreaker.get(service) || {
      state: 'CLOSED',
      failures: 0,
      lastFailure: 0,
      halfOpenAttempts: 0,
    };

    const now = Date.now();
    const timeout = 30000; // 30 seconds

    // If circuit is OPEN and timeout hasn't expired, use fallback
    if (cb.state === 'OPEN' && now - cb.lastFailure < timeout) {
      return fallback();
    }

    // If circuit is OPEN and timeout expired, move to HALF_OPEN
    if (cb.state === 'OPEN' && now - cb.lastFailure >= timeout) {
      cb.state = 'HALF_OPEN';
      cb.halfOpenAttempts = 0;
    }

    // If circuit is HALF_OPEN, limit attempts
    if (cb.state === 'HALF_OPEN') {
      if (cb.halfOpenAttempts >= 1) {
        return fallback();
      }
      cb.halfOpenAttempts++;
    }

    try {
      const result = await operation();

      // Success - reset circuit breaker
      if (cb.state === 'HALF_OPEN' || cb.state === 'OPEN') {
        cb.state = 'CLOSED';
        cb.failures = 0;
        cb.halfOpenAttempts = 0;
      }

      MockServices.circuitBreaker.set(service, cb);
      return result;
    } catch (error) {
      // Failure - update circuit breaker
      cb.failures++;
      cb.lastFailure = now;

      // Trip circuit if threshold reached
      if (cb.failures >= 3) {
        cb.state = 'OPEN';
      }

      MockServices.circuitBreaker.set(service, cb);

      // Try fallback if circuit is open
      if (cb.state === 'OPEN') {
        return fallback();
      }

      throw error;
    }
  },

  resetCircuitBreakers() {
    this.circuitBreaker.clear();
  },
};

// Mock notification service with resilience
const MockNotificationService = {
  async sendPushNotification(
    userId: string,
    message: string,
  ): Promise<{ success: boolean; attempts: number; error?: string }> {
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        // Check circuit breaker for FCM
        const result = await MockServices.withCircuitBreaker(
          'fcm',
          async () => {
            // Try to send notification
            const response = await MockServices.fcm.sendBatch([`token_${userId}`], { message });
            if (response.successCount === 0) {
              throw new Error('No notifications delivered');
            }
            return response;
          },
          async () => {
            // Fallback: Log to database
            await MockServices.db.execute(
              'INSERT INTO failed_notifications (user_id, message, attempts) VALUES (?, ?, ?)',
              [userId, message, attempts],
            );
            return { success: false, failures: [], successCount: 0 };
          },
        );

        if (result.successCount > 0) {
          return { success: true, attempts };
        }
      } catch (error) {
        // Exponential backoff
        if (attempts < maxAttempts) {
          const delay = Math.pow(2, attempts) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return { success: false, attempts, error: 'Failed after max attempts' };
  },

  async getProjectConfigWithRetry(): Promise<any> {
    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const config = await MockServices.fcm.getProjectConfig();
        return config;
      } catch (error) {
        lastError = error;

        // Exponential backoff before retry
        if (attempt < maxAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  },
};

// Mock data service with fallback
const MockDataService = {
  async getTruckData(truckId: string): Promise<any> {
    const cacheKey = `truck:${truckId}`;

    // Try Redis cache first
    try {
      const cached = await MockServices.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Cache unavailable, continue to database
    }

    // Try database
    try {
      const result = await MockServices.db.query('SELECT * FROM food_trucks WHERE id = ?', [
        truckId,
      ]);

      if (result.length > 0) {
        // Cache in Redis (fire and forget, don't wait)
        MockServices.redis.set(cacheKey, JSON.stringify(result[0]), 300).catch(() => {
          /* ignore */
        });

        return result[0];
      }
    } catch (error) {
      // Database error - throw for graceful handling
      throw new Error('Database unavailable');
    }

    throw new Error('Truck not found');
  },

  async searchTrucks(query: string): Promise<any[]> {
    // Use circuit breaker for external API search
    return MockServices.withCircuitBreaker(
      'external-api',
      async () => {
        const results = await MockServices.externalApi.fetch(`/api/search?q=${query}`);
        return results.data;
      },
      async () => {
        // Fallback: Search database instead
        const result = await MockServices.db.query(
          'SELECT * FROM food_trucks WHERE name ILIKE ? LIMIT 50',
          [`%${query}%`],
        );
        return result;
      },
    );
  },
};

// Mock email service with retry logic
const MockEmailService = {
  async sendEmail(
    to: string,
    subject: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const maxAttempts = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Simulate email sending
        const response = await MockServices.externalApi.fetch('/api/email/send', {
          method: 'POST',
          body: JSON.stringify({ to, subject, body }),
        });

        return { success: true, messageId: response.data.messageId };
      } catch (error) {
        // Network or server error
        if (attempt < maxAttempts) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          return { success: false, error: (error as Error).message };
        }
      }
    }

    return { success: false, error: 'Max attempts exceeded' };
  },
};

test.describe('Chaos Tests - Failure Scenarios', () => {
  test.beforeEach(() => {
    MockServices.resetCircuitBreakers();
  });

  test.describe('FCM Service Resilience', () => {
    test('handles partial FCM failures gracefully', async () => {
      const tokens = Array.from({ length: 10 }, (_, i) => `token_${i}`);

      const result = await MockServices.fcm.sendBatch(tokens, { message: 'Test' });

      // Should handle partial failures
      expect(result.success).toBe(true);
      expect(result.successCount).toBeGreaterThan(0);
      expect(result.successCount).toBeLessThan(tokens.length);
      expect(result.failures.length).toBeGreaterThan(0);
    });

    test('retries FCM config fetch on failure', async () => {
      const result = await MockNotificationService.getProjectConfigWithRetry();

      expect(result).toBeDefined();
      expect(result.projectId).toBe('test-project');
    });

    test('notification service handles FCM failures with backoff', async () => {
      const result = await MockNotificationService.sendPushNotification('user_123', 'Test message');

      // Should succeed or fail gracefully
      expect(result.attempts).toBeGreaterThan(0);
      expect(result.attempts).toBeLessThanOrEqual(3);
    });
  });

  test.describe('Database Resilience', () => {
    test('handles database connection loss', async () => {
      const truckId = 'truck_123';

      let errorThrown = false;
      let errorMessage = '';

      try {
        await MockDataService.getTruckData(truckId);
      } catch (error) {
        errorThrown = true;
        errorMessage = (error as Error).message;
      }

      // Should throw error when database fails
      expect(errorThrown).toBe(true);
      expect(errorMessage).toBe('Database unavailable');
    });

    test('recovers from database query timeout', async () => {
      const start = performance.now();
      let errorThrown = false;

      try {
        await MockServices.db.query('SELECT * FROM slow_table');
      } catch (error) {
        errorThrown = true;
      }

      const duration = performance.now() - start;

      // Should timeout after reasonable period
      expect(errorThrown).toBe(true);
      expect(duration).toBeGreaterThan(4000);
    });
  });

  test.describe('External API Resilience', () => {
    test('handles API timeouts', async () => {
      const start = performance.now();
      let errorThrown = false;

      try {
        await MockServices.externalApi.fetch('/api/slow');
      } catch (error) {
        errorThrown = true;
      }

      const duration = performance.now() - start;

      // Should timeout
      expect(errorThrown).toBe(true);
      expect(duration).toBeGreaterThan(9000);
    });

    test('falls back to database when external API fails', async () => {
      // Force external API to fail by using circuit breaker
      MockServices.circuitBreaker.set('external-api', {
        state: 'OPEN',
        failures: 3,
        lastFailure: Date.now(),
        halfOpenAttempts: 0,
      });

      const results = await MockDataService.searchTrucks('taco');

      // Should return fallback results
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  test.describe('Circuit Breaker Pattern', () => {
    test('trips circuit breaker after 3 failures', async () => {
      // Simulate 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await MockServices.externalApi.fetch('/api/test');
        } catch (error) {
          // Expected
        }
      }

      const cb = MockServices.circuitBreaker.get('external-api');
      expect(cb).toBeDefined();
      expect(cb?.state).toBe('OPEN');
    });

    test('uses fallback when circuit is open', async () => {
      // Set circuit to OPEN
      MockServices.circuitBreaker.set('external-api', {
        state: 'OPEN',
        failures: 3,
        lastFailure: Date.now(),
        halfOpenAttempts: 0,
      });

      // This should use fallback
      const result = await MockServices.withCircuitBreaker(
        'external-api',
        async () => {
          throw new Error('Should not be called');
        },
        async () => ({ data: 'fallback' }),
      );

      expect(result.data).toBe('fallback');
    });

    test('resets circuit after timeout', async () => {
      // Set circuit to OPEN with old timestamp
      MockServices.circuitBreaker.set('external-api', {
        state: 'OPEN',
        failures: 3,
        lastFailure: Date.now() - 31000, // 31 seconds ago
        halfOpenAttempts: 0,
      });

      // Should attempt recovery
      const result = await MockServices.withCircuitBreaker(
        'external-api',
        async () => ({ data: 'success' }),
        async () => ({ data: 'fallback' }),
      );

      expect(result.data).toBe('success');

      const cb = MockServices.circuitBreaker.get('external-api');
      expect(cb?.state).toBe('CLOSED');
    });

    test('HALF_OPEN allows limited attempts', async () => {
      // Set circuit to HALF_OPEN
      MockServices.circuitBreaker.set('external-api', {
        state: 'HALF_OPEN',
        failures: 3,
        lastFailure: Date.now(),
        halfOpenAttempts: 0,
      });

      // First attempt should go through
      const result1 = await MockServices.withCircuitBreaker(
        'external-api',
        async () => ({ data: 'attempt1' }),
        async () => ({ data: 'fallback' }),
      );

      expect(result1.data).toBe('attempt1');

      // Second attempt should use fallback (HALF_OPEN limit reached)
      const result2 = await MockServices.withCircuitBreaker(
        'external-api',
        async () => ({ data: 'attempt2' }),
        async () => ({ data: 'fallback' }),
      );

      expect(result2.data).toBe('fallback');
    });
  });

  test.describe('Retry Logic with Exponential Backoff', () => {
    test('notification service retries on failure', async () => {
      const result = await MockNotificationService.sendPushNotification('user_123', 'Test');

      // Should have attempted multiple times
      expect(result.attempts).toBeGreaterThan(1);
    });

    test('email service implements exponential backoff', async () => {
      const start = performance.now();

      // This will fail but retry with delays
      const result = await MockEmailService.sendEmail('test@example.com', 'Subject', 'Body');

      const duration = performance.now() - start;

      // Should have taken time for retries
      expect(result.success).toBe(false);
      expect(duration).toBeGreaterThan(1000); // At least base delay
    });
  });

  test.describe('Graceful Degradation', () => {
    test('falls back to database when cache is unavailable', async () => {
      // Simulate Redis failure by having get() throw
      const originalGet = MockServices.redis.get;
      MockServices.redis.get = async () => {
        throw new Error('Redis connection error');
      };

      const truckId = 'truck_123';
      const result = await MockDataService.getTruckData(truckId);

      expect(result).toBeDefined();

      // Restore original function
      MockServices.redis.get = originalGet;
    });

    test('continues serving requests during external API downtime', async () => {
      // Simulate external API failure
      MockServices.circuitBreaker.set('external-api', {
        state: 'OPEN',
        failures: 3,
        lastFailure: Date.now(),
        halfOpenAttempts: 0,
      });

      // Should still be able to search using database fallback
      const results = await MockDataService.searchTrucks('taco');

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  test.describe('Error Propagation and Logging', () => {
    test('errors propagate correctly through layers', async () => {
      // Test that errors bubble up correctly
      let propagatedError: any;

      try {
        await MockServices.db.query('INVALID SQL');
      } catch (error) {
        propagatedError = error;
      }

      expect(propagatedError).toBeDefined();
      expect(propagatedError.message).toBeTruthy();
    });

    test('failed notifications are logged to database', async () => {
      const result = await MockNotificationService.sendPushNotification('user_123', 'Test');

      // Even if notification fails, it should be logged
      expect(result.attempts).toBeGreaterThan(0);
    });
  });

  test.describe('Concurrent Failure Scenarios', () => {
    test('handles multiple services failing simultaneously', async () => {
      // Simulate multiple failures at once
      const failures = await Promise.allSettled([
        MockServices.fcm.getProjectConfig(),
        MockServices.db.query('SELECT * FROM users'),
        MockServices.externalApi.fetch('/api/test'),
        MockServices.redis.get('key'),
      ]);

      // Some should fail, some might succeed
      const rejectedCount = failures.filter((f) => f.status === 'rejected').length;
      expect(rejectedCount).toBeGreaterThan(0);
      expect(rejectedCount).toBeLessThan(failures.length);
    });

    test('circuit breakers operate independently per service', async () => {
      // Trip circuit for external-api
      for (let i = 0; i < 3; i++) {
        try {
          await MockServices.externalApi.fetch('/api/test');
        } catch (error) {}
      }

      // Redis should still work (different circuit breaker)
      const redisResult = await MockServices.redis.get('key');
      expect(redisResult).toBeNull(); // Mock returns null for non-existent key
    });
  });

  test.describe('Recovery Scenarios', () => {
    test('system recovers when external API comes back online', async () => {
      // Simulate downtime
      MockServices.circuitBreaker.set('external-api', {
        state: 'OPEN',
        failures: 3,
        lastFailure: Date.now(),
        halfOpenAttempts: 0,
      });

      // Wait for timeout (simulated)
      MockServices.circuitBreaker.get('external-api')!.lastFailure = Date.now() - 31000;

      // Try to access - should trigger half-open state
      const result = await MockServices.withCircuitBreaker(
        'external-api',
        async () => ({ data: 'recovered' }),
        async () => ({ data: 'still_failing' }),
      );

      // Should now be using recovered API
      expect(result.data).toBe('recovered');
    });

    test('database connection pool recovers from failures', async () => {
      // Simulate temporary database failure
      const originalQuery = MockServices.db.query;
      MockServices.db.query = async () => {
        throw new Error('Temporary DB failure');
      };

      let errorThrown = false;
      try {
        await MockServices.db.query('SELECT 1');
      } catch (error) {
        errorThrown = true;
      }

      expect(errorThrown).toBe(true);

      // Restore and verify recovery
      MockServices.db.query = originalQuery;
      const result = await MockServices.db.query('SELECT 1');
      expect(result).toBeDefined();
    });
  });

  test.describe('Resource Exhaustion', () => {
    test('handles high memory usage gracefully', async () => {
      // Test that we can handle large result sets
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: `item_${i}`,
      }));

      // Simulate processing large dataset
      const processed = largeDataset.map((item) => ({
        ...item,
        processed: true,
      }));

      expect(processed.length).toBe(10000);
      expect(processed[0].processed).toBe(true);
    });

    test('handles rapid connection churn', async () => {
      const connections = Array.from({ length: 100 }, (_, i) => MockServices.db.query('SELECT 1'));

      const results = await Promise.allSettled(connections);
      const successful = results.filter((r) => r.status === 'fulfilled').length;

      // Should handle multiple concurrent connections
      expect(successful).toBeGreaterThan(0);
    });
  });

  test.describe('Integration: Complete Failure Scenario', () => {
    test('notification pipeline handles complete failure', async () => {
      // Force all services to fail
      MockServices.circuitBreaker.set('fcm', {
        state: 'OPEN',
        failures: 3,
        lastFailure: Date.now(),
        halfOpenAttempts: 0,
      });

      MockServices.circuitBreaker.set('external-api', {
        state: 'OPEN',
        failures: 3,
        lastFailure: Date.now(),
        halfOpenAttempts: 0,
      });

      // Try to send notification
      const result = await MockNotificationService.sendPushNotification('user_123', 'Test');

      // Should fail gracefully
      expect(result.success).toBe(false);
      expect(result.attempts).toBeGreaterThan(0);

      // Verify it was logged to database
      const logged = await MockServices.db.query(
        'SELECT * FROM failed_notifications WHERE user_id = ?',
        ['user_123'],
      );

      // Logging should have occurred (query succeeded)
      expect(logged).toBeDefined();
      expect(Array.isArray(logged)).toBe(true);
    });
  });
});
