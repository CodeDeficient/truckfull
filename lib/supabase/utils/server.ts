import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/lib/database.remote.types';

/**
 * Helper function to get and validate Supabase environment variables
 * @returns Object with supabaseUrl and anonKey
 * @throws Error if environment variables are missing
 */
function getSupabaseEnvVars(): { supabaseUrl: string; anonKey: string } {
  const supabaseUrl = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!anonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  }

  return { supabaseUrl, anonKey };
}

/**
 * Creates a Supabase server client for use in server components and API routes.
 *
 * For API routes, pass the NextResponse object to ensure session cookies are
 * properly propagated to the browser after auth operations.
 *
 * @param response - Optional NextResponse object for API routes to enable cookie propagation
 */
export function createClient(response?: NextResponse) {
  const { supabaseUrl, anonKey } = getSupabaseEnvVars();

  return createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookies().then((store) =>
          store.getAll().map((cookie) => ({ name: cookie.name, value: cookie.value })),
        );
      },
      async setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          if (response) {
            response.cookies.set({
              name,
              value,
              ...options,
            });
          } else {
            try {
              const store = await cookies();
              store.set({ name, value, ...options });
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          }
        }
      },
    },
  });
}

/**
 * Creates a Supabase client for use in middleware context.
 * This client works with NextRequest and NextResponse objects.
 */
export function createClientForMiddleware(request: NextRequest, response: NextResponse) {
  const { supabaseUrl, anonKey } = getSupabaseEnvVars();

  return createServerClient<Database>(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies
          .getAll()
          .map((cookie) => ({ name: cookie.name, value: cookie.value }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        }
      },
    },
  });
}

// Alias for backward compatibility - removed to fix duplicate exports
// export const createSupabaseServer = createClient;
