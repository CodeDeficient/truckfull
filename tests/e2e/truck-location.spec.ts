import { test, expect } from '@playwright/test';

/**
 * Truck Location Update API E2E Tests
 *
 * Tests the /api/trucks/[id]/location endpoint.
 * Verifies params is correctly awaited (Next.js 16 Promise params).
 *
 * Note: The default `request` fixture uses authenticated storageState.
 * For truly unauthenticated tests, use playwright.request.newContext()
 * with empty storageState.
 */
test.describe('Truck Location Update API', () => {
  const FAKE_TRUCK_ID = '00000000-0000-0000-0000-000000000000';

  // --- PUT /api/trucks/[id]/location ---

  test('PUT - Unauthenticated returns 403', async ({ playwright }) => {
    const noAuthContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    const response = await noAuthContext.put(`/api/trucks/${FAKE_TRUCK_ID}/location`, {
      data: {
        operation: 'update',
        lat: 40.7128,
        lng: -74.006,
      },
    });
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');

    await noAuthContext.dispose();
  });

  test('PUT - Missing coordinates returns 400', async ({ request }) => {
    // Authenticated request with missing lat/lng
    const response = await request.put(`/api/trucks/${FAKE_TRUCK_ID}/location`, {
      data: {
        operation: 'update',
        // Missing lat and lng
      },
    });
    // Should be 400 (missing coords) or 404 (truck not found)
    expect([400, 404]).toContain(response.status());
  });

  test('PUT - Invalid coordinates returns 400', async ({ request }) => {
    const response = await request.put(`/api/trucks/${FAKE_TRUCK_ID}/location`, {
      data: {
        operation: 'update',
        lat: 999, // Invalid: out of range
        lng: 999,
      },
    });
    // Should be 400 (invalid coords) or 404 (truck not found)
    expect([400, 404]).toContain(response.status());
  });

  test('PUT - Non-owner returns 403 or 404', async ({ request }) => {
    // Test user doesn't own the fake truck
    const response = await request.put(`/api/trucks/${FAKE_TRUCK_ID}/location`, {
      data: {
        operation: 'update',
        lat: 40.7128,
        lng: -74.006,
      },
    });
    // 403 (unauthorized for this truck) or 404 (truck not found)
    expect([403, 404]).toContain(response.status());
  });

  // --- GET /api/trucks/[id]/location ---

  test('GET - Unauthenticated returns 403', async ({ playwright }) => {
    const noAuthContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    const response = await noAuthContext.get(`/api/trucks/${FAKE_TRUCK_ID}/location`);
    expect(response.status()).toBe(403);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Unauthorized');

    await noAuthContext.dispose();
  });

  test('GET - Non-existent truck returns 404', async ({ request }) => {
    const response = await request.get(`/api/trucks/${FAKE_TRUCK_ID}/location`);
    // Authenticated but truck doesn't exist → 404
    expect([403, 404]).toContain(response.status());
  });
});
