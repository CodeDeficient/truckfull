'use client';

import { ChevronLeft, ChevronRight, Clock, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from './SettingsTab';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import {
  ACTION_ARIA,
  ACTION_ORDER,
  ParticleActionLayer,
  type ParticleAction,
} from './ParticleActionLayer';
import {
  effectiveHoursForDate,
  weekdayForDateKey,
  type ResolvedScheduleSlice,
  type OverrideRow,
  type RecurringHours,
} from '@/lib/services/scheduleOverride';
import type { DayOfWeek } from '@/lib/types';

interface ScheduleOverrideRecord {
  service_date: string;
  is_closed: boolean;
  is_all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  ends_next_day: boolean;
  timezone: string;
  source_type: string;
  location_data: { address?: string; city?: string; state?: string } | null;
}

interface RecurrenceOccurrenceRecord {
  seriesId: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  endsNextDay: boolean;
  location: { address?: string } | null;
}

export interface ScheduleRecurrenceRecord {
  id: string;
  frequency: string;
  monthly_mode: string | null;
  start_date: string;
  occurrences: number | null;
  start_time: string;
  end_time: string;
  location_data: { address?: string } | null;
}

interface ScheduleResponse {
  truck: {
    timezone: string;
    operating_hours: RecurringHours | null;
  };
  overrides: ScheduleOverrideRecord[];
  recurrences?: ScheduleRecurrenceRecord[];
  occurrences?: RecurrenceOccurrenceRecord[];
}

interface ScheduleCalendarProps {
  readonly truckId?: string;
  readonly refreshKey?: number;
  readonly headerLeft?: ReactNode;
  readonly headerRight?: ReactNode;
  /**
   * Unified modal opener for a weekday with no dated entry. Receives the date
   * key plus the current weekly hours so ScheduleTab can prefill the Repeat-ON
   * (indefinite weekly) path of the one and only scheduling modal.
   */
  readonly onEditRecurringDay?: (
    day: DayOfWeek,
    serviceDate: string,
    openTime: string | null,
    closeTime: string | null,
    location: string,
  ) => void;
  readonly onCloseRecurringDay?: (day: DayOfWeek, serviceDate: string) => void | Promise<void>;
  readonly onAddRecurringDay?: (
    day: DayOfWeek,
    serviceDate: string,
    openTime: string | null,
    closeTime: string | null,
    location: string,
  ) => void;
  readonly onEditDatedDay?: (serviceDate: string, startTime: string, endTime: string, location: string) => void;
  readonly onEditRecurrenceDay?: (
    serviceDate: string,
    recurrence: ScheduleRecurrenceRecord,
  ) => void;
  readonly onRemoveDatedOverride?: (serviceDate: string) => void | Promise<void>;
  readonly onDeleteDatedOverride?: (serviceDate: string) => void;
  /** Delete routing for a date answered by a generated recurrence occurrence. */
  readonly onDeleteRecurrenceDate?: (
    serviceDate: string,
    seriesId: string,
    day: DayOfWeek,
  ) => void;
}

interface CalendarDate {
  readonly key: string;
  readonly day: number;
  readonly inMonth: boolean;
  readonly isToday: boolean;
}

export interface ScheduleCellSummary {
  readonly status: string;
  readonly source: 'One-off' | 'Recurring';
  readonly location: string | null;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HEADER_COLORS = [
  'bg-[#7f1d1d]',
  'bg-[#9a3412]',
  'bg-[#854d0e]',
  'bg-[#166534]',
  'bg-[#155e75]',
  'bg-[#1d4ed8]',
  'bg-[#7e22ce]',
];

const ACTION_COLORS: Record<ParticleAction, string> = {
  add: '#3dde82',
  edit: '#f5c94d',
  delete: '#f05757',
};

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getMonthDates(month: Date): CalendarDate[] {
  const first = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - first.getUTCDay());
  const lastDay = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
  const weekCount = Math.ceil((first.getUTCDay() + lastDay.getUTCDate()) / 7);
  const today = formatDateKey(new Date());

  return Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    const key = formatDateKey(date);
    return {
      key,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month.getUTCMonth(),
      isToday: key === today,
    };
  });
}

export function monthRange(month: Date): { from: string; to: string } {
  return {
    from: formatDateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1))),
    to: formatDateKey(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0))),
  };
}

export function calendarRange(dates: readonly CalendarDate[]): { from: string; to: string } {
  return {
    from: dates[0]?.key ?? '',
    to: dates.at(-1)?.key ?? '',
  };
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

function formatCompactTime(value: string | null): string {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours >= 12 ? 'p' : 'a';
  const displayHours = hours % 12 || 12;
  const compactMinutes = minutes ? `:${String(minutes).padStart(2, '0')}` : '';
  return `${displayHours}${compactMinutes}${period}`;
}

export function compactScheduleTimes(
  open: string | null,
  close: string | null,
): readonly [string, string] {
  return [formatCompactTime(open), formatCompactTime(close)];
}

export function compactTimeRange(open: string | null, close: string | null): string {
  const [start, end] = compactScheduleTimes(open, close);
  return `${start}-${end}`;
}

export function scheduleCellShowsSourceLabel(
  _source: ScheduleCellSummary['source'],
): boolean {
  return false;
}

export function scheduleCellClosedLabel(
  effective: ReturnType<typeof effectiveHoursForDate>,
): 'Closed' | null {
  return effective.isClosed && effective.closedReason === 'closed' ? 'Closed' : null;
}

function toOverrideRow(record: ScheduleOverrideRecord): OverrideRow {
  return {
    serviceDate: record.service_date,
    isClosed: record.is_closed,
    isAllDay: record.is_all_day,
    startTime: record.start_time,
    endTime: record.end_time,
    endsNextDay: record.ends_next_day,
    timezone: record.timezone,
    location: record.location_data,
  };
}

function locationText(location: OverrideRow['location'] | string | null): string | null {
  if (!location) return null;
  if (typeof location === 'string') return location;
  return [location.address, location.city, location.state].filter(Boolean).join(', ') || null;
}

function nextMonth(month: Date, offset: number): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + offset, 1));
}

export function summarizeScheduleCell(
  effective: ReturnType<typeof effectiveHoursForDate>,
  override: boolean,
): ScheduleCellSummary {
  const status = effective.isClosed
    ? effective.closedReason === 'closed'
      ? 'Closed'
      : 'No hours'
    : effective.isAllDay
      ? 'All day'
      : `${formatTime(effective.open)} - ${formatTime(effective.close)}`;
  return {
    status,
    source: override ? 'One-off' : 'Recurring',
    location: locationText(effective.location),
  };
}

export function ScheduleCalendar({
  truckId,
  refreshKey,
  headerLeft,
  headerRight,
  onEditRecurringDay,
  onCloseRecurringDay,
  onAddRecurringDay,
  onEditDatedDay,
  onEditRecurrenceDay,
  onRemoveDatedOverride,
  onDeleteDatedOverride,
  onDeleteRecurrenceDate,
}: ScheduleCalendarProps) {
  const [month, setMonth] = useState(() => new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dates = useMemo(() => getMonthDates(month), [month]);
  const range = useMemo(() => calendarRange(dates), [dates]);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dockRef = useRef<HTMLDivElement | null>(null);
  const requestIdentityRef = useRef<string | null>(null);
  const animationsEnabled = useSettingsStore((state) => state.settings.animations);
  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    if (!truckId) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    let active = true;
    const requestIdentity = `${truckId}:${range.from}:${range.to}`;
    if (requestIdentityRef.current !== requestIdentity) {
      requestIdentityRef.current = requestIdentity;
      setData(null);
    }
    setError(null);

    fetch(`/api/owner/schedule?truck_id=${truckId}&from=${range.from}&to=${range.to}`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load schedule calendar');
        return (await response.json()) as ScheduleResponse;
      })
      .then((responseData) => {
        if (active) setData(responseData);
      })
      .catch((loadError: unknown) => {
        if (!active || loadError instanceof DOMException && loadError.name === 'AbortError') return;
        setData(null);
        setError(loadError instanceof Error ? loadError.message : 'Unable to load schedule calendar');
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [range.from, range.to, refreshKey, truckId]);

  const overrides = useMemo(
    () => new Map((data?.overrides ?? []).map((override) => [override.service_date, override])),
    [data?.overrides],
  );

  // Merge precedence: dated override > recurrence occurrence > operating_hours.
  const occurrences = useMemo(
    () => new Map((data?.occurrences ?? []).map((occurrence) => [occurrence.serviceDate, occurrence])),
    [data?.occurrences],
  );
  const recurrences = useMemo(
    () => new Map((data?.recurrences ?? []).map((recurrence) => [recurrence.id, recurrence])),
    [data?.recurrences],
  );

  function occurrenceToOverrideRow(occurrence: RecurrenceOccurrenceRecord): OverrideRow {
    return {
      serviceDate: occurrence.serviceDate,
      isClosed: false,
      isAllDay: false,
      startTime: occurrence.startTime,
      endTime: occurrence.endTime,
      endsNextDay: occurrence.endsNextDay,
      timezone: data?.truck?.timezone ?? 'UTC',
      location: occurrence.location,
    };
  }

  const hasDatedOrigin = useCallback(
    (origin: 'override' | 'recurrence' | 'recurring'): boolean => origin !== 'recurring',
    [],
  );

  function effectiveForDate(dateKey: string): ResolvedScheduleSlice {
    const override = overrides.get(dateKey);
    if (override) {
      return {
        effective: effectiveHoursForDate(dateKey, data?.truck?.timezone ?? 'UTC', {}, toOverrideRow(override)),
        origin: 'override',
      };
    }
    const occurrence = occurrences.get(dateKey);
    if (occurrence) {
      return {
        effective: effectiveHoursForDate(
          dateKey,
          data?.truck?.timezone ?? 'UTC',
          {},
          occurrenceToOverrideRow(occurrence),
        ),
        origin: 'recurrence',
      };
    }
    return {
      effective: effectiveHoursForDate(
        dateKey,
        data?.truck?.timezone ?? 'UTC',
        data?.truck?.operating_hours ?? {},
        null,
      ),
      origin: 'recurring',
    };
  }

  const actionsByKey = useMemo(() => {
    const map = new Map<string, readonly ParticleAction[]>();
    if (!data) return map;
    for (const date of dates) {
      const override = overrides.get(date.key);
      if (override) {
        map.set(date.key, override.is_closed ? ['add', 'delete'] : ['edit', 'delete']);
        continue;
      }
      if (!weekdayForDateKey(date.key)) {
        map.set(date.key, []);
        continue;
      }
      const { effective } = effectiveForDate(date.key);
      map.set(date.key, effective.isClosed ? ['add'] : ['edit', 'delete']);
    }
    return map;
  }, [data, dates, overrides, occurrences]);

  const actionsForKey = useCallback(
    (key: string): readonly ParticleAction[] => {
      const actions = actionsByKey.get(key) ?? [];
      if (!isMobile) return actions;
      if (actions.includes('edit')) return ['edit'];
      return actions.length > 0 ? ['add'] : [];
    },
    [actionsByKey, isMobile],
  );

  const handleParticleAction = useCallback(
      async (action: ParticleAction, key: string): Promise<void> => {
        const day = weekdayForDateKey(key) as DayOfWeek | null;
        if (!day) return;
        const override = overrides.get(key);
        const occurrence = occurrences.get(key);
        const { effective } = effectiveForDate(key);
        switch (action) {
        case 'add': {
        if (override) onEditDatedDay?.(key, override.start_time ?? '09:00', override.end_time ?? '17:00', locationText(override.location_data) ?? '');
        else if (occurrence) {
          const recurrence = recurrences.get(occurrence.seriesId);
          if (recurrence) onEditRecurrenceDay?.(key, recurrence);
        }
        else if (effective.isClosed) onAddRecurringDay?.(day, key, effective.open, effective.close, locationText(effective.location) ?? '');
        else onEditRecurringDay?.(day, key, effective.open, effective.close, locationText(effective.location) ?? '');
        break;
        }
        case 'edit': {
        if (override) onEditDatedDay?.(key, override.start_time ?? '09:00', override.end_time ?? '17:00', locationText(override.location_data) ?? '');
        else if (occurrence) {
          const recurrence = recurrences.get(occurrence.seriesId);
          if (recurrence) onEditRecurrenceDay?.(key, recurrence);
        }
        else onEditRecurringDay?.(day, key, effective.open, effective.close, locationText(effective.location) ?? '');
        break;
        }
        case 'delete': {
          if (override?.is_closed) await onRemoveDatedOverride?.(key);
          else if (override) onDeleteDatedOverride?.(key);
          else if (occurrence) onDeleteRecurrenceDate?.(key, occurrence.seriesId, day);
          else await onCloseRecurringDay?.(day, key);
        break;
      }
      // No default
      }
    },
    [occurrences, onAddRecurringDay, onCloseRecurringDay, onDeleteDatedOverride, onDeleteRecurrenceDate, onEditDatedDay, onEditRecurrenceDay, onEditRecurringDay, onRemoveDatedOverride, overrides, recurrences],
  );

  const initialActionKey = dates.find((date) => date.inMonth)?.key ?? dates[0]?.key ?? '';

  function resetMonth(): void {
    const today = new Date();
    setMonth(new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1)));
  }

  if (!truckId) {
    return <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">Add a truck to view its schedule.</div>;
  }

  return (
    <section className="space-y-4" aria-label="Schedule calendar" data-testid="schedule-calendar">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">{headerLeft}</div>
        <div className="flex flex-wrap items-center gap-2">
          {headerRight}
          <Button variant="outline" size="sm" onClick={resetMonth}>Today</Button>
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth((current) => nextMonth(current, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-32 text-center text-sm font-medium">{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</span>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth((current) => nextMonth(current, 1))}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      {!data && !error && (
        <div className="rounded-xl border border-border bg-card p-8" role="status" aria-label="Loading schedule">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-56 animate-pulse rounded-lg bg-muted/70" />
        </div>
      )}

      {data && <div ref={stageRef} className="relative overflow-hidden rounded-xl bg-black p-[2px]">
        <div className="grid grid-cols-7 gap-[2px]">
          {WEEKDAYS.map((weekday, index) => (
            <div
              key={weekday}
              data-testid={`schedule-header-${weekday.toLowerCase()}`}
              className={`${HEADER_COLORS[index]} py-2.5 text-center text-[11px] font-black text-white`}
            >
              {isMobile ? weekday[0] : weekday}
            </div>
          ))}
        </div>
        <div ref={gridRef} className="mt-[2px] grid grid-cols-7 gap-[2px]">
          {dates.map((date, cellIndex) => {
            const { effective, origin } = effectiveForDate(date.key);
            const summary = summarizeScheduleCell(effective, hasDatedOrigin(origin));
            const cellBackground = date.isToday
              ? { backgroundColor: '#1d4441' }
              : { backgroundColor: cellIndex % 7 % 2 === 0 ? '#151515' : '#262626' };

            return (
              <div
                key={date.key}
                className={`particle-day-cell relative flex min-h-[76px] flex-col p-1 sm:min-h-[170px] sm:p-3 ${date.inMonth ? '' : 'opacity-60'}`}
                style={cellBackground}
                data-testid={`schedule-date-${date.key}`}
                data-key={date.key}
                tabIndex={0}
                role="button"
                aria-label={`${date.key} schedule: ${summary.status}`}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.currentTarget.click();
                  }
                }}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-sm font-bold leading-none sm:text-xs sm:font-semibold sm:leading-normal ${date.inMonth ? 'text-neutral-200 sm:text-neutral-300' : 'text-neutral-500'}`}
                  >
                    {date.day}
                  </span>
                </div>
                {scheduleCellClosedLabel(effective) ? (
                  <div className="mt-2 text-[9px] font-bold uppercase leading-none tracking-tight text-red-400 sm:mt-3 sm:text-[11px] sm:leading-normal sm:tracking-wide">
                    <span className="sm:hidden">Closed</span>
                    <span className="hidden sm:inline">Closed</span>
                  </div>
                ) : effective.isClosed ? null : (
                  <div className="mt-2 sm:mt-3">
                    <div className="flex items-center gap-1 sm:hidden">
                      <span className="truncate text-[9px] font-semibold leading-none text-neutral-100">
                        {effective.isAllDay ? 'All day' : compactTimeRange(effective.open, effective.close)}
                      </span>
                      <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                      />
                    </div>
                    <div className="hidden sm:block">
                      <div className="text-[11px] font-bold uppercase leading-normal tracking-wide text-emerald-400">
                        Open
                      </div>
                      {effective.isAllDay ? (
                        <div className="mt-1 whitespace-nowrap text-sm font-semibold text-neutral-100">
                          <Clock className="mr-1 inline h-3 w-3 text-emerald-400" />
                          {summary.status}
                        </div>
                      ) : (
                        <div className="mt-1 inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold leading-normal text-neutral-100">
                          <Clock className="h-3 w-3 shrink-0 text-emerald-400" />
                          <span>{compactTimeRange(effective.open, effective.close)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {summary.location ? (
                  <div className="mt-1 flex min-w-0 items-start gap-1 text-[9px] leading-tight text-neutral-300 sm:mt-2 sm:text-xs sm:leading-tight sm:text-neutral-400">
                    <MapPin className="mt-0.5 hidden h-3 w-3 shrink-0 sm:block" />
                    <span className="line-clamp-2 sm:whitespace-normal">
                      {summary.location}
                    </span>
                  </div>
                ) : effective.isClosed ? null : (
                  <div className="mt-1 truncate text-[8px] leading-none text-neutral-600 sm:mt-2 sm:whitespace-normal sm:text-xs sm:leading-tight">
                    <span className="sm:hidden">No location</span>
                    <span className="hidden sm:inline">No location set</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <canvas
          ref={canvasRef}
          className="particle-action-canvas"
          aria-hidden="true"
        />
        <div ref={dockRef} className="particle-action-dock traveling" aria-label="Selected date actions" style={{ opacity: 0 }}>
          {ACTION_ORDER.map((action) => (
            <button
              key={action}
              type="button"
              className={`particle-action-button particle-action-${action}`}
              style={{ color: ACTION_COLORS[action] }}
              data-action={action}
              aria-label={ACTION_ARIA[action]}
            >
              {action === 'add' && <Plus className="h-5 w-5" aria-hidden="true" />}
              {action === 'edit' && <Pencil className="h-5 w-5" aria-hidden="true" />}
              {action === 'delete' && <Trash2 className="h-5 w-5" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <ParticleActionLayer
          stageRef={stageRef}
          gridRef={gridRef}
          canvasRef={canvasRef}
          dockRef={dockRef}
          actionsForKey={actionsForKey}
          onAction={handleParticleAction}
          initialKey={initialActionKey}
          animationsEnabled={animationsEnabled}
        />
      </div>}
    </section>
  );
}
