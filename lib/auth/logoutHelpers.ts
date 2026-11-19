import { getSupabase } from '@/lib/supabase/client';
import { clearSupabaseAuthCookies } from './cookieHelpers';
import { logError } from '@/lib/logging';

export async function handleLogout() {
  try {
    const supabase = getSupabase();

    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      logError('Logout error:', error);
      throw error;
    }

    // Clear any additional cookies that might persist
    clearSupabaseAuthCookies();

    // Redirect to home page
    if (globalThis.window != undefined) {
      globalThis.location.href = '/';
    }

    return { success: true };
  } catch (error) {
    logError('Logout failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Logout failed',
    };
  }
}
