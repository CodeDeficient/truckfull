import { NextRequest, NextResponse } from 'next/server';
import { AuditLogger } from '@/lib/security/auditLogger';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/lib/database.remote.types';
import { logError } from '@/lib/logging';

interface RequestMetadata {
  ip: string;
  userAgent: string;
  url: string;
  method: string;
}

interface LogAndRedirectParams {
  req: NextRequest;
  res: NextResponse;
  requestMetadata: RequestMetadata;
  reason: string;
  userError?: { message?: string };
}

function createSupabaseMiddlewareClient(req: NextRequest) {
  return createServerClient(
    globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL ?? '',
    globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(_name: string, _value: string, _options: CookieOptions) {
          // We don't set cookies in the middleware for protection routes
        },
        remove(_name: string, _options: CookieOptions) {
          // We don't remove cookies in the middleware for protection routes
        },
      },
    },
  );
}

async function logAndRedirect({
  req,
  requestMetadata,
  reason,
  userError,
}: LogAndRedirectParams): Promise<NextResponse> {
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = '/';
  loginUrl.searchParams.set('auth', 'open');
  loginUrl.searchParams.set('next', req.nextUrl.pathname);

  await AuditLogger.logSecurityEvent({
    event_type: 'permission_denied',
    ip_address: requestMetadata.ip,
    user_agent: requestMetadata.userAgent,
    details: {
      attempted_url: requestMetadata.url,
      reason,
      error: userError?.message,
    },
    severity: 'warning',
  });

  return NextResponse.redirect(loginUrl);
}

export async function protectAdminRoutes(
  req: NextRequest,
  res: NextResponse,
  requestMetadata: RequestMetadata,
) {
  const supabase = createSupabaseMiddlewareClient(req);

  try {
    // Proactive session refresh - this is critical for avoiding stale tokens
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError ?? !session) {
      return logAndRedirect({
        req,
        res,
        requestMetadata,
        reason: 'no_valid_session',
        userError: sessionError ? { message: sessionError.message } : undefined,
      });
    }

    // Validate user with refreshed session
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError ?? !user) {
      return logAndRedirect({
        req,
        res,
        requestMetadata,
        reason: 'not_authenticated',
        userError: userError ? { message: userError.message } : undefined,
      });
    }

    // Get user profile to check role with admin client for security
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient<Database>(
      globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL ?? '',
      globalThis.process?.env?.SUPABASE_SERVICE_ROLE_KEY ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError ?? !profile) {
      return logAndRedirect({
        req,
        res,
        requestMetadata,
        reason: 'no_profile',
        userError: profileError ? { message: profileError.message } : undefined,
      });
    }

    // Check if user has admin access
    const isAdmin = profile.role === 'admin' || profile.role === 'superadmin';

    if (!isAdmin) {
      await AuditLogger.logSecurityEvent({
        event_type: 'permission_denied',
        user_id: user.id,
        user_email: user.email ?? 'unknown',
        ip_address: requestMetadata.ip,
        user_agent: requestMetadata.userAgent,
        details: {
          reason: 'insufficient_role',
          user_role: profile.role,
        },
        severity: 'warning',
      });

      const accessDeniedUrl = req.nextUrl.clone();
      accessDeniedUrl.pathname = '/access-denied';
      return NextResponse.redirect(accessDeniedUrl);
    }

    // User is authenticated and has admin access
    // Continue with the request
    const next = NextResponse.next({
      request: {
        headers: new Headers(req.headers),
      },
    });

    // Basic audit log
    if (req.method !== 'GET' || req.nextUrl.pathname.includes('/api/')) {
      await AuditLogger.logDataAccess({
        userId: user.id,
        userEmail: user.email ?? 'unknown',
        resourceType: 'admin_panel',
        resourceId: req.nextUrl.pathname,
        action: req.method === 'GET' ? 'read' : 'admin_access',
        request: {
          ip: requestMetadata.ip,
          userAgent: requestMetadata.userAgent,
        },
      });
    }

    return next;
  } catch (error) {
    logError('Admin route protection error:', error);
    return logAndRedirect({
      req,
      res,
      requestMetadata,
      reason: 'internal_error',
      userError: error instanceof Error ? { message: error.message } : undefined,
    });
  }
}

export async function protectUserRoutes(
  req: NextRequest,
  res: NextResponse,
  requestMetadata: RequestMetadata,
) {
  const supabase = createSupabaseMiddlewareClient(req);

  try {
    // Check if user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError ?? !user) {
      return logAndRedirect({
        req,
        res,
        requestMetadata,
        reason: 'not_authenticated',
        userError: userError ? { message: userError.message } : undefined,
      });
    }

    // Minimal audit log; detailed user info should be logged server-side.
    if (req.method !== 'GET' || req.nextUrl.pathname.includes('/api/')) {
      await AuditLogger.logDataAccess({
        userId: user.id,
        userEmail: user.email ?? 'unknown',
        resourceType: 'user_profile',
        resourceId: req.nextUrl.pathname,
        action: req.method === 'GET' ? 'read' : 'admin_access',
        request: {
          ip: requestMetadata.ip,
          userAgent: requestMetadata.userAgent,
        },
      });
    }

    return NextResponse.next({
      request: {
        headers: new Headers(req.headers),
      },
    });
  } catch (error) {
    logError('User route protection error:', error);
    return logAndRedirect({
      req,
      res,
      requestMetadata,
      reason: 'internal_error',
      userError: error instanceof Error ? { message: error.message } : undefined,
    });
  }
}
