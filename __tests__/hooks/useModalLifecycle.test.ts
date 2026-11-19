import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

const { useModalLifecycle } = await import('@/hooks/useModalLifecycle');

describe('useModalLifecycle', () => {
  const mockCloseModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.addEventListener = jest.fn();
    document.removeEventListener = jest.fn();
  });

  describe('dialogRef', () => {
    it('should return a ref object with current property', () => {
      const { result } = renderHook(() => useModalLifecycle(mockCloseModal));
      expect(result.current.dialogRef).toBeDefined();
      expect('current' in result.current.dialogRef).toBe(true);
    });
  });

  describe('onOpen', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useModalLifecycle(mockCloseModal));
      expect(typeof result.current.onOpen).toBe('function');
    });
  });

  describe('onClose', () => {
    it('should be a function', () => {
      const { result } = renderHook(() => useModalLifecycle(mockCloseModal));
      expect(typeof result.current.onClose).toBe('function');
    });
  });

  describe('ESC key handling', () => {
    it('should add keydown event listener on mount', () => {
      renderHook(() => useModalLifecycle(mockCloseModal));

      expect(document.addEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      );
    });

    it('should call closeModal when ESC key is pressed', () => {
      let keydownHandler: (event: KeyboardEvent) => void;

      (document.addEventListener as jest.Mock).mockImplementationOnce(
        (_event: string, handler: (event: KeyboardEvent) => void) => {
          keydownHandler = handler;
        },
      );

      renderHook(() => useModalLifecycle(mockCloseModal));

      act(() => {
        keydownHandler!({ key: 'Escape' } as KeyboardEvent);
      });

      expect(mockCloseModal).toHaveBeenCalledTimes(1);
    });

    it('should not call closeModal for other keys', () => {
      let keydownHandler: (event: KeyboardEvent) => void;

      (document.addEventListener as jest.Mock).mockImplementationOnce(
        (_event: string, handler: (event: KeyboardEvent) => void) => {
          keydownHandler = handler;
        },
      );

      renderHook(() => useModalLifecycle(mockCloseModal));

      act(() => {
        keydownHandler!({ key: 'Enter' } as KeyboardEvent);
      });

      expect(mockCloseModal).not.toHaveBeenCalled();
    });

    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() => useModalLifecycle(mockCloseModal));

      unmount();

      expect(document.removeEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function),
      );
    });
  });
});
