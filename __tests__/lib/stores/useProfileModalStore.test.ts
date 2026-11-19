import { jest, describe, it, expect, beforeEach } from '@jest/globals';

let storeState: Record<string, unknown> = {};

const mockSetFn = jest.fn((update: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>)) => {
  if (typeof update === 'function') {
    const newState = update(storeState);
    Object.assign(storeState, newState);
  } else {
    Object.assign(storeState, update);
  }
});

const mockGetFn = jest.fn(() => storeState);

jest.unstable_mockModule('zustand', () => ({
  create: jest.fn((creatorFunc?: (set: jest.Mock, get: jest.Mock) => Record<string, unknown>) => {
    if (creatorFunc) {
      const state = creatorFunc(mockSetFn, mockGetFn);
      Object.assign(storeState, state);
      return {
        ...state,
        getState: () => storeState,
        setState: mockSetFn,
        subscribe: jest.fn(),
        destroy: jest.fn(),
      };
    }
    return (creator: (set: jest.Mock, get: jest.Mock) => Record<string, unknown>) => {
      const state = creator(mockSetFn, mockGetFn);
      Object.assign(storeState, state);
      return {
        ...state,
        getState: () => storeState,
        setState: mockSetFn,
        subscribe: jest.fn(),
        destroy: jest.fn(),
      };
    };
  }),
}));

jest.unstable_mockModule('zustand/middleware', () => ({
  persist: jest.fn((creator: (set: jest.Mock, get: jest.Mock) => Record<string, unknown>) => creator),
  createJSONStorage: jest.fn(() => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  })),
}));

const { useProfileModalStore } = await import('@/lib/stores/useProfileModalStore');

describe('useProfileModalStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(storeState, {
      isOpen: false,
      openedViaRoute: false,
    });
  });

  describe('initial state', () => {
    it('should have isOpen as false', () => {
      expect(useProfileModalStore.getState().isOpen).toBe(false);
    });

    it('should have openedViaRoute as false', () => {
      expect(useProfileModalStore.getState().openedViaRoute).toBe(false);
    });
  });

  describe('openModal', () => {
    it('should open modal without viaRoute', () => {
      const { openModal } = useProfileModalStore.getState();
      openModal();
      expect(useProfileModalStore.getState().isOpen).toBe(true);
      expect(useProfileModalStore.getState().openedViaRoute).toBe(false);
    });

    it('should open modal with viaRoute flag', () => {
      const { openModal } = useProfileModalStore.getState();
      openModal(true);
      expect(useProfileModalStore.getState().isOpen).toBe(true);
      expect(useProfileModalStore.getState().openedViaRoute).toBe(true);
    });
  });

  describe('closeModal', () => {
    it('should close modal', () => {
      const { openModal, closeModal } = useProfileModalStore.getState();
      openModal();
      closeModal();
      expect(useProfileModalStore.getState().isOpen).toBe(false);
    });

    it('should reset openedViaRoute', () => {
      const { openModal, closeModal } = useProfileModalStore.getState();
      openModal(true);
      closeModal();
      expect(useProfileModalStore.getState().openedViaRoute).toBe(false);
    });
  });

  describe('toggleModal', () => {
    it('should toggle modal open', () => {
      const { toggleModal } = useProfileModalStore.getState();
      toggleModal();
      expect(useProfileModalStore.getState().isOpen).toBe(true);
    });

    it('should toggle modal closed', () => {
      const { toggleModal } = useProfileModalStore.getState();
      toggleModal();
      toggleModal();
      expect(useProfileModalStore.getState().isOpen).toBe(false);
    });
  });
});
