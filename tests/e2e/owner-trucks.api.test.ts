import { test, expect } from '@playwright/test';

test('owner trucks route rejects requests without a session', async ({ request }) => {
  const response = await request.get('/api/owner/trucks');
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: 'Not authenticated' });
});
