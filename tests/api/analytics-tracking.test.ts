/**
 * Analytics Tracking API Tests
 *
 * Phase 2.2.1: Test analytics event tracking API
 * Verifies that analytics events are properly logged and rate limited
 */

import { test, expect } from '@playwright/test';
import { DatabaseTestUtils } from '../utils/testUtils';
import { getSupabase } from '../../lib/supabase/client';

test.describe('Analytics Tracking API', () => {
  test.describe('Event Logging', () => {
    test('logs view event successfully', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'view',
          truck_id: 'test-truck-123',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.eventId).toBeTruthy();
    });

    test('logs click event successfully', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'click',
          truck_id: 'test-truck-123',
          button_type: 'directions',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.eventId).toBeTruthy();
    });

    test('logs favorite event successfully', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'favorite',
          truck_id: 'test-truck-123',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.eventId).toBeTruthy();
    });

    test('rejects invalid event type', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'invalid_event_type',
          truck_id: 'test-truck-123',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeTruthy();
    });

    test('rejects missing truck_id', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'view',
        },
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeTruthy();
    });
  });

  test.describe('Rate Limiting', () => {
    test('enforces rate limit on authenticated users', async ({ request }) => {
      // Make more than 100 requests in a short time
      const requests = [];
      for (let i = 0; i < 101; i++) {
        requests.push(
          request.post('/api/analytics/track', {
            data: {
              event_type: 'view',
              truck_id: 'test-truck-123',
            },
          }),
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.filter((r) => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);

      // Check Retry-After header
      if (rateLimited.length > 0) {
        const retryAfter = await rateLimited[0].headers()['retry-after'];
        expect(retryAfter).toBeTruthy();
      }
    });

    test('enforces rate limit on anonymous requests', async ({ request }) => {
      // Anonymous requests (no auth) should also be rate limited
      const requests = [];
      for (let i = 0; i < 31; i++) {
        requests.push(
          request.post('/api/analytics/track', {
            data: {
              event_type: 'view',
              truck_id: 'test-truck-123',
            },
          }),
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.filter((r) => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('Retry-After header is present on rate limit', async ({ request }) => {
      // Make multiple requests to trigger rate limit
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request.post('/api/analytics/track', {
            data: {
              event_type: 'view',
              truck_id: 'test-truck-123',
            },
          }),
        );
      }

      const responses = await Promise.all(requests);
      const rateLimited = responses.find((r) => r.status() === 429);

      if (rateLimited) {
        const retryAfter = await rateLimited.headers()['retry-after'];
        expect(retryAfter).toBeTruthy();
        expect(Number(retryAfter)).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Data Persistence', () => {
    test('events are stored in database', async ({ request }) => {
      const truckId = 'test-truck-' + Date.now();

      // Log an event
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'view',
          truck_id: truckId,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      const eventId = body.eventId;

      // Query database to verify event was stored
      const supabase = getSupabase();
      if (!supabase) {
        test.skip(true, 'Supabase client not available');
        return;
      }

      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('truck_id', truckId)
        .eq('event_type', 'view')
        .order('created_at', { ascending: false })
        .limit(1);

      expect(error).toBeFalsy();
      expect(events).toBeTruthy();
      expect(events!.length).toBeGreaterThan(0);
      expect(events![0].truck_id).toBe(truckId);
      expect(events![0].event_type).toBe('view');
    });

    test('multiple events for same truck are tracked separately', async ({ request }) => {
      const truckId = 'test-truck-' + Date.now();

      // Log multiple events
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          request.post('/api/analytics/track', {
            data: {
              event_type: 'view',
              truck_id: truckId,
            },
          }),
        );
      }

      const responses = await Promise.all(promises);

      // All should succeed
      for (const response of responses) {
        expect(response.status()).toBe(200);
      }

      // Query database to verify all events were stored
      const supabase = getSupabase();
      if (!supabase) {
        test.skip(true, 'Supabase client not available');
        return;
      }

      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('truck_id', truckId)
        .eq('event_type', 'view');

      expect(error).toBeFalsy();
      expect(events).toBeTruthy();
      expect(events!.length).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('Data Validation', () => {
    test('rejects missing event_type', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          truck_id: 'test-truck-123',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('rejects empty truck_id', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'view',
          truck_id: '',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('rejects null truck_id', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'view',
          truck_id: null,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('accepts optional button_type for click events', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'click',
          truck_id: 'test-truck-123',
          button_type: 'directions',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });

    test('accepts optional event_data JSON', async ({ request }) => {
      const response = await request.post('/api/analytics/track', {
        data: {
          event_type: 'view',
          truck_id: 'test-truck-123',
          event_data: {
            source: 'map',
            zoom_level: 12,
            screen_size: 'desktop',
          },
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });
});
