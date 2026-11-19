/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';

describe('useIsMobile', () => {
  let useIsMobile: typeof import('@/hooks/UseMobile').useIsMobile;
  let detectMobileDevice: typeof import('@/hooks/UseMobile').detectMobileDevice;

  beforeEach(async () => {
    jest.clearAllMocks();

    if (!window.matchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    }

    const module = await import('@/hooks/UseMobile');
    useIsMobile = module.useIsMobile;
    detectMobileDevice = module.detectMobileDevice;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('detectMobileDevice', () => {
    it('should return true for iPhone user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
      expect(result).toBe(true);
    });

    it('should return true for Android user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Linux; Android 10) Android');
      expect(result).toBe(true);
    });

    it('should return true for iPad user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)');
      expect(result).toBe(true);
    });

    it('should return true for mobile Chrome user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/90.0');
      expect(result).toBe(true);
    });

    it('should return true for BlackBerry user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)');
      expect(result).toBe(true);
    });

    it('should return true for Windows Phone user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Windows Phone 10.0; Android 6.0)');
      expect(result).toBe(true);
    });

    it('should return true for Tablet user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Tablet; CPU OS 14_0 like Mac OS X)');
      expect(result).toBe(true);
    });

    it('should return true for PlayBook user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (PlayBook; U; RIM Tablet OS 2.1.0)');
      expect(result).toBe(true);
    });

    it('should return true for Silk user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Linux; Android 9.0; KFKAWI) AppleWebKit/537.36 Silk/1.0');
      expect(result).toBe(true);
    });

    it('should return false for desktop Chrome user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/90.0');
      expect(result).toBe(false);
    });

    it('should return false for desktop Firefox user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:78.0) Gecko/20100101 Firefox/78.0');
      expect(result).toBe(false);
    });

    it('should return false for desktop Safari user agent', () => {
      const result = detectMobileDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15');
      expect(result).toBe(false);
    });
  });

  describe('useIsMobile hook', () => {
    it('should return true when mobile device detected via user agent', async () => {
      Object.defineProperty(window, 'navigator', {
        writable: true,
        configurable: true,
        value: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)' },
      });

      const { result } = renderHook(() => useIsMobile());

      await act(async () => {});

      expect(result.current).toBe(true);
    });

    it('should return false when desktop device detected via user agent', async () => {
      Object.defineProperty(window, 'navigator', {
        writable: true,
        configurable: true,
        value: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/90.0' },
      });

      const { result } = renderHook(() => useIsMobile());

      await act(async () => {});

      expect(result.current).toBe(false);
    });

    it('should fall back to screen width when no user agent', async () => {
      Object.defineProperty(window, 'navigator', {
        writable: true,
        configurable: true,
        value: { userAgent: '' },
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: true,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useIsMobile());

      await act(async () => {});

      expect(result.current).toBe(true);
    });

    it('should use screen width 768 as breakpoint', async () => {
      Object.defineProperty(window, 'navigator', {
        writable: true,
        configurable: true,
        value: { userAgent: '' },
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useIsMobile());

      await act(async () => {});

      expect(result.current).toBe(false);
    });

    it('should return true when width is below 768', async () => {
      Object.defineProperty(window, 'navigator', {
        writable: true,
        configurable: true,
        value: { userAgent: '' },
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 767,
      });

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: jest.fn().mockImplementation((query: string) => ({
          matches: true,
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });

      const { result } = renderHook(() => useIsMobile());

      await act(async () => {});

      expect(result.current).toBe(true);
    });
  });
});