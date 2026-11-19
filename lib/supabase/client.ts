// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/lib/database.remote.types';

/**
 * Creates a Supabase browser client for use in client components.
 * This client is intended for use in browser environments.
 *
 * @example
 * const supabase = getSupabase()
 * const { data, error } = await supabase.from('food_trucks').select('*')
 *
 * @returns {ReturnType<typeof createBrowserClient<Database>>} A Supabase client configured for browser use
 */
export function getSupabase() {
  // In Next.js client components, environment variables must be exposed with NEXT_PUBLIC_ prefix
  // This is the required method to initialize Supabase client in browser context
   
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  return createBrowserClient<Database>(supabaseUrl, anonKey);
}
