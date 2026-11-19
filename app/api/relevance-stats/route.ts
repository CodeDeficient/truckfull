import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/auth/authHelpers';
import { logError } from '@/lib/logging';
import { getRelevanceStats } from '@/lib/api/relevance-stats/handlers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const hasAdminAccess = await verifyAdminAccess(request);
  if (!hasAdminAccess) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getRelevanceStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    logError('Relevance stats error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
