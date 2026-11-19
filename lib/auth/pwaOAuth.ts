const PWA_AUTH_CALLBACK_PATH = '/auth/callback';
const PWA_COMPLETE_PATH = '/auth/pwa-complete';

export const PWA_AUTH_STORAGE_KEY = 'truckfull:pwa-auth-redirect';
export const PWA_AUTH_CHANNEL = 'truckfull:pwa-auth';

export function sanitizeRelativeRedirectPath(path: string | null | undefined): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return '/';
  }

  return path;
}

export function buildOAuthCallbackUrl(
  origin: string,
  redirectTo: string,
  isStandalonePwa: boolean,
): string {
  const params = new URLSearchParams({
    redirectTo: sanitizeRelativeRedirectPath(redirectTo),
  });

  if (isStandalonePwa) {
    params.set('pwa', '1');
  }

  return `${origin}${PWA_AUTH_CALLBACK_PATH}?${params.toString()}`;
}

export function buildPwaCompletionUrl(origin: string, redirectTo: string): string {
  const params = new URLSearchParams({
    redirectTo: sanitizeRelativeRedirectPath(redirectTo),
  });

  return `${origin}${PWA_COMPLETE_PATH}?${params.toString()}`;
}

export function resolvePwaCompletionRedirect(target: string, origin: string): string {
  try {
    const pwaTargetUrl = new URL(target);
    pwaTargetUrl.searchParams.set('source', 'pwa');
    const redirectPath = sanitizeRelativeRedirectPath(
      `${pwaTargetUrl.pathname}${pwaTargetUrl.search}`,
    );
    return buildPwaCompletionUrl(origin, redirectPath);
  } catch {
    return buildPwaCompletionUrl(origin, '/?source=pwa');
  }
}

export function isStandalonePwa(): boolean {
  if (typeof globalThis === 'undefined') {
    return false;
  }

  return (
    globalThis.matchMedia?.('(display-mode: standalone)').matches ||
    ((globalThis.navigator as (Navigator & { standalone?: boolean }) | undefined)?.standalone === true)
  );
}

export function getCurrentRelativeUrl(): string {
  if (typeof globalThis === 'undefined' || !('location' in globalThis)) {
    return '/';
  }

  const url = new URL(globalThis.location.href);
  url.searchParams.delete('auth');
  url.searchParams.delete('mode');
  url.searchParams.delete('showAuth');
  url.searchParams.delete('error');
  url.searchParams.delete('message');

  const search = url.searchParams.toString();
  const searchSuffix = search.length > 0 ? `?${search}` : '';
  const path = `${url.pathname}${searchSuffix}`;
  return sanitizeRelativeRedirectPath(path);
}
