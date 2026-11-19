// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.remote.types';

/**
 * Creates a Supabase server client for use in server components and API routes.
 * This client can read and write cookies using the Next.js `cookies()` function.
 *
 * @example
 * const supabase = createServerSupabaseClient()
 * const { data, error } = await supabase.from('food_trucks').select('*')
 *
 * @returns {ReturnType<typeof createServerClient<Database>>} A Supabase client configured for server use
 */
/**
 * Gets a Supabase server client - alias for createServerSupabaseClient for backward compatibility
 * @deprecated Use createServerSupabaseClient instead
 */
export const getSupabase = createServerSupabaseClient;

export function createServerSupabaseClient() {
  const supabaseUrl = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  return createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      get: async (name: string): Promise<string | undefined> => {
        const store = await cookies();
        return store.get(name)?.value;
      },
      set: async (name: string, value: string, options: CookieOptions): Promise<void> => {
        const store = await cookies();
        try {
          store.set({ name, value, ...options });
        } catch {
          // The `set` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
      remove: async (name: string, options: CookieOptions): Promise<void> => {
        const store = await cookies();
        try {
          store.set({ name, value: '', ...options });
        } catch {
          // The `delete` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
