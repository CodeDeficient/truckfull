import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

describe('useAutoConnect', () => {
  let useAutoConnect: typeof import('@/hooks/realtime/useAutoConnect').useAutoConnect;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('@/hooks/realtime/useAutoConnect');
    useAutoConnect = module.useAutoConnect;
  });

  it('should call connect when autoConnect is true', () => {
    const connect = jest.fn();
    const disconnect = jest.fn();

    renderHook(() => useAutoConnect(true, connect, disconnect));

    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('should not call connect when autoConnect is false', () => {
    const connect = jest.fn();
    const disconnect = jest.fn();

    renderHook(() => useAutoConnect(false, connect, disconnect));

    expect(connect).not.toHaveBeenCalled();
  });

  it('should call disconnect on cleanup', () => {
    const connect = jest.fn();
    const disconnect = jest.fn();

    const { unmount } = renderHook(() => useAutoConnect(true, connect, disconnect));

    expect(disconnect).not.toHaveBeenCalled();

    unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('should call disconnect when autoConnect changes to false', () => {
    const connect = jest.fn();
    const disconnect = jest.fn();

    const { rerender } = renderHook(
      ({ autoConnect }) => useAutoConnect(autoConnect, connect, disconnect),
      { initialProps: { autoConnect: true } },
    );

    expect(connect).toHaveBeenCalledTimes(1);
    expect(disconnect).not.toHaveBeenCalled();

    rerender({ autoConnect: false });

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it('should reconnect when autoConnect changes from false to true', () => {
    const connect = jest.fn();
    const disconnect = jest.fn();

    const { rerender } = renderHook(
      ({ autoConnect }) => useAutoConnect(autoConnect, connect, disconnect),
      { initialProps: { autoConnect: false } },
    );

    expect(connect).not.toHaveBeenCalled();

    rerender({ autoConnect: true });

    expect(connect).toHaveBeenCalledTimes(1);
  });
});