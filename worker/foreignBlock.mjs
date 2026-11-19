const ALLOWED_COUNTRY = 'US';
const SERVICE_PREFIXES = ['/api/webhooks/', '/api/cron/', '/api/revalidate/'];
const SERVICE_PATHS = new Set(['/api/stripe/webhook']);
export const FOREIGN_DENIAL_MESSAGE =
  'TruckFull lists food trucks in the United States and is only available there.\n';

function isServiceEndpoint(pathname) {
  return SERVICE_PATHS.has(pathname) || SERVICE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isForeignRequest(cf, url) {
  const country = cf?.country;
  if (typeof country !== 'string' || country === ALLOWED_COUNTRY) return false;
  if (cf?.verifiedBotCategory) return false;
  return !isServiceEndpoint(url.pathname);
}

export function foreignDenial(cf, url) {
  if (!isForeignRequest(cf, url)) return null;
  return new Response(FOREIGN_DENIAL_MESSAGE, {
    status: 403,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}
