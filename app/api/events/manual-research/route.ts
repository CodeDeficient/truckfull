import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/utils/server';
import { logError, logMessage } from '@/lib/logging';
import { runManualResearch } from '@/lib/research/manualResearch';
import { sanitizeInput } from '@/lib/research/parseEventText';
import { invalidateEventCacheTargets } from '@/lib/events/eventPageInvalidation';
import { checkRateLimited, researchLimiter, getClientIp } from '@/lib/middleware/rateLimit';

export const maxDuration = 120;

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const tier = profile?.subscription_tier ?? 'free';

    if (tier !== 'pro' && tier !== 'enterprise') {
      return NextResponse.json(
        { error: 'Pro subscription required for manual research' },
        { status: 403 },
      );
    }

    const ip = getClientIp(request);
    const rateResult = await checkRateLimited(`manual-research:${ip}`, researchLimiter);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Max 10 research requests per hour.' },
        {
          status: 429,
          headers: { 'Retry-After': String(rateResult.retryAfter) },
        },
      );
    }

    const body = await request.json();
    const { text, sourceEventId, shareWithCommunity } = body as {
      text: string;
      sourceEventId?: string;
      shareWithCommunity?: boolean;
    };

    if (sourceEventId !== undefined && !z.string().uuid().safeParse(sourceEventId).success) {
      return NextResponse.json({ error: 'Invalid sourceEventId' }, { status: 400 });
    }

    const sanitized = sanitizeInput(text);
    if (!sanitized) {
      return NextResponse.json(
        { error: 'Invalid or empty text provided' },
        { status: 400 },
      );
    }

    logMessage(`Manual research request from user ${user.id}`);

    const result = await runManualResearch({
      text: sanitized,
      sourceEventId,
      shareWithCommunity: shareWithCommunity === true,
      userId: user.id,
      isProUser: tier === 'pro' || tier === 'enterprise',
    }, invalidateEventCacheTargets);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    logError('Manual research API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
