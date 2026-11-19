import * as React from 'react';
import type { RealtimeEvent } from '@/hooks/useRealtimeAdminEvents.types';
import type { RealtimeMetrics } from '@/lib/types';
import { setupEventSourceAuth } from '@/hooks/useRealtimeAdminEventsHelpers';
import { logError, logMessage } from '@/lib/logging';
function handleConnectionError(
  error: unknown,
  setIsConnecting: (connecting: boolean) => void,
  setConnectionError: (error: string | undefined) => void,
) {
  logError('Failed to establish real-time connection:', error);
  setIsConnecting(false);
  setConnectionError(error instanceof Error ? error.message : 'Connection failed');
}

function initializeEventSource(config: CreateConnectionConfig) {
  const {
    handleEvent,
    isManuallyDisconnectedRef,
    connectionAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    reconnectTimeoutRef,
    connect,
    setIsConnected,
    setIsConnecting,
    setConnectionError,
    setConnectionAttempts,
  } = config;
  const eventSource = new EventSource('/api/admin/realtime-events');

  eventSource.addEventListener('open', () => {
    logMessage('Real-time admin events connected');
    setIsConnected(true);
    setIsConnecting(false);
    setConnectionError(undefined);
    setConnectionAttempts(0);
  });

  eventSource.addEventListener('message', (event: MessageEvent) => {
    try {
      const adminEvent: RealtimeEvent = JSON.parse(event.data as string) as RealtimeEvent;
      handleEvent(adminEvent);
    } catch (error) {
      logError('Error parsing event data:', error);
      setConnectionError('Error parsing event data');
    }
  });

  eventSource.addEventListener('error', (error: Event) => {
    logError('Real-time admin events error:', error);
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError('Connection error occurred');

    if (isManuallyDisconnectedRef.current !== true && connectionAttempts < maxReconnectAttempts) {
      setConnectionAttempts((prev) => prev + 1);

      reconnectTimeoutRef.current = setTimeout(() => {
        if (isManuallyDisconnectedRef.current !== true) {
          connect();
        }
      }, reconnectInterval);
    } else if (connectionAttempts >= maxReconnectAttempts) {
      setConnectionError('Max reconnection attempts reached');
    }
  });

  return eventSource;
}

function setupInitialConnectionState(
  setIsConnecting: (connecting: boolean) => void,
  setConnectionError: (error: string | undefined) => void,
  isManuallyDisconnectedRef: React.RefObject<boolean>,
) {
  setIsConnecting(true);
  setConnectionError(undefined);
  isManuallyDisconnectedRef.current = false;
}

function establishEventSourceConnection(config: CreateConnectionConfig) {
  const { eventSourceRef, connectionState } = config;
  try {
    setupEventSourceAuth();
    eventSourceRef.current = initializeEventSource(config);
  } catch (error) {
    handleConnectionError(
      error,
      connectionState.setIsConnecting,
      connectionState.setConnectionError,
    );
  }
}

export function shouldPreventConnection(
  eventSourceRef: React.RefObject<EventSource | undefined>,
  isConnecting: boolean,
): boolean {
  return !!eventSourceRef.current || isConnecting;
}

export interface CreateConnectionConfig {
  eventSourceRef: React.RefObject<EventSource | undefined>;
  isConnecting: boolean;
  isManuallyDisconnectedRef: React.RefObject<boolean>;
  connectionAttempts: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  reconnectTimeoutRef: React.RefObject<NodeJS.Timeout | undefined>;
  handleEvent: (event: RealtimeEvent) => void;
  connect: () => void;
  setLastEventTime: React.Dispatch<React.SetStateAction<Date | undefined>>;
  setLatestMetrics: React.Dispatch<React.SetStateAction<RealtimeMetrics | undefined>>;
  setRecentEvents: React.Dispatch<React.SetStateAction<RealtimeEvent[]>>;
  setIsConnected: (connected: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
  setConnectionError: (error: string | undefined) => void;
  setConnectionAttempts: (attempts: number | ((prev: number) => number)) => void;
  connectionState: {
    setIsConnecting: (connecting: boolean) => void;
    setConnectionError: (error: string | undefined) => void;
  };
}

export function createEventSourceConnection(config: CreateConnectionConfig) {
  const {
    eventSourceRef,
    isConnecting,
    isManuallyDisconnectedRef,
    setIsConnecting,
    setConnectionError,
  } = config;

  if (shouldPreventConnection(eventSourceRef, isConnecting)) {
    return;
  }

  setupInitialConnectionState(setIsConnecting, setConnectionError, isManuallyDisconnectedRef);
  establishEventSourceConnection(config);
}
