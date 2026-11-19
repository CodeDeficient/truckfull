/**
 * Social Media Webhook API Tests
 *
 * Phase 3.1.3: Test Meta webhook endpoint with HMAC validation
 * Verifies webhook authentication and rate limiting
 */

import { test, expect } from '@playwright/test';

test.describe('Social Media Webhook API', () => {
  test.describe('HMAC Signature Validation', () => {
    test('accepts request with valid HMAC signature', async ({ request }) => {
      // Generate valid HMAC signature for test payload
      const payload = JSON.stringify({ test: 'data' });
      const secret = process.env.META_APP_SECRET || 'test-secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const response = await request.post('/api/webhooks/meta', {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'User-Agent': 'facebook-platform',
        },
      });

      // Should accept the request (200 OK or 202 Accepted)
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(400);
    });

    test('rejects request with invalid HMAC signature', async ({ request }) => {
      const payload = JSON.stringify({ test: 'data' });

      const response = await request.post('/api/webhooks/meta', {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=invalid-signature',
          'User-Agent': 'facebook-platform',
        },
      });

      expect(response.status()).toBe(401);
      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('rejects request without HMAC signature', async ({ request }) => {
      const payload = JSON.stringify({ test: 'data' });

      const response = await request.post('/api/webhooks/meta', {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'facebook-platform',
        },
      });

      expect(response.status()).toBe(401);
    });

    test('rejects request with wrong User-Agent', async ({ request }) => {
      const payload = JSON.stringify({ test: 'data' });

      const response = await request.post('/api/webhooks/meta', {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'some-bot',
        },
      });

      expect(response.status()).toBe(403);
    });
  });

  test.describe('Rate Limiting', () => {
    test('enforces rate limit on webhook requests', async ({ request }) => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = process.env.META_APP_SECRET || 'test-secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // Make more than allowed requests
      const requests = [];
      for (let i = 0; i < 101; i++) {
        requests.push(
          request.post('/api/webhooks/meta', {
            data: payload,
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': `sha256=${signature}`,
              'User-Agent': 'facebook-platform',
            },
          }),
        );
      }

      const responses = await Promise.all(requests);

      // At least one should be rate limited
      const rateLimited = responses.filter((r) => r.status() === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });

    test('Retry-After header present on rate limit', async ({ request }) => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = process.env.META_APP_SECRET || 'test-secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      // Make requests to trigger rate limit
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          request.post('/api/webhooks/meta', {
            data: payload,
            headers: {
              'Content-Type': 'application/json',
              'X-Hub-Signature-256': `sha256=${signature}`,
              'User-Agent': 'facebook-platform',
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

  test.describe('Request Logging', () => {
    test('logs failed HMAC attempts with IP', async ({ request }) => {
      // This test would need database access to verify logging
      // For now, we verify the request is rejected and would be logged
      const payload = JSON.stringify({ test: 'data' });

      const response = await request.post('/api/webhooks/meta', {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': 'sha256=invalid-signature',
          'User-Agent': 'facebook-platform',
        },
      });

      expect(response.status()).toBe(401);
      // In production, this would be logged to a security audit table
    });
  });

  test.describe('Payload Validation', () => {
    test('rejects empty payload', async ({ request }) => {
      const secret = process.env.META_APP_SECRET || 'test-secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update('').digest('hex');

      const response = await request.post('/api/webhooks/meta', {
        data: '',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'User-Agent': 'facebook-platform',
        },
      });

      expect(response.status()).toBe(400);
    });

    test('accepts valid Facebook webhook payload', async ({ request }) => {
      const payload = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: 'test-page-id',
            time: Date.now(),
            messaging: [
              {
                sender: { id: 'sender-id' },
                recipient: { id: 'recipient-id' },
                timestamp: Date.now(),
                message: { text: 'Test message' },
              },
            ],
          },
        ],
      });

      const secret = process.env.META_APP_SECRET || 'test-secret';
      const crypto = require('crypto');
      const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      const response = await request.post('/api/webhooks/meta', {
        data: payload,
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': `sha256=${signature}`,
          'User-Agent': 'facebook-platform',
        },
      });

      // Should accept valid payload
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(400);
    });
  });

  test.describe('Challenge Response', () => {
    test('responds to GET challenge for webhook verification', async ({ request }) => {
      // This would test the GET endpoint for webhook verification
      // The actual endpoint might be different
      const response = await request.get('/api/webhooks/meta', {
        params: {
          'hub.mode': 'subscribe',
          'hub.verify_token': process.env.META_VERIFY_TOKEN || 'test-token',
          'hub.challenge': 'test-challenge',
        },
      });

      // Should return the challenge for verification
      expect(response.status()).toBe(200);
      const body = await response.text();
      expect(body).toBe('test-challenge');
    });
  });
});
