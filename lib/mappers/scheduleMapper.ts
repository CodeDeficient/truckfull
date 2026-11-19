import { type FoodTruckSchedule, type Event } from '../types';

/**
 * Maps the database FoodTruckSchedule format to the format expected by InfoTruckCard
 * @param schedules - Array of schedules from the database
 * @returns Array of schedules in the format expected by InfoTruckCard
 */
export function mapSchedulesToInfoTruckCardFormat(schedules: FoodTruckSchedule[]): Array<{
  id: string;
  food_truck_id: string;
  day_of_week: number;
  is_active: boolean;
}> {
  return schedules.map((schedule) => {
    // Convert day_of_week string (like 'Monday') to number (0=Sun, 1=Mon, ...)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let dayOfWeekNumber = 0;
    // Ensure day_of_week is a string before calling toLowerCase
    const dayOfWeekString = String(schedule.day_of_week || '');
    const dayIndex = dayNames.findIndex(
      (day) => day.toLowerCase() === dayOfWeekString.toLowerCase(),
    );
    if (dayIndex === -1) {
      const shortDayIndex = shortDayNames.findIndex(
        (day) => day.toLowerCase() === dayOfWeekString.toLowerCase(),
      );
      if (shortDayIndex !== -1) {
        dayOfWeekNumber = shortDayIndex;
      }
    } else {
      dayOfWeekNumber = dayIndex;
    }

    // For simplicity, we'll assume the schedule is active if it exists
    // In a real implementation, you might want to check if today is the scheduled day
    const isActive = true;

    return {
      id: schedule.id,
      food_truck_id: schedule.food_truck_id,
      day_of_week: dayOfWeekNumber,
      is_active: isActive,
    };
  });
}

/**
 * Maps events from the database format to the format expected by InfoTruckCard
 * @param events - Array of events from the database
 * @returns Array of events in the format expected by InfoTruckCard
 */
export function mapEventsToInfoTruckCardFormat(events: Event[]): Array<{
  id: string;
  title: string;
  event_date: string;
  location_address: string | undefined;
}> {
  return events.map((event) => ({
    id: event.id,
    title: event.title ?? event.location?.location_name ?? event.location?.address ?? 'Event',
    event_date: event.date ?? new Date().toISOString().split('T')[0],
    location_address: (() => {
      if (event.location?.address && typeof event.location.address === 'string') {
        return event.location.address;
      }
      if (event.location?.location_name && typeof event.location.location_name === 'string') {
        return event.location.location_name;
      }
    })(),
  }));
}
