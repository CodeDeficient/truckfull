import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * Robust authentication helper that works around JWT token issues
 * by falling back to direct database verification when needed
 */

interface AuthVerificationResult {
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
  method: 'token' | 'database' | 'hybrid';
}

/**
 * Verify user authentication using token validation (primary method)
 */
export async function verifyAuthToken(): Promise<AuthVerificationResult> {
  try {
    const supabase = getSupabase();

    // Try to get current session/user
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return {
        success: false,
        error: sessionError?.message ?? 'No active session',
        method: 'token',
      };
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: userError?.message ?? 'Unable to get user data',
        method: 'token',
      };
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: profileError?.message ?? 'Unable to get user profile',
        method: 'token',
      };
    }

    return {
      success: true,
      userId: user.id,
      email: user.email ?? undefined,
      role: profile.role,
      method: 'token',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in token verification',
      method: 'token',
    };
  }
}

/**
 * Verify user authentication using direct database verification (fallback method)
 */
export async function verifyAuthDatabase(userId: string): Promise<AuthVerificationResult> {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Get user profile directly from database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        error: profileError?.message ?? 'User profile not found in database',
        method: 'database',
      };
    }

    return {
      success: true,
      userId: profile.id,
      email: profile.email ?? undefined,
      role: profile.role,
      method: 'database',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error in database verification',
      method: 'database',
    };
  }
}

/**
 * Hybrid verification that tries token validation first, then falls back to database
 */
export async function verifyAuthHybrid(): Promise<AuthVerificationResult> {
  // Try token validation first
  const tokenResult = await verifyAuthToken();

  if (tokenResult.success) {
    return tokenResult;
  }

  // If token validation fails, we could fall back to database verification
  // But we'd need the user ID, which we don't have without a token
  // In a real implementation, we might get this from a cookie or other source

  return {
    ...tokenResult,
    method: 'hybrid',
    error: `Token verification failed: ${tokenResult.error}. Database fallback not implemented without user ID.`,
  };
}

/**
 * Check if user has admin access (specific to this application)
 */
export async function verifyAdminAccess(): Promise<AuthVerificationResult> {
  const authResult = await verifyAuthHybrid();

  if (!authResult.success) {
    return {
      ...authResult,
      error: `Authentication failed: ${authResult.error}`,
    };
  }

  // Check if user has admin role
  const isAdmin = authResult.role === 'admin' || authResult.role === 'superadmin';

  if (!isAdmin) {
    return {
      success: false,
      userId: authResult.userId,
      email: authResult.email,
      role: authResult.role,
      error: `Insufficient permissions. User role: ${authResult.role}`,
      method: authResult.method,
    };
  }

  return {
    success: true,
    userId: authResult.userId,
    email: authResult.email,
    role: authResult.role,
    method: authResult.method,
  };
}
