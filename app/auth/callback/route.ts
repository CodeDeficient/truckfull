import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { resolvePwaCompletionRedirect } from '@/lib/auth/pwaOAuth';
import { authLimiter, checkRateLimited, getClientIp } from '@/lib/middleware/rateLimit';
import { AuditLogger } from '@/lib/security/auditLogger';
import { logError, logMessage } from '@/lib/logging';
import { getDefaultNewProfileRole, getOAuthRedirectTarget } from '@/lib/auth/oauthPolicy';
import { resolvePublicOrigin } from '@/lib/http/publicOrigin';

const LOG_CONTROL_CHARS = /[\r\n\t]/g;

interface RequestMetadata {
  ip: string;
  userAgent: string;
}

function sanitizeLogField(value: string | null): string {
  if (value == null) return 'none';
  return value.replaceAll(LOG_CONTROL_CHARS, ' ').slice(0, 300);
}

async function handleAuthFailure(
  error: Error,
  identifier: string,
  requestMetadata: RequestMetadata,
  provider?: string,
) {
  await AuditLogger.logAuthEvent({
    eventType: 'login_failure',
    userEmail: undefined,
    userId: undefined,
    request: requestMetadata,
    details: { provider: provider ?? 'unknown', error: error.message },
  });
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const identifier = `auth:${ip}`;
  const rateLimitResult = await checkRateLimited(identifier, authLimiter);

  if (!rateLimitResult.allowed) {
    await AuditLogger.logSecurityEvent({
      event_type: 'login_failure',
      ip_address: identifier.split(':')[0],
      user_agent: request.headers.get('user-agent') ?? 'unknown',
      details: {
        reason: 'rate_limit_exceeded',
        retryAfter: rateLimitResult.retryAfter,
      },
      severity: 'warning',
    });
    return NextResponse.redirect(`${resolvePublicOrigin(request.nextUrl.origin)}/?auth=open&error=rate_limit`);
  }

  const { searchParams, origin } = request.nextUrl;
  const publicOrigin = resolvePublicOrigin(origin);
  const code = searchParams.get('code');
  const type = searchParams.get('type'); // recovery, signup, magiclink, etc.
  const callbackError = searchParams.get('error');
  const callbackErrorDescription = searchParams.get('error_description');
  const isPwaCallback = searchParams.get('pwa') === '1';

  // Security: Validate redirectTo to prevent open redirect attacks
  const rawRedirectTo = searchParams.get('redirectTo') ?? '/';
  const ALLOWED_REDIRECT_PREFIXES = ['/owner-dashboard', '/admin', '/auth', '/pricing'];
  const isValidRedirect = (path: string): boolean => {
    try {
      // Use URL constructor to detect any sneaky absolute URL patterns
      const url = new URL(path, 'http://localhost');
      if (url.host !== 'localhost') return false; // Reject if URL parsing detected external host
      // Must start with single slash (not //)
      if (!path.startsWith('/') || path.startsWith('//')) return false;
      // Block any URL schemes
      if (path.includes('://')) return false;
      // Allow root or paths starting with allowed prefixes
      return path === '/' || ALLOWED_REDIRECT_PREFIXES.some((prefix) => path.startsWith(prefix));
    } catch {
      return false;
    }
  };
  const redirectTo = isValidRedirect(rawRedirectTo) ? rawRedirectTo : '/';

  const supabase = createClient();

  const requestMetadata = {
    ip,
    userAgent: request.headers.get('user-agent') ?? 'unknown',
  };

  const isOAuthDebugEnabled = process.env.NODE_ENV !== 'production';
  const safeRawRedirectTo = sanitizeLogField(rawRedirectTo);
  const safeCallbackError = sanitizeLogField(callbackError);
  const safeCallbackErrorDescription = sanitizeLogField(callbackErrorDescription);
  if (isOAuthDebugEnabled) {
    logMessage('OAuth callback received', {
      host: request.headers.get('host') ?? 'unknown',
      xForwardedHost: request.headers.get('x-forwarded-host') ?? 'unknown',
      xForwardedProto: request.headers.get('x-forwarded-proto') ?? 'unknown',
      origin,
      path: request.nextUrl.pathname,
      hasCode: code != null,
      type: type ?? 'none',
      callbackError: safeCallbackError,
      callbackErrorDescription: safeCallbackErrorDescription,
      requestedRedirectTo: safeRawRedirectTo,
      validatedRedirectTo: redirectTo,
    });
  }

  if (code != undefined) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      if (isOAuthDebugEnabled) {
        logError('OAuth exchangeCodeForSession failed', {
          message: error.message,
          callbackError: safeCallbackError,
          callbackErrorDescription: safeCallbackErrorDescription,
          host: request.headers.get('host') ?? 'unknown',
          origin,
          path: request.nextUrl.pathname,
        });
      }
      // Error is already logged via handleAuthFailure
      await handleAuthFailure(error, identifier, requestMetadata, 'unknown');
      const errorMessage = encodeURIComponent(error.message);
      return NextResponse.redirect(
        `${publicOrigin}/?auth=open&error=OAuthCallbackError&message=${errorMessage}`,
      );
    }

    // If this is a password recovery flow, redirect to password update page
    if (type === 'recovery') {
      return NextResponse.redirect(`${publicOrigin}/auth/update-password`);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let userRole: string | null | undefined;
      let oauthProvider: string | undefined;

      // Detect OAuth provider from user metadata
      const appMetadata = user.app_metadata as { provider?: string; providers?: string[] } | null;
      if (appMetadata?.provider) {
        oauthProvider = appMetadata.provider;
      } else if (appMetadata?.providers && Array.isArray(appMetadata.providers)) {
        // Use the first provider if multiple
        oauthProvider = appMetadata.providers[0];
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError ?? !profile) {
        const defaultRole = getDefaultNewProfileRole();

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            updated_at: new Date().toISOString(),
            full_name: user.email?.split('@')[0] ?? user.id,
            avatar_url: undefined,
            role: defaultRole,
            email: user.email,
          })
          .select('role')
          .single();

        if (createError) {
          logError('Error creating profile:', createError);
        } else if (newProfile != undefined) {
          userRole = newProfile.role;
        }
      } else {
        userRole = profile.role;
      }

      if (oauthProvider === 'facebook' && isOAuthDebugEnabled) {
        logMessage('Facebook OAuth callback user metadata', {
          userId: user.id,
          hasEmail: typeof user.email === 'string' && user.email.length > 0,
          provider: oauthProvider,
          providers: Array.isArray(appMetadata?.providers) ? appMetadata.providers : [],
        });
      }

      await AuditLogger.logAuthEvent({
        eventType: 'login_success',
        userEmail: user.email ?? undefined,
        userId: user.id,
        request: requestMetadata,
        details: { provider: oauthProvider ?? 'email', role: userRole },
      });

      // Rate limit success is implicit — Upstash sliding window handles this.

      const target = getOAuthRedirectTarget({
        origin: publicOrigin,
        redirectTo,
        userRole,
      });

      const isUnauthorizedTarget = target.endsWith('/unauthorized') || target.includes('/unauthorized?');

      const resolvedTarget = (() => {
        if (!isPwaCallback) {
          return target;
        }

        return resolvePwaCompletionRedirect(target, publicOrigin);
      })();

      if (isUnauthorizedTarget) {
        // Log security event without blocking the redirect
        void (async () => {
          try {
            await AuditLogger.logSecurityEvent({
              event_type: 'permission_denied',
              user_id: user.id,
              user_email: user.email ?? 'unknown',
              ip_address: requestMetadata.ip,
              user_agent: requestMetadata.userAgent,
              details: {
                reason: 'insufficient_role',
                user_role: userRole ?? 'none',
              },
              severity: 'warning',
            });
          } catch (error) {
            // Don't block the redirect even if logging fails
            logError('Failed to log security event:', error);
          }
        })();
      }

      return NextResponse.redirect(resolvedTarget);
    }
  }

  return NextResponse.redirect(`${publicOrigin}/?auth=open&error=NoCodeProvided`);
}
