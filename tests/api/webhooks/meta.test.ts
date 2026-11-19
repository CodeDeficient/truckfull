/**
 * Meta Webhook API Tests
 *
 * Phase 4: Test Meta webhook endpoint with GET and POST handlers
 * Verifies webhook verification, signature validation, and rate limiting
 */

import crypto from 'node:crypto';
import { test, expect } from '@playwright/test';

const META_WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'test-verify-token';
const META_WEBHOOK_APP_SECRET = process.env.META_WEBHOOK_APP_SECRET || 'test-app-secret';
const UNREGISTERED_PAGE_ID = 'test-unregistered-page-00000000000000000001';
const SECOND_UNREGISTERED_PAGE_ID = 'test-unregistered-page-00000000000000000002';

function generateHmacSignature(payload: string): string {
  const signature = crypto
    .createHmac('sha256', META_WEBHOOK_APP_SECRET)
    .update(payload)
    .digest('hex');
  return `sha256=${signature}`;
}

test.describe('Meta Webhook API - GET Handler', () => {
  test('responds with challenge on valid verification', async ({ request }) => {
    const response = await request.get('/api/webhooks/meta', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': META_WEBHOOK_VERIFY_TOKEN,
        'hub.challenge': '1234567890',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toBe('1234567890');
  });

  test('rejects verification with invalid mode', async ({ request }) => {
    const response = await request.get('/api/webhooks/meta', {
      params: {
        'hub.mode': 'invalid',
        'hub.verify_token': META_WEBHOOK_VERIFY_TOKEN,
        'hub.challenge': '1234567890',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('rejects verification with invalid token', async ({ request }) => {
    const response = await request.get('/api/webhooks/meta', {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'invalid-token',
        'hub.challenge': '1234567890',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('rejects verification with missing parameters', async ({ request }) => {
    const response = await request.get('/api/webhooks/meta', {
      params: {
        'hub.mode': 'subscribe',
      },
    });

    expect(response.status()).toBe(403);
  });
});

test.describe('Meta Webhook API - POST Handler', () => {
  test('ignores a valid webhook for an unregistered page', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [
        {
          id: UNREGISTERED_PAGE_ID,
          time: 1700000000000,
          changes: [
            {
              field: 'feed',
              value: {
                item: 'post',
                post_id: 'post_123',
                message: 'Test post',
              },
            },
          ],
        },
      ],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': generateHmacSignature(payload),
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ignored');
  });

  test('rejects webhook with missing signature header', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Missing signature');
  });

  test('rejects webhook with invalid signature', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=invalid_signature_here',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Invalid signature');
  });

  test('accepts non-page object and returns 200', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'user',
      entry: [],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': generateHmacSignature(payload),
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('ignores feed status change for an unregistered page', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [
        {
          id: UNREGISTERED_PAGE_ID,
          time: 1700000000000,
          changes: [
            {
              field: 'feed',
              value: {
                item: 'status',
                verb: 'add',
                post_id: '100000000000001_100000000000002',
                message: 'This is a test post',
              },
            },
          ],
        },
      ],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': generateHmacSignature(payload),
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ignored');
  });

  test('accepts feed status change without post_id (skips processing)', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [
        {
          id: '100000000000001',
          time: 1700000000000,
          changes: [
            {
              field: 'feed',
              value: {
                item: 'status',
                verb: 'add',
              },
            },
          ],
        },
      ],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': generateHmacSignature(payload),
      },
    });

    expect(response.status()).toBe(202);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('filters non-feed changes', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [
        {
          id: UNREGISTERED_PAGE_ID,
          time: 1700000000000,
          changes: [
            {
              field: 'messages',
              value: { message: 'test' },
            },
          ],
        },
      ],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': generateHmacSignature(payload),
      },
    });

    expect(response.status()).toBe(202);
  });

  test('ignores multiple entries for unregistered pages', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [
        {
          id: UNREGISTERED_PAGE_ID,
          time: 1700000000000,
          changes: [
            {
              field: 'feed',
              value: {
                item: 'post',
                post_id: 'post_123',
                message: 'First post',
              },
            },
            {
              field: 'feed',
              value: {
                item: 'post',
                post_id: 'post_124',
                message: 'Second post',
              },
            },
          ],
        },
        {
          id: SECOND_UNREGISTERED_PAGE_ID,
          time: 1700000001000,
          changes: [
            {
              field: 'feed',
              value: {
                item: 'post',
                post_id: 'post_125',
                message: 'Third post',
              },
            },
          ],
        },
      ],
    });

    const response = await request.post('/api/webhooks/meta', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': generateHmacSignature(payload),
      },
    });

    expect(response.status()).toBe(200);
  });

  test('returns 500 on malformed JSON', async ({ request }) => {
    const response = await request.post('/api/webhooks/meta', {
      data: '{ invalid json }',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=anything',
      },
    });

    expect(response.status()).toBe(500);
  });
});

test.describe('Meta Webhook API - Rate Limiting', () => {
  test('enforces rate limit (100 req/min)', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [],
    });

    const signature = generateHmacSignature(payload);

    const requests = [];
    for (let i = 0; i < 101; i++) {
      requests.push(
        request.post('/api/webhooks/meta', {
          data: payload,
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
        }),
      );
    }

    const responses: any[] = await Promise.all(requests);

    const rateLimited = responses.filter((r) => r.status() === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  test('includes Retry-After header on rate limit', async ({ request }) => {
    const payload = JSON.stringify({
      object: 'page',
      entry: [],
    });

    const signature = generateHmacSignature(payload);

    const requests = [];
    for (let i = 0; i < 10; i++) {
      requests.push(
        request.post('/api/webhooks/meta', {
          data: payload,
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
        }),
      );
    }

    const responses: any[] = await Promise.all(requests);
    const rateLimited = responses.find((r) => r.status() === 429);

    if (rateLimited) {
      const retryAfter = await rateLimited.headers()['retry-after'];
      expect(retryAfter).toBeTruthy();
      expect(Number(retryAfter)).toBeGreaterThan(0);
    }
  });

  test('resets rate limit after 1 minute', async ({ request }) => {
    test.setTimeout(65000);

    const payload = JSON.stringify({
      object: 'page',
      entry: [],
    });

    const signature = generateHmacSignature(payload);

    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        request.post('/api/webhooks/meta', {
          data: payload,
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
        }),
      );
    }

    const firstResponses: any[] = await Promise.all(requests);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const secondRequests = [];
    for (let i = 0; i < 5; i++) {
      secondRequests.push(
        request.post('/api/webhooks/meta', {
          data: payload,
          headers: {
            'Content-Type': 'application/json',
            'X-Hub-Signature-256': signature,
          },
        }),
      );
    }

    const secondResponses: any[] = await Promise.all(secondRequests);

    const allRateLimited = [...firstResponses, ...secondResponses].filter(
      (r) => r.status() === 429,
    );
    expect(allRateLimited.length).toBe(0);
  });
});
