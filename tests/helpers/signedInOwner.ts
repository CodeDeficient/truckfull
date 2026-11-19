import { test, type Page } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { getSupabaseAdmin } from '../../lib/supabase/admin';

export async function createOwnerUser(email: string, password: string): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const { error: profileError } = await admin.from('profiles').insert({
    id: data.user.id,
    email,
    role: 'food_truck_owner',
    updated_at: new Date().toISOString(),
  });
  if (profileError) throw profileError;
  return data.user.id;
}

export async function deleteOwnerUser(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin.from('profiles').delete().eq('id', id);
  await admin.auth.admin.deleteUser(id);
}

export async function signInAs(page: Page, email: string, password: string): Promise<void> {
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
  const { error } = await ssrClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const baseURL = test.info().project.use.baseURL ?? 'http://localhost:3000';
  await page.context().addCookies([...jar].map(([name, value]) => ({ name, value, url: baseURL })));
}
