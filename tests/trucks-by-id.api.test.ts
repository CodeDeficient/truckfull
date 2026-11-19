import { test, expect, type APIRequestContext } from '@playwright/test';

const PRIVATE_KEYS = [
  'owner_id',
  'user_id',
  'claimed_by',
  'claim_verification_method',
  'claimed_at',
  'menu_updated_by',
  'location_updated_by',
  'schedule_updated_by',
  'facebook_page_id',
  'facebook_page_name',
  'facebook_webhook_enabled',
  'facebook_last_sync',
  'facebook_auto_updates_enabled',
  'live_gps_lat',
  'live_gps_lng',
  'default_lat',
  'default_lng',
  'location_geog',
  'admin_notes',
  'review_status',
  'status',
];

async function firstPublicTruckId(request: APIRequestContext): Promise<string> {
  const response = await request.get('/api/trucks/public?limit=50');
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { trucks: { id: string; is_active?: boolean | null }[] };
  const active = body.trucks.find((truck) => truck.is_active === true);
  expect(active).toBeDefined();
  return active?.id ?? '';
}

test.describe('GET /api/trucks/[id]', () => {
  test('returns 404 for an unknown truck', async ({ request }) => {
    const response = await request.get('/api/trucks/00000000-0000-4000-8000-000000000000');

    expect(response.status()).toBe(404);
  });

  test('returns only public fields for a listed truck', async ({ request }) => {
    const id = await firstPublicTruckId(request);

    const response = await request.get(`/api/trucks/${id}`);

    expect(response.status()).toBe(200);
    const { truck } = (await response.json()) as { truck: Record<string, unknown> };
    expect(truck.id).toBe(id);
    for (const key of PRIVATE_KEYS) {
      expect(truck).not.toHaveProperty(key);
    }
  });
});

test.describe('GET /api/trucks?id=', () => {
  test('returns 404 for an unknown truck', async ({ request }) => {
    const response = await request.get('/api/trucks?id=00000000-0000-4000-8000-000000000000');

    expect(response.status()).toBe(404);
  });

  test('returns only public fields for a listed truck', async ({ request }) => {
    const id = await firstPublicTruckId(request);

    const response = await request.get(`/api/trucks?id=${id}`);

    expect(response.status()).toBe(200);
    const { truck } = (await response.json()) as { truck: Record<string, unknown> };
    expect(truck.id).toBe(id);
    for (const key of PRIVATE_KEYS) {
      expect(truck).not.toHaveProperty(key);
    }
  });
});
