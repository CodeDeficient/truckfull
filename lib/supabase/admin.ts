// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.remote.types';
import { PUBLIC_READ_TIMEOUT_MS, fetchWithTimeout } from '@/lib/supabase/fetchWithTimeout';
import { timedFetch } from '@/lib/runtime/dependencyTiming.mjs';

/**
 * Creates a Supabase admin client for use in server components, scripts, and admin functions.
 * This client has full admin privileges and does not rely on Next.js headers or cookies.
 *
 * @example
 * const supabaseAdmin = getSupabaseAdmin()
 * const { data, error } = await supabaseAdmin.from('food_trucks').select('*')
 *
 * @returns {ReturnType<typeof createClient<Database>>} A Supabase client configured with admin privileges
 */
function createAdminClient(fetchImpl?: typeof fetch) {
  if (!globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  const supabaseUrl = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    ...(fetchImpl ? { global: { fetch: fetchImpl } } : {}),
  });
}

export function getSupabaseAdmin(): ReturnType<typeof createAdminClient> {
  return createAdminClient();
}

export function getSupabasePublicReader(): ReturnType<typeof createAdminClient> {
  return createAdminClient(timedFetch('db', fetchWithTimeout(PUBLIC_READ_TIMEOUT_MS)));
}
