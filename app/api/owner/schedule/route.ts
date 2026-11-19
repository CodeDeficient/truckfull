import { NextRequest, NextResponse } from 'next/server';
import { verifyRoleFromCookies } from '@/lib/auth/authHelpers';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isValidServiceDate, isValidTimezone } from '@/lib/services/scheduleOverride';
import { expandRecurrence, toRecurrenceSeries } from '@/lib/services/scheduleRecurrence';
import { loadRecurrences, type RecurrenceQueryClient } from '@/lib/services/scheduleRecurrenceLoad';
import { logError } from '@/lib/logging';

interface ScheduleQuery {
  truckId: string;
  from: string;
  to: string;
}

function parseScheduleQuery(request: NextRequest): ScheduleQuery | null {
  const params = request.nextUrl.searchParams;
  const truckId = params.get('truck_id');
  const from = params.get('from');
  const to = params.get('to');

  if (!truckId || !from || !to || !isDateKey(from) || !isDateKey(to) || from > to) {
    return null;
  }

  return { truckId, from, to };
}

function isDateKey(value: string): boolean {
  return isValidServiceDate(value);
}

function nextDateKey(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function localMidnightUtc(dateKey: string, timezone: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const nominalUtc = Date.UTC(year, month - 1, day);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(nominalUtc));
  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  const renderedUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return new Date(nominalUtc - (renderedUtc - nominalUtc)).toISOString();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const query = parseScheduleQuery(request);
  if (!query) {
    return NextResponse.json(
      { error: 'truck_id, from, and to are required as valid date-range parameters' },
      { status: 400 },
    );
  }

  try {
    const authResult = await verifyRoleFromCookies(['food_truck_owner', 'admin']);
    if (!authResult.ok || !authResult.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const truckQuery = admin
      .from('food_trucks')
      .select('id, name, timezone, operating_hours')
      .eq('id', query.truckId);
    const { data: truck, error: truckError } = authResult.role === 'admin'
      ? await truckQuery.single()
      : await truckQuery.eq('owner_id', authResult.userId).single();

    if (truckError || !truck) {
      return NextResponse.json({ error: 'Truck not found' }, { status: 404 });
    }

    if (typeof truck.timezone !== 'string' || !isValidTimezone(truck.timezone)) {
      return NextResponse.json({ error: 'Truck timezone is invalid' }, { status: 422 });
    }
    const timezone = truck.timezone;
    const rangeStart = localMidnightUtc(query.from, timezone);
    const rangeEnd = localMidnightUtc(nextDateKey(query.to), timezone);

    const [overrideResult, eventResult, recurrenceResult] = await Promise.all([
      admin
        .from('food_truck_schedule_overrides')
        .select('*')
        .eq('food_truck_id', query.truckId)
        .gte('service_date', query.from)
        .lte('service_date', query.to)
        .order('service_date', { ascending: true }),
      admin
        .from('food_truck_schedule_events')
        .select('*')
        .eq('food_truck_id', query.truckId)
        .neq('status', 'cancelled')
        .lt('start_at', rangeEnd)
        .order('start_at', { ascending: true }),
      // The generated Supabase builder type cannot structurally satisfy the
      // minimal RecurrenceQueryClient shape (instantiation-depth limits), but
      // this call chain is exactly select().eq().lte().order() at runtime.
      loadRecurrences(
        admin as unknown as RecurrenceQueryClient,
        query.truckId,
        query.to,
      ),
    ]);

    if (overrideResult.error || eventResult.error) {
      throw new Error(
        overrideResult.error?.message ?? eventResult.error?.message ?? 'Schedule query failed',
      );
    }
    // Recurrence storage is an additive source: a genuinely broken query must
    // still fail loudly, but a database without the migration yet (PG 42P01)
    // degrades to no recurrence data instead of killing the schedule read.
    if (recurrenceResult.unavailable) {
      logError('Recurrence storage unavailable; serving schedule without recurrences', {
        error: recurrenceResult.error?.message ?? 'unknown',
      });
    } else if (recurrenceResult.error) {
      throw new Error(recurrenceResult.error.message);
    }

    const rangeStartTimestamp = new Date(rangeStart).getTime();
    const events = (eventResult.data ?? []).filter((event) => {
      const end = event.end_at ? new Date(event.end_at).getTime() : new Date(event.start_at).getTime();
      return end >= rangeStartTimestamp;
    });

    // Expand recurrence definitions into concrete occurrences for this window.
    // Precedence (client-side merge): overrides > recurrence > operating_hours;
    // every occurrence date is also materialized as occurrences[] in the payload.
    const recurrenceRows = recurrenceResult.unavailable ? [] : (recurrenceResult.data ?? []);
    const occurrences = recurrenceRows.flatMap((row) => {
      const series = toRecurrenceSeries(row);
      return series ? expandRecurrence(series, query.from, query.to) : [];
    });

    return NextResponse.json({
      truck: {
        id: truck.id,
        name: truck.name,
        timezone,
        operating_hours: truck.operating_hours,
      },
      overrides: overrideResult.data ?? [],
      recurrences: recurrenceRows,
      occurrences,
      events,
      range: query,
    });
  } catch (error) {
    logError('Failed to load owner schedule', {
      error: error instanceof Error ? error.message : 'unknown',
    });
    return NextResponse.json({ error: 'Failed to load schedule' }, { status: 500 });
  }
}
