import { type NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/logging';
import { checkRateLimited, getClientIp, standardLimiter } from '@/lib/middleware/rateLimit';
import {
  isBoundedPublicOverrideDateRange,
  isBoundedPublicScheduleDateRange,
  type PublicScheduleRecurrencesResponse,
} from '@/lib/services/publicScheduleRecurrence';
import { publicScheduleRecurrencesRequestSchema } from '@/lib/services/publicScheduleRecurrenceRequest';
import {
  fetchPublicScheduleOverrides,
  fetchPublicScheduleRecurrences,
} from '@/lib/services/publicScheduleRecurrence.server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimitResult = await checkRateLimited(`current-schedules:${ip}`, standardLimiter);
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', retryAfter: rateLimitResult.retryAfter },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = publicScheduleRecurrencesRequestSchema.safeParse(body);
  if (
    !parsed.success ||
    !isBoundedPublicScheduleDateRange(parsed.data.fromDate, parsed.data.toDate) ||
    (parsed.data.overridesToDate !== undefined &&
      !isBoundedPublicOverrideDateRange(
        parsed.data.fromDate,
        parsed.data.toDate,
        parsed.data.overridesToDate,
      ))
  ) {
    return NextResponse.json({ error: 'Invalid truck IDs or date range' }, { status: 400 });
  }

  const { truckIds, fromDate, toDate, overridesToDate } = parsed.data;
  try {
    const [recurrences, overrides] = await Promise.all([
      fetchPublicScheduleRecurrences(truckIds, fromDate, toDate),
      overridesToDate === undefined
        ? undefined
        : fetchPublicScheduleOverrides(truckIds, fromDate, overridesToDate),
    ]);
    return NextResponse.json<PublicScheduleRecurrencesResponse>(
      overrides === undefined ? { recurrences } : { recurrences, overrides },
    );
  } catch (error) {
    logError('Public current-schedule recurrence lookup failed:', error);
    return NextResponse.json({ error: 'Failed to fetch current schedules' }, { status: 500 });
  }
}
