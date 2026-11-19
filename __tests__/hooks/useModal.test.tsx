import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ModalContext } from '@/contexts/ModalContext';
import { ModalContextType } from '@/types/modal';

const mockContextValue = {
  isOpen: false,
  type: null,
  props: {},
  id: undefined,
  openModal: jest.fn(),
  closeModal: jest.fn(),
  resetModal: jest.fn(),
};

describe('useModal', () => {
  let useModal: typeof import('@/hooks/useModal').default;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockContextValue.isOpen = false;
    mockContextValue.type = null;
    mockContextValue.props = {};
    mockContextValue.id = undefined;
    mockContextValue.openModal = jest.fn();
    mockContextValue.closeModal = jest.fn();
    mockContextValue.resetModal = jest.fn();

    const module = await import('@/hooks/useModal');
    useModal = module.default;
  });

  it('should return context value when used within ModalProvider', () => {
    const { result } = renderHook(() => useModal(), {
      wrapper: ({ children }) => (
        <ModalContext.Provider value={mockContextValue as unknown as ModalContextType}>
          {children}
        </ModalContext.Provider>
      ),
    });

    expect(result.current).toEqual(mockContextValue);
  });

  it('should return all context properties', () => {
    const contextValue = {
      isOpen: true,
      type: 'settings' as const,
      props: { title: 'Settings' },
      id: 'settings-1',
      openModal: jest.fn(),
      closeModal: jest.fn(),
      resetModal: jest.fn(),
    };

    const { result } = renderHook(() => useModal(), {
      wrapper: ({ children }) => (
        <ModalContext.Provider value={contextValue as unknown as ModalContextType}>
          {children}
        </ModalContext.Provider>
      ),
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.type).toBe('settings');
    expect(result.current.props).toEqual({ title: 'Settings' });
    expect(result.current.id).toBe('settings-1');
    expect(result.current.openModal).toBeDefined();
    expect(result.current.closeModal).toBeDefined();
    expect(result.current.resetModal).toBeDefined();
  });
});