import { createEventSourceConnection } from './createEventSourceConnection';
import { disconnectEventSource, clearRecentEvents } from './connectionManagementHelpers';
import type { RealtimeEvent } from '@/hooks/useRealtimeAdminEvents.types';
import type { RealtimeMetrics as LatestMetrics } from '@/lib/types';

export interface EventSourceManagerOptions {
  eventSourceRef: React.RefObject<EventSource | undefined>;
  reconnectTimeoutRef: React.RefObject<NodeJS.Timeout | undefined>;
  isManuallyDisconnectedRef: React.RefObject<boolean>;
  handleEvent: (event: RealtimeEvent) => void;
  connectionAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  isConnecting: boolean;
  setLastEventTime: React.Dispatch<React.SetStateAction<Date | undefined>>;
  setLatestMetrics: React.Dispatch<React.SetStateAction<LatestMetrics | undefined>>;
  setRecentEvents: React.Dispatch<React.SetStateAction<RealtimeEvent[]>>;
  setIsConnected: (connected: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | undefined) => void;
  setConnectionAttempts: (attempts: number | ((prev: number) => number)) => void;
}

export function createEventSourceManager(options: EventSourceManagerOptions) {
  const connect = () => {
    const config = {
      ...options,
      connect: () => connect(),
      connectionState: {
        setIsConnecting: options.setIsConnecting,
        setConnectionError: options.setConnectionError,
      },
    };
    createEventSourceConnection(config);
  };

  const disconnect = () => {
    disconnectEventSource({
      eventSourceRef: options.eventSourceRef,
      reconnectTimeoutRef: options.reconnectTimeoutRef,
      isManuallyDisconnectedRef: options.isManuallyDisconnectedRef,
      setIsConnected: options.setIsConnected,
      setIsConnecting: options.setIsConnecting,
      setConnectionError: options.setConnectionError,
    });
  };

  const clearEvents = () => {
    clearRecentEvents(options.setRecentEvents);
  };

  return { connect, disconnect, clearEvents };
}
