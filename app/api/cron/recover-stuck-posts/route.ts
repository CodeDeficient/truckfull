/**
 * Cron Job: Recover Stuck Posts
 * Called by external scheduler (e.g., Vercel Cron) to reprocess stuck pending posts
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/utils/cronAuth';
import { recoverStuckPosts } from '@/lib/cron/recoverStuckPosts';
import { logMessage, logError } from '@/lib/logging';

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
    const result = await recoverStuckPosts();

    logMessage('Stuck posts recovery cron completed', {
      found: result.found,
      reprocessed: result.reprocessed,
      failed: result.failed,
      error: result.error,
    });

    return NextResponse.json({
      success: !result.error,
      found: result.found,
      reprocessed: result.reprocessed,
      failed: result.failed,
      error: result.error,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Stuck posts recovery cron failed', { error: errorMessage });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
