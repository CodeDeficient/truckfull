import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyClaimCode } from '@/lib/auth/verificationService';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verificationCheckLimiter, isRateLimitConfigured } from '@/lib/middleware/rateLimit';
import { logError } from '@/lib/logging';

const ATTEMPTS_REMAINING_MESSAGE = /^Invalid code\. \d+ attempts? remaining\.$/;

// Zod schema for request validation
const VerifyCodeSchema = z.object({
  truckId: z.string().uuid('Invalid truck ID format'),
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must be numeric'),
});

// Allowlist of safe error messages to return to clients
const SAFE_ERROR_MESSAGES = new Set([
  'No active verification code found. Please request a new code.',
  'This code has been locked due to too many failed attempts. Please request a new code.',
  'Too many failed attempts. Please request a new code.',
  'This truck has already been claimed. Please contact support if you believe this is an error.',
]);

// Sanitize error messages - only return whitelisted messages
function sanitizeError(error: string | undefined): string {
  if (!error) return 'Unable to verify code. Please try again.';

  // Check for exact matches in allowlist
  if (SAFE_ERROR_MESSAGES.has(error)) return error;

  // Check for "Invalid code" pattern with remaining attempts
  if (ATTEMPTS_REMAINING_MESSAGE.test(error)) return error;

  // Default generic message for unknown errors
  return 'Unable to verify code. Please try again.';
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication
    // createServerSupabaseClient() returns synchronously - no await needed
    // S4123: This is a false positive - function returns client object, not Promise
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    if (isRateLimitConfigured()) {
      try {
        const { success, remaining } = await verificationCheckLimiter.limit(
          `verify-code:${userId}`,
        );
        if (!success) {
          return NextResponse.json(
            { error: 'Too many verification attempts. Please try again later.' },
            { status: 429, headers: { 'X-RateLimit-Remaining': remaining.toString() } },
          );
        }
      } catch (rateLimitError) {
        logError('Rate limiter error:', rateLimitError);
        return NextResponse.json(
          { error: 'Unable to verify code. Please try again.' },
          { status: 503 },
        );
      }
    }

    // 3. Parse and Validate Body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const parseResult = VerifyCodeSchema.safeParse(body);
    if (!parseResult.success) {
      // Don't reveal validation details
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { truckId, code } = parseResult.data;

    // 4. Verify Code and Claim
    const result = await verifyClaimCode(truckId, code, userId);

    if (result.success) {
      return NextResponse.json({ success: true, trialStarted: result.trialStarted ?? false });
    }
    // Sanitize error message before returning to client
    return NextResponse.json({ error: sanitizeError(result.error) }, { status: 400 });
  } catch (error) {
    logError('Error in verify-code route:', error);
    return NextResponse.json(
      { error: 'Unable to verify code. Please try again.' },
      { status: 500 },
    );
  }
}
