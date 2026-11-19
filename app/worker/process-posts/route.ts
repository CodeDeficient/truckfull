import { NextRequest, NextResponse } from 'next/server';
import { processPendingPosts } from '@/lib/webhooks/postProcessingPipeline';
import { isLegacyProcessingEnabled } from '@/lib/webhooks/legacyProcessingGate';

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!isLegacyProcessingEnabled()) {
    return NextResponse.json(
      { error: 'Legacy post processing is disabled' },
      { status: 403 },
    );
  }

  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processPendingPosts();

    return NextResponse.json({
      success: true,
      processed: result.processed,
      applied: result.applied,
      pendingReview: result.pendingReview,
      rejected: result.rejected,
      skipped: result.skipped,
      errors: result.errors,
      processingTimeMs: result.processingTimeMs,
      results: result.results,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
