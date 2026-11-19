import { describe, it, expect } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

describe('useConnectionState', () => {
  let useConnectionState: typeof import('@/hooks/realtime/useConnectionState').useConnectionState;

  beforeEach(async () => {
    const module = await import('@/hooks/realtime/useConnectionState');
    useConnectionState = module.useConnectionState;
  });

  it('should initialize with isConnected false', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.isConnected).toBe(false);
  });

  it('should initialize with isConnecting false', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.isConnecting).toBe(false);
  });

  it('should initialize with connectionError undefined', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.connectionError).toBeUndefined();
  });

  it('should initialize with latestMetrics undefined', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.latestMetrics).toBeUndefined();
  });

  it('should initialize with recentEvents empty array', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.recentEvents).toEqual([]);
  });

  it('should initialize with connectionAttempts 0', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.connectionAttempts).toBe(0);
  });

  it('should initialize with lastEventTime undefined', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.lastEventTime).toBeUndefined();
  });

  it('should return all setter functions', () => {
    const { result } = renderHook(() => useConnectionState());

    expect(result.current.setIsConnected).toBeDefined();
    expect(typeof result.current.setIsConnected).toBe('function');

    expect(result.current.setIsConnecting).toBeDefined();
    expect(typeof result.current.setIsConnecting).toBe('function');

    expect(result.current.setConnectionError).toBeDefined();
    expect(typeof result.current.setConnectionError).toBe('function');

    expect(result.current.setLatestMetrics).toBeDefined();
    expect(typeof result.current.setLatestMetrics).toBe('function');

    expect(result.current.setRecentEvents).toBeDefined();
    expect(typeof result.current.setRecentEvents).toBe('function');

    expect(result.current.setConnectionAttempts).toBeDefined();
    expect(typeof result.current.setConnectionAttempts).toBe('function');

    expect(result.current.setLastEventTime).toBeDefined();
    expect(typeof result.current.setLastEventTime).toBe('function');
  });

  it('should allow setting isConnected to true', async () => {
    const { result } = renderHook(() => useConnectionState());

    await act(async () => {
      result.current.setIsConnected(true);
    });

    expect(result.current.isConnected).toBe(true);
  });

  it('should allow setting isConnecting to true', async () => {
    const { result } = renderHook(() => useConnectionState());

    await act(async () => {
      result.current.setIsConnecting(true);
    });

    expect(result.current.isConnecting).toBe(true);
  });

  it('should allow setting connectionError to a message', async () => {
    const { result } = renderHook(() => useConnectionState());

    await act(async () => {
      result.current.setConnectionError('Connection failed');
    });

    expect(result.current.connectionError).toBe('Connection failed');
  });

  it('should allow setting connectionAttempts', async () => {
    const { result } = renderHook(() => useConnectionState());

    await act(async () => {
      result.current.setConnectionAttempts(5);
    });

    expect(result.current.connectionAttempts).toBe(5);
  });

  it('should allow setting lastEventTime', async () => {
    const { result } = renderHook(() => useConnectionState());
    const testDate = new Date();

    await act(async () => {
      result.current.setLastEventTime(testDate);
    });

    expect(result.current.lastEventTime).toEqual(testDate);
  });
});