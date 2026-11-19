export const DEFAULT_MAX_IN_FLIGHT = 20;
export const BUSY_RETRY_AFTER_SECONDS = 5;
export const BUSY_MESSAGE = 'TruckFull is busy right now. Please try again in a few seconds.';
export const UNAVAILABLE_RETRY_AFTER_SECONDS = 30;
export const UNAVAILABLE_MESSAGE =
  'TruckFull is having trouble loading this page. Please try again in a minute.';

const EXEMPT_PATH_PREFIXES = ['/_next/static/', '/api/cron/', '/api/webhooks/'];

export function maxInFlight(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_IN_FLIGHT;
}

export function isExemptFromShedding(pathname) {
  return EXEMPT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function busyResponse() {
  return new Response(BUSY_MESSAGE, {
    status: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': String(BUSY_RETRY_AFTER_SECONDS),
    },
  });
}

export function createInFlightLimiter(limit) {
  let inFlight = 0;
  async function limitInFlight(request, forward) {
    const { pathname } = new URL(request.url);
    if (inFlight >= limit && !isExemptFromShedding(pathname)) {
      console.log(
        '[load-shed]',
        JSON.stringify({ inFlight, pathname, userAgent: request.headers.get('user-agent') }),
      );
      return busyResponse();
    }
    inFlight += 1;
    try {
      return await forward(request);
    } finally {
      inFlight -= 1;
    }
  }
  limitInFlight.inFlight = () => inFlight;
  return limitInFlight;
}

export function unavailableResponse() {
  return new Response(UNAVAILABLE_MESSAGE, {
    status: 503,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': String(UNAVAILABLE_RETRY_AFTER_SECONDS),
    },
  });
}

export async function orUnavailable(task, pathname) {
  try {
    return await task;
  } catch (error) {
    console.error(
      JSON.stringify({ event: 'app_unavailable', pathname, message: String(error).slice(0, 240) }),
    );
    return unavailableResponse();
  }
}
