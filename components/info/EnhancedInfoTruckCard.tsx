import React from 'react';
import { type FoodTruckSchedule, type Event } from '@/lib/types';
import {
  mapSchedulesToInfoTruckCardFormat,
  mapEventsToInfoTruckCardFormat,
} from '@/lib/mappers/scheduleMapper';
import { BaseInfoTruckCard, type InfoTruckCardFoodTruck } from './BaseInfoTruckCard';

interface EnhancedInfoTruckCardProps {
  truck: InfoTruckCardFoodTruck;
  schedules?: FoodTruckSchedule[];
  events?: Event[];
  loadingSchedules?: boolean;
  loadingEvents?: boolean;
  partialLoading?: boolean;
  error?: string | null;
}

/**
 * Enhanced version of InfoTruckCard that properly handles data mapping between
 * database schema and component expectations.
 *
 * This component maps the schedule/events data from the database schema to the format
 * expected by the original InfoTruckCard component, enabling proper display of
 * schedules and events. Includes proper loading states and error boundaries.
 */
const EnhancedInfoTruckCard: React.FC<EnhancedInfoTruckCardProps> = ({
  truck,
  schedules = [],
  events = [],
  loadingSchedules = false,
  loadingEvents = false,
}) => {
  // Map the schedules and events to the format expected by InfoTruckCard
  const mappedSchedules = mapSchedulesToInfoTruckCardFormat(schedules);
  const mappedEvents = mapEventsToInfoTruckCardFormat(events);

  // Merge the provided truck data with the mapped schedules and events
  const enhancedTruck: InfoTruckCardFoodTruck = {
    ...truck,
    schedule: [...(truck.schedule ?? []), ...mappedSchedules],
    events: [...(truck.events ?? []), ...mappedEvents],
  };

  return (
    <BaseInfoTruckCard
      truck={enhancedTruck}
      loadingSchedules={loadingSchedules}
      loadingEvents={loadingEvents}
    />
  );
};

export default EnhancedInfoTruckCard;
