import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import dotenv from 'dotenv';

/**
 * Webhook claim-lease lifecycle tests.
 *
 * Drives the real webhook route with properly signed synthetic events and
 * verifies the lease semantics against the real database: expired-lease
 * claims are re-claimed (the permanent-strand fix), fresh claims are
 * duplicate-acked, and processing reaches the terminal state.
 *
 * Requires STRIPE_WEBHOOK_SECRET (to sign events) and staging Supabase
 * service credentials; the dev server connects to that database.
 */
dotenv.config({ path: '.env.local', override: true });

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const runLocal = Boolean(webhookSecret && supabaseUrl && serviceKey);

function stripeClient(): Stripe {
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET required');
  return new Stripe(webhookSecret);
}

function signedEvent(event: Stripe.Event): string {
  return stripeClient().webhooks.generateTestHeaderString({
    payload: JSON.stringify(event),
    secret: webhookSecret!,
  });
}

/**
 * An event type the handler does not act on, so a claimed event reaches the
 * terminal 'processed' state through the default branch — isolating the
 * claim/lease machinery from subscription-side effects.
 */
function makeEvent(eventId: string): Stripe.Event {
  return {
    id: eventId,
    object: 'event',
    api_version: '2025-10-29.clover',
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: 'probe_obj' } },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: 'transfer.created',
  } as unknown as Stripe.Event;
}

test.describe('webhook claim lease', () => {
  test.skip(!runLocal, 'Requires STRIPE_WEBHOOK_SECRET and Supabase credentials');

  test('expired-lease processing event is re-claimed and processed, not acknowledged', async ({
    request,
  }) => {
    const supabase = admin();
    const eventId = `evt_lease_test_${Date.now()}`;
    try {
      const expiredLease = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { error } = await supabase.from('stripe_webhook_events').insert({
        id: eventId,
        type: 'transfer.created',
        data: { object: {} },
        status: 'processing',
        lease_expires_at: expiredLease,
      });
      expect(error).toBeNull();

      const response = await request.post('/api/stripe/webhook', {
        data: JSON.stringify(makeEvent(eventId)),
        headers: { 'stripe-signature': signedEvent(makeEvent(eventId)) },
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as { status: string };
      // The lease expired, so the retry must PROCESS, not ack as duplicate.
      expect(body.status).toBe('processed');

      const { data: row } = await supabase
        .from('stripe_webhook_events')
        .select('status, lease_expires_at')
        .eq('id', eventId)
        .single();
      expect(row?.status).toBe('processed');
      expect(row?.lease_expires_at).toBeNull();
    } finally {
      await supabase.from('stripe_webhook_events').delete().eq('id', eventId);
    }
  });

  test('legacy pending row is re-claimed and processed, not acknowledged forever', async ({
    request,
  }) => {
    const supabase = admin();
    const eventId = `evt_lease_pending_${Date.now()}`;
    try {
      // Legacy 'pending' rows have no lease value at all.
      const { error } = await supabase.from('stripe_webhook_events').insert({
        id: eventId,
        type: 'transfer.created',
        data: { object: {} },
        status: 'pending',
        lease_expires_at: null,
      });
      expect(error).toBeNull();

      const response = await request.post('/api/stripe/webhook', {
        data: JSON.stringify(makeEvent(eventId)),
        headers: { 'stripe-signature': signedEvent(makeEvent(eventId)) },
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as { status: string };
      expect(body.status).toBe('processed');

      const { data: row } = await supabase
        .from('stripe_webhook_events')
        .select('status')
        .eq('id', eventId)
        .single();
      expect(row?.status).toBe('processed');
    } finally {
      await supabase.from('stripe_webhook_events').delete().eq('id', eventId);
    }
  });

  test('fresh-lease processing event is acknowledged as duplicate', async ({ request }) => {
    const supabase = admin();
    const eventId = `evt_lease_fresh_${Date.now()}`;
    try {
      const freshLease = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const { error } = await supabase.from('stripe_webhook_events').insert({
        id: eventId,
        type: 'transfer.created',
        data: { object: {} },
        status: 'processing',
        lease_expires_at: freshLease,
      });
      expect(error).toBeNull();

      const response = await request.post('/api/stripe/webhook', {
        data: JSON.stringify(makeEvent(eventId)),
        headers: { 'stripe-signature': signedEvent(makeEvent(eventId)) },
      });

      expect(response.status()).toBe(200);
      const body = (await response.json()) as { status: string };
      expect(body.status).toBe('duplicate');
    } finally {
      await supabase.from('stripe_webhook_events').delete().eq('id', eventId);
    }
  });
});

function admin() {
  if (!supabaseUrl || !serviceKey) throw new Error('Supabase env required');
  if (!supabaseUrl.includes('examplestagingref000')) {
    throw new Error('Claim-lease tests only run against TruckFull staging');
  }
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
