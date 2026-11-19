import { useContext } from 'react';
import { ModalContext } from '../contexts/ModalContext';
import { ModalContextType } from '../types/modal';

/**
 * Custom hook to access the modal context
 * @returns Modal context value with state and actions
 * @throws Error if used outside of ModalProvider
 */
const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);

  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }

  return context;
};

export default useModal;
