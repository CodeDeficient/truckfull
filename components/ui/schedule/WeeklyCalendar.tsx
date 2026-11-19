'use client';

import * as React from 'react';
import { MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/AlertDialog';
import type { DayOfWeek } from '@/lib/types';
import type { WeeklyDayModel } from '@/lib/mappers/weeklyScheduleModel';

export interface WeeklyCalendarProps {
  readonly days: ReadonlyArray<WeeklyDayModel>;
  readonly defaultLocation?: string;
  readonly onSaveDay: (
    day: DayOfWeek,
    open: string,
    close: string,
    location?: string,
  ) => Promise<void>;
  readonly onCloseDay: (day: DayOfWeek) => Promise<void>;
}

type SavingState = 'idle' | 'saving' | 'error';
type DayAction = { readonly day: DayOfWeek; readonly kind: 'edit' | 'add' };

const CALENDAR_DAY_ORDER: readonly DayOfWeek[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const CALENDAR_DAY_HEADERS: Record<DayOfWeek, string> = {
  sunday: 'S',
  monday: 'M',
  tuesday: 'T',
  wednesday: 'W',
  thursday: 'T',
  friday: 'F',
  saturday: 'S',
};

const CALENDAR_HEADER_COLORS: readonly string[] = [
  'bg-[#7f1d1d]',
  'bg-[#9a3412]',
  'bg-[#854d0e]',
  'bg-[#166534]',
  'bg-[#155e75]',
  'bg-[#1d4ed8]',
  'bg-[#7e22ce]',
];

function formatTime(value: string): string {
  if (!value || !value.includes(':')) return value;
  const [hh, mm] = value.split(':');
  const h = Number(hh);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:${mm ?? '00'} ${period}`;
}

function formatCompactTime(value: string): string {
  return formatTime(value).replace(' AM', 'a').replace(' PM', 'p');
}

function getCurrentDay(): DayOfWeek {
  return CALENDAR_DAY_ORDER[new Date().getDay()];
}

export function WeeklyCalendar({
  days,
  defaultLocation,
  onSaveDay,
  onCloseDay,
}: WeeklyCalendarProps) {
  const [editing, setEditing] = React.useState<DayAction | null>(null);
  const [draftOpen, setDraftOpen] = React.useState('');
  const [draftClose, setDraftClose] = React.useState('');
  const [draftLocation, setDraftLocation] = React.useState('');
  const [savingState, setSavingState] = React.useState<SavingState>('idle');
  const [deletingDay, setDeletingDay] = React.useState<DayOfWeek | null>(null);
  const [hoveredCloseDay, setHoveredCloseDay] = React.useState<DayOfWeek | null>(null);
  const [deletingState, setDeletingState] = React.useState<SavingState>('idle');

  const currentDay = React.useMemo(() => getCurrentDay(), []);
  const dayByKey = React.useMemo(
    () => new Map(days.map((d) => [d.day, d])),
    [days],
  );
  const editingDay = editing ? dayByKey.get(editing.day) : undefined;

  function startEdit(day: DayOfWeek, model: WeeklyDayModel) {
    setEditing({ day, kind: model.isOpen ? 'edit' : 'add' });
    setDraftOpen(model.open ?? '09:00');
    setDraftClose(model.close ?? '17:00');
    setDraftLocation(model.location ?? defaultLocation ?? '');
    setSavingState('idle');
  }

  function cancelEdit() {
    if (savingState === 'saving') return;
    setEditing(null);
    setSavingState('idle');
  }

  async function submitEdit(day: DayOfWeek) {
    setSavingState('saving');
    try {
      await onSaveDay(day, draftOpen, draftClose, draftLocation);
      setEditing(null);
      setSavingState('idle');
    } catch {
      setSavingState('error');
    }
  }

  async function confirmClose(day: DayOfWeek) {
    setDeletingState('saving');
    try {
      await onCloseDay(day);
      setDeletingDay(null);
      setDeletingState('idle');
    } catch {
      setDeletingState('error');
    }
  }

  return (
    <div className="w-full sm:px-6 lg:px-8" data-testid="weekly-calendar">
      <div className="overflow-hidden rounded-xl bg-black p-[2px]">
        <div className="grid grid-cols-7 gap-[2px]">
          {CALENDAR_DAY_ORDER.map((dayKey, idx) => (
            <div
              key={dayKey}
              data-testid={`header-${dayKey}`}
              className={[
                CALENDAR_HEADER_COLORS[idx],
                'py-2.5 text-center text-[11px] font-black text-white',
                idx === 0 ? 'rounded-tl-xl' : '',
                idx === 6 ? 'rounded-tr-xl' : '',
              ].join(' ')}
            >
              {CALENDAR_DAY_HEADERS[dayKey]}
            </div>
          ))}
        </div>

        <div className="mt-[2px] grid grid-cols-7 gap-[2px]">
          {CALENDAR_DAY_ORDER.map((dayKey, cellIndex) => {
            const day = dayByKey.get(dayKey);
            if (!day) return null;
            const isToday = day.day === currentDay;
            const displayLocation = day.location ?? defaultLocation;
            const altBg = cellIndex % 2 === 0 ? 'bg-[#151515]' : '';
            const cellBg = isToday ? '' : day.isOpen ? altBg : 'bg-[#121212]';
            const openClass = 'text-emerald-400';
            const mainTextClass = 'text-neutral-100';
            const mutedTextClass = 'text-neutral-400';
            const emptyLocationClass = 'text-neutral-600';
            const editIconClass =
              'inline-flex h-8 w-8 items-center justify-center rounded-modern bg-transparent text-neutral-400 transition-colors hover:bg-transparent hover:text-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40';
            const closeIconClass =
              'inline-flex h-8 w-8 items-center justify-center rounded-modern bg-transparent text-neutral-400 transition-colors hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 active:bg-transparent data-[state=open]:bg-transparent';
            const closeIsActive = hoveredCloseDay === day.day || deletingDay === day.day;
            return (
              <div
                key={day.day}
                data-testid={`day-${day.day}`}
                style={
                  isToday
                    ? { backgroundColor: '#1d4441' }
                    : cellIndex % 2 === 1 && day.isOpen
                      ? { backgroundColor: '#262626' }
                      : undefined
                }
                className={[
                  'relative flex min-h-[185px] flex-col p-2 sm:min-h-[200px] sm:p-3',
                  cellBg,
                  !day.isOpen && !isToday ? 'text-neutral-600' : '',
                ].join(' ')}
                role="button"
                tabIndex={0}
                aria-label={`${day.label} schedule`}
                onClick={(event) => {
                  if (event.target !== event.currentTarget) return;
                  startEdit(day.day, day);
                }}
                onKeyDown={(event) => {
                  if (event.target !== event.currentTarget) return;
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  startEdit(day.day, day);
                }}
              >
                {isToday && (
                  <span
                    data-testid={`today-${day.day}`}
                    // Hidden on mobile by explicit user decision — the today cell
                    // background (#1d4441) remains the mobile cue; the pill was
                    // too dense at narrow widths. Visible at sm: and up.
                    className="absolute right-2 top-2 hidden rounded-full bg-blue-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm shadow-blue-950/30 sm:inline-flex"
                  >
                    Today
                  </span>
                )}

                {day.isOpen ? (
                  <>
                    <div className="mt-0 max-sm:pointer-events-none sm:mt-4">
                      <div className={['text-[9px] font-bold uppercase tracking-wide sm:text-[10px]', openClass].join(' ')}>
                        Open
                      </div>
                      <div className={['mt-1 whitespace-nowrap text-[11px] font-semibold sm:text-sm', mainTextClass].join(' ')}>
                        <span className="sm:hidden">{formatCompactTime(day.open ?? '00:00')}</span>
                        <span className="hidden sm:inline">{formatTime(day.open ?? '00:00')}</span>
                      </div>
                      <div className={['whitespace-nowrap text-[11px] font-semibold sm:text-sm', mainTextClass].join(' ')}>
                        <span className="hidden sm:inline">- </span>
                        <span className="sm:hidden">{formatCompactTime(day.close ?? '00:00')}</span>
                        <span className="hidden sm:inline">{formatTime(day.close ?? '00:00')}</span>
                      </div>
                    </div>
                    {displayLocation ? (
                      <div className={['mt-1 text-[9px] leading-tight max-sm:pointer-events-none sm:mt-2 sm:flex sm:items-start sm:gap-1 sm:text-xs', mutedTextClass].join(' ')}>
                        <MapPin className="mt-0.5 hidden h-3 w-3 shrink-0 sm:block" aria-hidden="true" />
                        <span className="line-clamp-2">{displayLocation}</span>
                      </div>
                    ) : (
                      // "No location set" is hidden on mobile by explicit user
                      // decision — the mobile density pass prioritizes actual
                      // hours/location content over empty-state prompts. Visible
                      // at sm: and up.
                      <div className={['mt-2 hidden items-center gap-1 text-xs sm:flex', emptyLocationClass].join(' ')}>
                        <MapPin className="h-3 w-3" aria-hidden="true" />
                        <span>No location set</span>
                      </div>
                    )}
                    <div className="mt-auto hidden items-center gap-1 pt-4 sm:flex">
                      <button
                        type="button"
                        className={editIconClass}
                        data-testid={`edit-${day.day}`}
                        aria-label={`Edit ${day.label} hours`}
                        onClick={() => startEdit(day.day, day)}
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <AlertDialog
                        open={deletingDay === day.day}
                        onOpenChange={(open) => {
                          setDeletingDay(open ? day.day : null);
                          setDeletingState('idle');
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <button
                            type="button"
                            className={closeIconClass}
                            data-testid={`delete-${day.day}`}
                            aria-label={`Close ${day.label}`}
                            onMouseEnter={() => setHoveredCloseDay(day.day)}
                            onMouseLeave={() => setHoveredCloseDay(null)}
                          >
                            <Trash2
                              className="h-3.5 w-3.5 transition-colors"
                              style={{ color: closeIsActive ? '#ef4444' : undefined }}
                              aria-hidden="true"
                            />
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Close {day.label}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark {day.label} as closed. You can add hours again later.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          {deletingState === 'error' && (
                            <p className="px-6 text-sm text-red-400" role="alert">
                              Failed to close. Try again.
                            </p>
                          )}
                          <AlertDialogFooter>
                            <AlertDialogCancel data-testid={`cancel-close-${day.day}`}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              data-testid={`confirm-close-${day.day}`}
                              disabled={deletingState === 'saving'}
                              onClick={(e) => {
                                e.preventDefault();
                                void confirmClose(day.day);
                              }}
                            >
                              {deletingState === 'saving' ? 'Closing...' : 'Close day'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className={[
                        'mt-0 max-sm:pointer-events-none text-[9px] font-bold uppercase tracking-wide text-red-400 sm:mt-4 sm:text-sm sm:font-semibold sm:normal-case sm:tracking-normal sm:text-neutral-400',
                      ].join(' ')}
                    >
                      Closed
                    </div>
                    <button
                      type="button"
                      className={['mt-auto hidden sm:inline-flex', editIconClass].join(' ')}
                      data-testid={`add-${day.day}`}
                      aria-label={`Add ${day.label} hours`}
                      onClick={() => startEdit(day.day, day)}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Dialog
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) cancelEdit();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing?.kind === 'add' ? 'Add' : 'Edit'} {editingDay?.label ?? 'Day'} Hours
            </DialogTitle>
            <DialogDescription>
              Set the recurring weekly hours and location shown on your public truck profile.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div data-testid={`edit-form-${editing.day}`} className="grid gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`open-${editing.day}`}>Open</Label>
                  <Input
                    id={`open-${editing.day}`}
                    type="time"
                    value={draftOpen}
                    data-testid={`open-input-${editing.day}`}
                    onChange={(e) => setDraftOpen(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`close-${editing.day}`}>Close</Label>
                  <Input
                    id={`close-${editing.day}`}
                    type="time"
                    value={draftClose}
                    data-testid={`close-input-${editing.day}`}
                    onChange={(e) => setDraftClose(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`location-${editing.day}`}>Location</Label>
                <Input
                  id={`location-${editing.day}`}
                  type="text"
                  value={draftLocation}
                  placeholder="e.g. Marion Square, Downtown"
                  data-testid={`location-input-${editing.day}`}
                  onChange={(e) => setDraftLocation(e.target.value)}
                />
              </div>
              {savingState === 'error' && (
                <div className="text-sm text-destructive">Save failed. Try again.</div>
              )}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={cancelEdit} data-testid={`cancel-edit-${editing.day}`}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  data-testid={`save-${editing.day}`}
                  disabled={savingState === 'saving'}
                  onClick={() => void submitEdit(editing.day)}
                >
                  {savingState === 'saving' ? 'Saving...' : 'Save hours'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
