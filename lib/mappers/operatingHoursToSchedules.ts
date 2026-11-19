import type { FoodTruckOperatingHours } from '@/lib/types';

const DAY_NAMES: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export interface OperatingHoursSchedule {
  id: string;
  title: string;
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

export function operatingHoursToSchedules(
  hours: FoodTruckOperatingHours | null | undefined,
): OperatingHoursSchedule[] {
  if (!hours) return [];

  const entries = Object.entries(hours);
  const result: OperatingHoursSchedule[] = [];

  for (const [day, value] of entries) {
    if (!value || typeof value !== 'object') continue;
    const dayHours = value as { open?: string; close?: string; closed?: boolean };
    if (dayHours.closed) continue;
    if (!dayHours.open || !dayHours.close) continue;

    const capitalized = DAY_NAMES[day] ?? day.charAt(0).toUpperCase() + day.slice(1);

    result.push({
      id: `hours-${day}`,
      title: `${capitalized} Hours`,
      dayOfWeek: day,
      startTime: dayHours.open,
      endTime: dayHours.close,
      location: '',
      isActive: true,
      baseLocation: '',
      baseStartTime: dayHours.open,
      baseEndTime: dayHours.close,
      exceptions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return result;
}
