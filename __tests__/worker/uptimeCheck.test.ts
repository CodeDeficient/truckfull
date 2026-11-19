/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MONITOR_USER_AGENT,
  SLOW_RESPONSE_MS,
  alertEmail,
  checkWithRetry,
  nextUptimeState,
  parseMonitorUrls,
  probeUrl,
  SECURITY_HEADER,
} from '../../worker/uptimeCheck.mjs';
import { BUSY_MESSAGE, UNAVAILABLE_MESSAGE } from '../../worker/loadShedding.mjs';
import { runUptimeCheck } from '../../worker/uptime.mjs';

type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

const HOME = 'https://www.truckfull.food/';
const TRUCKS = 'https://www.truckfull.food/trucks';

function scriptedFetch(statuses: Record<string, number[]>, sent: RequestInit[] = []): FetchImpl {
  return (input, init) => {
    if (input === 'https://api.resend.com/emails') {
      sent.push(init ?? {});
      return Promise.resolve(new Response('{"id":"x"}', { status: 200 }));
    }
    const status = statuses[input]?.shift() ?? 200;
    return Promise.resolve(new Response(null, { status }));
  };
}

class MemoryKv {
  value: string | null = null;

  get(): Promise<unknown> {
    return Promise.resolve(this.value === null ? null : JSON.parse(this.value));
  }

  put(_key: string, value: string): Promise<void> {
    this.value = value;
    return Promise.resolve();
  }
}

function monitorEnv(kv: MemoryKv): Record<string, unknown> {
  return {
    MONITOR_URLS: `${HOME},${TRUCKS}`,
    ALERT_EMAIL_FROM: 'TruckFull Uptime <alerts@example.test>',
    ALERT_EMAIL_TO: 'owner@example.test',
    RESEND_API_KEY: 'test-key',
    UPTIME_STATE: kv,
  };
}

const noWait = (): Promise<void> => Promise.resolve();

function steppedClock(durations: number[]): () => number {
  let now = 0;
  let starting = true;
  const remaining = [...durations];
  return () => {
    if (!starting) now += remaining.shift() ?? 0;
    starting = !starting;
    return now;
  };
}

describe('parseMonitorUrls', () => {
  it('keeps only https URLs from the comma list', () => {
    expect(parseMonitorUrls(` ${HOME} , http://insecure.test/, ${TRUCKS},`)).toEqual([
      HOME,
      TRUCKS,
    ]);
    expect(parseMonitorUrls(undefined)).toEqual([]);
  });
});

describe('probeUrl', () => {
  it('treats success and redirects as up', async () => {
    expect((await probeUrl(HOME, scriptedFetch({ [HOME]: [200] }), 1000)).failure).toBeNull();
    expect((await probeUrl(HOME, scriptedFetch({ [HOME]: [308] }), 1000)).failure).toBeNull();
  });

  it('treats server and edge errors as down', async () => {
    expect((await probeUrl(HOME, scriptedFetch({ [HOME]: [500] }), 1000)).failure).toContain(
      'HTTP 500',
    );
    expect((await probeUrl(HOME, scriptedFetch({ [HOME]: [403] }), 1000)).failure).toContain(
      'HTTP 403',
    );
  });

  it('names our own protection and overload answers apart from app failures', async () => {
    const answer =
      (body: string, status: number, headers: Record<string, string> = {}): FetchImpl =>
      () =>
        Promise.resolve(new Response(body, { status, headers }));
    const failureFor = async (fetchImpl: FetchImpl): Promise<string | null> => {
      const result = await probeUrl(HOME, fetchImpl, 1000);
      return result.failure;
    };
    expect(
      await failureFor(answer('slow down', 429, { [SECURITY_HEADER]: 'aggregate-emergency' })),
    ).toBe(
      `${HOME} was refused by TruckFull's own traffic protection (aggregate-emergency, HTTP 429)`,
    );
    expect(await failureFor(answer(BUSY_MESSAGE, 503))).toBe(
      `${HOME} was turned away by the app's overload limit (HTTP 503)`,
    );
    expect(await failureFor(answer(UNAVAILABLE_MESSAGE, 503))).toBe(
      `${HOME} could not reach the app (HTTP 503)`,
    );
    expect(await failureFor(answer('<html>error</html>', 500))).toBe(`${HOME} returned HTTP 500`);
  });

  it('reports a hung request as a timeout', async () => {
    const hang: FetchImpl = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    expect((await probeUrl(HOME, hang, 20)).failure).toContain('did not respond');
  });

  it('identifies itself with a user agent the edge rules allow', async () => {
    const seen: string[] = [];
    const recordAgent: FetchImpl = (_input, init) => {
      seen.push(new Headers(init?.headers).get('user-agent') ?? '');
      return Promise.resolve(new Response(null, { status: 200 }));
    };
    await probeUrl(HOME, recordAgent, 1000);
    expect(seen).toEqual([MONITOR_USER_AGENT]);
    expect(MONITOR_USER_AGENT.startsWith('Mozilla/')).toBe(false);
    expect(/bot|crawl|spider|scrap/i.test(MONITOR_USER_AGENT)).toBe(false);
  });
});

describe('checkWithRetry', () => {
  it('ignores a failure that clears on the retry', async () => {
    const fetchImpl = scriptedFetch({ [HOME]: [502, 200] });
    expect(
      await checkWithRetry([HOME], { fetchImpl, timeoutMs: 1000, retryDelayMs: 0, wait: noWait }),
    ).toEqual({ failures: [], slow: [] });
  });

  it('reports a failure that persists through the retry', async () => {
    const fetchImpl = scriptedFetch({ [HOME]: [502, 500] });
    const { failures } = await checkWithRetry([HOME], {
      fetchImpl,
      timeoutMs: 1000,
      retryDelayMs: 0,
      wait: noWait,
    });
    expect(failures).toEqual([`${HOME} returned HTTP 500`]);
  });

  it('reports a page as slow only when both attempts are slow', async () => {
    const options = (durations: number[]): Parameters<typeof checkWithRetry>[1] => ({
      fetchImpl: scriptedFetch({}),
      timeoutMs: 20_000,
      retryDelayMs: 0,
      wait: noWait,
      clock: steppedClock(durations),
    });
    const twice = await checkWithRetry([HOME], options([9_000, 9_500]));
    expect(twice.failures).toEqual([]);
    expect(twice.slow).toEqual([`${HOME} took 9.5s, slow twice in a row`]);
    expect((await checkWithRetry([HOME], options([9_000, 2_000]))).slow).toEqual([]);
    expect((await checkWithRetry([HOME], options([SLOW_RESPONSE_MS]))).slow).toEqual([]);
  });
});

describe('nextUptimeState', () => {
  const now = '2026-10-28T12:55:00.000Z';

  it('alerts once when the site goes down', () => {
    expect(nextUptimeState(null, ['x'], now)).toEqual({
      state: { status: 'down', since: now },
      notify: 'down',
    });
    expect(
      nextUptimeState({ status: 'down', since: now }, ['x'], '2026-10-28T12:56:00.000Z').notify,
    ).toBeNull();
  });

  it('alerts once on recovery and remembers the outage start', () => {
    const result = nextUptimeState({ status: 'down', since: now }, [], '2026-10-28T13:01:00.000Z');
    expect(result.notify).toBe('recovered');
    expect(result.state).toEqual({
      status: 'up',
      since: '2026-10-28T13:01:00.000Z',
      downSince: now,
    });
  });

  it('stays quiet while the site is up', () => {
    expect(nextUptimeState(null, [], now).notify).toBeNull();
    expect(nextUptimeState({ status: 'up', since: now }, [], now).notify).toBeNull();
  });
});

describe('alertEmail', () => {
  it('lists the failing checks in the down alert', () => {
    const email = alertEmail('down', ['a failed', 'b failed'], { status: 'down', since: 'T0' });
    expect(email.subject).toBe('TruckFull is DOWN');
    expect(email.text).toContain('a failed');
    expect(email.text).toContain('b failed');
  });
});

describe('runUptimeCheck', () => {
  it('emails on outage, stays quiet while down, and emails on recovery', async () => {
    const kv = new MemoryKv();
    const sent: RequestInit[] = [];
    const env = monitorEnv(kv);

    const run = (statuses: Record<string, number[]>, at: string): Promise<void> =>
      runUptimeCheck(env, {
        fetchImpl: scriptedFetch(statuses, sent),
        now: new Date(at),
        waitImpl: noWait,
      });

    await run({ [HOME]: [500, 500] }, '2026-10-28T12:55:00Z');
    await run({ [HOME]: [500, 500] }, '2026-10-28T12:56:00Z');
    await run({}, '2026-10-28T13:01:00Z');

    const subjects = sent.map(
      (init) => (JSON.parse(String(init.body)) as { subject: string }).subject,
    );
    expect(subjects).toEqual(['TruckFull is DOWN', 'TruckFull recovered']);
    expect(JSON.parse(String(sent[0].body))).toMatchObject({ to: ['owner@example.test'] });
  });

  it('keeps the outage unacknowledged when the email fails so the next run retries', async () => {
    const kv = new MemoryKv();
    const failingResend: FetchImpl = (input) =>
      Promise.resolve(
        input === 'https://api.resend.com/emails'
          ? new Response('nope', { status: 500 })
          : new Response(null, { status: 503 }),
      );
    await expect(
      runUptimeCheck(monitorEnv(kv), {
        fetchImpl: failingResend,
        now: new Date('2026-10-28T12:55:00Z'),
        waitImpl: noWait,
      }),
    ).rejects.toThrow('HTTP 500');
    expect(kv.value).toBeNull();
  });
});

describe('runUptimeCheck page schedule', () => {
  const HEALTH = 'https://www.truckfull.food/api/health';

  function pagedEnv(kv: MemoryKv): Record<string, unknown> {
    return { ...monitorEnv(kv), MONITOR_URLS: HEALTH, PAGE_MONITOR_URLS: `${HOME},${TRUCKS}` };
  }

  function recordingFetch(
    statuses: Record<string, number[]>,
    probed: string[],
    sent: RequestInit[],
  ): FetchImpl {
    const inner = scriptedFetch(statuses, sent);
    return (input, init) => {
      if (input !== 'https://api.resend.com/emails') probed.push(input);
      return inner(input, init);
    };
  }

  it('checks health every minute and the full pages only every five minutes', async () => {
    const kv = new MemoryKv();
    const probed: string[] = [];
    const check = async (at: string): Promise<string[]> => {
      probed.length = 0;
      await runUptimeCheck(pagedEnv(kv), {
        fetchImpl: recordingFetch({}, probed, []),
        now: new Date(at),
        waitImpl: noWait,
      });
      return [...probed];
    };
    expect(await check('2026-11-19T16:01:00Z')).toEqual([HEALTH]);
    expect(await check('2026-11-19T16:05:00Z')).toEqual([HEALTH, HOME, TRUCKS]);
  });

  it('keeps checking the pages every minute while down so health alone never ends an outage', async () => {
    const kv = new MemoryKv();
    const sent: RequestInit[] = [];
    const run = async (statuses: Record<string, number[]>, at: string): Promise<string[]> => {
      const probed: string[] = [];
      await runUptimeCheck(pagedEnv(kv), {
        fetchImpl: recordingFetch(statuses, probed, sent),
        now: new Date(at),
        waitImpl: noWait,
      });
      return probed;
    };
    await run({ [HOME]: [500, 500] }, '2026-11-19T16:05:00Z');
    expect(await run({ [HOME]: [500, 500] }, '2026-11-19T16:06:00Z')).toContain(HOME);
    await run({}, '2026-11-19T16:07:00Z');
    const subjects = sent.map(
      (init) => (JSON.parse(String(init.body)) as { subject: string }).subject,
    );
    expect(subjects).toEqual(['TruckFull is DOWN', 'TruckFull recovered']);
  });
});

describe('runUptimeCheck alert configuration', () => {
  it('fails every run, even while the site is up, when alert settings are missing', async () => {
    for (const name of ['RESEND_API_KEY', 'ALERT_EMAIL_TO', 'ALERT_EMAIL_FROM']) {
      const env = { ...monitorEnv(new MemoryKv()), [name]: '' };
      await expect(
        runUptimeCheck(env, { fetchImpl: scriptedFetch({}), now: new Date(), waitImpl: noWait }),
      ).rejects.toThrow(name);
    }
  });
});

describe('uptime worker config', () => {
  const config = readFileSync(join(process.cwd(), 'wrangler.uptime-production.jsonc'), 'utf8');

  it('checks every minute and never runs a container', () => {
    expect(config).toContain('"crons": ["* * * * *"]');
    expect(config).not.toContain('containers');
    expect(config).not.toContain('durable_objects');
  });

  it('keeps the recipient and API key out of the tracked config', () => {
    expect(config).not.toContain('ALERT_EMAIL_TO');
    expect(config).not.toContain('RESEND_API_KEY');
  });
});
