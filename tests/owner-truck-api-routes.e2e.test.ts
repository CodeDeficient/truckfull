import { randomUUID } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/admin';
import { createOwnerUser, deleteOwnerUser, signInAs } from './helpers/signedInOwner';

const RUN_ID = Date.now();
const OWNER_EMAIL = `owner-truck-api-${RUN_ID}@example.com`;
const OTHER_EMAIL = `owner-truck-api-other-${RUN_ID}@example.com`;
const PASSWORD = `${randomUUID()}-Aa1!`;
const JSON_HEADERS = { 'content-type': 'application/json' };

let ownerId: string;
let otherId: string;
let truckId: string;

async function truckDescription(): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('description')
    .eq('id', truckId)
    .single();
  if (error) throw error;
  return data.description;
}

async function callRoutes(page: Page, label: string): Promise<number[]> {
  const responses = await Promise.all([
    page.request.put(`/api/trucks/${truckId}`, {
      headers: JSON_HEADERS,
      data: { description: `by-id ${label}` },
    }),
    page.request.put('/api/trucks', {
      headers: JSON_HEADERS,
      data: { id: truckId, description: `collection ${label}` },
    }),
    page.request.get(`/api/events/saved-leads?truck_id=${truckId}`),
    page.request.post('/api/events/saved-leads', {
      headers: JSON_HEADERS,
      data: { event_id: randomUUID(), truck_id: truckId },
    }),
    page.request.post('/api/events/applications', {
      headers: JSON_HEADERS,
      data: { event_id: randomUUID(), truck_id: truckId },
    }),
  ]);
  return responses.map((response) => response.status());
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('signed-in owner truck API routes', () => {
  test.beforeAll(async () => {
    ownerId = await createOwnerUser(OWNER_EMAIL, PASSWORD);
    otherId = await createOwnerUser(OTHER_EMAIL, PASSWORD);
    const { data, error } = await getSupabaseAdmin()
      .from('food_trucks')
      .insert({
        name: `Owner Truck API E2E ${RUN_ID}`,
        slug: `owner-truck-api-e2e-${RUN_ID}`,
        owner_id: ownerId,
        is_active: false,
        verification_status: 'pending',
        average_rating: 0,
        timezone: 'America/New_York',
        description: 'original',
      })
      .select('id')
      .single();
    if (error) throw error;
    truckId = data.id;
  });

  test.afterAll(async () => {
    if (truckId) await getSupabaseAdmin().from('food_trucks').delete().eq('id', truckId);
    for (const id of [ownerId, otherId]) {
      if (id) await deleteOwnerUser(id);
    }
  });

  test('another signed-in owner is refused and the truck is unchanged', async ({ page }) => {
    await signInAs(page, OTHER_EMAIL, PASSWORD);
    expect(await callRoutes(page, 'stranger')).toEqual([403, 403, 403, 403, 403]);
    expect(await truckDescription()).toBe('original');
    const applications = await page.request.get(`/api/events/applications?truck_id=${truckId}`);
    expect(applications.status()).toBe(200);
    expect(((await applications.json()) as { applications: unknown[] }).applications).toEqual([]);
  });

  test('owner passes every ownership check', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    const [byId, collection, leads, saveLead, apply] = await callRoutes(page, 'owner');
    expect([byId, collection, leads, apply]).toEqual([200, 200, 200, 404]);
    expect(saveLead).not.toBe(403);
    expect(await truckDescription()).toMatch(/^(by-id|collection) owner$/);
  });
});
