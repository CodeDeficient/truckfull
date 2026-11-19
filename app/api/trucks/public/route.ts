import { type NextRequest, NextResponse } from 'next/server';
import { logError, logMessage } from '@/lib/logging';
import { getClientIp } from '@/lib/middleware/rateLimit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  getPublicTruckListPage,
  parsePublicTruckListParams,
  type PublicTruckListParams,
} from '@/lib/services/publicTruckList.server';

export const dynamic = 'force-dynamic';

async function readSignedInUserId(): Promise<string | null> {
  try {
    const { data } = await createServerSupabaseClient().auth.getClaims();
    return typeof data?.claims.sub === 'string' ? data.claims.sub : null;
  } catch {
    return null;
  }
}

async function logListRequest(request: NextRequest, params: PublicTruckListParams): Promise<void> {
  logMessage('Public truck list request', {
    ip: getClientIp(request),
    userAgent: request.headers.get('user-agent') ?? 'unknown',
    userId: await readSignedInUserId(),
    limit: params.limit,
    offset: params.offset,
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = parsePublicTruckListParams(request.nextUrl.searchParams);
  const logged = logListRequest(request, params);
  try {
    const [trucks] = await Promise.all([getPublicTruckListPage(params), logged]);
    return NextResponse.json({ trucks });
  } catch (error) {
    logError('Public truck list failed:', error);
    return NextResponse.json({ error: 'Failed to load trucks' }, { status: 500 });
  }
}
