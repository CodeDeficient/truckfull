import { randomUUID } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../lib/supabase/admin';
import { createOwnerUser, deleteOwnerUser, signInAs } from './helpers/signedInOwner';

const RUN_ID = Date.now();
const OWNER_EMAIL = `owner-facebook-${RUN_ID}@example.com`;
const OTHER_EMAIL = `owner-facebook-other-${RUN_ID}@example.com`;
const PASSWORD = `${randomUUID()}-Aa1!`;
const PAGE_ID = `e2e-page-${RUN_ID}`;

let ownerId: string;
let otherId: string;
let truckId: string;
let postId: string;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('signed-in owner Facebook routes', () => {
  test.beforeAll(async () => {
    ownerId = await createOwnerUser(OWNER_EMAIL, PASSWORD);
    otherId = await createOwnerUser(OTHER_EMAIL, PASSWORD);
    const admin = getSupabaseAdmin();
    const { data: truck, error } = await admin
      .from('food_trucks')
      .insert({
        name: `Owner Facebook E2E ${RUN_ID}`,
        slug: `owner-facebook-e2e-${RUN_ID}`,
        owner_id: ownerId,
        is_active: false,
        verification_status: 'pending',
        average_rating: 0,
        facebook_page_id: PAGE_ID,
        facebook_page_name: 'E2E Page',
      })
      .select('id')
      .single();
    if (error) throw error;
    truckId = truck.id;
    const { data: post, error: postError } = await admin
      .from('facebook_posts')
      .insert({
        truck_id: truckId,
        facebook_post_id: `e2e-post-${RUN_ID}`,
        created_time: new Date().toISOString(),
        message: 'E2E post',
      })
      .select('id')
      .single();
    if (postError) throw postError;
    postId = post.id;
  });

  test.afterAll(async () => {
    const admin = getSupabaseAdmin();
    if (truckId) {
      await admin.from('facebook_posts').delete().eq('truck_id', truckId);
      await admin.from('food_trucks').delete().eq('id', truckId);
    }
    for (const id of [ownerId, otherId]) {
      if (id) await deleteOwnerUser(id);
    }
  });

  test('another signed-in user is refused on every owner Facebook route', async ({ page }) => {
    await signInAs(page, OTHER_EMAIL, PASSWORD);
    const json = { headers: { 'content-type': 'application/json' } };
    const statuses = await Promise.all([
      page.request.get(`/api/owner/facebook/trucks/${truckId}`),
      page.request.get(`/api/owner/facebook/posts?truckId=${truckId}`),
      page.request.delete('/api/owner/facebook/posts', { ...json, data: { postId } }),
      page.request.get(`/api/owner/facebook/confirm-update?truckId=${truckId}`),
      page.request.post('/api/owner/facebook/disconnect-page', { ...json, data: { truckId } }),
      page.request.post('/api/owner/facebook/connect-page', {
        ...json,
        data: { truckId, pageId: PAGE_ID, pageName: 'E2E Page' },
      }),
      page.request.post('/api/owner/facebook/sync-posts', { ...json, data: { truckId } }),
      page.request.post('/api/owner/facebook/toggle-webhook', {
        ...json,
        data: { truckId, enabled: true },
      }),
    ]).then((responses) => responses.map((response) => response.status()));
    expect(statuses).toEqual([404, 404, 404, 403, 403, 403, 403, 403]);

    const { data } = await getSupabaseAdmin()
      .from('food_trucks')
      .select('facebook_page_id')
      .eq('id', truckId)
      .single();
    expect(data?.facebook_page_id).toBe(PAGE_ID);
  });

  test('owner reads their Facebook connection, posts and confirmations', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    const connection = await page.request.get(`/api/owner/facebook/trucks/${truckId}`);
    expect(connection.status()).toBe(200);
    const connectionBody = (await connection.json()) as { truck: { facebook_page_id: string } };
    expect(connectionBody.truck.facebook_page_id).toBe(PAGE_ID);

    const posts = await page.request.get(`/api/owner/facebook/posts?truckId=${truckId}`);
    expect(posts.status()).toBe(200);
    const postsBody = (await posts.json()) as { posts: { id: string }[] };
    expect(postsBody.posts.map((post) => post.id)).toEqual([postId]);

    const confirmations = await page.request.get(
      `/api/owner/facebook/confirm-update?truckId=${truckId}`,
    );
    expect(confirmations.status()).toBe(200);
  });

  test('owner deletes a post and disconnects the page', async ({ page }) => {
    await signInAs(page, OWNER_EMAIL, PASSWORD);
    const json = { headers: { 'content-type': 'application/json' } };
    const deleted = await page.request.delete('/api/owner/facebook/posts', {
      ...json,
      data: { postId },
    });
    expect(deleted.status()).toBe(200);

    const disconnected = await page.request.post('/api/owner/facebook/disconnect-page', {
      ...json,
      data: { truckId },
    });
    expect(disconnected.status()).toBe(200);

    const admin = getSupabaseAdmin();
    const { data: truck } = await admin
      .from('food_trucks')
      .select('facebook_page_id, facebook_page_name')
      .eq('id', truckId)
      .single();
    expect(truck).toEqual({ facebook_page_id: null, facebook_page_name: null });
    const { count } = await admin
      .from('facebook_posts')
      .select('id', { count: 'exact', head: true })
      .eq('truck_id', truckId);
    expect(count).toBe(0);
  });
});
