import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/utils/cronAuth';
import { vetRelevantEvents } from '@/lib/cron/ingestExternalEvents';
import { invalidateEventCacheTargets } from '@/lib/events/eventPageInvalidation';
import { logError } from '@/lib/logging';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }

  if (!isAuthorized(authHeader, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await vetRelevantEvents(invalidateEventCacheTargets);
    return NextResponse.json(result);
  } catch (error) {
    logError('Vetting cron failed', error);
    return NextResponse.json({ error: 'Vetting failed' }, { status: 500 });
  }
}
