import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/utils/cronAuth';
import { runGeocodeRetry } from '@/lib/cron/ingestExternalEvents';
import { invalidateEventCacheTargets } from '@/lib/events/eventPageInvalidation';
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
    const result = await runGeocodeRetry(invalidateEventCacheTargets);

    logMessage('Geocode retry cron completed', {
      success: result.success,
      total: result.total,
      succeeded: result.succeeded,
      failed: result.failed,
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Geocode retry cron failed', { error: errorMessage });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
