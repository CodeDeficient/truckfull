import { getSupabase } from '../client';
import { handleSupabaseError } from '../utils/index';
import type { FoodTruckSchedule, Event } from '@/lib/types';
import type { RecurringSchedule as RecurringScheduleType } from '@/lib/recurrence';
import type { RecurrenceProcessingOptions } from '@/lib/recurrence';
import { calculateRecurrenceOccurrences } from '@/lib/recurrence/recurrenceProcessor';
import { logError } from '@/lib/logging';
import type { Database } from '@/lib/database.remote.types';

// Row types from database
type EventRow = Database['public']['Tables']['events']['Row'];
type ScheduleRow = Database['public']['Tables']['food_truck_schedules']['Row'];

export function mapRowToEvent(row: EventRow): Event {
  const rowWithCoords = row as EventRow & { lat?: number; lng?: number };
  return {
    id: row.id,
    food_truck_id: row.food_truck_id,
    title: row.location,
    description: row.description ?? '',
    date: row.date,
    time: row.time,
    location: {
      address: row.location,
      lat: typeof rowWithCoords.lat === 'number' ? rowWithCoords.lat : undefined,
      lng: typeof rowWithCoords.lng === 'number' ? rowWithCoords.lng : undefined,
      location_name: row.location,
    },
    created_at: row.created_at ?? undefined,
  };
}

export function mapRowToSchedule(row: ScheduleRow): FoodTruckSchedule {
  return {
    id: row.id,
    food_truck_id: row.food_truck_id,
    day_of_week: row.day_of_week,
    start_time: row.start_time,
    end_time: row.end_time,
    location_address: row.location ?? '',
    location_lat: 0,
    location_lng: 0,
    created_at: row.created_at ?? undefined,
    updated_at: row.created_at ?? undefined,
  };
}

export function groupEventsByTruck(events: Event[], truckIds: string[]): Record<string, Event[]> {
  const eventsByTruck: Record<string, Event[]> = {};
  for (const id of truckIds) {
    eventsByTruck[id] = [];
  }
  for (const row of events) {
    const truckId = row.food_truck_id;
    if (eventsByTruck[truckId]) {
      eventsByTruck[truckId].push(row);
    } else {
      eventsByTruck[truckId] = [row];
    }
  }
  return eventsByTruck;
}

export function groupSchedulesByTruck(
  schedules: FoodTruckSchedule[],
  truckIds: string[],
): Record<string, FoodTruckSchedule[]> {
  const schedulesByTruck: Record<string, FoodTruckSchedule[]> = {};
  for (const id of truckIds) {
    schedulesByTruck[id] = [];
  }
  for (const schedule of schedules) {
    const truckId = schedule.food_truck_id;
    if (schedulesByTruck[truckId]) {
      schedulesByTruck[truckId].push(schedule);
    } else {
      schedulesByTruck[truckId] = [schedule];
    }
  }
  return schedulesByTruck;
}

export const ScheduleService = {
  /**
   * Fetch all events for a specific food truck
   */
  async getEventsByTruckId(truckId: string): Promise<Event[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('food_truck_id', truckId)
        .gt('date', new Date().toISOString().split('T')[0]) // Only future events
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => mapRowToEvent(row));
    } catch (error) {
      handleSupabaseError(error as Error, 'getEventsByTruckId');
      logError(`Error fetching events for truck: ${truckId}`, error);
      return [];
    }
  },

  /**
   * Fetch all schedules for a specific food truck
   */
  async getSchedulesByTruckId(truckId: string): Promise<FoodTruckSchedule[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('food_truck_schedules')
        .select('*')
        .eq('food_truck_id', truckId)
        .order('day_of_week', { ascending: true });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        id: row.id,
        food_truck_id: row.food_truck_id,
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        location_address: row.location ?? '',
        location_lat: 0, // Schedule table doesn't have lat/lng
        location_lng: 0,
        created_at: row.created_at ?? undefined,
        updated_at: row.created_at ?? undefined, // Using created_at as updated_at for now
      }));
    } catch (error) {
      handleSupabaseError(error as Error, 'getSchedulesByTruckId');
      logError(`Error fetching schedules for truck: ${truckId}`, error);
      return [];
    }
  },

  /**
   * Fetch all events and schedules for multiple trucks
   */
  async getTrucksWithEventsAndSchedules(truckIds: string[]): Promise<{
    events: Record<string, Event[]>;
    schedules: Record<string, FoodTruckSchedule[]>;
  }> {
    try {
      const supabase = getSupabase();
      const [eventsResult, schedulesResult] = await Promise.all([
        // Fetch all events for the specified trucks
        supabase
          .from('events')
          .select('*')
          .in('food_truck_id', truckIds)
          .gt('date', new Date().toISOString().split('T')[0]), // Only future events

        // Fetch all schedules for the specified trucks
        supabase.from('food_truck_schedules').select('*').in('food_truck_id', truckIds),
      ]);

      const eventsError = eventsResult.error;
      const schedulesError = schedulesResult.error;

      if (eventsError) throw eventsError;
      if (schedulesError) throw schedulesError;

      const eventsData = eventsResult.data || [];
      const schedulesData = schedulesResult.data || [];

      // Group events by truck ID
      const eventsByTruck: Record<string, Event[]> = {};
      for (const id of truckIds) {
        eventsByTruck[id] = [];
      }

      for (const row of eventsData) {
        const event = mapRowToEvent(row as EventRow);
        const truckId = row.food_truck_id;

        if (eventsByTruck[truckId]) {
          eventsByTruck[truckId].push(event);
        } else {
          eventsByTruck[truckId] = [event];
        }
      }

      // Group schedules by truck ID
      const schedulesByTruck: Record<string, FoodTruckSchedule[]> = {};
      for (const id of truckIds) {
        schedulesByTruck[id] = [];
      }

      for (const row of schedulesData) {
        const scheduleRow = row as ScheduleRow;
        const schedule: FoodTruckSchedule = {
          id: scheduleRow.id,
          food_truck_id: scheduleRow.food_truck_id,
          day_of_week: scheduleRow.day_of_week,
          start_time: scheduleRow.start_time,
          end_time: scheduleRow.end_time,
          location_address: scheduleRow.location ?? '',
          location_lat: 0,
          location_lng: 0,
          created_at: scheduleRow.created_at ?? undefined,
          updated_at: scheduleRow.created_at ?? undefined,
        };
        const truckId = scheduleRow.food_truck_id;

        if (schedulesByTruck[truckId]) {
          schedulesByTruck[truckId].push(schedule);
        } else {
          schedulesByTruck[truckId] = [schedule];
        }
      }

      return {
        events: eventsByTruck,
        schedules: schedulesByTruck,
      };
    } catch (error) {
      handleSupabaseError(error as Error, 'getTrucksWithEventsAndSchedules');
      logError(`Error fetching events and schedules for trucks: ${truckIds.join(', ')}`, error);
      return {
        events: {},
        schedules: {},
      };
    }
  },

  /**
   * Fetch all upcoming events (for event listings)
   */
  async getUpcomingEvents(limit: number = 50, offset: number = 0): Promise<Event[]> {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gt('date', new Date().toISOString().split('T')[0]) // Only future events
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return (data ?? []).map((row) => mapRowToEvent(row));
    } catch (error) {
      handleSupabaseError(error as Error, 'getUpcomingEvents');
      logError('Error fetching upcoming events:', error);
      return [];
    }
  },

  /**
   * Create a new recurring schedule
   */
  createRecurringSchedule(
    schedule: Omit<RecurringScheduleType, 'id' | 'createdAt' | 'updatedAt' | 'foodTruckId'>,
    foodTruckId: string,
  ): RecurringScheduleType | null {
    try {
      // In a real implementation, we would save this to the database
      // For now, we'll just return the schedule with a generated ID and timestamps
      const newSchedule: RecurringScheduleType = {
        ...schedule,
        id: `rec-${Date.now()}`,
        foodTruckId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return newSchedule;
    } catch (error) {
      handleSupabaseError(error as Error, 'createRecurringSchedule');
      logError('Error creating recurring schedule:', error);
      return null;
    }
  },

  /**
   * Update an existing recurring schedule
   */
  updateRecurringSchedule(
    scheduleId: string,
    updates: Partial<RecurringScheduleType>,
  ): RecurringScheduleType | null {
    try {
      // In a real implementation, we would update the database
      // For now, we'll just return a mock updated schedule
      const updatedSchedule: RecurringScheduleType = {
        ...updates,
        id: scheduleId,
        updatedAt: new Date().toISOString(),
      } as RecurringScheduleType;

      return updatedSchedule;
    } catch (error) {
      handleSupabaseError(error as Error, 'updateRecurringSchedule');
      logError('Error updating recurring schedule:', error);
      return null;
    }
  },

  /**
   * Delete a recurring schedule
   */
  deleteRecurringSchedule(_scheduleId: string): boolean {
    return true;
  },

  /**
   * Get all recurring schedules for a food truck
   */
  getRecurringSchedulesByTruckId(truckId: string): RecurringScheduleType[] {
    try {
      // In a real implementation, we would fetch from the database
      // For now, we'll return mock data that demonstrates the new functionality
      return [
        {
          id: 'rec-1',
          title: 'Regular Week Schedule',
          description: 'Standard weekly schedule for downtown location',
          baseLocation: 'Downtown Core',
          baseStartTime: '10:00',
          baseEndTime: '18:00',
          foodTruckId: truckId,
          recurrencePattern: {
            frequency: 'weekly',
            interval: 1,
            daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
            skipWeekends: true,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            isActive: true,
          },
          exceptions: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
      ];
    } catch (error) {
      handleSupabaseError(error as Error, 'getRecurringSchedulesByTruckId');
      logError(`Error fetching recurring schedules for truck: ${truckId}`, error);
      return [];
    }
  },

  /**
   * Calculate occurrences for a recurring schedule within a date range
   */
  calculateScheduleOccurrences(
    recurringSchedule: RecurringScheduleType,
    options: RecurrenceProcessingOptions,
  ): Record<string, unknown>[] {
    try {
      // Calculate occurrences using our recurrence processor
      const occurrences = calculateRecurrenceOccurrences(recurringSchedule, options);

      // Convert occurrences to a format compatible with existing schedule displays
      return occurrences.map((occ) => ({
        id: occ.id,
        date: occ.date,
        start_time: occ.startTime,
        end_time: occ.endTime,
        location: occ.location,
        title: occ.title,
        is_exception: occ.isException,
        is_active: occ.isActive,
        generated_at: occ.generatedAt,
      }));
    } catch (error) {
      handleSupabaseError(error as Error, 'calculateScheduleOccurrences');
      logError('Error calculating schedule occurrences:', error);
      return [];
    }
  },
};
