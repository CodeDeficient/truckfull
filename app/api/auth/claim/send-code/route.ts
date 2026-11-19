import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendVerificationCode } from '@/lib/auth/verificationService';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { verificationSendLimiter, isRateLimitConfigured } from '@/lib/middleware/rateLimit';
import { logError } from '@/lib/logging';

// Zod schema for request validation
const SendCodeSchema = z.object({
  truckId: z.string().uuid('Invalid truck ID format'),
});

// Sanitize error messages to not reveal internal details
function sanitizeError(error?: string): string {
  if (!error) return 'Unable to process request. Please try again.';

  // Allow these user-friendly messages through
  const safePatterns = ['Too many', 'try again', 'contact support'];

  for (const pattern of safePatterns) {
    if (error.toLowerCase().includes(pattern.toLowerCase())) {
      return error;
    }
  }

  // Generic fallback for all other errors
  return 'Unable to send verification code. Please contact support.';
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

    // 3. Parse and Validate Body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parseResult = SendCodeSchema.safeParse(body);
    if (!parseResult.success) {
      // Don't reveal validation details
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { truckId } = parseResult.data;

    if (isRateLimitConfigured()) {
      const limits = await Promise.all([
        verificationSendLimiter.limit(`send-code:${user.id}`),
        verificationSendLimiter.limit(`send-code-truck:${truckId}`),
      ]);
      if (limits.some((limit) => !limit.success)) {
        return NextResponse.json(
          { error: 'Too many code requests. Please try again later.' },
          { status: 429 },
        );
      }
    }

    // 4. Call Service
    const result = await sendVerificationCode(truckId);

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      // Sanitize error messages - don't reveal internal details
      const safeError = sanitizeError(result.error);
      return NextResponse.json({ error: safeError }, { status: 400 });
    }
  } catch (error) {
    logError('Error in send-code route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
