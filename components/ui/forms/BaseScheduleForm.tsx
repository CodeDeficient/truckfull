import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { DateRange as DateRangeValue } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { RecurrencePattern } from '@/lib/recurrence/recurrenceTypes';
import { DayOfWeek } from '@/lib/types';

// Common time options array shared across all forms
export const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  const value = `${hour.toString().padStart(2, '0')}:${minute}`;
  const label = `${displayHour}:${minute} ${period}`;
  return { value, label };
});

// Common days of week options
export const daysOfWeek = [
  { value: 'sun', label: 'Sunday', shortLabel: 'S' },
  { value: 'mon', label: 'Monday', shortLabel: 'M' },
  { value: 'tue', label: 'Tuesday', shortLabel: 'T' },
  { value: 'wed', label: 'Wednesday', shortLabel: 'W' },
  { value: 'thu', label: 'Thursday', shortLabel: 'T' },
  { value: 'fri', label: 'Friday', shortLabel: 'F' },
  { value: 'sat', label: 'Saturday', shortLabel: 'S' },
];

// Common form data interface
export interface BaseScheduleFormData {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  date?: string;
  recurrencePattern?: RecurrencePattern;
  isRecurring?: boolean;
}

// Common form props interface
export interface BaseScheduleFormProps<T extends BaseScheduleFormData> {
  readonly formData: T;
  readonly onFormChange: (data: T) => void;
  readonly onSubmit: () => void;
  readonly submitLabel?: string;
  readonly disabled?: boolean;
  readonly title?: string;
  readonly description?: string;
  readonly icon?: React.ReactNode;
  readonly showRecurringToggle?: boolean;
  readonly showRecurrencePattern?: boolean;
  readonly showDateField?: boolean;
  readonly showTimeFields?: boolean;
}

// Main base form component
export function BaseScheduleForm<T extends BaseScheduleFormData>({
  formData,
  onFormChange,
  onSubmit,
  submitLabel = 'Submit',
  disabled = false,
  showRecurringToggle = false,
  showRecurrencePattern = false,
  showDateField = false,
  showTimeFields = true,
}: BaseScheduleFormProps<T>) {
  const formWidthClass = showRecurrencePattern ? 'max-w-[340px]' : 'max-w-2xl';
  const fieldStackWidthClass = showRecurrencePattern ? 'max-w-[340px]' : 'max-w-md';

  const updateFormData = (updates: Partial<T>) => {
    onFormChange({ ...formData, ...updates });
  };

  const updateRecurrencePattern = (updates: Partial<RecurrencePattern>) => {
    if (formData.recurrencePattern) {
      updateFormData({
        recurrencePattern: { ...formData.recurrencePattern, ...updates },
      } as Partial<T>);
    }
  };

  const toggleDayOfWeek = (day: string) => {
    if (formData.recurrencePattern) {
      const currentDays = formData.recurrencePattern.daysOfWeek ?? [];
      const isDaySelected = currentDays.includes(day as DayOfWeek);
      const newDays: DayOfWeek[] = isDaySelected
        ? currentDays.filter((d) => d !== day)
        : [...currentDays, day as DayOfWeek];

      updateRecurrencePattern({ daysOfWeek: newDays });
    }
  };

  const [dateRange, setDateRange] = useState<DateRangeValue>();

  useEffect(() => {
    if (formData.recurrencePattern?.endDate) {
      setDateRange({ from: new Date(), to: new Date(formData.recurrencePattern.endDate) });
    }
  }, []);

  return (
    <div
      className={formWidthClass}
      role="form"
    >
      <div className={`${fieldStackWidthClass} space-y-4`}>
        {formData.title !== undefined && (
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateFormData({ title: e.target.value } as Partial<T>)}
              placeholder="e.g. Downtown Lunch Rush"
              disabled={disabled}
            />
          </div>
        )}

        {showTimeFields && !showRecurrencePattern && (
          <div className="grid grid-cols-2 gap-3 max-w-sm">
            <div className="space-y-1.5">
              <Label htmlFor="startTime">Open</Label>
              <Select
                value={formData.startTime}
                onValueChange={(value) => updateFormData({ startTime: value } as Partial<T>)}
                disabled={disabled}
              >
                <SelectTrigger id="startTime" aria-label="Select start time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime">Close</Label>
              <Select
                value={formData.endTime}
                onValueChange={(value) => updateFormData({ endTime: value } as Partial<T>)}
                disabled={disabled}
              >
                <SelectTrigger id="endTime" aria-label="Select end time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={time.value} value={time.value}>
                      {time.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={formData.location}
            onChange={(e) => updateFormData({ location: e.target.value } as Partial<T>)}
            placeholder="e.g. Marion Square, Downtown"
            disabled={disabled}
          />
        </div>

        {formData.description !== undefined && (
          <div className="space-y-1.5">
            <Label htmlFor="description">Notes</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData({ description: e.target.value } as Partial<T>)}
              placeholder="Optional details"
              disabled={disabled}
            />
          </div>
        )}

        {showDateField && (
          <div className="space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => updateFormData({ date: e.target.value } as Partial<T>)}
              disabled={disabled}
            />
          </div>
        )}

        {showRecurringToggle && (
          <div className="flex items-center justify-between py-1">
            <Label htmlFor="isRecurring" className="cursor-pointer">Recurring event</Label>
            <Switch
              id="isRecurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) =>
                updateFormData({ isRecurring: checked } as Partial<T>)
              }
              aria-label="Toggle recurring event"
              disabled={disabled}
            />
          </div>
        )}

        {showRecurrencePattern && (
          <div className="space-y-4 bg-muted/30 rounded-lg p-4 max-w-[340px]">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium whitespace-nowrap">Repeats</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    updateFormData({ isRecurring: false, recurrencePattern: undefined } as Partial<T>);
                    setDateRange(undefined);
                  }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      formData.isRecurring
                        ? 'bg-muted text-muted-foreground hover:bg-muted/80'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                    }`}
                  aria-pressed={!formData.isRecurring}
                  disabled={disabled}
                >
                  Never
                </button>
                {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => {
                      if (formData.recurrencePattern) {
                        updateFormData({ isRecurring: true } as Partial<T>);
                        updateRecurrencePattern({ frequency: freq });
                      } else {
                        updateFormData({
                          isRecurring: true,
                          recurrencePattern: {
                            frequency: freq,
                            interval: 1,
                            isActive: true,
                            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                          },
                        } as Partial<T>);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      formData.isRecurring && formData.recurrencePattern?.frequency === freq
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                    aria-pressed={formData.isRecurring && formData.recurrencePattern?.frequency === freq}
                    disabled={disabled}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {formData.isRecurring && formData.recurrencePattern && (
              <>
                {formData.recurrencePattern.frequency === 'weekly' && (
              <div className="space-y-1.5">
                <Label>On days</Label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isDaySelectedInPattern =
                      formData.recurrencePattern?.daysOfWeek?.includes(day.value as DayOfWeek);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDayOfWeek(day.value)}
                        className={`h-8 w-8 rounded-full text-sm font-medium transition-colors ${
                          isDaySelectedInPattern
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                        aria-pressed={isDaySelectedInPattern ?? false}
                        aria-label={`${day.label} selection`}
                        disabled={disabled}
                      >
                        {day.shortLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showTimeFields && (
              <div className="flex flex-nowrap gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="startTime">Open</Label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => updateFormData({ startTime: value } as Partial<T>)}
                    disabled={disabled}
                  >
                    <SelectTrigger id="startTime" aria-label="Select start time" className="h-9 w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime">Close</Label>
                  <Select
                    value={formData.endTime}
                    onValueChange={(value) => updateFormData({ endTime: value } as Partial<T>)}
                    disabled={disabled}
                  >
                    <SelectTrigger id="endTime" aria-label="Select end time" className="h-9 w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-w-[280px]">
              <Label className="block">Start / Stop</Label>
              <Popover>
                <div className="block">
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'h-9 w-fit min-w-[180px] justify-start rounded-lg bg-muted/30 px-3 text-left text-sm font-normal',
                        !dateRange?.from && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'MMM d')} → {format(dateRange.to, 'MMM d')}
                          </>
                        ) : (
                          format(dateRange.from, 'MMM d')
                        )
                      ) : (
                        <span>Pick a date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                </div>
                <PopoverContent
                  className="w-[260px] min-w-0 border-0 bg-transparent p-0 shadow-none ring-0"
                  style={{ width: 260, minWidth: 260 }}
                  align="start"
                  side="bottom"
                  avoidCollisions={false}
                >
                  <div style={{ width: 260, minWidth: 260 }}>
                    <Calendar
                      mode="range"
                      className="w-[260px]"
                      selected={dateRange}
                      onSelect={(range) => {
                        setDateRange(range);
                        updateRecurrencePattern({
                          endDate: range?.to
                            ? format(range.to, 'yyyy-MM-dd')
                            : undefined,
                        });
                      }}
                      numberOfMonths={1}
                      disabled={{ before: new Date() }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
            </div>
              </>
            )}
          </div>
        )}

        <Button
          onClick={onSubmit}
          className="bg-emerald-500/10 text-emerald-400 font-semibold hover:bg-emerald-500/15"
          aria-label={submitLabel}
          disabled={disabled}
        >
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
