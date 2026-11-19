'use client';

import * as React from 'react';
import { createContext, useReducer, ReactNode } from 'react';
import {
  ModalContextType,
  initialModalState,
  ModalState,
  ModalType,
  ModalProps,
} from '../types/modal';

// Define action types for the reducer
type ModalAction =
  | { type: 'OPEN_MODAL'; payload: { type: ModalType; props?: ModalProps; id?: string } }
  | { type: 'CLOSE_MODAL'; payload?: { id?: string } }
  | { type: 'RESET_MODAL' };

// Reducer function to handle modal state changes
const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
  switch (action.type) {
    case 'OPEN_MODAL': {
      return {
        isOpen: true,
        type: action.payload.type,
        props: action.payload.props ?? {},
        id: action.payload.id,
      };
    }
    case 'CLOSE_MODAL': {
      // If no ID provided, close any open modal
      // If ID provided, only close if it matches the current modal's ID
      if (action.payload?.id && state.id !== action.payload.id) {
        return state; // Don't close if IDs don't match
      }
      return {
        ...initialModalState,
        id: undefined, // Reset ID when closing
      };
    }
    case 'RESET_MODAL': {
      return { ...initialModalState };
    }
    default: {
      return state;
    }
  }
};

// Create the context with initial state
const ModalContext = createContext<ModalContextType | undefined>(undefined);

// Provider component props
interface ModalProviderProps {
  children: ReactNode;
}

// Provider component implementation
const ModalProvider: React.FC<ModalProviderProps> = ({ children }: ModalProviderProps) => {
  const [state, dispatch] = useReducer(modalReducer, initialModalState);

  // Actions for opening/closing/resetting modals
  const openModal = (type: ModalType, props?: ModalProps, id?: string) => {
    dispatch({
      type: 'OPEN_MODAL',
      payload: { type, props, id },
    });
  };

  const closeModal = (id?: string) => {
    dispatch({
      type: 'CLOSE_MODAL',
      payload: { id },
    });
  };

  const resetModal = () => {
    dispatch({ type: 'RESET_MODAL' });
  };

  // Context value to provide to consumers
  const contextValue: ModalContextType = {
    isOpen: state.isOpen,
    type: state.type,
    props: state.props,
    id: state.id,
    openModal,
    closeModal,
    resetModal,
  };

  return <ModalContext.Provider value={contextValue}>{children}</ModalContext.Provider>;
};

// Memoized provider for performance optimization
const MemoizedModalProvider = React.memo(ModalProvider);

export { ModalContext, MemoizedModalProvider as ModalProvider };
