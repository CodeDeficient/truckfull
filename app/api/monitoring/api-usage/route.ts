import { NextRequest, NextResponse } from 'next/server';
import { type APIService } from '@/lib/monitoring/apiMonitor';
import {
  handleClearAlerts,
  handleComprehensiveMonitoring,
  handleGetAlerts,
  handleServiceSpecificMonitoring,
  handleTestAlert,
} from '@/lib/api/monitoring/api-usage/handlers';
import { logError } from '@/lib/logging';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { evaluateAuthGate } from '@/lib/auth/apiAccessPolicy';

// Operational telemetry and alert management: admin-only.
const MONITORING_ACCESS = { requiresAdmin: true } as const;

async function authorizeMonitoringRequest(): Promise<NextResponse | undefined> {
  const { userId, role } = await verifyRoleFromCookies('admin');
  const decision = evaluateAuthGate(userId, role, MONITORING_ACCESS);

  if (decision === 'unauthorized') {
    return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
  }
  if (decision === 'forbidden') {
    return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const denied = await authorizeMonitoringRequest();
    if (denied != undefined) return denied;

    const { searchParams } = request.nextUrl;
    const service = searchParams.get('service') as APIService | null;

    return service
      ? handleServiceSpecificMonitoring(request, service)
      : handleComprehensiveMonitoring();
  } catch (error: unknown) {
    logError('API monitoring error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get API monitoring data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

function handlePostAction(
  action: string | undefined,
  service: string | undefined,
  level: string | undefined,
): NextResponse {
  if (action == undefined) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body: missing or invalid action' },
      { status: 400 },
    );
  }

  switch (action) {
    case 'clear-alerts': {
      return handleClearAlerts();
    }
    case 'get-alerts': {
      return handleGetAlerts();
    }
    case 'test-alert': {
      if (service == undefined || level == undefined) {
        return NextResponse.json(
          { success: false, error: 'Missing service or level for test-alert action' },
          { status: 400 },
        );
      }
      return handleTestAlert({ service, level });
    }
    default: {
      return NextResponse.json(
        { success: false, error: `Unknown action: ${action}` },
        { status: 400 },
      );
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const denied = await authorizeMonitoringRequest();
    if (denied != undefined) return denied;

    const rawBody: unknown = await request.json();

    if (typeof rawBody !== 'object' || rawBody == undefined) {
      // Changed to check for null instead of undefined as typeof null is 'object'
      return NextResponse.json(
        { success: false, error: 'Invalid request body: not an object' },
        { status: 400 },
      );
    }

    const body = rawBody as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : undefined;
    const service = typeof body.service === 'string' ? body.service : undefined;
    const level = typeof body.level === 'string' ? body.level : undefined;

    return handlePostAction(action, service, level);
  } catch (error: unknown) {
    logError('API monitoring POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process monitoring request',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
