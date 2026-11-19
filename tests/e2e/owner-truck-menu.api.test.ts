import { test, expect } from '@playwright/test';

const MENU_URL = '/api/owner/trucks/00000000-0000-0000-0000-000000000000/menu';

test('owner menu route rejects reads without a session', async ({ request }) => {
  const response = await request.get(MENU_URL);
  expect(response.status()).toBe(401);
});

test('owner menu route rejects writes without a session', async ({ request }) => {
  const response = await request.put(MENU_URL, { data: { menu: [] } });
  expect(response.status()).toBe(401);
});
