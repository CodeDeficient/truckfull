import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Clock, Truck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { describeMonthlyChoice, describeMonthlySkipNote } from '@/lib/services/scheduleRecurrence';
import { normalizeOverrideTime } from '@/lib/services/scheduleOverride';
import {
  createEmptyScheduleEditor,
  createOverrideScheduleEditor,
  createRecurrenceScheduleEditor,
  createWeeklyScheduleEditor,
  scheduleEditorSaveKind,
  type ScheduleEditorState,
} from '@/lib/services/scheduleEditorState';
import { ScheduleCalendar, type ScheduleRecurrenceRecord } from './ScheduleCalendar';
import { NoTrucksGuidance } from './NoTrucksGuidance';
import { convertOneOffToWeeklySchedule } from '@/lib/services/scheduleConversion';
import {
  buildScheduleUpdatePayload,
  closeDay,
  setDayHours,
} from '@/lib/mappers/weeklyScheduleModel';
import type { DayOfWeek, FoodTruckDomain, FoodTruckOperatingHours } from '@/lib/types';

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

interface ScheduleTabProps {
  readonly trucks: ReadonlyArray<FoodTruckDomain>;
  readonly onOperatingHoursChange?: (
    truckId: string,
    operatingHours: FoodTruckOperatingHours,
  ) => void;
}

export function formatServiceDate(dateKey: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

type DeleteTarget = {
  kind: 'recurring' | 'dated' | 'series';
  day: DayOfWeek;
  serviceDate: string;
  seriesId?: string;
};

export function getDeleteDialogCopy(target: DeleteTarget): {
  title: string;
  description: string;
  primary: string;
  secondary: string;
} {
  const date = formatServiceDate(target.serviceDate);
  if (target.kind === 'series') {
    return {
      title: 'Delete repeating schedule',
      description: `This removes the repeating schedule that includes ${date}. Dates already saved individually are kept.`,
      primary: 'Delete repeating schedule',
      secondary: `Close ${date} only`,
    };
  }
  if (target.kind === 'dated') {
    return {
      title: 'Change date-specific schedule',
      description: `Choose whether to remove the date-specific schedule or close ${date}.`,
      primary: 'Remove date-specific schedule',
      secondary: `Close ${date}`,
    };
  }
  const day = DAY_LABELS[target.day];
  return {
    title: 'Close schedule',
    description: `Choose whether to close every ${day} or close only ${date}.`,
    primary: `Close every ${day}`,
    secondary: `Close ${date} only`,
  };
}

export function ScheduleTab({ trucks, onOperatingHoursChange }: ScheduleTabProps) {
  const [selectedTruckId, setSelectedTruckId] = useState<string | undefined>(
    trucks[0]?.id,
  );

  const selectedTruck = trucks.find((t) => t.id === selectedTruckId);

  // Local source of truth for operating hours — avoids stale-snapshot bugs
  // when editing multiple days in succession before parent state propagates.
  const [hoursState, setHoursState] = useState<FoodTruckOperatingHours | null>(
    selectedTruck?.operating_hours ?? null,
  );

  // Reset local hours when the selected truck changes.
  useEffect(() => {
    setHoursState(selectedTruck?.operating_hours ?? null);
  }, [selectedTruckId]);

  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);
  const [dateEditor, setDateEditor] = useState<ScheduleEditorState | null>(null);
  const [dateEditorError, setDateEditorError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function updateDateEditor(patch: Partial<ScheduleEditorState>): void {
    setDateEditor((current) => current ? { ...current, ...patch } : null);
  }

  function closeDateEditor(): void {
    setDateEditor(null);
    setDateEditorError(null);
  }

  async function persistOperatingHours(nextHours: FoodTruckOperatingHours): Promise<void> {
    if (!selectedTruck) return;
    const response = await fetch(`/api/trucks/${selectedTruck.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildScheduleUpdatePayload(nextHours)),
    });
    if (!response.ok) {
      throw new Error(`Failed to save schedule (status ${response.status})`);
    }
    setHoursState(nextHours);
    onOperatingHoursChange?.(selectedTruck.id, nextHours);
    setScheduleRefreshKey((current) => current + 1);
  }

  async function handleCloseDay(day: DayOfWeek): Promise<void> {
    const nextHours = closeDay(hoursState, day);
    await persistOperatingHours(nextHours);
  }

  function requestDeleteConfirmation(day: DayOfWeek, serviceDate: string): void {
    setDeleteError(null);
    setDeleteTarget({ kind: 'recurring', day, serviceDate });
  }

  function requestDatedDelete(serviceDate: string): void {
    setDeleteError(null);
    setDeleteTarget({ kind: 'dated', day: 'monday', serviceDate });
  }

  async function removeDatedOverride(serviceDate: string): Promise<void> {
    if (!selectedTruck || isDeleting) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const response = await fetch('/api/owner/schedule/override', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truck_id: selectedTruck.id, service_date: serviceDate }),
      });
      if (!response.ok) throw new Error('Unable to remove date-specific schedule');
      setScheduleRefreshKey((current) => current + 1);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to remove date-specific schedule');
    } finally {
      setIsDeleting(false);
    }
  }

  function requestDatedEdit(serviceDate: string, startTime: string, endTime: string, location: string): void {
    setDateEditorError(null);
    setDateEditor(createOverrideScheduleEditor(serviceDate, startTime, endTime, location));
  }

  function requestRecurringEdit(
    day: DayOfWeek,
    serviceDate: string,
    openTime: string | null,
    closeTime: string | null,
    location: string,
  ): void {
    setDateEditorError(null);
    setDateEditor(createWeeklyScheduleEditor(serviceDate, day, openTime, closeTime, location));
  }

  function requestEmptyEdit(day: DayOfWeek, serviceDate: string): void {
    setDateEditorError(null);
    setDateEditor(createEmptyScheduleEditor(serviceDate, day));
  }

  function requestRecurrenceEdit(serviceDate: string, recurrence: ScheduleRecurrenceRecord): void {
    setDateEditorError(null);
    setDateEditor(createRecurrenceScheduleEditor(serviceDate, recurrence));
  }

  function requestDeleteFromEditor(): void {
    if (!dateEditor) return;
    closeDateEditor();
    if (dateEditor.source === 'override') {
      requestDatedDelete(dateEditor.target);
    } else if (dateEditor.source === 'recurrence' && dateEditor.seriesId) {
      requestSeriesDelete(dateEditor.target, dateEditor.seriesId, dateEditor.day);
    } else if (dateEditor.source === 'weekly') {
      requestDeleteConfirmation(dateEditor.day, dateEditor.target);
    }
  }

  async function submitDatedEdit(): Promise<void> {
    if (!dateEditor || !selectedTruck) return;
    const normalizedStart = normalizeOverrideTime(dateEditor.start);
    const normalizedEnd = normalizeOverrideTime(dateEditor.end);
    if (!normalizedStart || !normalizedEnd) {
      setDateEditorError('Schedule times must use HH:MM format');
      return;
    }
    if (normalizedStart === normalizedEnd) {
      setDateEditorError('Opening and closing times must differ');
      return;
    }
    setIsSaving(true);
    try {
      const saveKind = scheduleEditorSaveKind(dateEditor);
      if (saveKind === 'override') {
        const response = await fetch('/api/owner/schedule/override', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            truck_id: selectedTruck.id,
            service_date: dateEditor.target,
            start_time: normalizedStart,
            end_time: normalizedEnd,
            location_data: dateEditor.location.trim() ? { address: dateEditor.location.trim() } : null,
          }),
        });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error ?? 'Unable to save date-specific schedule');
        }
      } else {
        if (saveKind === 'weekly') {
          const previousHours = hoursState ?? {};
          const nextHours = setDayHours(
            hoursState,
            dateEditor.day,
            normalizedStart,
            normalizedEnd,
            dateEditor.location,
          );
          if (dateEditor.source === 'override') {
            const conversion = await convertOneOffToWeeklySchedule({
              saveWeekly: () => persistOperatingHours(nextHours),
              removeOverride: async () => {
                const removal = await fetch('/api/owner/schedule/override', {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ truck_id: selectedTruck.id, service_date: dateEditor.target }),
                });
                if (!removal.ok) throw new Error('Unable to remove date-specific schedule');
              },
              restoreWeekly: () => persistOperatingHours(previousHours),
            });
            if (!conversion.success) throw new Error(conversion.error);
          } else {
            await persistOperatingHours(nextHours);
          }
        } else {
          const response = await fetch('/api/owner/schedule/recurrence', {
            method: saveKind === 'recurrence-update' ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              series_id: dateEditor.seriesId ?? undefined,
              truck_id: selectedTruck.id,
              frequency: dateEditor.frequency,
              monthly_mode: dateEditor.frequency === 'monthly' ? dateEditor.monthlyMode : null,
              start_date: dateEditor.seriesStartDate,
              occurrences: dateEditor.endMode === 'after' ? dateEditor.occurrences : null,
              start_time: normalizedStart,
              end_time: normalizedEnd,
              location_data: dateEditor.location.trim() ? { address: dateEditor.location.trim() } : null,
              converted_override_date: dateEditor.source === 'override' ? dateEditor.target : undefined,
            }),
          });
          if (!response.ok) {
            const result = (await response.json()) as { error?: string };
            throw new Error(result.error ?? 'Unable to save repeating schedule');
          }
        }
      }
      closeDateEditor();
      setScheduleRefreshKey((current) => current + 1);
    } catch (error) {
      setDateEditorError(error instanceof Error ? error.message : 'Unable to save schedule');
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDelete(scope: 'recurring' | 'specific' | 'remove' | 'series'): Promise<void> {
    if (!deleteTarget || !selectedTruck || isDeleting) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.kind === 'dated' && scope === 'remove') {
        const response = await fetch('/api/owner/schedule/override', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ truck_id: selectedTruck.id, service_date: deleteTarget.serviceDate }),
        });
        if (!response.ok) throw new Error('Unable to remove date-specific schedule');
        setScheduleRefreshKey((current) => current + 1);
      } else if (deleteTarget.kind === 'dated' && scope === 'specific') {
        const response = await fetch('/api/owner/schedule/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ truck_id: selectedTruck.id, service_date: deleteTarget.serviceDate }),
        });
        if (!response.ok) throw new Error('Unable to close this date');
        setScheduleRefreshKey((current) => current + 1);
      } else if (deleteTarget.kind === 'series' && deleteTarget.seriesId && scope === 'series') {
        const response = await fetch('/api/owner/schedule/recurrence', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            truck_id: selectedTruck.id,
            series_id: deleteTarget.seriesId,
          }),
        });
        if (!response.ok) throw new Error('Unable to delete repeating schedule');
        setScheduleRefreshKey((current) => current + 1);
      } else if (scope === 'recurring') {
        await handleCloseDay(deleteTarget.day);
      } else {
        const response = await fetch('/api/owner/schedule/override', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ truck_id: selectedTruck.id, service_date: deleteTarget.serviceDate }),
        });
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error ?? 'Unable to close this date');
        }
        setScheduleRefreshKey((current) => current + 1);
      }
      setDeleteTarget(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete schedule');
    } finally {
      setIsDeleting(false);
    }
  }

  function requestSeriesDelete(serviceDate: string, seriesId: string, day: DayOfWeek): void {
    setDeleteError(null);
    setDeleteTarget({ kind: 'series', day, serviceDate, seriesId });
  }

  if (trucks.length === 0) {
    return <NoTrucksGuidance />;
  }

  return (
    <div className="space-y-6">
      <ScheduleCalendar
        truckId={selectedTruck?.id}
        refreshKey={scheduleRefreshKey}
        headerLeft={
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Clock className="h-5 w-5" aria-hidden="true" />
              Schedule
            </h2>
            <p className="text-muted-foreground mt-1 hidden sm:block">Manage your operating hours and events</p>
          </div>
        }
        headerRight={
          trucks.length > 1 ? (
            <Select value={selectedTruckId ?? ''} onValueChange={setSelectedTruckId}>
              <SelectTrigger className="w-[220px] h-8 text-xs">
                <Truck className="w-3 h-3 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Choose your TruckFull profile" />
              </SelectTrigger>
              <SelectContent>
                {trucks.map((truck) => (
                  <SelectItem key={truck.id} value={truck.id}>
                    {truck.name || 'Unnamed Truck'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : undefined
        }
        onEditRecurringDay={requestRecurringEdit}
        onAddRecurringDay={(day, serviceDate) => requestEmptyEdit(day, serviceDate)}
        onCloseRecurringDay={requestDeleteConfirmation}
        onEditDatedDay={requestDatedEdit}
        onEditRecurrenceDay={requestRecurrenceEdit}
        onRemoveDatedOverride={removeDatedOverride}
        onDeleteDatedOverride={requestDatedDelete}
        onDeleteRecurrenceDate={requestSeriesDelete}
      />

      {deleteError && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <span>{deleteError}</span>
          <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteError(null)}>Dismiss</Button>
        </div>
      )}

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => {
        if (!open) {
          setDeleteTarget(null);
          setDeleteError(null);
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{deleteTarget ? getDeleteDialogCopy(deleteTarget).title : 'Change schedule'}</DialogTitle>
            <DialogDescription>{deleteTarget ? getDeleteDialogCopy(deleteTarget).description : ''}</DialogDescription>
          </DialogHeader>
          {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
          <div className="grid gap-2">
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={() =>
                void confirmDelete(
                  deleteTarget?.kind === 'dated'
                    ? 'remove'
                    : deleteTarget?.kind === 'series'
                      ? 'series'
                      : 'recurring',
                )
              }
            >
              {deleteTarget ? getDeleteDialogCopy(deleteTarget).primary : 'Confirm'}
            </Button>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => void confirmDelete('specific')}
            >
              {deleteTarget ? getDeleteDialogCopy(deleteTarget).secondary : 'Close this date'}
            </Button>
            <Button variant="ghost" disabled={isDeleting} onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dateEditor !== null} onOpenChange={(open) => !open && closeDateEditor()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set hours for {dateEditor ? formatServiceDate(dateEditor.target) : 'this date'}</DialogTitle>
            <DialogDescription>Choose the hours this truck serves on this date.</DialogDescription>
          </DialogHeader>
          {dateEditorError && <p className="text-sm text-destructive">{dateEditorError}</p>}
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submitDatedEdit();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="dated-schedule-editor-start">Opens</Label>
                 <Input id="dated-schedule-editor-start" type="time" value={dateEditor?.start ?? ''} onChange={(event) => updateDateEditor({ start: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dated-schedule-editor-end">Closes</Label>
                 <Input id="dated-schedule-editor-end" type="time" value={dateEditor?.end ?? ''} onChange={(event) => updateDateEditor({ end: event.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dated-schedule-editor-location">Location</Label>
               <Input id="dated-schedule-editor-location" value={dateEditor?.location ?? ''} onChange={(event) => updateDateEditor({ location: event.target.value })} placeholder="Service location" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="dated-schedule-editor-repeat" className="text-sm font-medium">Repeat</Label>
                <p className="text-xs text-muted-foreground">
                   {dateEditor?.repeat ? 'Repeats on a schedule you choose' : 'Applies to this date only'}
                </p>
              </div>
              <Switch
                id="dated-schedule-editor-repeat"
                 checked={dateEditor?.repeat ?? false}
                 onCheckedChange={(repeat) => updateDateEditor({ repeat })}
              />
            </div>
             {dateEditor?.repeat && (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Repeat cadence">
                  {(['daily', 'weekly', 'monthly'] as const).map((frequency) => (
                    <Button
                      key={frequency}
                      type="button"
                      size="sm"
                       variant={dateEditor.frequency === frequency ? 'default' : 'outline'}
                      className="flex-1 capitalize"
                       aria-pressed={dateEditor.frequency === frequency}
                       onClick={() => updateDateEditor({ frequency })}
                    >
                      {frequency}
                    </Button>
                  ))}
                </div>
                 {dateEditor.frequency === 'monthly' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Repeat on</Label>
                    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Monthly repeat pattern">
                      <Button
                        type="button"
                        size="sm"
                         variant={dateEditor.monthlyMode === 'same_date' ? 'default' : 'outline'}
                        className="flex-1"
                         aria-pressed={dateEditor.monthlyMode === 'same_date'}
                         onClick={() => updateDateEditor({ monthlyMode: 'same_date' })}
                      >
                         {describeMonthlyChoice(dateEditor.target, 'same_date')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                         variant={dateEditor.monthlyMode === 'ordinal_weekday' ? 'default' : 'outline'}
                        className="flex-1"
                         aria-pressed={dateEditor.monthlyMode === 'ordinal_weekday'}
                         onClick={() => updateDateEditor({ monthlyMode: 'ordinal_weekday' })}
                      >
                         {describeMonthlyChoice(dateEditor.target, 'ordinal_weekday')}
                      </Button>
                    </div>
                     {dateEditor.monthlyMode === 'same_date' &&
                       describeMonthlySkipNote(dateEditor.target, 'same_date') && (
                        <p className="text-xs text-muted-foreground">
                           {describeMonthlySkipNote(dateEditor.target, 'same_date')}
                        </p>
                      )}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="dated-schedule-editor-ends" className="text-xs text-muted-foreground">Ends</Label>
                    <p className="text-[11px] text-muted-foreground/80">
                       {dateEditor.endMode === 'after'
                        ? 'Stops after a set number of occurrences'
                        : 'Repeats until you delete it'}
                    </p>
                  </div>
                  <Switch
                    id="dated-schedule-editor-ends"
                     checked={dateEditor.endMode === 'after'}
                     onCheckedChange={(checked) => updateDateEditor({ endMode: checked ? 'after' : 'never' })}
                  />
                </div>
                   {dateEditor.endMode === 'after' && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="dated-schedule-editor-occurrences" className="whitespace-nowrap text-xs text-muted-foreground">
                        After
                      </Label>
                      <Input
                        id="dated-schedule-editor-occurrences"
                        type="number"
                        min={1}
                        step={1}
                         value={dateEditor.occurrences}
                         onChange={(event) => updateDateEditor({ occurrences: Math.max(1, Math.floor(Number(event.target.value) || 1)) })}
                        className="h-8 w-20"
                      />
                      <span className="text-xs text-muted-foreground">
                         {dateEditor.frequency === 'weekly' ? 'weeks' : dateEditor.frequency === 'monthly' ? 'months' : 'days'} (including this date)
                      </span>
                    </div>
                  )}
              </div>
            )}
            <div className="flex items-center gap-2">
              {dateEditor && dateEditor.source !== 'empty' && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSaving}
                  onClick={requestDeleteFromEditor}
                >
                  Delete
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={!dateEditor?.start || !dateEditor.end || dateEditor.start === dateEditor.end || isSaving}>
                Save schedule
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
