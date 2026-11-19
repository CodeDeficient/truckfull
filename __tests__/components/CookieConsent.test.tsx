import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import CookieConsent from '../../components/CookieConsent';

describe('CookieConsent Component', () => {
  let originalLocalStorage: Storage;
  let originalNavigator: Navigator;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    originalNavigator = globalThis.navigator;

    // Attempt to redefine document.cookie if not configurable, spy on it if not
    let cookieVal = '';
    try {
        Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
        });
    } catch {
       Object.defineProperty(globalThis.document, 'cookie', {
          get: () => cookieVal,
          set: (v) => { cookieVal = v; },
          configurable: true,
       });
    }

    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });

    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });

    jest.restoreAllMocks();
  });

  describe('Happy Paths', () => {
    it('does not render if consent is already given', () => {
      // Mock localStorage where user has already consented
      const mockStorage = {
        getItem: jest.fn(() => 'true'),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 1
      } as unknown as Storage;

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const { container } = render(<CookieConsent />);

      // The component returns null, so container should be empty
      expect(container.firstChild).toBeNull();
      expect(mockStorage.getItem).toHaveBeenCalledWith('cookie_consent');
    });

    it('renders if consent has not been given', () => {
      // Mock localStorage where user has not consented
      const mockStorage = {
        getItem: jest.fn(() => ''),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 0
      } as unknown as Storage;

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      render(<CookieConsent />);

      expect(screen.getByText(/We use essential first‑party cookies/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
    });

    it('successfully accepts cookies and hides banner', async () => {
      const mockStorage = {
        getItem: jest.fn(() => ''),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 0
      } as unknown as Storage;

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      Object.defineProperty(globalThis.navigator, 'cookieEnabled', {
        value: true,
        configurable: true
      });

      // Override document.cookie safely
      let mockCookieStr = '';
      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(globalThis.document, 'cookie') ||
                                       Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');

      if (originalCookieDescriptor && originalCookieDescriptor.configurable) {
         Object.defineProperty(globalThis.document, 'cookie', {
            get: () => mockCookieStr,
            set: (val: string) => { mockCookieStr = val; },
            configurable: true
         });
      }

      render(<CookieConsent />);

      const acceptButton = screen.getByRole('button', { name: /Accept/i });
      fireEvent.click(acceptButton);

      // Verify setItem was called
      expect(mockStorage.setItem).toHaveBeenCalledWith('cookie_consent', 'true');

      // Because jsdom has a working document.cookie by default, it usually works
      // Verify banner is hidden
      await waitFor(() => {
        expect(screen.queryByText(/We use essential first‑party cookies/)).not.toBeInTheDocument();
      });

      if (originalCookieDescriptor && originalCookieDescriptor.configurable) {
         Object.defineProperty(globalThis.document, 'cookie', originalCookieDescriptor);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles localStorage throwing an error on mount gracefully', async () => {
      // Mock localStorage to throw an error when accessed during mount
      Object.defineProperty(globalThis, 'localStorage', {
        get: jest.fn(() => {
          throw new Error('Access Denied');
        }),
        configurable: true,
      });

      // Should render without crashing and default to showing consent
      expect(() => {
        render(<CookieConsent />);
      }).not.toThrow();

      // Verify the consent prompt is visible
      expect(await screen.findByText(/We use essential first‑party cookies/)).toBeInTheDocument();
    });

    it('handles localStorage throwing an error on accept gracefully', async () => {
      // Setup a mock localStorage that throws only on setItem
      const mockStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn(() => {
          throw new Error('Storage Quota Exceeded');
        }),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 0
      } as unknown as Storage;

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      render(<CookieConsent />);

      const acceptButton = await screen.findByRole('button', { name: /Accept/i });
      expect(acceptButton).toBeInTheDocument();

      // Click accept and ensure it doesn't crash
      expect(() => {
        fireEvent.click(acceptButton);
      }).not.toThrow();

      // Because test cookie works natively in jsdom, the banner should hide even if localStorage failed
      await waitFor(() => {
        expect(screen.queryByText(/We use essential first‑party cookies/)).not.toBeInTheDocument();
      });
    });

    it('shows warning when safe cookie test fails (cookies blocked)', async () => {
      // Setup a working mock localStorage
      const mockStorage = {
          getItem: jest.fn(() => null),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
          key: jest.fn(),
          length: 0
        } as unknown as Storage;

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(globalThis.document, 'cookie') ||
                                       Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                                       Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

      // Try to mock document.cookie safely. If it fails, mock navigator.cookieEnabled
      let mockCookieSuccess = false;
      try {
         if (originalCookieDescriptor && originalCookieDescriptor.configurable) {
             Object.defineProperty(globalThis.document, 'cookie', {
                get: () => '',
                set: () => { /* Simulate blocked - no op */ },
                configurable: true
             });
             mockCookieSuccess = true;
         }
      } catch {
         // Fallback to setting cookieEnabled=false if document.cookie isn't configurable
      }

      if (!mockCookieSuccess) {
           Object.defineProperty(globalThis.navigator, 'cookieEnabled', {
            value: false,
            configurable: true
          });
      }

      render(<CookieConsent />);
      const acceptButton = await screen.findByRole('button', { name: /Accept/i });

      fireEvent.click(acceptButton);

      // Banner should remain and show warning
      expect(screen.getByText(/We use essential first‑party cookies/)).toBeInTheDocument();
      expect(await screen.findByText(/Your browser blocked cookies/)).toBeInTheDocument();

       if (mockCookieSuccess && originalCookieDescriptor) {
         Object.defineProperty(globalThis.document, 'cookie', originalCookieDescriptor);
       }
    });

    it('verifies safe cookie test behavior when an error occurs during test cookie write', async () => {
      // Setup a working mock localStorage
      const mockStorage = {
          getItem: jest.fn(() => null),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
          key: jest.fn(),
          length: 0
        } as unknown as Storage;

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      const originalCookieDescriptor = Object.getOwnPropertyDescriptor(globalThis.document, 'cookie') ||
                                       Object.getOwnPropertyDescriptor(Document.prototype, 'cookie') ||
                                       Object.getOwnPropertyDescriptor(HTMLDocument.prototype, 'cookie');

      let cookieRedefined = false;
      if (originalCookieDescriptor && originalCookieDescriptor.configurable) {
         // Mock document.cookie setter to throw an error
         Object.defineProperty(globalThis.document, 'cookie', {
            get: () => '',
            set: () => {
               throw new Error('Cookie write error');
            },
            configurable: true
         });
         cookieRedefined = true;
      } else {
         // Fallback testing setTestCookieSafe early return
         Object.defineProperty(globalThis.navigator, 'cookieEnabled', {
            value: false,
            configurable: true
         });
      }

      render(<CookieConsent />);
      const acceptButton = await screen.findByRole('button', { name: /Accept/i });

      fireEvent.click(acceptButton);

      // It should catch the error and return false, showing the blocked cookies warning
      expect(await screen.findByText(/Your browser blocked cookies/)).toBeInTheDocument();

      if (cookieRedefined && originalCookieDescriptor) {
         Object.defineProperty(globalThis.document, 'cookie', originalCookieDescriptor);
      }
    });

    it('returns false from setTestCookieSafe when navigator.cookieEnabled is false', async () => {
      // Setup a working mock localStorage
      const mockStorage = {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
        key: jest.fn(),
        length: 0
      } as unknown as Storage;

      Object.defineProperty(globalThis, 'localStorage', {
        value: mockStorage,
        writable: true,
        configurable: true,
      });

      // Mock navigator.cookieEnabled to false
      Object.defineProperty(globalThis.navigator, 'cookieEnabled', {
        value: false,
        configurable: true
      });

      render(<CookieConsent />);
      const acceptButton = await screen.findByRole('button', { name: /Accept/i });

      fireEvent.click(acceptButton);

      // Warning should be shown because setTestCookieSafe returned false early
      expect(await screen.findByText(/Your browser blocked cookies/)).toBeInTheDocument();
    });
  });
});
