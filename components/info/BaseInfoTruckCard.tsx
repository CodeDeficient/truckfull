import React from 'react';
import { type FoodTruck, type FoodTruckSchedule, type Event } from '@/lib/types';
import {
  BaseTruckCard,
  type BaseTruckCardData,
  type BaseTruckCardSchedule,
  type BaseTruckCardEvent,
} from '@/components/ui/truck-cards/BaseTruckCard';

// Type definitions that match the format expected by the original InfoTruckCard
export interface InfoTruckCardSchedule {
  id: string;
  food_truck_id: string;
  day_of_week: number; // 0=Sun, 1=Mon, ...
  is_active: boolean;
}

export interface InfoTruckCardEvent {
  id: string;
  title: string;
  event_date: string;
  location_address?: string;
}

export interface InfoTruckCardFoodTruck {
  id: string;
  name: string;
  description: string;
  cuisine_type?: string;
  schedule?: InfoTruckCardSchedule[];
  events?: InfoTruckCardEvent[];
}

// Helper functions
export const mapDatabaseSchedules = (
  schedules: FoodTruckSchedule[] | undefined,
): InfoTruckCardSchedule[] => {
  if (!schedules || !Array.isArray(schedules)) return [];

  return schedules.map((schedule) => {
    // Convert day_of_week string (like 'Monday') to number (0=Sun, 1=Mon, ...)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let dayOfWeekNumber = 0;
    // Handle case where day_of_week might already be a number
    if (typeof schedule.day_of_week === 'number') {
      dayOfWeekNumber = schedule.day_of_week;
    } else {
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
    }

    // Determine if schedule is active (for now, assume all schedules are active)
    const isActive = true;

    return {
      id: schedule.id,
      food_truck_id: schedule.food_truck_id,
      day_of_week: dayOfWeekNumber,
      is_active: isActive,
    };
  });
};

export const mapDatabaseEvents = (events: Event[] | undefined): InfoTruckCardEvent[] => {
  if (!events || !Array.isArray(events)) return [];

  return events.map((event) => ({
    id: event.id,
    title: event.title ?? event.location?.address ?? 'Event',
    event_date: event.date ?? new Date().toISOString().split('T')[0],
    location_address: event.location?.address ?? '',
  }));
};

interface BaseInfoTruckCardProps {
  truck: InfoTruckCardFoodTruck | FoodTruck;
  loadingSchedules?: boolean;
  loadingEvents?: boolean;
}

/**
 * Base component for rendering a food truck information card including its schedule and upcoming events.
 * Supports both database schema format and InfoTruckCard format for the truck data.
 *
 * @param {BaseInfoTruckCardProps} props - Component props
 * @returns {JSX.Element} A JSX element representing a styled card with food truck information.
 */
export const BaseInfoTruckCard: React.FC<BaseInfoTruckCardProps> = ({
  truck,
  loadingSchedules = false,
  loadingEvents = false,
}) => {
  // Determine data format and map accordingly
  let schedule, events;

  // Check if the truck matches the database schema
  if ('schedule' in truck && Array.isArray((truck as FoodTruck).schedule)) {
    // This is a database schema truck, need to map to InfoTruckCard format
    const dbTruck = truck as FoodTruck;
    schedule = mapDatabaseSchedules(dbTruck.schedule);
    events = mapDatabaseEvents(dbTruck.events as Event[] | undefined);

    // Create BaseTruckCardData directly with proper type handling
    let cuisineType: string | undefined;
    if (dbTruck.cuisine_type == null) {
      // Using == to check for both null and undefined
      cuisineType = undefined;
    } else if (Array.isArray(dbTruck.cuisine_type)) {
      const cuisineArray = dbTruck.cuisine_type;
      cuisineType = cuisineArray.length > 0 ? cuisineArray.join(', ') : undefined;
    } else {
      cuisineType = String(dbTruck.cuisine_type);
    }

    const baseTruckData: BaseTruckCardData = {
      id: dbTruck.id ?? '',
      name: dbTruck.name ?? 'Unknown Truck',
      description: dbTruck.description ?? '',
      cuisine_type: cuisineType,
      schedule: schedule as BaseTruckCardSchedule[],
      events: events as BaseTruckCardEvent[],
    };

    return (
      <BaseTruckCard
        truck={baseTruckData}
        loadingSchedules={loadingSchedules}
        loadingEvents={loadingEvents}
      />
    );
  } else {
    // This is already in InfoTruckCard format
    const infoTruck = truck as InfoTruckCardFoodTruck;
    schedule = infoTruck.schedule;
    events = infoTruck.events;

    // Create BaseTruckCardData directly from InfoTruckCard format
    const baseTruckData: BaseTruckCardData = {
      id: infoTruck.id ?? '',
      name: infoTruck.name ?? 'Unknown Truck',
      description: infoTruck.description ?? '',
      cuisine_type: infoTruck.cuisine_type ?? undefined,
      schedule: schedule as BaseTruckCardSchedule[],
      events: events as BaseTruckCardEvent[],
    };

    return (
      <BaseTruckCard
        truck={baseTruckData}
        loadingSchedules={loadingSchedules}
        loadingEvents={loadingEvents}
      />
    );
  }
};
