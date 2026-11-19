// lib/auth/adminAuthHelpers.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/utils/server';
import type { Database } from '@/lib/database.remote.types';

interface Profile {
  role: string | null;
}

async function _checkAdminAccess(supabase: SupabaseClient<Database>): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
}> {
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      success: false,
      error: userError?.message ?? 'No active session',
    };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single<Profile>();

  // Handle profile query errors
  if (profileError || !profile) {
    return {
      success: false,
      userId: user.id,
      email: user.email ?? undefined,
      error: profileError?.message ?? 'Profile not found',
    };
  }

  // Check admin role
  const isAdmin = profile.role === 'admin' || profile.role === 'superadmin';

  if (!isAdmin) {
    return {
      success: false,
      userId: user.id,
      email: user.email ?? undefined,
      role: profile.role ?? undefined,
      error: 'Insufficient permissions',
    };
  }

  return {
    success: true,
    userId: user.id,
    email: user.email ?? undefined,
    role: profile.role ?? undefined,
  };
}

/**
 * Checks admin access from server context (uses cookies to get user session)
 * @returns Promise that resolves to an object with success status and user info if authorized
 */
export async function checkAdminAccessServer(): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
}> {
  try {
    // Use cookie-aware server client to get user session
    const supabase = createClient();
    return await _checkAdminAccess(supabase);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Client-side admin access check (for client components)
export async function checkAdminAccessClient(): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
}> {
  try {
    // Import dynamically to avoid server-only imports in client components
    const { getSupabase } = await import('@/lib/supabase/client');
    const supabase = getSupabase();
    return await _checkAdminAccess(supabase);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
