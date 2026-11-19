import { logWarning } from '@/lib/logging';

const REGEX_SPECIAL_CHARS = /[.*+?^${}()|[\\]]/g;
/**
 * Cookie helper functions for client-side cookie management
 */

// Cache for compiled regex patterns to avoid recompiling in loops
const cookieRegexCache = new Map<string, RegExp>();

/**
 * Clear a cookie by name
 * @param name Cookie name to clear
 * @param path Cookie path (default: '/')
 * @param domain Cookie domain (optional)
 */
export function clearCookie(name: string, path: string = '/', domain?: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
  if (domain != undefined) {
    cookieString += `; domain=${domain}`;
  }

  // Use a helper to avoid direct document.cookie access
  setCookieString(cookieString);
}

/**
 * Helper function to set cookie string
 * @param cookieString The cookie string to set
 */
function setCookieString(cookieString: string): void {
  // eslint-disable-next-line unicorn/no-document-cookie
  document.cookie = cookieString;
}

/**
 * Clear all Supabase auth cookies
 */
export function clearSupabaseAuthCookies(): void {
  if (typeof document === 'undefined') {
    return;
  }

  // Clear common Supabase auth cookies
  const cookieNames = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-provider-token',
    'sb-provider-refresh-token',
  ];

  for (const name of cookieNames) {
    clearCookie(name, '/');
  }

  // Also try to clear project-specific cookies
  if (
    globalThis.window !== undefined &&
    globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL != undefined
  ) {
    try {
      const url = new URL(globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL);
      const projectId = url.hostname.split('.')[0];
      const projectCookie = `sb-${projectId}-auth-token`;
      clearCookie(projectCookie, '/');
    } catch (error) {
      logWarning('Could not parse Supabase URL for cookie clearing:', error);
    }
  }
}

/**
 * Get the Supabase auth cookie name based on the project URL
 * @returns The cookie name or undefined if not available
 */
export function getAuthCookieName(): string | undefined {
  if (
    globalThis.window === undefined ||
    globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL == undefined
  ) {
    return undefined;
  }

  try {
    const url = new URL(globalThis.process?.env?.NEXT_PUBLIC_SUPABASE_URL);
    const projectId = url.hostname.split('.')[0];
    return `sb-${projectId}-auth-token`;
  } catch (error) {
    logWarning('Could not parse Supabase URL for cookie name:', error);
    return undefined;
  }
}

/**
 * Get all possible Supabase cookie names
 * @returns Array of possible cookie names
 */
export function getAllPossibleCookieNames(): string[] {
  const names = [
    'sb-access-token',
    'sb-refresh-token',
    'sb-provider-token',
    'sb-provider-refresh-token',
    'supabase-auth-token',
    'sb:token',
  ];

  const authCookieName = getAuthCookieName();
  if (authCookieName != undefined) {
    names.push(authCookieName);
  }

  return names;
}

/**
 * Get auth cookie from request headers or cookie store
 * @param requestOrCookies The Next.js request object or cookie store
 * @returns The auth cookie value or undefined if not found
 */
export function getAuthCookieFromRequest(
  requestOrCookies: Request | { get: (name: string) => { value: string } | undefined },
): string | undefined {
  // Handle Next.js cookie store
  if (typeof requestOrCookies === 'object' && 'get' in requestOrCookies) {
    const cookieStore = requestOrCookies;
    const cookieNames = getAllPossibleCookieNames();

    for (const name of cookieNames) {
      const cookie = cookieStore.get(name);
      if (cookie?.value != undefined) {
        return decodeURIComponent(cookie.value);
      }
    }

    return undefined;
  }

  // Handle Request object
  const request = requestOrCookies;
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader == undefined) {
    return undefined;
  }

  const cookieNames = getAllPossibleCookieNames();

  for (const name of cookieNames) {
    let regex = cookieRegexCache.get(name);

    if (!regex) {
      // Use a more specific regex pattern to avoid issues
      // eslint-disable-next-line unicorn/prefer-string-raw
      const escapedName = name.replaceAll(REGEX_SPECIAL_CHARS, '\\$&');
      regex = new RegExp(`(?:^| )${escapedName}=([^;]+)`);
      cookieRegexCache.set(name, regex);
    }

    const match = regex.exec(cookieHeader);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }

  return undefined;
}
