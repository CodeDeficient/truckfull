// Define internal types for our shared components to work with
export interface InternalRecurringSchedule {
  id: string;
  name: string;
  description?: string;
  start_time: string;
  end_time: string;
  location_address: string;
  is_active: boolean;
  recurrence_pattern?: {
    frequency?: string;
    interval?: number;
    daysOfWeek?: string[];
    endDate?: string;
  };
  created_at?: string;
  updated_at?: string;
  exceptions?: string[];
}

export interface InternalSpecialEvent {
  id: string;
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location_address: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

// Adapter functions to convert from various source types to internal types
function safeString(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
}

function safeStringWithDefault(value: unknown, defaultValue: string = ''): string {
  return safeString(value) ?? defaultValue;
}

export function adaptRecurringSchedule(externalSchedule: unknown): InternalRecurringSchedule {
  // Handle multiple possible input types
  if (
    typeof externalSchedule === 'object' &&
    externalSchedule !== null &&
    'location' in externalSchedule
  ) {
    const schedule = externalSchedule as Record<string, unknown>;
    // Handle the type from ScheduleTab.tsx
    return {
      id: safeStringWithDefault(schedule.id),
      name: safeStringWithDefault(schedule.title ?? schedule.name),
      description: safeString(schedule.description),
      start_time: safeStringWithDefault(
        schedule.startTime ?? schedule.baseStartTime ?? schedule.start_time,
      ),
      end_time: safeStringWithDefault(
        schedule.endTime ?? schedule.baseEndTime ?? schedule.end_time,
      ),
      location_address: safeStringWithDefault(
        schedule.location ?? schedule.baseLocation ?? schedule.location_address,
      ),
      is_active: Boolean(schedule.isActive ?? schedule.is_active ?? true),
      recurrence_pattern:
        schedule.recurrencePattern ??
        (schedule.recurrence_pattern as InternalRecurringSchedule['recurrence_pattern']),
      created_at: safeString(schedule.createdAt),
      updated_at: safeString(schedule.updatedAt),
      exceptions: Array.isArray(schedule.exceptions)
        ? (schedule.exceptions as string[])
        : undefined,
    };
  } else {
    const schedule = externalSchedule as Record<string, unknown>;
    // Handle the type from lib/types.ts
    return {
      id: safeStringWithDefault(schedule.id),
      name: safeStringWithDefault(schedule.name),
      description: safeString(schedule.description),
      start_time: safeStringWithDefault(schedule.start_time),
      end_time: safeStringWithDefault(schedule.end_time),
      location_address: safeStringWithDefault(schedule.location_address),
      is_active: Boolean(schedule.is_active ?? true),
      recurrence_pattern:
        schedule.recurrence_pattern as InternalRecurringSchedule['recurrence_pattern'],
      created_at: safeString(schedule.created_at),
      updated_at: safeString(schedule.updated_at),
      exceptions: Array.isArray(schedule.exceptions)
        ? (schedule.exceptions as string[])
        : undefined,
    };
  }
}

export function adaptSpecialEvent(externalEvent: unknown): InternalSpecialEvent {
  // Handle multiple possible input types
  if (typeof externalEvent === 'object' && externalEvent !== null && 'date' in externalEvent) {
    const event = externalEvent as Record<string, unknown>;
    // Handle the type from ScheduleTab.tsx
    return {
      id: safeStringWithDefault(event.id),
      title: safeStringWithDefault(event.name ?? event.title),
      description: safeString(event.description),
      event_date: safeStringWithDefault(event.date ?? event.event_date),
      start_time: safeStringWithDefault(event.startTime ?? event.start_time),
      end_time: safeStringWithDefault(event.endTime ?? event.end_time),
      location_address: safeStringWithDefault(event.location ?? event.location_address),
      is_active: Boolean(event.isRecurring ?? event.is_active ?? false),
      created_at: safeString(event.created_at),
      updated_at: safeString(event.updated_at),
    };
  } else {
    const event = externalEvent as Record<string, unknown>;
    // Handle the type from lib/types.ts
    return {
      id: safeStringWithDefault(event.id),
      title: safeStringWithDefault(event.title),
      description: safeString(event.description),
      event_date: safeStringWithDefault(event.event_date),
      start_time: safeStringWithDefault(event.start_time),
      end_time: safeStringWithDefault(event.end_time),
      location_address: safeStringWithDefault(event.location_address),
      is_active: Boolean(event.is_active ?? true),
      created_at: safeString(event.created_at),
      updated_at: safeString(event.updated_at),
    };
  }
}
