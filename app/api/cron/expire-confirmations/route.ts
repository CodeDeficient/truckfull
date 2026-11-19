/**
 * Cron Job: Expire Pending Confirmations
 * Called by external scheduler (e.g., Vercel Cron) to expire old confirmations
 */

import { NextRequest, NextResponse } from 'next/server';
import { expireConfirmations } from '@/lib/cron/expireConfirmations';
import { logMessage, logError } from '@/lib/logging';
import { isAuthorized } from '@/lib/utils/cronAuth';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logError('Cron secret not configured');
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }

  if (!isAuthorized(authHeader, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await expireConfirmations();

    logMessage('Confirmation expiration cron completed', {
      expired: result.expired,
      error: result.error,
    });

    return NextResponse.json({
      success: !result.error,
      expired: result.expired,
      error: result.error,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Confirmation expiration cron failed', { error: errorMessage });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
