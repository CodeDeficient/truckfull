/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BUSY_MESSAGE,
  UNAVAILABLE_MESSAGE,
  UNAVAILABLE_RETRY_AFTER_SECONDS,
  DEFAULT_MAX_IN_FLIGHT,
  createInFlightLimiter,
  maxInFlight,
  orUnavailable,
} from '../../worker/loadShedding.mjs';

type Forward = (request: Request) => Promise<Response>;

const PAGE = 'https://www.truckfull.food/trucks/some-truck';

function heldForward(): { forward: Forward; releaseAll: () => void } {
  const releases: Array<() => void> = [];
  return {
    forward: () =>
      new Promise((resolve) => {
        releases.push(() => resolve(new Response('page', { status: 200 })));
      }),
    releaseAll: () => {
      for (const release of releases.splice(0)) release();
    },
  };
}

const immediate: Forward = () => Promise.resolve(new Response('page', { status: 200 }));

describe('maxInFlight', () => {
  it('uses the default unless given a positive whole number', () => {
    expect(maxInFlight(undefined)).toBe(DEFAULT_MAX_IN_FLIGHT);
    expect(maxInFlight('0')).toBe(DEFAULT_MAX_IN_FLIGHT);
    expect(maxInFlight('abc')).toBe(DEFAULT_MAX_IN_FLIGHT);
    expect(maxInFlight('35')).toBe(35);
  });
});

describe('createInFlightLimiter', () => {
  it('answers busy instantly once the limit of unanswered requests is reached', async () => {
    const limit = createInFlightLimiter(2);
    const held = heldForward();
    const first = limit(new Request(PAGE), held.forward);
    const second = limit(new Request(PAGE), held.forward);

    const shed = await limit(new Request(PAGE), immediate);
    expect(shed.status).toBe(503);
    expect(shed.headers.get('retry-after')).toBe('5');
    expect(shed.headers.get('cache-control')).toBe('no-store');
    expect(await shed.text()).toBe(BUSY_MESSAGE);

    held.releaseAll();
    expect((await first).status).toBe(200);
    expect((await second).status).toBe(200);
  });

  it('reports how many requests are already being answered', async () => {
    const limit = createInFlightLimiter(5);
    const held = heldForward();
    expect(limit.inFlight()).toBe(0);
    const pending = [
      limit(new Request(PAGE), held.forward),
      limit(new Request(PAGE), held.forward),
    ];
    expect(limit.inFlight()).toBe(2);
    held.releaseAll();
    await Promise.all(pending);
    expect(limit.inFlight()).toBe(0);
  });

  it('frees a slot when a request finishes or fails', async () => {
    const limit = createInFlightLimiter(1);
    await limit(new Request(PAGE), immediate);
    await expect(
      limit(new Request(PAGE), () => Promise.reject(new Error('container crashed'))),
    ).rejects.toThrow('container crashed');
    expect((await limit(new Request(PAGE), immediate)).status).toBe(200);
  });

  it('never turns away static files, cron jobs, or webhooks', async () => {
    const limit = createInFlightLimiter(1);
    const held = heldForward();
    const blocking = limit(new Request(PAGE), held.forward);
    for (const path of [
      '/_next/static/chunks/app.js',
      '/api/cron/recover-stuck-posts',
      '/api/webhooks/meta',
    ]) {
      expect(
        (await limit(new Request(`https://www.truckfull.food${path}`), immediate)).status,
      ).toBe(200);
    }
    expect((await limit(new Request(PAGE), immediate)).status).toBe(503);
    held.releaseAll();
    await blocking;
  });
});

describe('container worker wiring', () => {
  const source = readFileSync(join(process.cwd(), 'worker/container.mjs'), 'utf8');

  it('routes every container request through the limiter', () => {
    expect(source).toContain('createInFlightLimiter(maxInFlight(env.CONTAINER_MAX_IN_FLIGHT))');
    expect(source).toContain('this.limitInFlight(request, (forwarded) => super.fetch(forwarded))');
  });

  it('reports the in-flight count on every container response', () => {
    expect(source).toContain('const alreadyInFlight = this.limitInFlight.inFlight();');
    expect(source).toContain("{ name: 'inflight', ms: alreadyInFlight }");
  });
});

describe('orUnavailable', () => {
  it('passes the app response through when it answers', async () => {
    const response = await orUnavailable(Promise.resolve(new Response('page')), '/trucks');
    expect(await response.text()).toBe('page');
  });

  it('answers a plain 503 with a retry hint when the app cannot be reached', async () => {
    const errors: string[] = [];
    const original = console.error;
    console.error = (line: unknown): void => {
      errors.push(String(line));
    };
    try {
      const response = await orUnavailable(Promise.reject(new Error('container gone')), '/lakeo');
      expect(response.status).toBe(503);
      expect(response.headers.get('retry-after')).toBe(String(UNAVAILABLE_RETRY_AFTER_SECONDS));
      expect(response.headers.get('cache-control')).toBe('no-store');
      expect(await response.text()).toBe(UNAVAILABLE_MESSAGE);
    } finally {
      console.error = original;
    }
    expect(JSON.parse(errors[0])).toEqual({
      event: 'app_unavailable',
      pathname: '/lakeo',
      message: 'Error: container gone',
    });
  });
});
