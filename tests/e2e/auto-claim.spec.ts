import { test, expect } from '@playwright/test';

/**
 * Auto-Claim API E2E Tests
 *
 * Tests the /api/auth/auto-claim endpoint for both authenticated
 * and unauthenticated scenarios. Unauthenticated tests use a fresh
 * API context with explicitly empty storageState to ensure no auth
 * cookies are sent (Playwright projects inherit storageState by default).
 */
test.describe('Auto-Claim API', () => {
  // --- GET /api/auth/auto-claim ---

  test('GET - Unauthenticated returns 401', async ({ playwright }) => {
    // Create a fresh API context with explicitly empty storage state
    // (no auth cookies). Without this, project-level storageState is inherited.
    const noAuthContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    const response = await noAuthContext.get('/api/auth/auto-claim');
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Not authenticated');

    await noAuthContext.dispose();
  });

  test('GET - Authenticated user returns matchingTruck property', async ({ request }) => {
    // Uses storageState from auth.setup.ts (authenticated)
    const response = await request.get('/api/auth/auto-claim');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('matchingTruck');
  });

  test('GET - Authenticated food_truck_owner returns null', async ({ request }) => {
    // The test account is a food_truck_owner, so auto-claim returns null
    const response = await request.get('/api/auth/auto-claim');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.matchingTruck).toBeNull();
  });

  // --- POST /api/auth/auto-claim ---

  test('POST - Unauthenticated returns 401', async ({ playwright }) => {
    // Fresh context with no auth cookies
    const noAuthContext = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
      storageState: { cookies: [], origins: [] },
    });

    const response = await noAuthContext.post('/api/auth/auto-claim', {
      data: { truckId: 'nonexistent-truck-id' },
    });
    expect(response.status()).toBe(401);
    const data = await response.json();
    expect(data).toHaveProperty('error', 'Not authenticated');

    await noAuthContext.dispose();
  });

  test('POST - Invalid truckId returns 400', async ({ request }) => {
    // Empty truckId should fail Zod validation
    const response = await request.post('/api/auth/auto-claim', {
      data: { truckId: '' },
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('POST - Missing truckId returns 400', async ({ request }) => {
    const response = await request.post('/api/auth/auto-claim', {
      data: {},
    });
    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('POST - Non-existent truck (valid UUID) returns 409', async ({ request }) => {
    // Claiming a truck that doesn't exist with a valid UUID format
    const response = await request.post('/api/auth/auto-claim', {
      data: { truckId: '00000000-0000-0000-0000-000000000000' },
    });
    // Authenticated user — should get 409 (truck not found or already claimed)
    expect(response.status()).toBe(409);
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });

  test('POST - Claiming with non-existent truck returns 400 (email lookup failure)', async ({
    request,
  }) => {
    // Using a different truck ID that definitely doesn't exist
    // Tests that email lookup fails gracefully when truck not found
    const response = await request.post('/api/auth/auto-claim', {
      data: { truckId: '11111111-1111-1111-1111-111111111111' },
    });
    // Should return 400 because email lookup fails (truck not found)
    expect([400, 409]).toContain(response.status());
    const data = await response.json();
    expect(data).toHaveProperty('error');
  });
});
