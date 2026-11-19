import { dateKeyInTimezone, weekdayForDateKey } from '@/lib/services/scheduleOverride';
import type { FoodTruckOperatingHours, UpcomingScheduleOverride } from '@/lib/types';

export interface UpcomingScheduleEntry {
  readonly dateKey: string;
  readonly day: string;
  readonly dayOfMonth: number;
  readonly monthShort: string;
  readonly hours: string;
  readonly location?: string;
  readonly lat?: number;
  readonly lng?: number;
}

export interface UpcomingScheduleInput {
  readonly timezone?: string | null;
  readonly operating_hours?: FoodTruckOperatingHours | null;
  readonly overrides?: readonly UpcomingScheduleOverride[];
  /** Day offset from today at which to start collecting entries (default 0). */
  readonly startOffset?: number;
}

const MAX_UPCOMING_DAYS = 7;
const MAX_OPEN_ENTRIES = 3;
const DAY_LABELS: Record<string, string> = {
  sunday: 'Sun',
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
};

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatHours(open: string, close: string): string {
  return `${formatTime12Hour(open)} - ${formatTime12Hour(close)}`;
}

function formatTime12Hour(time: string): string {
  const [hoursStr, minutes] = time.split(':');
  const hours = Number.parseInt(hoursStr, 10);
  const shownMinutes = minutes === '00' ? '' : `:${minutes}`;
  if (hours === 0) return `12${shownMinutes}a`;
  if (hours < 12) return `${hours}${shownMinutes}a`;
  if (hours === 12) return `12${shownMinutes}p`;
  return `${hours - 12}${shownMinutes}p`;
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function locationLabel(location: UpcomingScheduleOverride['location_data']): string | undefined {
  if (!location) return undefined;
  const address = typeof location.address === 'string' ? location.address.trim() : '';
  const city = typeof location.city === 'string' ? location.city.trim() : '';
  const state = typeof location.state === 'string' ? location.state.trim() : '';

  // Upcoming stops can sit outside the truck's home city, so always carry
  // city/state context — parts already present in the address are not repeated.
  const haystack = address.toLowerCase();
  const locality = [city, state].filter((part) => part && !haystack.includes(part.toLowerCase()));
  if (address) return [address, ...locality].filter(Boolean).join(', ');
  if (locality.length > 0) return locality.join(', ');
  return undefined;
}

export function buildUpcomingSchedule(
  input: UpcomingScheduleInput,
  now: Date,
): UpcomingScheduleEntry[] {
  const timezone = input.timezone?.trim();
  if (!timezone) return [];

  const todayKey = dateKeyInTimezone(now.toISOString(), timezone);
  if (!todayKey) return [];

  const overridesByDate = new Map<string, UpcomingScheduleOverride>();
  for (const override of input.overrides ?? []) {
    if (override.service_date) {
      overridesByDate.set(override.service_date, override);
    }
  }

  const entries: UpcomingScheduleEntry[] = [];
  const startOffset = input.startOffset ?? 0;
  for (let offset = startOffset; offset < MAX_UPCOMING_DAYS; offset += 1) {
    const dateKey = addDays(todayKey, offset);
    const weekday = weekdayForDateKey(dateKey);
    if (!weekday) continue;

    const override = overridesByDate.get(dateKey);
    let open: string | undefined;
    let close: string | undefined;
    let location: string | undefined;
    let lat: number | undefined;
    let lng: number | undefined;

    if (override) {
      if (override.is_closed) continue;
      if (override.is_all_day) {
        open = '00:00';
        close = '23:59';
      } else if (override.start_time && override.end_time) {
        open = override.start_time;
        close = override.end_time;
      } else {
        const recurring = input.operating_hours?.[weekday];
        if (!recurring || recurring.closed || !recurring.open || !recurring.close) continue;
        open = recurring.open;
        close = recurring.close;
      }
      location = locationLabel(override.location_data);
      if (typeof override.location_data?.lat === 'number') lat = override.location_data.lat;
      if (typeof override.location_data?.lng === 'number') lng = override.location_data.lng;
    } else {
      const recurring = input.operating_hours?.[weekday];
      if (!recurring || recurring.closed || !recurring.open || !recurring.close) continue;
      open = recurring.open;
      close = recurring.close;
    }

    entries.push({
      dateKey,
      day: DAY_LABELS[weekday] ?? weekday,
      dayOfMonth: Number.parseInt(dateKey.slice(8, 10), 10),
      monthShort: MONTH_LABELS[Number.parseInt(dateKey.slice(5, 7), 10) - 1] ?? '',
      hours: formatHours(open, close),
      ...(location ? { location } : {}),
      ...(lat != null && lng != null ? { lat, lng } : {}),
    });
    if (entries.length >= MAX_OPEN_ENTRIES) break;
  }

  return entries;
}
