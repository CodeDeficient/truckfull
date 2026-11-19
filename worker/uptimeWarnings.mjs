export const WARNING_KEY_PREFIX = 'warn:';
export const WARNING_COOLDOWN_MS = 60 * 60 * 1000;
export const LOG_WINDOW_MS = 5 * 60 * 1000;
export const LOG_LAG_MS = 60 * 1000;

const WEB_SERVICE = 'truckfull-container-production';
const CONTAINER_SERVICE = 'a036f398-7296-4c08-a8a2-bd2982abbd03';

export const DEFAULT_THRESHOLDS = Object.freeze({
  serverErrors: 5,
  canceled: 25,
  cacheWriteFailures: 5,
  outOfMemory: 1,
  slowRequests: 40,
  requests: 150,
});

export function parseThresholds(value) {
  const overrides = typeof value === 'string' && value.trim() !== '' ? JSON.parse(value) : {};
  const thresholds = { ...DEFAULT_THRESHOLDS };
  for (const name of Object.keys(DEFAULT_THRESHOLDS)) {
    if (Number.isFinite(overrides[name]) && overrides[name] > 0) thresholds[name] = overrides[name];
  }
  return thresholds;
}

export function isLogCheckMinute(now) {
  return now.getUTCMinutes() % 5 === 0;
}

export function logWindow(now) {
  const to = now.getTime() - LOG_LAG_MS;
  return { from: to - LOG_WINDOW_MS, to };
}

function stringFilter(key, operation, value) {
  return { key, operation, type: 'string', value };
}

const WEB_REQUEST_FILTERS = [
  stringFilter('$metadata.service', 'eq', WEB_SERVICE),
  stringFilter('$workers.eventType', 'eq', 'fetch'),
  stringFilter('$workers.entrypoint', 'eq', 'TruckFullContainer'),
];

export const PAGE_URL_PATTERN = String.raw`^https?://[^/]+/[^.?]*(\?|$)`;
export const NON_PAGE_URL_PARTS = ['/_next/', '/ingest/', '_rsc=', '/api/', '/serwist/'];

const PAGE_REQUEST_FILTERS = [
  ...WEB_REQUEST_FILTERS,
  stringFilter('$workers.event.request.url', 'regex', PAGE_URL_PATTERN),
  ...NON_PAGE_URL_PARTS.map((part) =>
    stringFilter('$workers.event.request.url', 'not_includes', part),
  ),
];

function query(id, window, filters, groupBys = [], limit = 20) {
  return {
    queryId: `uptime-warn-${id}`,
    timeframe: window,
    view: 'calculations',
    dry: true,
    parameters: {
      calculations: [{ operator: 'count', alias: 'n' }],
      filters,
      groupBys,
      limit,
      orderBy: { value: 'n', order: 'desc' },
    },
  };
}

const SLOW_REQUEST_FILTERS = [
  stringFilter('$metadata.service', 'eq', WEB_SERVICE),
  stringFilter('event', 'eq', 'slow_request'),
];

function containerMessage(needle) {
  return [
    stringFilter('$metadata.service', 'eq', CONTAINER_SERVICE),
    stringFilter('$metadata.message', 'includes', needle),
  ];
}

export function buildLogQueries(window) {
  return {
    statuses: query('statuses', window, WEB_REQUEST_FILTERS, [
      { type: 'number', value: '$workers.event.response.status' },
      { type: 'string', value: '$workers.outcome' },
    ]),
    pageRequests: query('page-requests', window, PAGE_REQUEST_FILTERS),
    cacheWriteFailures: query('cache-writes', window, containerMessage('entry write failed')),
    outOfMemory: query('oom', window, containerMessage('heap out of memory')),
    slowRequests: query('slow-requests', window, SLOW_REQUEST_FILTERS),
    userAgents: query(
      'user-agents',
      window,
      PAGE_REQUEST_FILTERS,
      [{ type: 'string', value: '$workers.event.request.headers.user-agent' }],
      1,
    ),
    networks: query(
      'networks',
      window,
      PAGE_REQUEST_FILTERS,
      [{ type: 'string', value: '$workers.event.request.cf.asOrganization' }],
      1,
    ),
  };
}

function aggregates(result) {
  return result?.calculations?.[0]?.aggregates ?? [];
}

export function totalCount(result) {
  return aggregates(result).reduce((sum, row) => sum + (Number(row.value) || 0), 0);
}

function groupValue(row, key) {
  return row.groups?.find((group) => group.key === key)?.value;
}

export function summarizeStatuses(result) {
  const summary = { serverErrors: 0, canceled: 0 };
  for (const row of aggregates(result)) {
    const count = Number(row.value) || 0;
    if (Number(groupValue(row, '$workers.event.response.status')) >= 500)
      summary.serverErrors += count;
    if (groupValue(row, '$workers.outcome') === 'canceled') summary.canceled += count;
  }
  return summary;
}

export function topGroup(result) {
  const row = aggregates(result)[0];
  if (!row) return null;
  return { value: String(row.groups?.[0]?.value ?? 'unknown'), count: Number(row.value) || 0 };
}

export function evaluateSignals(signals, thresholds) {
  const warnings = [];
  const add = (kind, count, message) => {
    if (count >= thresholds[kind]) warnings.push({ kind, message });
  };
  add('serverErrors', signals.serverErrors, `${signals.serverErrors} server errors (5xx)`);
  add('canceled', signals.canceled, `${signals.canceled} requests canceled before finishing`);
  add(
    'cacheWriteFailures',
    signals.cacheWriteFailures,
    `${signals.cacheWriteFailures} page cache write failures in the container`,
  );
  add('outOfMemory', signals.outOfMemory, 'the container ran out of memory');
  add(
    'slowRequests',
    signals.slowRequests,
    `${signals.slowRequests} requests took over 3 seconds (slow_request logs)`,
  );
  add('requests', signals.requests, trafficMessage(signals));
  return warnings;
}

function trafficMessage(signals) {
  const lines = [`${signals.requests} page views (files, analytics and in-app data not counted)`];
  if (signals.topUserAgent) {
    lines.push(`top user agent: ${signals.topUserAgent.value} (${signals.topUserAgent.count})`);
  }
  if (signals.topNetwork) {
    lines.push(`top network: ${signals.topNetwork.value} (${signals.topNetwork.count})`);
  }
  return lines.join('; ');
}

export function slowWarning(slow) {
  if (slow.length === 0) return null;
  return { kind: 'slow', message: slow.join('\n') };
}

export async function dueWarnings(kv, warnings, now) {
  const due = [];
  for (const warning of warnings) {
    const lastSent = await kv.get(`${WARNING_KEY_PREFIX}${warning.kind}`);
    const lastMs = lastSent ? Date.parse(lastSent) : Number.NaN;
    if (Number.isNaN(lastMs) || now.getTime() - lastMs >= WARNING_COOLDOWN_MS) due.push(warning);
  }
  return due;
}

export async function markWarningsSent(kv, warnings, now) {
  for (const warning of warnings) {
    await kv.put(`${WARNING_KEY_PREFIX}${warning.kind}`, now.toISOString());
  }
}

export function warningEmail(warnings, nowIso, window) {
  const lines = [
    `TruckFull is still up, but these signals crossed their warning levels as of ${nowIso}:`,
    '',
    ...warnings.map((warning) => `- ${warning.message}`),
    '',
  ];
  if (window) {
    lines.push(
      `Log counts cover ${new Date(window.from).toISOString()} to ${new Date(window.to).toISOString()}.`,
    );
  }
  lines.push('Each kind of warning is sent at most once an hour.');
  return {
    subject: `TruckFull warning: ${warnings.map((warning) => warning.kind).join(', ')}`,
    text: lines.join('\n'),
  };
}

export async function runTelemetryQuery(env, fetchImpl, body) {
  const response = await fetchImpl(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/workers/observability/telemetry/query`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${env.CF_OBSERVABILITY_TOKEN}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(
      `Observability query ${body.queryId} failed with HTTP ${response.status}: ${JSON.stringify(payload?.errors ?? payload)}`,
    );
  }
  return payload?.result ?? payload;
}

export async function collectSignals(env, fetchImpl, window) {
  const queries = buildLogQueries(window);
  const [statuses, pageRequests, cacheWrites, oom, slowRequests] = await Promise.all([
    runTelemetryQuery(env, fetchImpl, queries.statuses),
    runTelemetryQuery(env, fetchImpl, queries.pageRequests),
    runTelemetryQuery(env, fetchImpl, queries.cacheWriteFailures),
    runTelemetryQuery(env, fetchImpl, queries.outOfMemory),
    runTelemetryQuery(env, fetchImpl, queries.slowRequests),
  ]);
  return {
    ...summarizeStatuses(statuses),
    requests: totalCount(pageRequests),
    cacheWriteFailures: totalCount(cacheWrites),
    outOfMemory: totalCount(oom),
    slowRequests: totalCount(slowRequests),
  };
}

export async function addTrafficSources(env, fetchImpl, window, signals) {
  const queries = buildLogQueries(window);
  const [userAgents, networks] = await Promise.all([
    runTelemetryQuery(env, fetchImpl, queries.userAgents),
    runTelemetryQuery(env, fetchImpl, queries.networks),
  ]);
  return { ...signals, topUserAgent: topGroup(userAgents), topNetwork: topGroup(networks) };
}
