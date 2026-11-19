import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/admin';
import { createOwnerUser, deleteOwnerUser, signInAs } from './helpers/signedInOwner';

const RUN_ID = Date.now();
const OWNER_EMAIL = `owner-avatar-${RUN_ID}@example.com`;
const OTHER_EMAIL = `owner-avatar-other-${RUN_ID}@example.com`;
const PASSWORD = `${randomUUID()}-Aa1!`;
const JSON_HEADERS = { 'content-type': 'application/json' };
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

let ownerId: string;
let otherId: string;
let ownerTruckId: string;
let otherTruckId: string;

function facebookUrl(label: string): string {
  return `https://facebook.com/owner-avatar-e2e-${label}-${RUN_ID}`;
}

function avatarUrl(userId: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');
  return `${base}/storage/v1/object/public/user-avatars/avatars/${userId}/${RUN_ID}.png`;
}

async function createTruck(ownerUserId: string, label: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .insert({
      name: `Owner Avatar E2E ${label} ${RUN_ID}`,
      slug: `owner-avatar-e2e-${label}-${RUN_ID}`,
      owner_id: ownerUserId,
      is_active: false,
      verification_status: 'pending',
      average_rating: 0,
      timezone: 'America/New_York',
      social_media: { facebook: facebookUrl(label) },
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function truckSocialMedia(id: string): Promise<Record<string, unknown>> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('social_media')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data.social_media as Record<string, unknown>;
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('signed-in owner avatar sync to trucks', () => {
  test.beforeAll(async () => {
    ownerId = await createOwnerUser(OWNER_EMAIL, PASSWORD);
    otherId = await createOwnerUser(OTHER_EMAIL, PASSWORD);
    ownerTruckId = await createTruck(ownerId, 'owner');
    otherTruckId = await createTruck(otherId, 'other');
  });

  test.afterAll(async () => {
    const admin = getSupabaseAdmin();
    await admin.from('food_trucks').delete().in('id', [ownerTruckId, otherTruckId].filter(Boolean));
    for (const id of [ownerId, otherId]) {
      if (id) await deleteOwnerUser(id);
    }
  });

  test('signed-out callers are refused', async ({ request }) => {
    const response = await request.post('/api/owner/trucks/avatar', {
      headers: JSON_HEADERS,
      data: { url: avatarUrl(ownerId) },
    });
    expect(response.status()).toBe(401);
  });

  test('only the caller avatar folder is accepted and only their trucks change', async ({ page }) => {
    await signInAs(page, OTHER_EMAIL, PASSWORD);
    const rejected = await Promise.all(
      ['https://example.com/avatar.png', avatarUrl(ownerId)].map(async (url) =>
        (await page.request.post('/api/owner/trucks/avatar', { headers: JSON_HEADERS, data: { url } })).status(),
      ),
    );
    expect(rejected).toEqual([400, 400]);
    const synced = await page.request.post('/api/owner/trucks/avatar', {
      headers: JSON_HEADERS,
      data: { url: avatarUrl(otherId) },
    });
    expect(synced.status()).toBe(200);
    expect(await synced.json()).toEqual({ updated: 1 });
    expect(await truckSocialMedia(otherTruckId)).toEqual({
      facebook: facebookUrl('other'),
      photo_url: avatarUrl(otherId),
    });
    expect(await truckSocialMedia(ownerTruckId)).toEqual({ facebook: facebookUrl('owner') });
  });

  test('owner uploads an avatar in the profile modal and it reaches their truck', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    await page.route('**/storage/v1/object/user-avatars/**', async (route) => {
      const key = new URL(route.request().url()).pathname.split('/storage/v1/object/')[1];
      await route.fulfill({ status: 200, json: { Key: key, Id: randomUUID() } });
    });
    await page.goto('/');
    await page.locator('button.rounded-full', { hasText: /^[A-Z?]{1,2}$/ }).first().click();
    await page.getByText('Profile', { exact: true }).click();
    await page.locator('[role="button"].group').first().click();
    await page.locator('#avatar-upload-input').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: PNG,
    });
    const synced = page.waitForResponse((response) => response.url().endsWith('/api/owner/trucks/avatar'));
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    expect((await synced).status()).toBe(200);
    const socialMedia = await truckSocialMedia(ownerTruckId);
    expect(socialMedia.facebook).toBe(facebookUrl('owner'));
    expect(String(socialMedia.photo_url)).toContain(`/user-avatars/avatars/${ownerId}/`);
  });
});
