import { test, expect } from '@playwright/test';

test('health answers from the app without caching', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(await response.json()).toEqual({ ok: true });
});

test('health is not rate limited by the API limiter', async ({ request }) => {
  const statuses: number[] = [];
  for (let i = 0; i < 110; i += 1) statuses.push((await request.get('/api/health')).status());
  expect(statuses.filter((status) => status !== 200)).toEqual([]);
});
