import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthorized } from '@/lib/utils/cronAuth';
import { readBodyWithinLimit } from '@/lib/utils/readBodyWithinLimit';
import { INVALIDATION_EDGE_HEADER } from '@/lib/events/syncCacheTargets';
import {
  invalidateEventPage,
  isEventCacheTarget,
  type EventCacheTarget,
} from '@/lib/events/eventPageInvalidation';

interface RevalidationPayload {
  readonly events: readonly unknown[];
}

const MAX_PAYLOAD_BYTES = 128 * 1024;

function isEdgeCredential(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const provided = Buffer.from(header);
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

function isPayload(value: unknown): value is RevalidationPayload {
  if (typeof value !== 'object' || value === null) return false;
  return Array.isArray((value as { events?: unknown }).events);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const edgeSecret = process.env.TRUCKFULL_EDGE_SECRET;
  if (!cronSecret || !edgeSecret) {
    return NextResponse.json({ error: 'Service misconfigured' }, { status: 500 });
  }
  if (!isAuthorized(request.headers.get('authorization'), cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isEdgeCredential(request.headers.get(INVALIDATION_EDGE_HEADER), edgeSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
  }

  try {
    const body = await readBodyWithinLimit(request.body, MAX_PAYLOAD_BYTES);
    if (body.tooLarge) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 });
    }
    if (body.body === null) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const payload: unknown = JSON.parse(body.body);
    if (
      !isPayload(payload) ||
      payload.events.length === 0 ||
      payload.events.length > 100 ||
      !payload.events.every((event) => isEventCacheTarget(event))
    ) {
      return NextResponse.json({ error: 'Invalid events payload' }, { status: 400 });
    }

    const targets = payload.events as EventCacheTarget[];
    for (const target of targets) invalidateEventPage(target);
    return NextResponse.json({ invalidated: targets.length });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
