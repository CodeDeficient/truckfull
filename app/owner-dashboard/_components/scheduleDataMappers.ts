import type { FoodTruckSchedule, Event, FoodTruckOperatingHours } from '@/lib/types';

interface RecurringSchedule {
  id: string;
  title: string;
  description?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  location: string;
  isActive: boolean;
  baseLocation: string;
  baseStartTime: string;
  baseEndTime: string;
  exceptions: never[];
  createdAt: string;
  updatedAt: string;
}

interface SpecialEvent {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  description?: string;
  isRecurring: boolean;
  isException?: boolean;
}

const DAY_TITLE: Record<string, string> = {
  monday: 'Monday Schedule',
  tuesday: 'Tuesday Schedule',
  wednesday: 'Wednesday Schedule',
  thursday: 'Thursday Schedule',
  friday: 'Friday Schedule',
  saturday: 'Saturday Schedule',
  sunday: 'Sunday Schedule',
};

export function mapDbScheduleToComponent(db: FoodTruckSchedule): RecurringSchedule {
  const day = db.day_of_week ?? '';
  return {
    id: db.id,
    title: DAY_TITLE[day] ?? `${day} Schedule`,
    dayOfWeek: day,
    startTime: db.start_time ?? '',
    endTime: db.end_time ?? '',
    location: db.location_address ?? '',
    isActive: true,
    baseLocation: db.location_address ?? '',
    baseStartTime: db.start_time ?? '',
    baseEndTime: db.end_time ?? '',
    exceptions: [],
    createdAt: db.created_at ?? new Date().toISOString(),
    updatedAt: db.updated_at ?? db.created_at ?? new Date().toISOString(),
  };
}

function extractEventLocation(db: Event): string {
  const loc = db.location;
  if (loc && typeof loc === 'object') {
    const obj = loc as { location_name?: string; address?: string };
    if (obj.location_name && obj.location_name.length > 0) return obj.location_name;
    if (obj.address && obj.address.length > 0) return obj.address;
  }
  if (db.location_address && db.location_address.length > 0) return db.location_address;
  return '';
}

export function mapDbEventToComponent(db: Event): SpecialEvent {
  const startTime = db.start_time ?? db.time ?? '';
  const endTime = db.end_time ?? '';
  return {
    id: db.id,
    name: db.title,
    date: db.date ?? db.event_date ?? '',
    startTime,
    endTime,
    location: extractEventLocation(db),
    description: db.description,
    isRecurring: false,
  };
}

const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export function mapOperatingHoursToSchedules(
  hours: FoodTruckOperatingHours | null | undefined,
): RecurringSchedule[] {
  if (!hours) return [];
  const now = new Date().toISOString();
  return DAY_ORDER.filter((day) => {
    const entry = hours[day];
    if (!entry) return false;
    if (entry.closed) return false;
    if (!entry.open || !entry.close) return false;
    return true;
  }).map((day) => {
    const entry = hours[day]!;
    return {
      id: `hours-${day}`,
      title: DAY_TITLE[day] ?? `${day} Schedule`,
      dayOfWeek: day,
      startTime: entry.open!,
      endTime: entry.close!,
      location: '',
      isActive: true,
      baseLocation: '',
      baseStartTime: entry.open!,
      baseEndTime: entry.close!,
      exceptions: [],
      createdAt: now,
      updatedAt: now,
    };
  });
}