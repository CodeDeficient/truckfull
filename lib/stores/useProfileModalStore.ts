import { create } from 'zustand';

/**
 * Profile modal store state
 */
interface ProfileModalState {
  /** Whether the profile modal is open */
  isOpen: boolean;
  /** Whether the modal was opened via URL redirect */
  openedViaRoute: boolean;
}

/**
 * Profile modal store actions
 */
interface ProfileModalActions {
  /** Open the profile modal */
  openModal: (viaRoute?: boolean) => void;
  /** Close the profile modal */
  closeModal: () => void;
  /** Toggle modal open/close */
  toggleModal: () => void;
}

/**
 * Complete profile modal store type
 */
export type ProfileModalStore = ProfileModalState & ProfileModalActions;

/**
 * Profile modal store for managing modal state
 */
export const useProfileModalStore = create<ProfileModalStore>((set) => ({
  // Initial state
  isOpen: false,
  openedViaRoute: false,

  // Actions
  openModal: (viaRoute = false) =>
    set({
      isOpen: true,
      openedViaRoute: viaRoute,
    }),

  closeModal: () => {
    set((state) => {
      // If opened via route, we should navigate back to the main page
      if (state.openedViaRoute && globalThis.window != undefined) {
        // Remove the openProfile query param
        const url = new URL(globalThis.window.location.href);
        url.searchParams.delete('openProfile');
        globalThis.window.history.replaceState({}, '', url.toString());
      }
      return {
        isOpen: false,
        openedViaRoute: false,
      };
    });
  },

  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
}));
