import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/admin';
import { createOwnerUser, deleteOwnerUser, signInAs } from './helpers/signedInOwner';

const RUN_ID = Date.now();
const OWNER_EMAIL = `owner-routes-${RUN_ID}@example.com`;
const OTHER_EMAIL = `owner-routes-other-${RUN_ID}@example.com`;
const PASSWORD = 'OwnerRoutes123!';
const STARTING_MENU = [{ name: 'Starter Taco', price: 3, category: 'Tacos' }];

let ownerId: string;
let otherId: string;
let truckId: string;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('signed-in owner routes', () => {
  test.beforeAll(async () => {
    ownerId = await createOwnerUser(OWNER_EMAIL, PASSWORD);
    otherId = await createOwnerUser(OTHER_EMAIL, PASSWORD);
    const admin = getSupabaseAdmin();
    const { data: truck, error } = await admin
      .from('food_trucks')
      .insert({
        name: `Owner Routes E2E ${RUN_ID}`,
        slug: `owner-routes-e2e-${RUN_ID}`,
        owner_id: ownerId,
        is_active: false,
        verification_status: 'pending',
        average_rating: 0,
        menu: STARTING_MENU,
      })
      .select('id')
      .single();
    if (error) throw error;
    truckId = truck.id;
    const { error: favoriteError } = await admin
      .from('user_favorites')
      .insert({ user_id: otherId, food_truck_id: truckId });
    if (favoriteError) throw favoriteError;
  });

  test.afterAll(async () => {
    const admin = getSupabaseAdmin();
    if (truckId) {
      await admin.from('user_favorites').delete().eq('food_truck_id', truckId);
      await admin.from('food_trucks').delete().eq('id', truckId);
    }
    for (const id of [ownerId, otherId]) {
      if (!id) continue;
      await deleteOwnerUser(id);
    }
  });

  test('owner sees only their own trucks', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    const response = await page.request.get('/api/owner/trucks');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { trucks: { id: string }[] };
    expect(body.trucks.map((truck) => truck.id)).toEqual([truckId]);
  });

  test('owner can read, add, edit, and delete menu items', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    const menuUrl = `/api/owner/trucks/${truckId}/menu`;

    const initial = await page.request.get(menuUrl);
    expect(initial.status()).toBe(200);
    expect(((await initial.json()) as { menu: unknown[] }).menu).toEqual(STARTING_MENU);

    const added = [...STARTING_MENU, { name: 'Burrito', price: 9, category: 'Mains' }];
    expect((await page.request.put(menuUrl, { data: { menu: added } })).status()).toBe(200);

    const edited = [STARTING_MENU[0], { name: 'Big Burrito', price: 11, category: 'Mains' }];
    expect((await page.request.put(menuUrl, { data: { menu: edited } })).status()).toBe(200);

    const deleted = [STARTING_MENU[0]];
    expect((await page.request.put(menuUrl, { data: { menu: deleted } })).status()).toBe(200);

    const { data } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('menu')
      .eq('id', truckId)
      .single();
    expect(data?.menu).toEqual(deleted);
  });

  test('owner dashboard pages show the truck and its menu', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    await page.goto('/owner-dashboard/trucks');
    await expect(page.getByText(`Owner Routes E2E ${RUN_ID}`).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.goto('/owner-dashboard/menu');
    await expect(page.getByText('Starter Taco').first()).toBeVisible({ timeout: 30_000 });
  });

  test('another signed-in user cannot read or change the menu', async ({ page }) => {
    await signInAs(page, OTHER_EMAIL, PASSWORD);
    const menuUrl = `/api/owner/trucks/${truckId}/menu`;
    expect((await page.request.get(menuUrl)).status()).toBe(403);
    expect((await page.request.put(menuUrl, { data: { menu: [] } })).status()).toBe(403);
    const ownTrucks = (await (await page.request.get('/api/owner/trucks')).json()) as {
      trucks: unknown[];
    };
    expect(ownTrucks.trucks).toEqual([]);
  });

  test('a signed-in user gets their favorites without owner fields', async ({ page }) => {
    await signInAs(page, OTHER_EMAIL, PASSWORD);
    const response = await page.request.get('/api/favorites/trucks');
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { trucks: Record<string, unknown>[] };
    expect(body.trucks.map((truck) => truck.id)).toEqual([truckId]);
    expect(body.trucks[0]).not.toHaveProperty('owner_id');
  });
});
