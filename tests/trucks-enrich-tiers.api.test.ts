import { test, expect } from '@playwright/test';

test.describe('POST /api/trucks/enrich-tiers', () => {
  test('returns empty tiers map for empty ownerIds', async ({ request }) => {
    const response = await request.post('/api/trucks/enrich-tiers', {
      data: { ownerIds: [] },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ tiers: {} });
  });

  test('returns tier map for valid ownerIds', async ({ request }) => {
    // Synthetic v4-shaped UUIDs; unknown owners resolve to null in the response map
    const ownerIds = [
      '00000000-0000-4000-8000-000000000001',
      '00000000-0000-4000-8000-000000000002',
    ];

    const response = await request.post('/api/trucks/enrich-tiers', {
      data: { ownerIds },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('tiers');
    expect(typeof body.tiers).toBe('object');
    expect(body.tiers).toHaveProperty(ownerIds[0]);
    expect(body.tiers).toHaveProperty(ownerIds[1]);
  });

  test('rejects invalid JSON with 400', async ({ request }) => {
    const response = await request.post('/api/trucks/enrich-tiers', {
      headers: { 'Content-Type': 'application/json' },
      data: 'not-json',
    });

    expect(response.status()).toBe(400);
  });

  test('rejects missing ownerIds with 400', async ({ request }) => {
    const response = await request.post('/api/trucks/enrich-tiers', {
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/ownerIds/);
  });

  test('rejects non-array ownerIds with 400', async ({ request }) => {
    const response = await request.post('/api/trucks/enrich-tiers', {
      data: { ownerIds: 'not-an-array' },
    });

    expect(response.status()).toBe(400);
  });

  test('rejects ownerIds over the 500 batch limit with 400', async ({ request }) => {
    const ownerIds = Array.from({ length: 501 }, () => crypto.randomUUID());

    const response = await request.post('/api/trucks/enrich-tiers', {
      data: { ownerIds },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/500/);
  });

  test('rejects non-UUID ownerId entries with 400', async ({ request }) => {
    const response = await request.post('/api/trucks/enrich-tiers', {
      data: { ownerIds: ['not-a-uuid'] },
    });

    expect(response.status()).toBe(400);
  });
});
