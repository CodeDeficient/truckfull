import type { FoodTruck } from '@/lib/types';

/**
 * Parses a time string (HH:MM format) into a comparable number (HHMM format)
 * @param timeStr - Time string in "HH:MM" format (e.g., "09:30")
 * @returns Number in HHMM format (e.g., 930 for "09:30")
 * @example
 * parseTimeString("09:30") // 930
 * parseTimeString("14:00") // 1400
 */
export function parseTimeString(timeStr: string): number {
  if (timeStr == undefined || timeStr === '') return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 100 + (minutes ?? 0);
}

/**
 * Checks if a food truck is currently open based on its operating hours
 * @param truck - The food truck to check
 * @returns True if the truck is currently open, false otherwise
 * @example
 * const truck = { operating_hours: { monday: { open: "09:00", close: "17:00" } } };
 * isOpenNow(truck) // true if current time is between 09:00 and 17:00 on Monday
 */
export function isOpenNow(truck: FoodTruck): boolean {
  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.getHours() * 100 + now.getMinutes();

  const hours = truck.operating_hours?.[currentDay as keyof typeof truck.operating_hours] as
    | { closed?: boolean; open?: string; close?: string }
    | undefined;

  if (hours == undefined || hours.closed === true) return false;

  const openTime = parseTimeString(hours.open ?? '');
  const closeTime = parseTimeString(hours.close ?? '');

  return currentTime >= openTime && currentTime <= closeTime;
}
