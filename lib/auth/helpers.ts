// lib/auth/helpers.ts
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import type { User } from '@supabase/supabase-js';
import { logError } from '@/lib/logging';

/**
 * Verifies if a user has admin access
 * @param userId - The user's ID to check
 * @returns Promise that resolves to true if user has admin access, false otherwise
 */
export async function verifyAdminAccess(userId: string): Promise<boolean> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get user profile to check role
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logError('Error fetching user profile:', error?.message ?? 'Profile not found');
      return false;
    }

    // Check if user has admin role
    return profile.role === 'admin' || profile.role === 'superadmin';
  } catch (error) {
    logError('Error verifying admin access:', error);
    return false;
  }
}

/**
 * Gets user profile information
 * @param userId - The user's ID
 * @returns Promise that resolves to user profile or null if not found
 */
export async function getUserProfile(userId: string) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      logError('Error fetching user profile:', error?.message ?? 'Profile not found');
      return;
    }

    return profile;
  } catch (error) {
    logError('Error getting user profile:', error);
  }
}

/**
 * Checks if a user is authenticated and returns their information
 * @returns Promise that resolves to user object or null if not authenticated
 */
export async function getAuthenticatedUser(): Promise<User | undefined> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get current session
    const {
      data: { session },
      error,
    } = await supabaseAdmin.auth.getSession();

    if (error || !session?.user) {
      return;
    }

    return session.user;
  } catch (error) {
    logError('Error getting authenticated user:', error);
  }
}
