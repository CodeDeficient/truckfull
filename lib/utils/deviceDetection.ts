const MOBILE_USER_AGENT = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
const IOS_USER_AGENT = /iPad|iPhone|iPod/;
const ANDROID_USER_AGENT = /Android/;
const PHONE_USER_AGENT = /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;
const TABLET_USER_AGENT = /iPad|Android(?!.*Mobile)/i;

/**
 * Utility functions for device detection
 */

/**
 * Detects if the current device is a mobile device from client-side
 * @returns boolean indicating if the device is mobile
 */
export function isMobileClient(): boolean {
  if (globalThis.window == undefined) {
    // Server-side detection would require user agent parsing from headers
    // This is a simplified check - in a real app you might want to parse the user agent
    return false;
  }

  // Check for mobile user agents
  return MOBILE_USER_AGENT.test(globalThis.navigator.userAgent);
}

/**
 * Detects if the request is from a mobile device based on user agent string
 * @param userAgent - The user agent string to check
 * @returns boolean indicating if the device is mobile
 */
export function isMobileServer(userAgent: string): boolean {
  return MOBILE_USER_AGENT.test(userAgent);
}

/**
 * Detects if the current device is an iOS device from client-side
 * @returns boolean indicating if the device is iOS
 */
export function isIOSClient(): boolean {
  if (globalThis.window == undefined) {
    return false;
  }

  return IOS_USER_AGENT.test(globalThis.navigator.userAgent);
}

/**
 * Detects if the request is from an iOS device based on user agent string
 * @param userAgent - The user agent string to check
 * @returns boolean indicating if the device is iOS
 */
export function isIOSServer(userAgent: string): boolean {
  return IOS_USER_AGENT.test(userAgent);
}

/**
 * Detects if the current device is an Android device from client-side
 * @returns boolean indicating if the device is Android
 */
export function isAndroidClient(): boolean {
  if (globalThis.window == undefined) {
    return false;
  }

  return ANDROID_USER_AGENT.test(globalThis.navigator.userAgent);
}

/**
 * Detects if the request is from an Android device based on user agent string
 * @param userAgent - The user agent string to check
 * @returns boolean indicating if the device is Android
 */
export function isAndroidServer(userAgent: string): boolean {
  return ANDROID_USER_AGENT.test(userAgent);
}

/**
 * Gets the device type string from client-side
 * @returns 'mobile', 'tablet', or 'desktop'
 */
export function getDeviceTypeClient(): 'mobile' | 'tablet' | 'desktop' {
  if (globalThis.window == undefined) {
    return 'desktop';
  }

  const width = window.innerWidth;
  const userAgent = globalThis.navigator.userAgent;

  // Check for mobile keywords in user agent
  if (PHONE_USER_AGENT.test(userAgent)) {
    return 'mobile';
  }

  // Check for tablet keywords in user agent
  if (TABLET_USER_AGENT.test(userAgent)) {
    return 'tablet';
  }

  // Use screen width as fallback
  if (width <= 768) {
    return 'mobile';
  } else if (width <= 1024) {
    return 'tablet';
  }

  return 'desktop';
}

/**
 * Gets the device type string based on user agent
 * @param userAgent - The user agent string to check
 * @returns 'mobile', 'tablet', or 'desktop'
 */
export function getDeviceTypeServer(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
  // Check for mobile keywords in user agent
  if (PHONE_USER_AGENT.test(userAgent)) {
    return 'mobile';
  }

  // Check for tablet keywords in user agent
  if (TABLET_USER_AGENT.test(userAgent)) {
    return 'tablet';
  }

  return 'desktop';
}
