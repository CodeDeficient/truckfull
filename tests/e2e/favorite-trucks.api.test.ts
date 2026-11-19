import { test, expect } from '@playwright/test';

test('favorite trucks route rejects requests without a session', async ({ request }) => {
  const response = await request.get('/api/favorites/trucks');
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: 'Not authenticated' });
});
