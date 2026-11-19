import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';
import { jest } from '@jest/globals';

describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(async () => {
    await jest.runOnlyPendingTimersAsync();
    jest.useRealTimers();
  });

  describe('useDebounce hook', () => {
    it('should return initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 500));
      expect(result.current).toBe('initial');
    });

    it('should debounce value changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 500 },
        }
      );

      expect(result.current).toBe('initial');

      // Change value
      rerender({ value: 'updated', delay: 500 });
      
      // Value should not change immediately
      expect(result.current).toBe('initial');

      // Fast-forward time by 500ms
      await act(async () => {
        await jest.advanceTimersByTimeAsync(500);
      });

      // Now value should be updated
      expect(result.current).toBe('updated');
    });

    it('should cancel previous timeout on rapid changes', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: 1 },
        }
      );

      expect(result.current).toBe(1);

      // Make rapid changes
      rerender({ value: 2 });
      await act(async () => { await jest.advanceTimersByTimeAsync(100); });
      expect(result.current).toBe(1); // Still 1

      rerender({ value: 3 });
      await act(async () => { await jest.advanceTimersByTimeAsync(100); });
      expect(result.current).toBe(1); // Still 1

      rerender({ value: 4 });
      await act(async () => { await jest.advanceTimersByTimeAsync(100); });
      expect(result.current).toBe(1); // Still 1

      // Wait for the full debounce period from the last change
      await act(async () => { await jest.advanceTimersByTimeAsync(200); });
      expect(result.current).toBe(4); // Now updated to the last value
    });

    it('should handle delay changes', async () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        {
          initialProps: { value: 'initial', delay: 200 },
        }
      );

      rerender({ value: 'updated', delay: 500 });

      await act(async () => { await jest.advanceTimersByTimeAsync(200); });
      expect(result.current).toBe('initial'); // Not enough time passed

      await act(async () => { await jest.advanceTimersByTimeAsync(300); });
      expect(result.current).toBe('updated'); // Now updated
    });

    it('should work with complex objects', async () => {
      const initialObj = { count: 1, name: 'test' };
      const updatedObj = { count: 2, name: 'updated' };

      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        {
          initialProps: { value: initialObj },
        }
      );

      expect(result.current).toEqual(initialObj);

      rerender({ value: updatedObj });
      expect(result.current).toEqual(initialObj);

      await act(async () => { await jest.advanceTimersByTimeAsync(300); });
      expect(result.current).toEqual(updatedObj);
    });

    it('should handle zero delay', async () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 0),
        {
          initialProps: { value: 'initial' },
        }
      );

      rerender({ value: 'updated' });
      
      // With zero delay, update should be immediate (next tick)
      await act(async () => { await jest.advanceTimersByTimeAsync(0); });
      expect(result.current).toBe('updated');
    });
  });

  describe('useDebouncedCallback hook', () => {
    it('should debounce callback execution', async () => {
      const mockCallback = jest.fn();
      
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      // Call the debounced function multiple times
      await act(async () => {
        result.current('first');
        result.current('second');
        result.current('third');
      });

      // Callback should not be called immediately
      expect(mockCallback).not.toHaveBeenCalled();

      // Fast-forward time
      await act(async () => { await jest.advanceTimersByTimeAsync(300); });

      // Callback should be called only once with the last arguments
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('third');
    });

    it('should handle multiple arguments', async () => {
      const mockCallback = jest.fn();
      
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 200)
      );

      await act(async () => {
        result.current(1, 'test', true);
      });

      await act(async () => { await jest.advanceTimersByTimeAsync(200); });

      expect(mockCallback).toHaveBeenCalledWith(1, 'test', true);
    });

    it('should cancel previous timeouts', async () => {
      const mockCallback = jest.fn();
      
      const { result } = renderHook(() => 
        useDebouncedCallback(mockCallback, 500)
      );

      // Make rapid calls
      await act(async () => {
        result.current('call1');
      });
      
      await act(async () => { await jest.advanceTimersByTimeAsync(200); });
      
      await act(async () => {
        result.current('call2');
      });
      
      await act(async () => { await jest.advanceTimersByTimeAsync(200); });
      
      await act(async () => {
        result.current('call3');
      });

      // Callback should not have been called yet
      expect(mockCallback).not.toHaveBeenCalled();

      // Wait for the full delay from the last call
      await act(async () => { await jest.advanceTimersByTimeAsync(500); });

      // Should only be called once with the last value
      expect(mockCallback).toHaveBeenCalledTimes(1);
      expect(mockCallback).toHaveBeenCalledWith('call3');
    });

    it('should clean up on unmount', async () => {
      const mockCallback = jest.fn();
      
      const { result, unmount } = renderHook(() => 
        useDebouncedCallback(mockCallback, 300)
      );

      await act(async () => {
        result.current('test');
      });

      // Unmount before the callback fires
      unmount();

      await act(async () => { await jest.advanceTimersByTimeAsync(300); });

      // Callback should not be called after unmount
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });
});
