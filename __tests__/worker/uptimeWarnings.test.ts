/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  DEFAULT_THRESHOLDS,
  buildLogQueries,
  NON_PAGE_URL_PARTS,
  PAGE_URL_PATTERN,
  dueWarnings,
  evaluateSignals,
  isLogCheckMinute,
  logWindow,
  markWarningsSent,
  parseThresholds,
  summarizeStatuses,
  topGroup,
  totalCount,
  warningEmail,
} from '../../worker/uptimeWarnings.mjs';
import { runWarningChecks } from '../../worker/uptime.mjs';

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

interface Row {
  readonly groups?: ReadonlyArray<{ readonly key: string; readonly value: string | number }>;
  readonly value: number;
}

function calculation(rows: Row[]): { calculations: Array<{ aggregates: Row[] }> } {
  return { calculations: [{ aggregates: rows }] };
}

function statusRow(status: number, outcome: string, value: number): Row {
  return {
    groups: [
      { key: '$workers.event.response.status', value: status },
      { key: '$workers.outcome', value: outcome },
    ],
    value,
  };
}

const QUIET = {
  requests: 120,
  serverErrors: 0,
  canceled: 3,
  cacheWriteFailures: 0,
  outOfMemory: 0,
  slowRequests: 2,
};

class MemoryKv {
  readonly values = new Map<string, string>();

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.values.get(key) ?? null);
  }

  put(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }
}

function warningEnv(
  kv: MemoryKv,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    ALERT_EMAIL_FROM: 'TruckFull Uptime <alerts@example.test>',
    ALERT_EMAIL_TO: 'owner@example.test',
    RESEND_API_KEY: 'test-key',
    CF_ACCOUNT_ID: 'account',
    CF_OBSERVABILITY_TOKEN: 'token',
    UPTIME_STATE: kv,
    ...overrides,
  };
}

function telemetryFetch(
  results: Record<string, unknown>,
  sent: string[],
  queried: string[] = [],
): FetchImpl {
  return (input, init) => {
    const body = JSON.parse(String(init?.body)) as { queryId?: string; subject?: string };
    if (input === 'https://api.resend.com/emails') {
      sent.push(body.subject ?? '');
      return Promise.resolve(new Response('{"id":"x"}', { status: 200 }));
    }
    const id = String(body.queryId).replace('uptime-warn-', '');
    queried.push(id);
    const result = results[id] ?? calculation([]);
    return Promise.resolve(Response.json({ success: true, result }));
  };
}

const OUTAGE_RESULTS = {
  statuses: calculation([statusRow(200, 'ok', 4200), statusRow(500, 'ok', 40)]),
  'page-requests': calculation([{ value: 315 }]),
  'cache-writes': calculation([{ value: 43 }]),
  oom: calculation([{ value: 1 }]),
  'slow-requests': calculation([{ value: 61 }]),
  'user-agents': calculation([{ groups: [{ key: 'ua', value: 'Mozilla/5.0' }], value: 3900 }]),
  networks: calculation([{ groups: [{ key: 'as', value: 'Fastly, Inc.' }], value: 3950 }]),
};

describe('parseThresholds', () => {
  it('uses defaults and accepts only positive numeric overrides', () => {
    expect(parseThresholds(undefined)).toEqual(DEFAULT_THRESHOLDS);
    expect(parseThresholds('{"requests":800,"canceled":-1,"serverErrors":"x"}')).toEqual({
      ...DEFAULT_THRESHOLDS,
      requests: 800,
    });
  });
});

describe('log window', () => {
  it('checks logs every fifth minute over the five minutes before ingestion lag', () => {
    expect(isLogCheckMinute(new Date('2026-10-28T12:55:00Z'))).toBe(true);
    expect(isLogCheckMinute(new Date('2026-10-28T12:56:00Z'))).toBe(false);
    expect(logWindow(new Date('2026-10-28T12:55:00Z'))).toEqual({
      from: Date.parse('2026-10-28T12:49:00Z'),
      to: Date.parse('2026-10-28T12:54:00Z'),
    });
  });

  it('scopes request queries to the production web app and container logs to its app id', () => {
    const queries = buildLogQueries({ from: 1, to: 2 });
    expect(JSON.stringify(queries.statuses)).toContain('truckfull-container-production');
    expect(JSON.stringify(queries.statuses)).toContain('TruckFullContainer');
    expect(JSON.stringify(queries.outOfMemory)).toContain('a036f398-7296-4c08-a8a2-bd2982abbd03');
    expect(JSON.stringify(queries.outOfMemory)).toContain('heap out of memory');
    expect(JSON.stringify(queries.cacheWriteFailures)).toContain('entry write failed');
    expect(JSON.stringify(queries.slowRequests)).toContain('truckfull-container-production');
    expect(JSON.stringify(queries.slowRequests)).toContain('slow_request');
  });
});

describe('page view filter', () => {
  const isPageView = (url: string): boolean =>
    new RegExp(PAGE_URL_PATTERN).test(url) &&
    !NON_PAGE_URL_PARTS.some((part) => url.includes(part));

  it('counts document requests for pages', () => {
    expect(isPageView('https://www.truckfull.food/')).toBe(true);
    expect(isPageView('https://www.truckfull.food/country-cooking-with-a-wrap')).toBe(true);
    expect(isPageView('https://www.truckfull.food/city/columbia-sc?page=2')).toBe(true);
  });

  it('ignores files, analytics, in-app data, api calls and the service worker', () => {
    expect(isPageView('https://www.truckfull.food/_next/static/chunks/330977b3rs_r1.js')).toBe(
      false,
    );
    expect(isPageView('https://www.truckfull.food/pwa-icon-512.webp')).toBe(false);
    expect(isPageView('https://www.truckfull.food/heroes/holo/clips/greenville-sc.webm')).toBe(
      false,
    );
    expect(isPageView('https://www.truckfull.food/manifest.json')).toBe(false);
    expect(isPageView('https://www.truckfull.food/ingest/i/v0/e/?ip=0')).toBe(false);
    expect(isPageView('https://www.truckfull.food/login?_rsc=qaBINZNUfzBppLWP')).toBe(false);
    expect(isPageView('https://www.truckfull.food/api/trucks/nearby')).toBe(false);
    expect(isPageView('https://www.truckfull.food/serwist/sw.js')).toBe(false);
  });

  it('applies the page filter to the traffic count and its source lookups only', () => {
    const queries = buildLogQueries({ from: 1, to: 2 });
    for (const query of [queries.pageRequests, queries.userAgents, queries.networks]) {
      expect(JSON.stringify(query)).toContain('"operation":"regex"');
    }
    expect(JSON.stringify(queries.statuses)).not.toContain('"operation":"regex"');
  });
});

describe('reading query results', () => {
  it('splits request counts into totals, server errors, and cancellations', () => {
    expect(
      summarizeStatuses(
        calculation([
          statusRow(200, 'ok', 100),
          statusRow(502, 'ok', 4),
          statusRow(200, 'canceled', 7),
        ]),
      ),
    ).toEqual({ serverErrors: 4, canceled: 7 });
  });

  it('treats empty results as zero', () => {
    expect(totalCount({})).toBe(0);
    expect(summarizeStatuses(undefined)).toEqual({ serverErrors: 0, canceled: 0 });
    expect(topGroup(calculation([]))).toBeNull();
  });
});

describe('evaluateSignals', () => {
  it('stays quiet on a normal five minutes', () => {
    expect(evaluateSignals(QUIET, DEFAULT_THRESHOLDS)).toEqual([]);
  });

  it('flags each signal that reaches its threshold and names the traffic source', () => {
    const warnings = evaluateSignals(
      {
        requests: 4240,
        serverErrors: 40,
        canceled: 25,
        cacheWriteFailures: 43,
        outOfMemory: 1,
        slowRequests: 40,
        topUserAgent: { value: 'Mozilla/5.0', count: 3900 },
        topNetwork: { value: 'Fastly, Inc.', count: 3950 },
      },
      DEFAULT_THRESHOLDS,
    );
    expect(warnings.map((warning) => warning.kind)).toEqual([
      'serverErrors',
      'canceled',
      'cacheWriteFailures',
      'outOfMemory',
      'slowRequests',
      'requests',
    ]);
    expect(warnings.at(-1)?.message).toContain('Mozilla/5.0 (3900)');
    expect(warnings.at(-1)?.message).toContain('Fastly, Inc. (3950)');
  });
});

describe('warning cooldown', () => {
  it('sends each kind at most once an hour', async () => {
    const kv = new MemoryKv();
    const first = new Date('2026-10-28T12:00:00Z');
    const warning = { kind: 'canceled', message: 'x' };
    await markWarningsSent(kv, [warning], first);
    expect(await dueWarnings(kv, [warning], new Date('2026-10-28T12:59:00Z'))).toEqual([]);
    expect(await dueWarnings(kv, [warning], new Date('2026-10-28T13:00:00Z'))).toEqual([warning]);
    expect(await dueWarnings(kv, [{ kind: 'slow', message: 'y' }], first)).toHaveLength(1);
  });
});

describe('warningEmail', () => {
  it('says the site is up and lists every warning', () => {
    const email = warningEmail(
      [
        { kind: 'canceled', message: '30 requests canceled before finishing' },
        { kind: 'slow', message: 'home took 9.1s' },
      ],
      '2026-10-28T12:55:00.000Z',
      { from: 0, to: 300_000 },
    );
    expect(email.subject).toBe('TruckFull warning: canceled, slow');
    expect(email.text).toContain('still up');
    expect(email.text).toContain('- 30 requests canceled before finishing');
    expect(email.text).toContain('1970-01-01T00:05:00.000Z');
  });
});

describe('runWarningChecks', () => {
  const logMinute = new Date('2026-10-28T12:55:00Z');

  it('would have warned before the October 28 crash, then stays quiet for an hour', async () => {
    const kv = new MemoryKv();
    const sent: string[] = [];
    const run = (now: Date): Promise<void> =>
      runWarningChecks(warningEnv(kv), {
        fetchImpl: telemetryFetch(OUTAGE_RESULTS, sent),
        now,
        down: false,
        slow: [],
      });
    await run(logMinute);
    await run(new Date('2026-10-28T13:00:00Z'));
    expect(sent).toEqual([
      'TruckFull warning: serverErrors, cacheWriteFailures, outOfMemory, slowRequests, requests',
    ]);
  });

  it('only looks up traffic sources when traffic is high', async () => {
    const queried: string[] = [];
    await runWarningChecks(warningEnv(new MemoryKv()), {
      fetchImpl: telemetryFetch(
        {
          statuses: calculation([statusRow(200, 'ok', 1255)]),
          'page-requests': calculation([{ value: 54 }]),
        },
        [],
        queried,
      ),
      now: logMinute,
      down: false,
      slow: [],
    });
    expect(queried.sort()).toEqual([
      'cache-writes',
      'oom',
      'page-requests',
      'slow-requests',
      'statuses',
    ]);
  });

  it('skips the log queries between five-minute marks but still sends slow warnings', async () => {
    const sent: string[] = [];
    const queried: string[] = [];
    await runWarningChecks(warningEnv(new MemoryKv()), {
      fetchImpl: telemetryFetch({}, sent, queried),
      now: new Date('2026-10-28T12:56:00Z'),
      down: false,
      slow: ['https://www.truckfull.food/ took 9.0s, slow twice in a row'],
    });
    expect(queried).toEqual([]);
    expect(sent).toEqual(['TruckFull warning: slow']);
  });

  it('sends no warnings while the site is down, since the outage email covers it', async () => {
    const sent: string[] = [];
    await runWarningChecks(warningEnv(new MemoryKv()), {
      fetchImpl: telemetryFetch(OUTAGE_RESULTS, sent),
      now: logMinute,
      down: true,
      slow: ['x'],
    });
    expect(sent).toEqual([]);
  });

  it('fails loudly without the observability token but still sends the slow warning', async () => {
    const sent: string[] = [];
    await expect(
      runWarningChecks(warningEnv(new MemoryKv(), { CF_OBSERVABILITY_TOKEN: '' }), {
        fetchImpl: telemetryFetch({}, sent),
        now: logMinute,
        down: false,
        slow: ['x'],
      }),
    ).rejects.toThrow('CF_OBSERVABILITY_TOKEN');
    expect(sent).toEqual(['TruckFull warning: slow']);
  });

  it('fails loudly when the observability API rejects the query', async () => {
    const rejecting: FetchImpl = () =>
      Promise.resolve(
        Response.json({ success: false, errors: [{ message: 'denied' }] }, { status: 403 }),
      );
    await expect(
      runWarningChecks(warningEnv(new MemoryKv()), {
        fetchImpl: rejecting,
        now: logMinute,
        down: false,
        slow: [],
      }),
    ).rejects.toThrow('HTTP 403');
  });
});

describe('uptime worker config for warnings', () => {
  const config = readFileSync(join(process.cwd(), 'wrangler.uptime-production.jsonc'), 'utf8');

  it('keeps the observability token out of the tracked config', () => {
    expect(config).toContain('CF_ACCOUNT_ID');
    expect(config).not.toContain('CF_OBSERVABILITY_TOKEN');
  });
});
