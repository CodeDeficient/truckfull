import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitEndpoint } from '@/lib/middleware/rateLimit';
import { logError } from '@/lib/logging';
import { isEmail } from 'validator';
import { normalizeEmail, classifyWaitlistInsertError } from '@/lib/waitlist/waitlistApi';
import { sendAdminNotification } from '@/lib/email/adminNotifications';
import { waitlistNotification } from '@/lib/email/adminNotificationTemplate';

import type { Json } from '@/lib/database.remote.types';

const VALID_ROLES = ['foodie', 'truck_owner', 'event_manager', 'api_customer'] as const;

// Define the type for the event_waitlist table row
interface EventWaitlistRow {
  email: string;
  role: (typeof VALID_ROLES)[number];
  metadata: Json;
  created_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    // In-route rate limiting, fail-closed: if the limiter errors or Redis is
    // unconfigured, reject. This endpoint emails support on every accepted
    // row, so an unavailable limiter is not an acceptable risk.
    let rateLimited: boolean = false;
    try {
      const { success } = await rateLimitEndpoint('event-waitlist', request);
      rateLimited = !success;
    } catch (limiterError) {
      logError('Waitlist rate limiter failed closed', limiterError);
      rateLimited = true;
    }
    if (!rateLimitConfiguredForEndpoint() || rateLimited) {
      return NextResponse.json(
        { error: 'Unable to accept signups right now. Please try again later.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      );
    }

    const { email: rawEmail, role } = await request.json();

    const email = normalizeEmail(rawEmail);
    if (!email || !role) {
      return NextResponse.json({ error: 'A valid email and role are required' }, { status: 400 });
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Email format validation using validator.js (prevents ReDoS)
    if (!isEmail(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Insert into event_waitlist table
    const { error: dbError } = await supabase.from('event_waitlist').insert<EventWaitlistRow>({
      email,
      role,
      metadata: { source: 'web_waitlist_form' },
    });

    if (dbError) {
      const outcome = classifyWaitlistInsertError(dbError);
      return NextResponse.json(outcome.body, { status: outcome.status });
    }

    // 2. Notify support — only after a genuinely new row was accepted.
    await sendAdminNotification(waitlistNotification(email, role, new Date()));

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('Event waitlist API error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function rateLimitConfiguredForEndpoint(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}
