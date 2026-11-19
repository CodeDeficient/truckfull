import { create } from 'zustand';

/**
 * Settings modal store state
 */
interface SettingsModalState {
  /** Whether the settings modal is open */
  isOpen: boolean;
  /** Active section/tab in the settings modal */
  activeSection: string;
  /** Whether the modal was opened via URL redirect */
  openedViaRoute: boolean;
}

/**
 * Settings modal store actions
 */
interface SettingsModalActions {
  /** Open the settings modal */
  openModal: (section?: string, viaRoute?: boolean) => void;
  /** Close the settings modal */
  closeModal: () => void;
  /** Set the active section */
  setActiveSection: (section: string) => void;
  /** Toggle modal open/close */
  toggleModal: () => void;
}

/**
 * Complete settings modal store type
 */
export type SettingsModalStore = SettingsModalState & SettingsModalActions;

/**
 * Settings modal store for managing modal state
 */
export const useSettingsModalStore = create<SettingsModalStore>((set) => ({
  // Initial state
  isOpen: false,
  activeSection: 'general',
  openedViaRoute: false,

  // Actions
  openModal: (section = 'general', viaRoute = false) =>
    set({
      isOpen: true,
      activeSection: section,
      openedViaRoute: viaRoute,
    }),

  closeModal: () => {
    set((state) => {
      // If opened via route, we should navigate back to the main page
      if (state.openedViaRoute && globalThis.window != undefined) {
        // Remove the openSettings query param
        const url = new URL(globalThis.window.location.href);
        url.searchParams.delete('openSettings');
        globalThis.window.history.replaceState({}, '', url.toString());
      }
      return {
        isOpen: false,
        openedViaRoute: false,
      };
    });
  },

  setActiveSection: (section) => set({ activeSection: section }),

  toggleModal: () => set((state) => ({ isOpen: !state.isOpen })),
}));
