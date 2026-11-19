import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import type { RealtimeEvent } from '@/hooks/useRealtimeAdminEvents.types';
import { useSystemAlerts } from '@/hooks/useSystemAlerts';

describe('useSystemAlerts', () => {
  const createMockEvent = (overrides: Partial<RealtimeEvent> = {}): RealtimeEvent => ({
    id: 'event-1',
    type: 'system_alert',
    timestamp: '2024-01-01T00:00:00Z',
    data: {},
    severity: 'info',
    ...overrides,
  });

  let eventsArray: RealtimeEvent[];

  beforeEach(() => {
    eventsArray = [];
  });

  describe('initial state', () => {
    it('should initialize with empty alerts and showDetails false', () => {
      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts).toEqual([]);
      expect(result.current.showDetails).toBe(false);
    });
  });

  describe('event processing', () => {
    it('should process events into alerts', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning', data: { message: 'Warning message' } }),
        createMockEvent({ id: '2', severity: 'error', data: { message: 'Error message' } }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts.length).toBe(2);
      expect(result.current.alerts[0].message).toBe('Warning message');
      expect(result.current.alerts[1].message).toBe('Error message');
    });

    it('should filter out events with info severity', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'info' }),
        createMockEvent({ id: '2', severity: 'warning' }),
        createMockEvent({ id: '3', severity: 'error' }),
        createMockEvent({ id: '4', severity: 'critical' }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts.length).toBe(3);
      expect(result.current.alerts.find((a) => a.id === '1')).toBeUndefined();
    });

    it('should use default message when event data has no message', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning', data: {} }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts[0].message).toBe('System event occurred');
    });

    it('should extract message from event data when available', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning', data: { message: 'Custom message' } }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts[0].message).toBe('Custom message');
    });

    it('should use default message when event data.message is not a string', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning', data: { message: 123 } }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts[0].message).toBe('System event occurred');
    });

    it('should preserve event severity as alert type', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning' }),
        createMockEvent({ id: '2', severity: 'error' }),
        createMockEvent({ id: '3', severity: 'critical' }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts.find((a) => a.id === '1')?.type).toBe('warning');
      expect(result.current.alerts.find((a) => a.id === '2')?.type).toBe('error');
      expect(result.current.alerts.find((a) => a.id === '3')?.type).toBe('critical');
    });

    it('should limit to 5 most recent alerts', () => {
      eventsArray = Array.from({ length: 10 }, (_, i) =>
        createMockEvent({ id: String(i), severity: 'warning', timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` }),
      );

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts.length).toBe(5);
    });

    it('should set acknowledged to false for all alerts', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning' }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts[0].acknowledged).toBe(false);
    });

    it('should return empty alerts when all events have info severity', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'info' }),
        createMockEvent({ id: '2', severity: 'info' }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts.length).toBe(0);
    });
  });

  describe('state updates', () => {
    it('should acknowledge alert by id', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning' }),
        createMockEvent({ id: '2', severity: 'error' }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      act(() => {
        result.current.acknowledgeAlert('1');
      });

      expect(result.current.alerts[0].acknowledged).toBe(true);
      expect(result.current.alerts[1].acknowledged).toBe(false);
    });

    it('should toggle showDetails', () => {
      eventsArray = [
        createMockEvent({ id: '1', severity: 'warning' }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.showDetails).toBe(false);

      act(() => {
        result.current.toggleDetails();
      });

      expect(result.current.showDetails).toBe(true);

      act(() => {
        result.current.toggleDetails();
      });

      expect(result.current.showDetails).toBe(false);
    });
  });

  describe('alert properties', () => {
    it('should preserve alert id, type, message, and timestamp', () => {
      eventsArray = [
        createMockEvent({
          id: 'test-id',
          severity: 'critical',
          timestamp: '2024-06-15T10:30:00Z',
          data: { message: 'Critical error occurred' },
        }),
      ];

      const { result } = renderHook(() => useSystemAlerts(eventsArray));

      expect(result.current.alerts[0]).toEqual({
        id: 'test-id',
        type: 'critical',
        message: 'Critical error occurred',
        timestamp: '2024-06-15T10:30:00Z',
        acknowledged: false,
      });
    });
  });
});