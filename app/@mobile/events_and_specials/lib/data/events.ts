import { getSupabase } from '@/lib/supabase/client';
import { logError, logWarning } from '@/lib/logging';

// Define a type for event records to replace Record<string, any>
export interface EventRecord {
  [key: string]: unknown;
  id?: string;
  name?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  food_truck_id?: string;
  created_at?: string;
  updated_at?: string;
}

export function fetchEventsAndSpecials(
  _type: 'events' | 'specials',
  _limit: number = 100,
  _offset: number = 0,
): EventRecord[] {
  // Events and specials tables don't exist in the current database schema
  // Return empty arrays for now until the database schema is updated
  logWarning(
    `fetchEventsAndSpecials called for '${_type}' but events/specials tables don't exist in database schema`,
  );
  return [];
}

export function subscribeToEventsAndSpecials(
  type: 'events' | 'specials',
  callback: (payload: EventRecord[]) => void,
) {
  const supabase = getSupabase();

  const handleUpdate = () => {
    try {
      const data = fetchEventsAndSpecials(type);
      // callback returns void, not a Promise, so no need to check instanceof Promise
      callback(data);
    } catch (error_) {
      logError('Error in fetchEventsAndSpecials:', error_);
    }
  };

  handleUpdate(); // Initial call

  // Only 'events' table exists, so use 'events' for the channel
  const tableName = type === 'specials' ? 'events' : type;

  const channel = supabase
    .channel(`public:${tableName}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, () => {
      handleUpdate();
    });

  // RealtimeChannel subscribe doesn't return a promise, handle status in callback
  channel.subscribe((status: string) => {
    if (status === 'SUBSCRIBED') {
      // Successfully subscribed
    } else if (status === 'CHANNEL_ERROR') {
      logError(`Error subscribing to ${tableName} channel`);
    }
  });

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}
