/**
 * Stripe Webhook API E2E Tests
 *
 * Tests for Stripe webhook endpoint.
 * Verifies signature validation and event handling.
 */

import { test, expect } from '@playwright/test';

test.describe('Stripe Webhook API', () => {
  test('returns 400 without stripe-signature header', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: JSON.stringify({ type: 'test' }),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing stripe-signature header');
  });

  test('returns 400 with invalid stripe-signature', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: JSON.stringify({ type: 'test', id: 'evt_test' }),
      headers: {
        'stripe-signature': 'invalid-signature',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Webhook signature verification failed');
  });

  test('returns 400 for malformed body', async ({ request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: 'not-valid-json',
      headers: {
        'stripe-signature': 't=123,v1=abc',
      },
    });

    expect(response.status()).toBe(400);
  });
});
