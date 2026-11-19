const APPROVED_PUBLIC_ROUTE_PATTERNS = [
  /^\/$/,
  /^\/city\/[^/]+\/?$/,
  /^\/cuisine\/[^/]+\/?$/,
  /^\/best\/[^/]+\/?$/,
  /^\/blog\/[^/]+\/?$/,
  /^\/events\/?$/,
  /^\/events\/[^/]+\/?$/,
  /^\/events\/[^/]+\/[^/]+\/?$/,
] as const;

export function shouldUseAnonymousPublicFastPath(
  pathname: string,
  method: string,
  headers: Headers,
): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  if (headers.has('cookie') || headers.has('authorization')) return false;
  return APPROVED_PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname));
}
