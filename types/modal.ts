/**
 * TypeScript interfaces for modal state management
 */

// Define the available modal types
export type ModalType =
  | 'settings'
  | 'profile'
  | 'auth'
  | 'generic'
  | 'confirmation'
  | 'alert'
  | 'menu'
  | 'image'
  | 'form'
  | 'loading'
  | 'error'
  | 'success'
  | 'truck-details'
  | 'filter-settings';

// Define the structure for modal props (more specific typing to improve type safety)
export type ModalProps = {
  // Generic props that can be used by various modal types
  title?: string;
  description?: string;
  children?: React.ReactNode;
  // Add more specific props as needed for different modal types
  [key: string]: unknown;
};

// Interface for modal state
export interface ModalState {
  isOpen: boolean;
  type: ModalType | null;
  props?: ModalProps;
  id?: string; // Optional ID for identifying specific modal instances
}

// Interface for modal actions
export interface ModalActions {
  openModal: (type: ModalType, props?: ModalProps, id?: string) => void;
  closeModal: (id?: string) => void;
  resetModal: () => void;
}

// Combined interface for modal context
export interface ModalContextType extends ModalState, ModalActions {}

// Initial state for modals
export const initialModalState: ModalState = {
  isOpen: false,
  type: null,
  props: {},
  id: undefined,
};
