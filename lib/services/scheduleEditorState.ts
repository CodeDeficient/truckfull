import { normalizeOverrideTime, weekdayForDateKey } from '@/lib/services/scheduleOverride';
import type { DayOfWeek } from '@/lib/types';

export type ScheduleEditorFrequency = 'daily' | 'weekly' | 'monthly';
export type ScheduleEditorMonthlyMode = 'same_date' | 'ordinal_weekday';

export interface ScheduleEditorRecurrence {
  readonly id: string;
  readonly frequency: string;
  readonly monthly_mode: string | null;
  readonly start_date: string;
  readonly occurrences: number | null;
  readonly start_time: string;
  readonly end_time: string;
  readonly location_data: { readonly address?: string } | null;
}

export interface ScheduleEditorState {
  readonly target: string;
  readonly seriesStartDate: string;
  readonly day: DayOfWeek;
  readonly source: 'empty' | 'override' | 'weekly' | 'recurrence';
  readonly seriesId: string | null;
  readonly start: string;
  readonly end: string;
  readonly location: string;
  readonly repeat: boolean;
  readonly frequency: ScheduleEditorFrequency;
  readonly monthlyMode: ScheduleEditorMonthlyMode;
  readonly endMode: 'never' | 'after';
  readonly occurrences: number;
}

function normalizedTime(value: string | null, fallback: string): string {
  const normalized = normalizeOverrideTime(value ?? fallback);
  if (!normalized) throw new Error('Schedule times must use HH:MM format');
  return normalized;
}

function dayForDate(target: string, day?: DayOfWeek): DayOfWeek {
  return day ?? (weekdayForDateKey(target) as DayOfWeek | null) ?? 'monday';
}

export function createEmptyScheduleEditor(target: string, day: DayOfWeek): ScheduleEditorState {
  return {
    target, seriesStartDate: target, day, source: 'empty', seriesId: null,
    start: '09:00', end: '17:00', location: '', repeat: false,
    frequency: 'weekly', monthlyMode: 'same_date', endMode: 'never', occurrences: 4,
  };
}

export function createOverrideScheduleEditor(
  target: string,
  start: string,
  end: string,
  location: string,
): ScheduleEditorState {
  return {
    target, seriesStartDate: target, day: dayForDate(target), source: 'override', seriesId: null,
    start: normalizedTime(start, '09:00'), end: normalizedTime(end, '17:00'), location,
    repeat: false, frequency: 'weekly', monthlyMode: 'same_date', endMode: 'never', occurrences: 4,
  };
}

export function createWeeklyScheduleEditor(
  target: string,
  day: DayOfWeek,
  start: string | null,
  end: string | null,
  location: string,
): ScheduleEditorState {
  return {
    target, seriesStartDate: target, day, source: 'weekly', seriesId: null,
    start: normalizedTime(start, '09:00'), end: normalizedTime(end, '17:00'), location,
    repeat: true, frequency: 'weekly', monthlyMode: 'same_date', endMode: 'never', occurrences: 4,
  };
}

export function createRecurrenceScheduleEditor(
  target: string,
  recurrence: ScheduleEditorRecurrence,
): ScheduleEditorState {
  const frequency = recurrence.frequency === 'daily' || recurrence.frequency === 'monthly'
    ? recurrence.frequency
    : 'weekly';
  const monthlyMode = recurrence.monthly_mode === 'ordinal_weekday'
    ? 'ordinal_weekday'
    : 'same_date';
  return {
    target, seriesStartDate: recurrence.start_date,
    day: dayForDate(target), source: 'recurrence', seriesId: recurrence.id,
    start: normalizedTime(recurrence.start_time, '09:00'),
    end: normalizedTime(recurrence.end_time, '17:00'),
    location: recurrence.location_data?.address?.trim() ?? '',
    repeat: true, frequency, monthlyMode,
    endMode: recurrence.occurrences === null ? 'never' : 'after',
    occurrences: recurrence.occurrences ?? 4,
  };
}

export function scheduleEditorSaveKind(
  editor: ScheduleEditorState,
): 'override' | 'weekly' | 'recurrence-create' | 'recurrence-update' {
  if (!editor.repeat) return 'override';
  if (editor.seriesId) return 'recurrence-update';
  if (editor.frequency === 'weekly' && editor.endMode === 'never') return 'weekly';
  return 'recurrence-create';
}
