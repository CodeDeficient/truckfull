import * as React from 'react';

const MOBILE_USER_AGENT = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i;
const TABLET_USER_AGENT = /iPad|Tablet|PlayBook|Silk/i;

const MOBILE_BREAKPOINT = 768;

/**
 * Determines if the current page view is displayed on a mobile device using proper device detection.
 * @example
 * useIsMobile()
 * true
 * @returns {boolean} - True if the current view is mobile, otherwise false.
 * @description
 *   - Uses user agent string parsing for proper device detection
 *   - Falls back to screen size detection on client-side
 *   - Device types: 'mobile', 'tablet', 'console', 'smarttv', 'wearable', 'embedded', or undefined (desktop)
 *   - Client-side compatible for responsive behavior
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>();

  const isDesktopRef = React.useRef(false);

  React.useEffect(() => {
    // Try to detect device type from user agent first
    if (globalThis.window !== undefined) {
      const userAgentString = globalThis.navigator?.userAgent || '';

      if (userAgentString) {
        const isMobileDevice = detectMobileDevice(userAgentString);
        setIsMobile(isMobileDevice);
        isDesktopRef.current = !isMobileDevice;
        return;
      }
    }

    // Client-side fallback using screen size, but only if not known desktop
    if (globalThis.window !== undefined && !isDesktopRef.current) {
      const mql = globalThis.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
      const onChange = () => {
        if (!isDesktopRef.current) {
          setIsMobile(globalThis.innerWidth < MOBILE_BREAKPOINT);
        }
      };

      mql.addEventListener('change', onChange);
      setIsMobile(globalThis.innerWidth < MOBILE_BREAKPOINT);

      return () => mql.removeEventListener('change', onChange);
    }
  }, []);

  return isMobile === true;
}

/**
 * Device detection utility using user agent string parsing
 * @param userAgentString - The user agent string to parse
 * @returns {boolean} - True if the device is mobile
 */
export function detectMobileDevice(userAgentString: string): boolean {
  // Check for mobile device indicators in user agent

  // Consider tablets as mobile devices for UI purposes
  return MOBILE_USER_AGENT.test(userAgentString) || TABLET_USER_AGENT.test(userAgentString);
}
