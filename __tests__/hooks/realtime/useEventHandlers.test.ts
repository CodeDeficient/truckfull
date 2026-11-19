import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import type { RealtimeEvent } from '@/hooks/useRealtimeAdminEvents.types';
import type { RealtimeMetrics } from '@/lib/types';

describe('useEventHandlers', () => {
  let useEventHandlers: typeof import('@/hooks/realtime/useEventHandlers').useEventHandlers;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('@/hooks/realtime/useEventHandlers');
    useEventHandlers = module.useEventHandlers;
  });

  const createMockEvent = (overrides: Partial<RealtimeEvent> = {}): RealtimeEvent => ({
    id: 'test-id',
    type: 'heartbeat',
    timestamp: new Date().toISOString(),
    data: {},
    ...overrides,
  });

  describe('event filtering', () => {
    it('should skip events that fail filter check', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const eventFilter = (event: RealtimeEvent) => event.type !== 'heartbeat';
      const { result } = renderHook(() =>
        useEventHandlers(eventFilter, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const heartbeatEvent = createMockEvent({ type: 'heartbeat' });
      result.current(heartbeatEvent);

      expect(setLastEventTime).not.toHaveBeenCalled();
      expect(setRecentEvents).not.toHaveBeenCalled();
    });

    it('should process events that pass filter check', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const eventFilter = (event: RealtimeEvent) => event.type !== 'heartbeat';
      const { result } = renderHook(() =>
        useEventHandlers(eventFilter, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const activityEvent = createMockEvent({ type: 'user_activity' });
      result.current(activityEvent);

      expect(setLastEventTime).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should process all events when no filter is provided', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const heartbeatEvent = createMockEvent({ type: 'heartbeat' });
      result.current(heartbeatEvent);

      expect(setLastEventTime).toHaveBeenCalled();
    });
  });

  describe('heartbeat events', () => {
    it('should update latest metrics when heartbeat contains valid RealtimeMetrics', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const metrics: RealtimeMetrics = {
        dataQuality: 95,
        systemHealth: 'good',
        activeConnections: 10,
        messagesPerSecond: 50,
      };

      const heartbeatEvent = createMockEvent({
        type: 'heartbeat',
        data: metrics as unknown as Record<string, unknown>,
      });

      result.current(heartbeatEvent);

      expect(setLatestMetrics).toHaveBeenCalledWith(metrics);
    });

    it('should not update metrics when heartbeat data is undefined', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const heartbeatEvent = createMockEvent({
        type: 'heartbeat',
        data: undefined,
      });

      result.current(heartbeatEvent);

      expect(setLatestMetrics).not.toHaveBeenCalled();
    });

    it('should not update metrics when heartbeat data is primitive', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const heartbeatEvent = createMockEvent({
        type: 'heartbeat',
        data: 'primitive' as unknown as Record<string, unknown>,
      });

      result.current(heartbeatEvent);

      expect(setLatestMetrics).not.toHaveBeenCalled();
    });

    it('should not update metrics when heartbeat data lacks required properties', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const heartbeatEvent = createMockEvent({
        type: 'heartbeat',
        data: { someProperty: 'value' } as unknown as Record<string, unknown>,
      });

      result.current(heartbeatEvent);

      expect(setLatestMetrics).not.toHaveBeenCalled();
    });
  });

  describe('non-heartbeat events', () => {
    it('should add data_quality_change events to recent events', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const event = createMockEvent({ type: 'data_quality_change' });
      result.current(event);

      expect(setRecentEvents).toHaveBeenCalledWith(expect.any(Function));
      const updateFn = setRecentEvents.mock.calls[0][0];
      const previousEvents: RealtimeEvent[] = [];
      const newEvents = updateFn(previousEvents);

      expect(newEvents).toHaveLength(1);
      expect(newEvents[0]).toEqual(event);
    });

    it('should add system_alert events to recent events', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const event = createMockEvent({ type: 'system_alert' });
      result.current(event);

      expect(setRecentEvents).toHaveBeenCalled();
    });

    it('should add user_activity events to recent events', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const event = createMockEvent({ type: 'user_activity' });
      result.current(event);

      expect(setRecentEvents).toHaveBeenCalled();
    });
  });

  describe('recent events limit', () => {
    it('should keep only the last 50 events', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const existingEvents: RealtimeEvent[] = Array.from({ length: 50 }, (_, i) =>
        createMockEvent({ id: `existing-${i}`, type: 'user_activity' }),
      );

      const newEvent = createMockEvent({ id: 'new-event', type: 'user_activity' });

      result.current(newEvent);

      const updateFn = setRecentEvents.mock.calls[0][0];
      const resultEvents = updateFn(existingEvents);

      expect(resultEvents).toHaveLength(50);
      expect(resultEvents[0]).toEqual(newEvent);
    });

    it('should add new event at the beginning of the list', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const existingEvents: RealtimeEvent[] = [
        createMockEvent({ id: 'existing-1', type: 'user_activity' }),
      ];

      const newEvent = createMockEvent({ id: 'new-event', type: 'user_activity' });

      result.current(newEvent);

      const updateFn = setRecentEvents.mock.calls[0][0];
      const resultEvents = updateFn(existingEvents);

      expect(resultEvents[0]).toEqual(newEvent);
      expect(resultEvents[1]).toEqual(existingEvents[0]);
    });
  });

  describe('last event time', () => {
    it('should update last event time on every event', () => {
      const setLastEventTime = jest.fn();
      const setLatestMetrics = jest.fn();
      const setRecentEvents = jest.fn();

      const { result } = renderHook(() =>
        useEventHandlers(undefined, setLastEventTime, setLatestMetrics, setRecentEvents),
      );

      const event = createMockEvent({ type: 'user_activity' });
      result.current(event);

      expect(setLastEventTime).toHaveBeenCalledWith(expect.any(Date));
    });
  });
});