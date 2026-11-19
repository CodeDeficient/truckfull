import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { RealtimeEvent } from '@/hooks/useRealtimeAdminEvents.types';

describe('connectionManagementHelpers', () => {
  let disconnectEventSource: typeof import('@/hooks/realtime/connectionManagementHelpers').disconnectEventSource;
  let clearRecentEvents: typeof import('@/hooks/realtime/connectionManagementHelpers').clearRecentEvents;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('@/hooks/realtime/connectionManagementHelpers');
    disconnectEventSource = module.disconnectEventSource;
    clearRecentEvents = module.clearRecentEvents;
  });

  describe('disconnectEventSource', () => {
    it('should set isManuallyDisconnectedRef to true', () => {
      const isManuallyDisconnectedRef = { current: false };

      disconnectEventSource({
        eventSourceRef: { current: undefined },
        reconnectTimeoutRef: { current: undefined },
        isManuallyDisconnectedRef,
        setIsConnected: jest.fn(),
        setIsConnecting: jest.fn(),
        setConnectionError: jest.fn(),
      });

      expect(isManuallyDisconnectedRef.current).toBe(true);
    });

    it('should clear any pending reconnect timeout', () => {
      const mockClearTimeout = jest.fn();
      const originalClearTimeout = global.clearTimeout;
      global.clearTimeout = mockClearTimeout;

      const reconnectTimeoutRef = { current: setTimeout(() => {}, 1000) as unknown as NodeJS.Timeout };

      disconnectEventSource({
        eventSourceRef: { current: undefined },
        reconnectTimeoutRef,
        isManuallyDisconnectedRef: { current: false },
        setIsConnected: jest.fn(),
        setIsConnecting: jest.fn(),
        setConnectionError: jest.fn(),
      });

      expect(mockClearTimeout).toHaveBeenCalled();
      expect(reconnectTimeoutRef.current).toBeUndefined();
      global.clearTimeout = originalClearTimeout;
    });

    it('should close the EventSource if it exists', () => {
      const mockClose = jest.fn();
      const eventSource = { close: mockClose } as unknown as EventSource;

      disconnectEventSource({
        eventSourceRef: { current: eventSource },
        reconnectTimeoutRef: { current: undefined },
        isManuallyDisconnectedRef: { current: false },
        setIsConnected: jest.fn(),
        setIsConnecting: jest.fn(),
        setConnectionError: jest.fn(),
      });

      expect(mockClose).toHaveBeenCalled();
    });

    it('should set eventSourceRef to undefined after closing', () => {
      const mockClose = jest.fn();
      const eventSourceRef = { current: { close: mockClose } as unknown as EventSource };

      disconnectEventSource({
        eventSourceRef,
        reconnectTimeoutRef: { current: undefined },
        isManuallyDisconnectedRef: { current: false },
        setIsConnected: jest.fn(),
        setIsConnecting: jest.fn(),
        setConnectionError: jest.fn(),
      });

      expect(eventSourceRef.current).toBeUndefined();
    });

    it('should call setIsConnected with false', () => {
      const setIsConnected = jest.fn();

      disconnectEventSource({
        eventSourceRef: { current: undefined },
        reconnectTimeoutRef: { current: undefined },
        isManuallyDisconnectedRef: { current: false },
        setIsConnected,
        setIsConnecting: jest.fn(),
        setConnectionError: jest.fn(),
      });

      expect(setIsConnected).toHaveBeenCalledWith(false);
    });

    it('should call setIsConnecting with false', () => {
      const setIsConnecting = jest.fn();

      disconnectEventSource({
        eventSourceRef: { current: undefined },
        reconnectTimeoutRef: { current: undefined },
        isManuallyDisconnectedRef: { current: false },
        setIsConnected: jest.fn(),
        setIsConnecting,
        setConnectionError: jest.fn(),
      });

      expect(setIsConnecting).toHaveBeenCalledWith(false);
    });

    it('should call setConnectionError with undefined', () => {
      const setConnectionError = jest.fn();

      disconnectEventSource({
        eventSourceRef: { current: undefined },
        reconnectTimeoutRef: { current: undefined },
        isManuallyDisconnectedRef: { current: false },
        setIsConnected: jest.fn(),
        setIsConnecting: jest.fn(),
        setConnectionError,
      });

      expect(setConnectionError).toHaveBeenCalledWith(undefined);
    });

    it('should handle missing EventSource gracefully', () => {
      const setIsConnected = jest.fn();
      const setIsConnecting = jest.fn();
      const setConnectionError = jest.fn();

      expect(() => {
        disconnectEventSource({
          eventSourceRef: { current: undefined },
          reconnectTimeoutRef: { current: undefined },
          isManuallyDisconnectedRef: { current: false },
          setIsConnected,
          setIsConnecting,
          setConnectionError,
        });
      }).not.toThrow();

      expect(setIsConnected).toHaveBeenCalledWith(false);
    });
  });

  describe('clearRecentEvents', () => {
    it('should call setRecentEvents with empty array', () => {
      const setRecentEvents = jest.fn();

      clearRecentEvents(setRecentEvents);

      expect(setRecentEvents).toHaveBeenCalledWith([]);
    });

    it('should work with RealtimeEvent type', () => {
      const setRecentEvents = jest.fn<(events: RealtimeEvent[]) => void>();

      clearRecentEvents(setRecentEvents);

      expect(setRecentEvents).toHaveBeenCalledWith([]);
    });
  });
});