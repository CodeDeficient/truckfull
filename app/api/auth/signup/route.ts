/**
 * Signup API
 *
 * POST: Creates a new account via GoTrue with Cloudflare Turnstile
 * verification and per-IP rate limiting.
 *
 * Order of operations:
 *   1. Rate limit (cheap rejection path — no DB access)
 *   2. Zod validation of { email, password, turnstileToken }
 *   3. Turnstile verification (fail closed on missing config)
 *   4. GoTrue signUp via the anon-key server client
 *   5. Best-effort audit (signup_success / signup_failure only, AFTER GoTrue)
 *
 * The response never contains session, access, or refresh tokens. On
 * confirmation-required environments the client shows a "check your email"
 * message; on immediate-session environments (local autoconfirm) the server
 * client establishes auth cookies and the client syncs via refreshSession().
 */

import { z } from 'zod';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/utils/server';
import { checkRateLimited, getClientIp, isRateLimitConfigured } from '@/lib/middleware/rateLimit';
import { signupLimiter } from '@/lib/middleware/signupRateLimit';
import { verifyTurnstileToken } from '@/lib/security/turnstile';
import { AuditLogger } from '@/lib/security/auditLogger';
import { logError } from '@/lib/logging';
import { sendAdminNotification } from '@/lib/email/adminNotifications';
import { accountSignupNotification } from '@/lib/email/adminNotificationTemplate';

const signupSchema = z.object({
  email: z.string().email().max(254).transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(128),
  turnstileToken: z.string().min(1).max(2048),
});

export async function POST(request: NextRequest) {
  // Defense in depth: the proxy 503s /api/auth/ when Redis is unconfigured,
  // but checkRateLimited would otherwise fail open. Block directly so an
  // unauthenticated signup endpoint is never left without a per-IP budget.
  if (!isRateLimitConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Signup is temporarily unavailable.' },
      { status: 503 },
    );
  }

  // getClientIp trusts a client-supplied X-Forwarded-For header. On Vercel
  // the platform overwrites it, so this is safe in production; on any
  // deployment where the app is directly reachable the per-IP budget can be
  // bypassed by rotating the header.
  const ip = getClientIp(request);

  // Only bind the Turnstile token to a real client IP. The loopback fallback
  // returned when no forwarding headers exist would mismatch the browser's
  // public egress IP and could fail verification on non-Vercel deployments.
  const remoteIp = ip === '127.0.0.1' ? undefined : ip;

  let rateLimitResult: Awaited<ReturnType<typeof checkRateLimited>>;
  try {
    rateLimitResult = await checkRateLimited(`signup:${ip}`, signupLimiter);
  } catch (error) {
    // Fail closed: the proxy already 503s /api/auth/ when Redis is down, so a
    // limiter error here must not silently waive the signup budget.
    logError('signup: rate limit check failed', error);
    return NextResponse.json(
      { ok: false, error: 'Signup is temporarily unavailable.' },
      { status: 503 },
    );
  }

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { ok: false, error: 'Too many signup attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimitResult.retryAfter) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 400 });
  }

  const { email, password, turnstileToken } = parsed.data;

  const turnstileResult = await verifyTurnstileToken(turnstileToken, { remoteIp });
  if (!turnstileResult.ok) {
    // Fail closed: missing Turnstile configuration is a deployment error,
    // not a reason to accept signups without protection.
    if (turnstileResult.reason === 'missing_config') {
      return NextResponse.json(
        { ok: false, error: 'Signup is temporarily unavailable.' },
        { status: 503 },
      );
    }

    // A siteverify timeout or network error means the token was likely never
    // consumed. Return 503 so the client keeps the current token and retries,
    // instead of forcing a fresh challenge.
    if (turnstileResult.reason === 'siteverify_timeout' || turnstileResult.reason === 'network_error') {
      return NextResponse.json(
        { ok: false, error: 'Signup is temporarily unavailable. Please try again.' },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { ok: false, error: 'Captcha verification failed. Please try again.' },
      { status: 400 },
    );
  }

  // In Next.js route handlers `cookies()` is writable, so the server client
  // attaches the auth cookies to the actual response without needing a
  // response object (avoids the multi-Set-Cookie header-copy pitfall).
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    // Best-effort audit AFTER the GoTrue call; logSecurityEvent swallows its
    // own errors so this can never affect the signup response.
    await AuditLogger.logSecurityEvent({
      event_type: 'signup_failure',
      user_email: email,
      ip_address: ip,
      details: { reason: error.message },
      severity: 'warning',
    });

    return NextResponse.json(
      { ok: false, error: 'Unable to create account. Please try again.' },
      { status: 400 },
    );
  }

  await AuditLogger.logSecurityEvent({
    event_type: 'signup_success',
    user_id: data.user?.id,
    user_email: email,
    ip_address: ip,
    severity: 'info',
  });

  if ((data.user?.identities?.length ?? 0) > 0) {
    await sendAdminNotification(accountSignupNotification(email, new Date()));
  }

  // On immediate-session environments (local autoconfirm) GoTrue returns a
  // session; the server client has already written the auth cookies onto the
  // response. confirmationRequired is derived from the session presence.
  const confirmationRequired = data.session == null;
  return NextResponse.json({ ok: true, confirmationRequired }, { status: 200 });
}
