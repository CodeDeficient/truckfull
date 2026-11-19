import { NextRequest, NextResponse } from 'next/server';
import { handleGetRequest, handlePostRequest } from '@/lib/api/analytics/web-vitals/handlers';
import { logError } from '@/lib/logging';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { evaluateAuthGate } from '@/lib/auth/apiAccessPolicy';

// POST intentionally stays public: it is the field-data collection beacon
// (see lib/performance/webVitals.ts). GET reads service-role telemetry, so it
// is restricted to admins.
const WEB_VITALS_READ_ACCESS = { requiresAdmin: true } as const;

export async function POST(request: NextRequest) {
  try {
    return await handlePostRequest(request);
  } catch (error) {
    logError('Web vitals endpoint error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await verifyRoleFromCookies('admin');
    const decision = evaluateAuthGate(userId, role, WEB_VITALS_READ_ACCESS);

    if (decision === 'unauthorized') {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (decision === 'forbidden') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    return await handleGetRequest(request);
  } catch (error) {
    logError('Failed to fetch web vitals analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics data' },
      { status: 500 },
    );
  }
}
