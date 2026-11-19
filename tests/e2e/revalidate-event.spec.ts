import { test, expect } from '@playwright/test';

const cronSecret = process.env.CRON_SECRET!;
const edgeSecret = process.env.TRUCKFULL_EDGE_SECRET!;

const VALID_TARGET = {
  citySlug: 'augusta-ga',
  eventSlug: 'food-fest-2026-05-01',
  city: 'Augusta',
  state: 'GA',
  eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
};

test.describe('Event revalidation endpoint', () => {
  test.skip(
    !cronSecret || !edgeSecret,
    'requires CRON_SECRET and TRUCKFULL_EDGE_SECRET env vars',
  );

  test('rejects a request missing the edge credential', async ({ request }) => {
    const response = await request.post('/api/revalidate/event', {
      headers: { authorization: `Bearer ${cronSecret}` },
      data: { events: [VALID_TARGET] },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects a request with a wrong edge credential', async ({ request }) => {
    const response = await request.post('/api/revalidate/event', {
      headers: {
        authorization: `Bearer ${cronSecret}`,
        'x-truckfull-internal': 'wrong-edge-secret',
      },
      data: { events: [VALID_TARGET] },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects a request with a wrong cron secret even with a valid edge credential', async ({
    request,
  }) => {
    const response = await request.post('/api/revalidate/event', {
      headers: {
        authorization: 'Bearer wrong-cron-secret',
        'x-truckfull-internal': edgeSecret,
      },
      data: { events: [VALID_TARGET] },
    });
    expect(response.status()).toBe(401);
  });

  test('rejects an out-of-footprint state target', async ({ request }) => {
    const response = await request.post('/api/revalidate/event', {
      headers: {
        authorization: `Bearer ${cronSecret}`,
        'x-truckfull-internal': edgeSecret,
      },
      data: { events: [{ ...VALID_TARGET, state: 'TX', citySlug: 'dallas-tx' }] },
    });
    expect(response.status()).toBe(400);
  });

  test('rejects an empty events payload', async ({ request }) => {
    const response = await request.post('/api/revalidate/event', {
      headers: {
        authorization: `Bearer ${cronSecret}`,
        'x-truckfull-internal': edgeSecret,
      },
      data: { events: [] },
    });
    expect(response.status()).toBe(400);
  });

  test('accepts a valid credential and target', async ({ request }) => {
    const response = await request.post('/api/revalidate/event', {
      headers: {
        authorization: `Bearer ${cronSecret}`,
        'x-truckfull-internal': edgeSecret,
      },
      data: { events: [VALID_TARGET] },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ invalidated: 1 });
  });
});
