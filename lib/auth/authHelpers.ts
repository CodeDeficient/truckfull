import 'server-only';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { hasAdminDashboardAccess, hasRoleAccess, type UserRole } from '@/lib/auth/roles';
import type { Json } from '@/lib/database.remote.types';
import { logError, logWarning } from '@/lib/logging';

// Internal function to validate token and get user profile
async function validateTokenAndGetProfile(token: string) {
  const {
    data: { user },
    error,
  } = await getSupabaseAdmin().auth.getUser(token);

  if (error != undefined || user == undefined) return null;

  // Use admin client to query profiles (bypasses RLS policies)
  const { data: profile, error: profileError } = await getSupabaseAdmin()
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .single<{ role: string; email: string }>();

  // Handle profile query errors
  if (profileError != undefined || profile == undefined) {
    return null;
  }

  return { user, profile };
}

export async function verifyAdminAccess(request: Request): Promise<boolean> {
  // Delegate to verifyAdminFromRequest for consistent implementation
  return verifyAdminFromRequest(request);
}

// Server-only util: verify one of the required roles from cookies() in server components/routes
export async function verifyRoleFromCookies(
  requiredRoles: string | string[],
): Promise<{ ok: boolean; userId?: string; role?: string }> {
  try {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // Use server client with cookies instead of admin client
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error != undefined || user == undefined) return { ok: false };

    // Use admin client to query profiles (bypasses RLS policies)
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from('profiles')
      .select('role, email')
      .eq('id', user.id)
      .single<{ role: string; email: string }>();

    // Handle profile query errors
    if (profileError != undefined || profile == undefined) {
      return { ok: false };
    }

    const role = profile.role ?? '';
    if (role === '') {
      return { ok: false };
    }

    // Check if user has ANY of the required roles
    const hasAccess = hasRoleAccess(role, roles as UserRole[]);
    return { ok: hasAccess, userId: user.id, role };
  } catch (error) {
    // Log the error for debugging purposes
    logError('Error in verifyRoleFromCookies:', error);
    return { ok: false };
  }
}

// Enhanced role verification with additional security checks
export async function verifyRoleWithSecurityChecks(
  requiredRoles: string | string[],
  additionalChecks?: {
    ip?: string;
    userAgent?: string;
    allowedIps?: string[];
    blockedUserAgents?: string[];
  },
): Promise<{ ok: boolean; userId?: string; role?: string }> {
  // First perform standard role verification
  const roleResult = await verifyRoleFromCookies(requiredRoles);
  if (!roleResult.ok) {
    return { ok: false };
  }

  // Apply additional security checks if provided
  if (additionalChecks) {
    // IP-based restrictions
    if (
      additionalChecks.allowedIps &&
      additionalChecks.ip &&
      !additionalChecks.allowedIps.includes(additionalChecks.ip)
    ) {
      logWarning(`Blocked access attempt from IP: ${additionalChecks.ip}`);
      return { ok: false };
    }

    // User agent blocking
    if (
      additionalChecks.blockedUserAgents &&
      additionalChecks.userAgent &&
      additionalChecks.blockedUserAgents.some((banned) =>
        additionalChecks.userAgent!.toLowerCase().includes(banned.toLowerCase()),
      )
    ) {
      logWarning(`Blocked access attempt with user agent: ${additionalChecks.userAgent}`);
      return { ok: false };
    }
  }

  return roleResult;
}

// Function to log security events
export async function logSecurityEvent(
  eventType: string,
  userId: string | null,
  ip: string | null,
  userAgent: string | null,
  resource?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    await supabase.from('security_events').insert({
      event_type: eventType,
      user_id: userId,
      ip_address: ip,
      user_agent: userAgent,
      resource: resource,
      metadata: (metadata as Json) ?? null, // Cast to Json type to match database schema
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    logError('Failed to log security event:', error);
    // Non-critical error, don't throw to avoid breaking main flow
  }
}

// Server-only util: verify user is an organizer from cookies() in server components/routes
export async function verifyOrganizerFromCookies(): Promise<{
  ok: boolean;
  userId?: string;
  organizerId?: string;
}> {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error != undefined || user == undefined) return { ok: false };

    const { data: organizer, error: organizerError } = await getSupabaseAdmin()
      .from('event_organizers')
      .select('id')
      .eq('user_id', user.id)
      .single<{ id: string }>();

    if (organizerError != undefined || organizer == undefined) {
      return { ok: false };
    }

    return { ok: true, userId: user.id, organizerId: organizer.id };
  } catch (error) {
    logError('Error in verifyOrganizerFromCookies:', error);
    return { ok: false };
  }
}

// Back-compat helper for existing code paths
export async function verifyAdminFromCookies(): Promise<boolean> {
  try {
    // Use the existing cookies-based verification
    const { ok } = await verifyRoleFromCookies('admin');
    return ok;
  } catch (error) {
    // In case of error accessing cookies (e.g., in non-server context), return false
    logError('Error in verifyAdminFromCookies:', error);
    return false;
  }
}

// Alternative verification function that accepts request object for static/dynamic contexts
export async function verifyAdminFromRequest(request: Request): Promise<boolean> {
  try {
    const authHeaderRaw = request.headers.get('authorization');
    const authHeader = authHeaderRaw ?? '';

    if (authHeader === '') return false;

    // Validate authorization header format
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return false;
    }

    const token = authHeader.slice(7).trim(); // Remove 'Bearer ' prefix
    if (!token) return false;

    const result = await validateTokenAndGetProfile(token);
    if (!result) return false;

    // Check if user has admin dashboard access (superadmin or admin)
    return hasAdminDashboardAccess(result.profile.role);
  } catch (error) {
    logError('Error in verifyAdminFromRequest:', error);
    return false;
  }
}
