import { BUSY_MESSAGE, UNAVAILABLE_MESSAGE } from './loadShedding.mjs';

export const UPTIME_STATE_KEY = 'status';
export const MONITOR_USER_AGENT = 'TruckFullUptimeMonitor/1.0';

export function parseMonitorUrls(value) {
  return String(value ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.startsWith('https://'));
}

export const SLOW_RESPONSE_MS = 8000;
export const PAGE_CHECK_EVERY_MINUTES = 5;

export function urlsForRun(env, now, previous) {
  const everyMinute = parseMonitorUrls(env.MONITOR_URLS);
  const pagesDue =
    now.getUTCMinutes() % PAGE_CHECK_EVERY_MINUTES === 0 || previous?.status === 'down';
  return pagesDue ? [...everyMinute, ...parseMonitorUrls(env.PAGE_MONITOR_URLS)] : everyMinute;
}

export const SECURITY_HEADER = 'x-truckfull-security';

async function bodyOf(response) {
  try {
    const text = await response.text();
    return text.trim();
  } catch {
    return '';
  }
}

export async function describeFailure(url, response) {
  const status = `HTTP ${response.status}`;
  const reason = response.headers.get(SECURITY_HEADER);
  if (reason)
    return `${url} was refused by TruckFull's own traffic protection (${reason}, ${status})`;
  const body = await bodyOf(response);
  if (body === BUSY_MESSAGE)
    return `${url} was turned away by the app's overload limit (${status})`;
  if (body === UNAVAILABLE_MESSAGE) return `${url} could not reach the app (${status})`;
  return `${url} returned ${status}`;
}

export async function probeUrl(url, fetchImpl, timeoutMs, clock = Date.now) {
  const started = clock();
  try {
    const response = await fetchImpl(url, {
      headers: { 'user-agent': MONITOR_USER_AGENT, 'cache-control': 'no-cache' },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });
    const failure = response.status < 400 ? null : await describeFailure(url, response);
    return { url, failure, ms: clock() - started };
  } catch (error) {
    const failure =
      error?.name === 'TimeoutError'
        ? `${url} did not respond within ${timeoutMs / 1000}s`
        : `${url} request failed: ${error?.message ?? String(error)}`;
    return { url, failure, ms: clock() - started };
  }
}

function isSlow(result) {
  return result.failure === null && result.ms > SLOW_RESPONSE_MS;
}

export async function probeAll(urls, fetchImpl, timeoutMs, clock) {
  return Promise.all(urls.map((url) => probeUrl(url, fetchImpl, timeoutMs, clock)));
}

function failuresOf(results) {
  return results.filter((result) => result.failure !== null).map((result) => result.failure);
}

export async function checkWithRetry(urls, { fetchImpl, timeoutMs, retryDelayMs, wait, clock }) {
  const first = await probeAll(urls, fetchImpl, timeoutMs, clock);
  if (!first.some((result) => result.failure !== null || isSlow(result))) {
    return { failures: [], slow: [] };
  }
  await wait(retryDelayMs);
  const second = await probeAll(urls, fetchImpl, timeoutMs, clock);
  const slowBefore = new Set(first.filter((result) => isSlow(result)).map((result) => result.url));
  const slow = second
    .filter((result) => isSlow(result) && slowBefore.has(result.url))
    .map((result) => `${result.url} took ${(result.ms / 1000).toFixed(1)}s, slow twice in a row`);
  return { failures: failuresOf(second), slow };
}

export function nextUptimeState(previous, failures, nowIso) {
  const wasDown = previous?.status === 'down';
  if (failures.length > 0 && !wasDown) {
    return { state: { status: 'down', since: nowIso }, notify: 'down' };
  }
  if (failures.length === 0 && wasDown) {
    return {
      state: { status: 'up', since: nowIso, downSince: previous.since },
      notify: 'recovered',
    };
  }
  return { state: previous ?? { status: 'up', since: nowIso }, notify: null };
}

export function alertEmail(kind, failures, state) {
  if (kind === 'down') {
    return {
      subject: 'TruckFull is DOWN',
      text: [`TruckFull stopped responding at ${state.since}.`, '', ...failures].join('\n'),
    };
  }
  return {
    subject: 'TruckFull recovered',
    text: `TruckFull is responding again as of ${state.since}. It was down since ${state.downSince}.`,
  };
}

export async function sendAlertEmail(env, fetchImpl, message) {
  const response = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.ALERT_EMAIL_FROM,
      to: [env.ALERT_EMAIL_TO],
      subject: message.subject,
      text: message.text,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Resend rejected the alert with HTTP ${response.status}: ${await response.text()}`,
    );
  }
}
