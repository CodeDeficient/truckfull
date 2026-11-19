import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/admin';
import { createOwnerUser, deleteOwnerUser, signInAs } from './helpers/signedInOwner';

const RUN_ID = Date.now();
const OWNER_EMAIL = `owner-schedule-${RUN_ID}@example.com`;
const OTHER_EMAIL = `owner-schedule-other-${RUN_ID}@example.com`;
const PASSWORD = `${randomUUID()}-Aa1!`;
const TRUCK_NAME = `Owner Schedule E2E ${RUN_ID}`;
const JSON_HEADERS = { 'content-type': 'application/json' };

let ownerId: string;
let otherId: string;
let truckId: string;
let pendingUpdateId: string;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('signed-in owner schedule, update and edit routes', () => {
  test.beforeAll(async () => {
    ownerId = await createOwnerUser(OWNER_EMAIL, PASSWORD);
    otherId = await createOwnerUser(OTHER_EMAIL, PASSWORD);
    const admin = getSupabaseAdmin();
    const { data: truck, error } = await admin
      .from('food_trucks')
      .insert({
        name: TRUCK_NAME,
        slug: `owner-schedule-e2e-${RUN_ID}`,
        owner_id: ownerId,
        is_active: false,
        verification_status: 'pending',
        average_rating: 0,
        timezone: 'America/New_York',
      })
      .select('id')
      .single();
    if (error) throw error;
    truckId = truck.id;
    const { data: update, error: updateError } = await admin
      .from('pending_updates')
      .insert({ truck_id: truckId, category: 'hours', status: 'pending' })
      .select('id')
      .single();
    if (updateError) throw updateError;
    pendingUpdateId = update.id;
  });

  test.afterAll(async () => {
    const admin = getSupabaseAdmin();
    if (truckId) {
      await admin.from('pending_updates').delete().eq('truck_id', truckId);
      await admin.from('food_trucks').delete().eq('id', truckId);
    }
    for (const id of [ownerId, otherId]) {
      if (id) await deleteOwnerUser(id);
    }
  });

  test('another signed-in user is refused and sees none of the owner data', async ({ page }) => {
    await signInAs(page, OTHER_EMAIL, PASSWORD);
    const statuses = await Promise.all([
      page.request.delete('/api/owner/schedule/override', {
        headers: JSON_HEADERS,
        data: { truck_id: truckId, service_date: '2030-01-01' },
      }),
      page.request.delete('/api/owner/schedule/recurrence', {
        headers: JSON_HEADERS,
        data: { truck_id: truckId, series_id: randomUUID() },
      }),
    ]).then((responses) => responses.map((response) => response.status()));
    expect(statuses).toEqual([403, 403]);

    const updates = await page.request.get('/api/owner/pending-updates');
    expect(updates.status()).toBe(200);
    expect(((await updates.json()) as { updates: unknown[] }).updates).toEqual([]);

    await page.goto(`/owner-dashboard/edit/${truckId}`);
    expect(page.url()).not.toContain(`/owner-dashboard/edit/${truckId}`);
    expect(await page.content()).not.toContain(TRUCK_NAME);
  });

  test('owner reaches their schedule, pending updates and edit page', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    const statuses = await Promise.all([
      page.request.delete('/api/owner/schedule/override', {
        headers: JSON_HEADERS,
        data: { truck_id: truckId, service_date: '2030-01-01' },
      }),
      page.request.delete('/api/owner/schedule/recurrence', {
        headers: JSON_HEADERS,
        data: { truck_id: truckId, series_id: randomUUID() },
      }),
    ]).then((responses) => responses.map((response) => response.status()));
    expect(statuses).toEqual([200, 200]);

    const updates = await page.request.get('/api/owner/pending-updates');
    expect(updates.status()).toBe(200);
    const body = (await updates.json()) as { updates: { id: string }[] };
    expect(body.updates.map((update) => update.id)).toEqual([pendingUpdateId]);

    await page.goto(`/owner-dashboard/edit/${truckId}`);
    expect(page.url()).toContain(`/owner-dashboard/edit/${truckId}`);
    await expect.poll(async () => page.content(), { timeout: 30_000 }).toContain(TRUCK_NAME);
  });
});
