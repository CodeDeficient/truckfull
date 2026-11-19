import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/utils/cronAuth';
import { runIngestion } from '@/lib/cron/ingestExternalEvents';
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
    const result = await runIngestion(invalidateEventCacheTargets);

    logMessage('External events cron completed', {
      success: result.success,
      inserted: result.inserted,
      skipped: result.skipped,
      errors: result.errors,
      invalidRecords: result.invalidRecords,
      enrichmentFailures: result.enrichmentFailures,
    });

    return NextResponse.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('External events cron failed', { error: errorMessage });
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
