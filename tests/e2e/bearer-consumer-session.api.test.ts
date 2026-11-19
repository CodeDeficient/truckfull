import { randomUUID } from 'node:crypto';
import { test, expect, type APIRequestContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '../../lib/supabase/admin';

const PASSWORD = `${randomUUID()}Aa1!`;
const ORIGIN = { lat: 33.4735, lng: -82.0105 };

function supabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error('Supabase env vars missing');
  return { url, anonKey };
}

async function createCustomer(email: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: profileError } = await admin.from('profiles').insert({
    id: data.user.id,
    email,
    role: 'customer',
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  return data.user.id;
}

async function sessionJwtFor(email: string): Promise<string> {
  const { url, anonKey } = supabaseEnv();
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return data.session.access_token;
}

async function cookieHeaderFor(email: string): Promise<string> {
  const { url, anonKey } = supabaseEnv();
  const jar = new Map<string, string>();
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function nearbyRadius(
  request: APIRequestContext,
  headers: Record<string, string>,
): Promise<number> {
  const response = await request.post('/api/trucks/nearby', {
    headers,
    data: { ...ORIGIN, radiusMiles: 150 },
  });
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { radiusMiles: number };
  return body.radiusMiles;
}

test.describe.serial('bearer sessions for consumer routes', () => {
  const email = `bearer-session-${Date.now()}@example.com`;
  let userId = '';
  let jwt = '';

  test.beforeAll(async () => {
    userId = await createCustomer(email);
    jwt = await sessionJwtFor(email);
  });

  test.afterAll(async () => {
    const admin = getSupabaseAdmin();
    await admin.from('profiles').delete().eq('id', userId);
    await admin.auth.admin.deleteUser(userId);
  });

  test('favorites accepts a valid bearer session', async ({ request }) => {
    const response = await request.get('/api/favorites/trucks', {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ trucks: [] });
  });

  test('favorites rejects an invalid or malformed bearer header', async ({ request }) => {
    for (const authorization of ['Bearer not-a-real-jwt', 'Bearer']) {
      const response = await request.get('/api/favorites/trucks', { headers: { authorization } });
      expect(response.status()).toBe(401);
    }
  });

  test('favorites still accepts a cookie session', async ({ request }) => {
    const response = await request.get('/api/favorites/trucks', {
      headers: { cookie: await cookieHeaderFor(email) },
    });
    expect(response.status()).toBe(200);
  });

  test('nearby gives the signed-in radius only to a valid bearer session', async ({ request }) => {
    expect(await nearbyRadius(request, { authorization: `Bearer ${jwt}` })).toBe(150);
    expect(await nearbyRadius(request, { authorization: 'Bearer not-a-real-jwt' })).toBe(50);
    expect(await nearbyRadius(request, {})).toBe(50);
  });

  test('account delete works with a bearer session', async ({ request }) => {
    const response = await request.delete('/api/account/delete', {
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(response.status()).toBe(200);
    const { data } = await getSupabaseAdmin().auth.admin.getUserById(userId);
    expect(data.user).toBeNull();
  });
});
