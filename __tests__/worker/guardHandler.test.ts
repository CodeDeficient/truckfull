/**
 * @jest-environment node
 */
import { describe, expect, it, jest } from '@jest/globals';
import { createBehaviorCounter } from '../../worker/guardCounter.mjs';
import {
  FORGET_LOG_RATE,
  GUARD_TIME_LIMIT_MS,
  checksSiteLoad,
  handleGuardRequest,
  answeredAtEdge,
} from '../../worker/guardHandler.mjs';
import { OTHER_IPV4, RELAY_IPV4, relayFeedResponse } from './support/relayFeed';
import { createDurableContext, type DurableContext } from './support/sqliteDurableStorage';

class Base {
  constructor(_ctx: DurableContext, _env: unknown) {}
}

const SITE = 'https://www.truckfull.food';
const BROWSER = 'Mozilla/5.0 (Macintosh) Chrome/142.0';

function guardEnv(counterOverride?: object, edgeLabel?: string) {
  const BehaviorCounter = createBehaviorCounter(Base, () => Promise.resolve(relayFeedResponse()));
  const instances = new Map<string, object>();
  const forwarded: Request[] = [];
  const env = {
    HASH_KEY: 'test-key',
    ORIGIN: {
      fetch: (request: Request) => {
        forwarded.push(request);
        const headers: Record<string, string> = edgeLabel
          ? { 'x-truckfull-edge-cache': edgeLabel }
          : {};
        return Promise.resolve(new Response('app', { status: 200, headers }));
      },
    },
    COUNTER: {
      getByName(name: string): object {
        if (counterOverride) return counterOverride;
        if (!instances.has(name))
          instances.set(name, new BehaviorCounter(createDurableContext(), env));
        return instances.get(name)!;
      },
    },
  };
  return { env, forwarded };
}

function page(path: string, ip: string, headers: Record<string, string> = {}): Request {
  return new Request(`${SITE}${path}`, {
    headers: {
      'cf-connecting-ip': ip,
      'user-agent': BROWSER,
      accept: 'text/html',
      'sec-fetch-dest': 'document',
      ...headers,
    },
  });
}

describe('handleGuardRequest', () => {
  it('passes ordinary page loads through to the app', async () => {
    const { env, forwarded } = guardEnv();
    const response = await handleGuardRequest(page('/trucks', OTHER_IPV4), env);
    expect(response.status).toBe(200);
    expect(forwarded).toHaveLength(1);
    expect(response.headers.get('server-timing')).toMatch(/^guard;dur=\d+$/);
    expect(await response.text()).toBe('app');
  });

  it('refuses scrapers that label themselves commercial', async () => {
    const { env, forwarded } = guardEnv();
    const response = await handleGuardRequest(
      page('/', OTHER_IPV4, { 'user-agent': 'Commercial-Bot' }),
      env,
    );
    expect(response.status).toBe(403);
    expect(response.headers.get('x-truckfull-security')).toBe('commercial');
    expect(forwarded).toHaveLength(0);
  });

  it('sheds a prefetch storm from one address before it reaches the app', async () => {
    const { env } = guardEnv();
    const statuses = [];
    for (let i = 0; i < 12; i += 1) {
      const prefetch = page(`/trucks/t${i}`, OTHER_IPV4, { 'next-router-prefetch': '1', rsc: '1' });
      statuses.push((await handleGuardRequest(prefetch, env)).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses.slice(10)).toEqual([429, 429]);
    const navigation = await handleGuardRequest(page('/trucks/t3', OTHER_IPV4), env);
    expect(navigation.status).toBe(200);
  });

  it('blocks rapid reloads of one page, but never from an Apple relay address', async () => {
    const { env } = guardEnv();
    const relay = env.COUNTER.getByName('relay-registry') as {
      relayStatus: (ip: string, force: boolean) => Promise<string>;
    };
    await relay.relayStatus(OTHER_IPV4, true);
    const statuses = async (ip: string): Promise<number[]> => {
      const out = [];
      for (let i = 0; i < 13; i += 1)
        out.push((await handleGuardRequest(page('/', ip), env)).status);
      return out;
    };
    expect((await statuses(OTHER_IPV4)).at(-1)).toBe(429);
    expect((await statuses(RELAY_IPV4)).every((s) => s === 200)).toBe(true);
  });

  it('fails open to the app when the counters throw', async () => {
    const broken = {
      observeTraffic: () => Promise.reject(new Error('counter unavailable')),
    };
    const { env, forwarded } = guardEnv(broken);
    const response = await handleGuardRequest(page('/', OTHER_IPV4), env);
    expect(response.status).toBe(200);
    expect(forwarded).toHaveLength(1);
  });

  it('fails open to the app when the counters stop answering', async () => {
    const stalled = { observeTraffic: () => new Promise(() => {}) };
    const { env, forwarded } = guardEnv(stalled);
    const response = await handleGuardRequest(page('/', OTHER_IPV4), env, 20);
    expect(response.status).toBe(200);
    expect(forwarded).toHaveLength(1);
  });

  it('keeps the default time limit short enough to protect page loads', () => {
    expect(GUARD_TIME_LIMIT_MS).toBeLessThanOrEqual(1000);
  });

  it('leaves the pages the edge always saves out of the overload check', async () => {
    let checked = 0;
    const overloaded = {
      observeTraffic: () => {
        checked += 1;
        return Promise.resolve({ block: true, reason: 'aggregate-emergency' });
      },
    };
    const { env, forwarded } = guardEnv(overloaded);
    const response = await handleGuardRequest(page('/trucks', OTHER_IPV4), env);
    expect(response.status).toBe(200);
    expect(checked).toBe(0);
    expect(forwarded).toHaveLength(1);
  });

  it('takes back the count for page loads the edge answered', async () => {
    const forgotten: Array<string | undefined> = [];
    for (const label of [undefined, 'MISS', 'BYPASS', 'STALE-ERROR', 'HIT', 'STALE']) {
      let calls = 0;
      const counter = {
        observeTraffic: () => Promise.resolve({ block: false }),
        forgetTraffic: () => {
          calls += 1;
          return Promise.resolve();
        },
      };
      const { env } = guardEnv(counter, label);
      const tasks: Promise<unknown>[] = [];
      await handleGuardRequest(page('/lakeo', OTHER_IPV4), env, GUARD_TIME_LIMIT_MS, (t) =>
        tasks.push(t),
      );
      await Promise.all(tasks);
      if (calls > 0) forgotten.push(label);
    }
    expect(forgotten).toEqual(['HIT', 'STALE']);
  });

  it('logs a sample of take-backs with the site-wide counts', async () => {
    const lines: string[] = [];
    const log = jest.spyOn(console, 'log').mockImplementation((line: unknown) => {
      lines.push(String(line));
    });
    const counter = {
      observeTraffic: () => Promise.resolve({ block: false }),
      forgetTraffic: () => Promise.resolve({ requests10: 3, requests60: 9 }),
    };
    const takeBack = async (draw: number): Promise<void> => {
      const random = jest.spyOn(Math, 'random').mockReturnValue(draw);
      const { env } = guardEnv(counter, 'HIT');
      const tasks: Promise<unknown>[] = [];
      await handleGuardRequest(page('/lakeo', OTHER_IPV4), env, GUARD_TIME_LIMIT_MS, (t) =>
        tasks.push(t),
      );
      await Promise.all(tasks);
      random.mockRestore();
    };
    await takeBack(FORGET_LOG_RATE / 2);
    await takeBack(FORGET_LOG_RATE);
    log.mockRestore();
    const samples = lines.filter((line) => line.includes('detector_forget_sample'));
    expect(samples).toHaveLength(1);
    expect(JSON.parse(samples[0])).toEqual({
      event: 'detector_forget_sample',
      sampleRate: FORGET_LOG_RATE,
      requests10: 3,
      requests60: 9,
    });
  });

  it('keeps serving the page when taking back the count fails', async () => {
    const counter = {
      observeTraffic: () => Promise.resolve({ block: false }),
      forgetTraffic: () => Promise.reject(new Error('counter unavailable')),
    };
    const { env } = guardEnv(counter, 'HIT');
    const tasks: Promise<unknown>[] = [];
    const response = await handleGuardRequest(
      page('/lakeo', OTHER_IPV4),
      env,
      GUARD_TIME_LIMIT_MS,
      (t) => tasks.push(t),
    );
    await expect(Promise.all(tasks)).resolves.toBeDefined();
    expect(response.status).toBe(200);
  });

  it('lets a burst the edge answers through, but not the same burst reaching the app', async () => {
    const burst = async (label: string): Promise<number[]> => {
      const { env } = guardEnv(undefined, label);
      const statuses: number[] = [];
      for (let i = 0; i < 260; i += 1) {
        const tasks: Promise<unknown>[] = [];
        const response = await handleGuardRequest(
          page(`/truck-${i % 40}`, `203.0.113.${i % 250}`, { referer: `${SITE}/trucks` }),
          env,
          GUARD_TIME_LIMIT_MS,
          (t) => tasks.push(t),
        );
        await Promise.all(tasks);
        statuses.push(response.status);
      }
      return statuses;
    };
    expect((await burst('HIT')).every((s) => s === 200)).toBe(true);
    expect((await burst('MISS')).at(-1)).toBe(429);
  });

  it('recognises answers the edge served from its own copy', () => {
    const label = (value: string): Response =>
      new Response('x', { headers: { 'x-truckfull-edge-cache': value } });
    expect(answeredAtEdge(label('HIT'))).toBe(true);
    expect(answeredAtEdge(label('STALE'))).toBe(true);
    expect(answeredAtEdge(label('MISS'))).toBe(false);
    expect(answeredAtEdge(label('STALE-ERROR'))).toBe(false);
    expect(answeredAtEdge(new Response('x'))).toBe(false);
  });

  it('checks every other dynamic page load before it reaches the app', () => {
    expect(checksSiteLoad(page('/trucks', OTHER_IPV4))).toBe(false);
    expect(checksSiteLoad(page('/', OTHER_IPV4))).toBe(false);
    expect(checksSiteLoad(page('/trucks?x=1', OTHER_IPV4))).toBe(true);
    expect(checksSiteLoad(page('/smoke-stack-bar-b-q', OTHER_IPV4))).toBe(true);
    expect(checksSiteLoad(page('/trucks/made-up-slug', OTHER_IPV4))).toBe(true);
    expect(checksSiteLoad(page('/no-such-page-zz', OTHER_IPV4))).toBe(true);
    expect(checksSiteLoad(page('/trucks', OTHER_IPV4, { cookie: 'sb-abc-auth-token=x' }))).toBe(
      true,
    );
    expect(checksSiteLoad(page('/trucks', OTHER_IPV4, { rsc: '1' }))).toBe(true);
    expect(checksSiteLoad(page('/owner-dashboard', OTHER_IPV4))).toBe(true);
    expect(checksSiteLoad(page('/api/trucks', OTHER_IPV4))).toBe(false);
  });

  it('reports the real reason when the site as a whole is overloaded', async () => {
    for (const reason of ['aggregate-emergency', 'aggregate-fair-share', 'prefetch-overload']) {
      const overloaded = {
        observeTraffic: () => Promise.resolve({ block: true, reason }),
      };
      const { env, forwarded } = guardEnv(overloaded);
      const response = await handleGuardRequest(page('/?city=columbia', OTHER_IPV4), env);
      expect(response.status).toBe(429);
      expect(response.headers.get('x-truckfull-security')).toBe(reason);
      expect(forwarded).toHaveLength(0);
    }
  });

  it('skips detection for verified crawlers', async () => {
    const { env, forwarded } = guardEnv({});
    const request = page('/', OTHER_IPV4);
    Object.defineProperty(request, 'cf', {
      value: { verifiedBotCategory: 'Search Engine Crawler' },
    });
    expect((await handleGuardRequest(request, env)).status).toBe(200);
    expect(forwarded).toHaveLength(1);
  });
});
