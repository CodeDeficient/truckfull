import React, { useEffect, useState } from 'react';
import { type FoodTruck } from '@/lib/types';
import { ScheduleService } from '@/lib/supabase/services/scheduleService';
import EnhancedInfoTruckCard from './EnhancedInfoTruckCard';
import { logError } from '@/lib/logging';

interface InfoTruckCardWithDataProps {
  truck: FoodTruck;
}

/**
 * Data-connected version of InfoTruckCard that automatically fetches
 * schedule and event data for the specified truck.
 *
 * This component handles loading states, error handling, and data fetching
 * according to the quality guidelines specified in the WBS.
 */
const InfoTruckCardWithData: React.FC<InfoTruckCardWithDataProps> = ({ truck }) => {
  const [schedules, setSchedules] = useState<import('@/lib/types').FoodTruckSchedule[]>([]);
  const [events, setEvents] = useState<import('@/lib/types').Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingSchedules, setLoadingSchedules] = useState<boolean>(true);
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch schedules and events in parallel
        const [schedulesPromise, eventsPromise] = [
          ScheduleService.getSchedulesByTruckId(truck.id),
          ScheduleService.getEventsByTruckId(truck.id),
        ];

        // Handle schedules loading
        schedulesPromise
          .then((fetchedSchedules) => {
            setSchedules(fetchedSchedules);
            setLoadingSchedules(false);
          })
          .catch((error_) => {
            logError('Error fetching schedules:', error_);
            setLoadingSchedules(false);
          });

        // Handle events loading
        eventsPromise
          .then((fetchedEvents) => {
            setEvents(fetchedEvents);
            setLoadingEvents(false);
          })
          .catch((error_) => {
            logError('Error fetching events:', error_);
            setLoadingEvents(false);
          });

        // Wait for both to complete before updating overall loading state
        await Promise.allSettled([schedulesPromise, eventsPromise]);
      } catch (error_) {
        logError('Error fetching schedule/event data:', error_);
        setError('Failed to load schedule and event data');
      } finally {
        // Only set loading to false when both schedules and events are loaded
        setLoading(false);
      }
    };

    void fetchData();
  }, [truck.id]);

  // Determine display state based on loading and error states
  const bothLoading = loadingSchedules && loadingEvents;
  const partialLoading = (loadingSchedules || loadingEvents) && !loading;

  if (bothLoading && loading) {
    return (
      <div
        className="border rounded-lg p-4"
        role="status"
        aria-live="polite"
        aria-label="Loading food truck information"
      >
        <div className="flex justify-between">
          <h3 className="text-lg font-semibold">{truck.name ?? 'Loading...'}</h3>
          <span className="text-gray-500">{truck.cuisine_type?.join(', ') ?? ''}</span>
        </div>
        <p className="text-gray-700 mt-1">{truck.description ?? 'Loading description...'}</p>
        <div className="mt-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mt-2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !loadingSchedules && !loadingEvents) {
    return (
      <div className="border rounded-lg p-4" role="alert" aria-live="assertive">
        <div className="flex justify-between">
          <h3 className="text-lg font-semibold">{truck.name ?? 'Unknown Truck'}</h3>
          <span className="text-gray-500">{truck.cuisine_type?.join(', ') ?? ''}</span>
        </div>
        <p className="text-gray-700 mt-1">{truck.description ?? 'No description available'}</p>
        <div className="mt-4 text-red-500" role="alert" aria-atomic="true">
          Error loading schedule and event data
        </div>
      </div>
    );
  }

  return (
    <EnhancedInfoTruckCard
      truck={{
        id: truck.id,
        name: truck.name ?? 'Unknown Truck',
        description: truck.description ?? 'No description available',
        cuisine_type: truck.cuisine_type?.join(', ') ?? undefined,
      }}
      schedules={schedules}
      events={events}
      loadingSchedules={loadingSchedules}
      loadingEvents={loadingEvents}
      partialLoading={partialLoading}
      error={error}
    />
  );
};

export default InfoTruckCardWithData;
