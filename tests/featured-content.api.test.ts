import { test, expect } from '@playwright/test';

test.describe('GET /api/featured-content', () => {
  test('returns 200 with featured + trending content for valid lat/lng/radius', async ({
    request,
  }) => {
    const response = await request.get(
      '/api/featured-content?lat=33.749&lng=-84.388&radius=30',
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('featuredTrucks');
    expect(body).toHaveProperty('trendingItems');
    expect(Array.isArray(body.featuredTrucks)).toBe(true);
    expect(Array.isArray(body.trendingItems)).toBe(true);
  });

  test('returns 200 for global path when lat/lng are missing', async ({ request }) => {
    const response = await request.get('/api/featured-content?radius=30');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('featuredTrucks');
    expect(body).toHaveProperty('trendingItems');
    expect(Array.isArray(body.featuredTrucks)).toBe(true);
    expect(Array.isArray(body.trendingItems)).toBe(true);
  });

  test('caps a radius over the limit instead of rejecting it', async ({ request }) => {
    const response = await request.get(
      '/api/featured-content?lat=33.749&lng=-84.388&radius=301',
    );

    expect(response.status()).toBe(200);
  });

  test('rejects negative radius with 400', async ({ request }) => {
    const response = await request.get(
      '/api/featured-content?lat=33.749&lng=-84.388&radius=-1',
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/positive/i);
  });

  test('rejects non-numeric radius with 400', async ({ request }) => {
    const response = await request.get(
      '/api/featured-content?lat=33.749&lng=-84.388&radius=abc',
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/positive/i);
  });

  test('rejects latitude outside ±90 with 400', async ({ request }) => {
    const response = await request.get(
      '/api/featured-content?lat=95&lng=-84.388&radius=30',
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/coordinates/i);
  });

  test('rejects longitude outside ±180 with 400', async ({ request }) => {
    const response = await request.get(
      '/api/featured-content?lat=33.749&lng=200&radius=30',
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/coordinates/i);
  });

  test('rejects non-numeric lat/lng with 400', async ({ request }) => {
    const response = await request.get(
      '/api/featured-content?lat=abc&lng=def&radius=30',
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/invalid/i);
  });
});
