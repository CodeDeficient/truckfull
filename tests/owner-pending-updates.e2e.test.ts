import { test, expect } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '../lib/supabase/admin';

const RUN_ID = Date.now();
const TEST_EMAIL = `pending-updates-${RUN_ID}@example.com`;
const TEST_PASSWORD = 'PendingUpd123!';
const TRUCK_NAME = `Pending Updates E2E ${RUN_ID}`;
const ORIGINAL_DESCRIPTION = 'original description';
const APPROVED_DESCRIPTION = 'approved description';

let userId: string;
let truckId: string;

async function insertPendingUpdateAsOwner(newValue: Record<string, unknown>): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase env vars missing');
  const ownerClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await ownerClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInError) throw signInError;
  const { data, error } = await ownerClient
    .from('pending_updates')
    .insert({ truck_id: truckId, category: 'menu', new_value: newValue, submitted_by: userId })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function readTruck(): Promise<{
  description: string | null;
  verification_status: string | null;
  average_rating: number | null;
}> {
  const { data, error } = await getSupabaseAdmin()
    .from('food_trucks')
    .select('description, verification_status, average_rating')
    .eq('id', truckId)
    .single();
  if (error) throw error;
  return data;
}

async function readUpdateStatus(id: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin()
    .from('pending_updates')
    .select('status')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data.status;
}

async function login(page: import('@playwright/test').Page): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase env vars missing');
  const jar = new Map<string, string>();
  const ssrClient = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });
  const { error } = await ssrClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw error;
  const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
  await page.context().addCookies([...jar].map(([name, value]) => ({ name, value, url: baseURL })));
}

test.use({ storageState: { cookies: [], origins: [] } });

test.describe.serial('owner approving pending updates', () => {
  test.beforeAll(async () => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email: TEST_EMAIL,
      role: 'food_truck_owner',
      updated_at: new Date().toISOString(),
    });
    if (profileError) throw profileError;
    const { data: truck, error: truckError } = await admin
      .from('food_trucks')
      .insert({
        name: TRUCK_NAME,
        slug: `pending-updates-e2e-${RUN_ID}`,
        description: ORIGINAL_DESCRIPTION,
        owner_id: userId,
        is_active: false,
        verification_status: 'pending',
        average_rating: 0,
      })
      .select('id')
      .single();
    if (truckError) throw truckError;
    truckId = truck.id;
  });

  test.afterAll(async () => {
    const admin = getSupabaseAdmin();
    if (truckId) {
      await admin.from('pending_updates').delete().eq('truck_id', truckId);
      await admin.from('food_trucks').delete().eq('id', truckId);
    }
    if (userId) {
      await admin.from('audit_log').delete().eq('user_id', userId);
      await admin.from('profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
  });

  test('unauthenticated approve is rejected', async ({ request }) => {
    const response = await request.put(`/api/owner/pending-updates/${crypto.randomUUID()}`, {
      data: { action: 'approve' },
    });
    expect(response.status()).toBe(401);
  });

  test('approving applies only owner-editable fields', async ({ page }) => {
    const updateId = await insertPendingUpdateAsOwner({
      description: APPROVED_DESCRIPTION,
      verification_status: 'verified',
      average_rating: 5,
    });
    await login(page);

    const response = await page.request.put(`/api/owner/pending-updates/${updateId}`, {
      data: { action: 'approve' },
    });

    expect(response.status()).toBe(200);
    const truck = await readTruck();
    expect(truck.description).toBe(APPROVED_DESCRIPTION);
    expect(truck.verification_status).toBe('pending');
    expect(Number(truck.average_rating)).toBe(0);
    expect(await readUpdateStatus(updateId)).toBe('approved');
  });

  test('an update with only protected fields is refused and stays pending', async ({ page }) => {
    const updateId = await insertPendingUpdateAsOwner({
      verification_status: 'verified',
      average_rating: 5,
    });
    await login(page);

    const response = await page.request.put(`/api/owner/pending-updates/${updateId}`, {
      data: { action: 'approve' },
    });

    expect(response.status()).toBe(400);
    const truck = await readTruck();
    expect(truck.verification_status).toBe('pending');
    expect(Number(truck.average_rating)).toBe(0);
    expect(await readUpdateStatus(updateId)).toBe('pending');
  });
});
