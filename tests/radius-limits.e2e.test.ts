import { test, expect, type APIRequestContext } from '@playwright/test';
import { createOwnerUser, deleteOwnerUser, signInAs } from './helpers/signedInOwner';

const RUN_ID = Date.now();
const EMAIL = `radius-limits-${RUN_ID}@example.com`;
const PASSWORD = 'RadiusLimits123!';
const COLUMBIA = { lat: 34.0007, lng: -81.0348 };

async function nearbyRadius(request: APIRequestContext, radiusMiles?: number): Promise<number> {
  const response = await request.post('/api/trucks/nearby', {
    data: { ...COLUMBIA, radiusMiles },
  });
  expect(response.status()).toBe(200);
  return ((await response.json()) as { radiusMiles: number }).radiusMiles;
}

async function trucksQueryRadius(request: APIRequestContext, radius: number): Promise<number> {
  const response = await request.get(
    `/api/trucks?lat=${COLUMBIA.lat}&lng=${COLUMBIA.lng}&radius=${radius}`,
  );
  expect(response.status()).toBe(200);
  return ((await response.json()) as { query: { radiusMiles: number } }).query.radiusMiles;
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('anonymous radius limits', () => {
  test('nearby defaults to 25 miles', async ({ request }) => {
    expect(await nearbyRadius(request)).toBe(25);
  });

  test('nearby caps anonymous requests at 50 miles', async ({ request }) => {
    expect(await nearbyRadius(request, 300)).toBe(50);
  });

  test('truck lookup by location caps anonymous requests at 50 miles', async ({ request }) => {
    expect(await trucksQueryRadius(request, 300)).toBe(50);
  });

  test('truck lookup by location rejects a non-numeric radius', async ({ request }) => {
    const response = await request.get(
      `/api/trucks?lat=${COLUMBIA.lat}&lng=${COLUMBIA.lng}&radius=abc`,
    );
    expect(response.status()).toBe(400);
  });

  test('featured content accepts an over-limit radius by capping it', async ({ request }) => {
    const response = await request.get(
      `/api/featured-content?lat=${COLUMBIA.lat}&lng=${COLUMBIA.lng}&radius=300`,
    );
    expect(response.status()).toBe(200);
  });

  test('search is no longer public', async ({ request }) => {
    const response = await request.get('/api/search?q=taco');
    expect(response.status()).toBe(404);
  });
});

test.describe.serial('signed-in radius limits', () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await createOwnerUser(EMAIL, PASSWORD);
  });

  test.afterAll(async () => {
    if (userId) await deleteOwnerUser(userId);
  });

  test('nearby allows signed-in users up to 150 miles', async ({ page }) => {
    await signInAs(page, EMAIL, PASSWORD);
    expect(await nearbyRadius(page.request, 100)).toBe(100);
    expect(await nearbyRadius(page.request, 300)).toBe(150);
  });

  test('truck lookup by location caps signed-in requests at 150 miles', async ({ page }) => {
    await signInAs(page, EMAIL, PASSWORD);
    expect(await trucksQueryRadius(page.request, 300)).toBe(150);
  });
});
