import { getSupabase } from '../supabase/client';
import { handleSupabaseError } from '../supabase/utils';
import type { Event } from '../types';
import type { PostgrestError } from '@supabase/supabase-js';
import { logError, logWarning, logMessage } from '@/lib/logging';

// Define our timezone-aware event interface
interface EventRow {
  id?: string | null;
  food_truck_id?: string | null;
  title?: string | null;
  description?: string | null;
  date?: string | null;
  time?: string | null;
  end_time?: string | null;
  location?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface TimezoneAwareEvent extends Event {
  start_datetime?: string; // Combined date and time in ISO format
  end_datetime?: string; // Combined date and time in ISO format
  timezone?: string; // Timezone identifier (e.g. 'America/New_York')
  local_start_time?: string; // Formatted time in local timezone
  local_end_time?: string; // Formatted time in local timezone
}

// Define options for timezone handling
export interface EventFetchOptions {
  timezone?: string; // Client timezone (e.g. 'America/New_York')
  includePastEvents?: boolean;
  limit?: number;
  offset?: number;
  startDate?: string; // Filter events from this date
  endDate?: string; // Filter events until this date
}

// Internal helper to build common query with date filtering
function buildBaseEventQuery(
  supabase: ReturnType<typeof getSupabase>,
  filterColumn: string,
  filterValue: string | string[],
  options: EventFetchOptions = {},
) {
  const { includePastEvents = false, startDate, endDate } = options;

  // Start building the query
  let query = supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })
    .order('time', { ascending: true });

  // Apply the specific filter (truck ID, truck IDs, etc.)
  query = Array.isArray(filterValue)
    ? query.in(filterColumn, filterValue)
    : query.eq(filterColumn, filterValue);

  // Filter for future events unless explicitly requested to include past events
  if (!includePastEvents) {
    const today = new Date().toISOString().split('T')[0];
    query = query.gte('date', today);
  }

  // Apply date range filters if specified
  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  return query;
}

// Internal helper to apply pagination to a query
function applyPagination<T extends { range: (from: number, to: number) => T; limit: (n: number) => { range: (from: number, to: number) => T } }>(query: T, options: EventFetchOptions = {}): T {
  const { limit = 5000, offset = 0 } = options;

  // Only apply range if limit is specified (for methods that have optional limits)
  if (options.limit !== undefined) {
    return query.range(offset, offset + limit - 1);
  }

  return query.limit(limit).range(offset, offset + limit - 1);
}

// Internal helper for common error handling
function handleEventServiceError(error: Error | PostgrestError, context: string) {
  handleSupabaseError(error, context);
  logError(`Error in TruckEventsService: ${context}`, error);
  return [];
}

// Internal helper to transform data with timezone handling
function transformEventData(data: EventRow[], timezone?: string): TimezoneAwareEvent[] {
  return (data || []).map((row) => TruckEventsService.transformEventWithTimezone(row, timezone));
}

// Internal helper to build query for upcoming events within a specific date range
function buildUpcomingEventsQuery(
  supabase: ReturnType<typeof getSupabase>,
  truckIds: string[],
  daysAhead: number,
  options: EventFetchOptions = {},
) {
  const { limit = 20 } = options;

  // Calculate the future date
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split('T')[0];
  const currentDateStr = new Date().toISOString().split('T')[0];

  return supabase
    .from('events')
    .select('*')
    .in('food_truck_id', truckIds)
    .gte('date', currentDateStr)
    .lte('date', futureDateStr)
    .order('date', { ascending: true })
    .order('time', { ascending: true })
    .limit(limit);
}

/**
 * Service for fetching events for trucks with proper timezone handling
 */
export const TruckEventsService = {
  /**
   * Fetch events for a specific truck with timezone handling
   */
  async getEventsByTruckId(
    truckId: string,
    options: EventFetchOptions = {},
  ): Promise<TimezoneAwareEvent[]> {
    try {
      const { timezone } = options;
      const supabase = getSupabase();

      // Build base query with truck ID filter
      let query = buildBaseEventQuery(supabase, 'food_truck_id', truckId, options);

      // Apply pagination
      query = applyPagination(query, options);

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to include timezone-aware properties
      return transformEventData(data, timezone);
    } catch (error) {
      return handleEventServiceError(
        error as Error | PostgrestError,
        `getEventsByTruckId - truckId: ${truckId}`,
      );
    }
  },

  /**
   * Fetch events for multiple trucks with timezone handling
   */
  async getEventsByTruckIds(
    truckIds: string[],
    options: EventFetchOptions = {},
  ): Promise<Record<string, TimezoneAwareEvent[]>> {
    try {
      const { timezone } = options;
      const supabase = getSupabase();

      // Build base query with truck IDs filter
      let query = buildBaseEventQuery(supabase, 'food_truck_id', truckIds, options);

      // Apply pagination only if limit is specified
      if (options.limit !== undefined) {
        query = applyPagination(query, options);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Group events by truck ID
      const eventsByTruck: Record<string, TimezoneAwareEvent[]> = {};
      for (const id of truckIds) {
        eventsByTruck[id] = [];
      }

      // Transform and group data
      for (const row of (data as unknown as EventRow[]) || []) {
        const event = this.transformEventWithTimezone(row, timezone);
        const truckId = row.food_truck_id;

        if (truckId && eventsByTruck[truckId]) {
          eventsByTruck[truckId].push(event);
        } else if (truckId) {
          eventsByTruck[truckId] = [event];
        }
      }

      return eventsByTruck;
    } catch (error) {
      logError(`Error fetching events for trucks: ${truckIds.join(', ')}`, error);
      // Return empty records for each truck ID to maintain structure
      const result: Record<string, TimezoneAwareEvent[]> = {};
      for (const id of truckIds) {
        result[id] = [];
      }
      return result;
    }
  },

  /**
   * Fetch events filtered by location with timezone handling
   */
  async getEventsByLocation(
    latitude: number,
    longitude: number,
    _radiusInMeters: number = 5000, // Default to 5km radius
    options: EventFetchOptions = {},
  ): Promise<TimezoneAwareEvent[]> {
    try {
      const { timezone } = options;
      const supabase = getSupabase();

      // This assumes there's a function to calculate distance in the database
      // If not available, we might need to fetch all events and filter client-side
      let query = supabase
        .from('events') // Table exists in generated types
        .select(
          `
          *,
          food_trucks!inner (
            id, 
            name, 
            current_location
          )
        `,
        )
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      // Filter for future events unless explicitly requested to include past events
      if (!options.includePastEvents) {
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('date', today);
      }

      // Apply date range filters if specified
      if (options.startDate) {
        query = query.gte('date', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('date', options.endDate);
      }

      // Apply pagination
      query = applyPagination(query, options);

      const { data, error } = await query;

      if (error) throw error;

      // Filter by distance if we have the capability (this might need to be done differently based on your DB setup)
      // For now, we'll just transform the data with timezone info
      return transformEventData(data, timezone).filter((_event) => {
        // Distance filtering would happen here if we had location data in events
        // For now, just return all events that passed the initial filters
        return true;
      });
    } catch (error) {
      return handleEventServiceError(
        error as Error | PostgrestError,
        `getEventsByLocation - lat: ${latitude}, lng: ${longitude}`,
      );
    }
  },

  /**
   * Transform raw event data to include timezone-aware properties
   */
  transformEventWithTimezone(row: EventRow, clientTimezone?: string): TimezoneAwareEvent {
    // Create a combined date-time string for proper timezone handling
    const dateStr = row.date;
    const timeStr = row.time ?? '00:00:00'; // Default to midnight if no time provided

    // Create Date object from date and time
    // The date and time are stored in the database without timezone info
    // We'll handle timezone conversion when needed
    const dateTimeStr = `${dateStr}T${timeStr}`;

    // If we have a client timezone, we could convert to that timezone
    let localStartTime = timeStr;
    let localEndTime = row.end_time ?? timeStr;
    let startDateTime = dateTimeStr;
    let endDateTime = row.end_time ? `${dateStr}T${row.end_time}` : dateTimeStr;

    // If client timezone is provided, attempt to format accordingly
    if (clientTimezone) {
      try {
        const dateObj = new Date(dateTimeStr);
        localStartTime = dateObj.toLocaleTimeString(clientTimezone, {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: clientTimezone,
        });

        // Update the start datetime to ISO format with timezone info
        startDateTime = dateObj.toLocaleString(clientTimezone, {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: clientTimezone,
          timeZoneName: 'short',
        });

        // Handle end time if available
        if (row.end_time) {
          const endDateObj = new Date(`${dateStr}T${row.end_time}`);
          localEndTime = endDateObj.toLocaleTimeString(clientTimezone, {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: clientTimezone,
          });

          endDateTime = endDateObj.toLocaleString(clientTimezone, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: clientTimezone,
            timeZoneName: 'short',
          });
        }
      } catch (tzError) {
        logWarning(`Error processing timezone: ${String(tzError)}`);
        // Fallback to original values if timezone conversion fails
      }
    }

    return {
      id: row.id ?? '',
      food_truck_id: row.food_truck_id ?? '',
      title: (row.title ?? row.location) ?? '',
      description: row.description ?? '',
      date: row.date ?? '',
      time: row.time ?? '',
      location: {
        address: row.location ?? undefined,
        lat: row.location_lat ?? 0,
        lng: row.location_lng ?? 0,
        location_name: (row.location_name ?? row.location) ?? '',
      },
      created_at: row.created_at ?? undefined,
      updated_at: row.updated_at ?? undefined,
      // Timezone-aware additions
      start_datetime: startDateTime,
      end_datetime: endDateTime,
      timezone: clientTimezone,
      local_start_time: localStartTime,
      local_end_time: localEndTime,
    };
  },

  /**
   * Subscribe to real-time updates for events of a specific truck
   */
  subscribeToTruckEvents(
    truckId: string,
    callback: (events: TimezoneAwareEvent[]) => void,
    options: EventFetchOptions = {},
  ) {
    const supabase = getSupabase();

    const handleUpdate = async () => {
      try {
        const events = await this.getEventsByTruckId(truckId, options);
        callback(events);
      } catch (error) {
        logError('Error in TruckEventsService handleUpdate:', error);
      }
    };

    // Initial call to populate data
    void handleUpdate();

    const channel = supabase.channel(`public:events:truck_${truckId}`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'events',
        filter: `food_truck_id=eq.${truckId}`,
      },
      (_event: Record<string, unknown>) => {
        void handleUpdate();
      },
    );

    // Subscribe with status callback
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        logMessage(`Successfully subscribed to events for truck ${truckId}`);
      } else if (status === 'CHANNEL_ERROR') {
        logError(`Error subscribing to events for truck ${truckId}`);
      }
    });

    return {
      unsubscribe: () => {
        supabase.removeChannel(channel);
      },
    };
  },

  /**
   * Get upcoming events for multiple trucks (optimized for dashboard view)
   */
  async getUpcomingEventsForTrucks(
    truckIds: string[],
    daysAhead: number = 7,
    options: EventFetchOptions = {},
  ): Promise<TimezoneAwareEvent[]> {
    try {
      const { timezone } = options;
      const supabase = getSupabase();

      const { data, error } = await buildUpcomingEventsQuery(
        supabase,
        truckIds,
        daysAhead,
        options,
      );

      if (error) throw error;

      return transformEventData(data, timezone);
    } catch (error) {
      return handleEventServiceError(
        error as Error | PostgrestError,
        `getUpcomingEventsForTrucks - truckIds: ${truckIds.join(', ')}`,
      );
    }
  },
};
