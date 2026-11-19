/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { createBehaviorCounter } from '../../worker/guardCounter.mjs';
import { OTHER_IPV4, RELAY_IPV4, RELAY_IPV6, relayFeedResponse } from './support/relayFeed';
import { createDurableContext, type DurableContext } from './support/sqliteDurableStorage';

class Base {
  constructor(_ctx: DurableContext, _env: unknown) {}
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

interface Counter {
  observe: (
    mode: string,
    ip: string,
    path: string,
    now: number,
  ) => Promise<{ block: boolean; reason: string }>;
  isPermanentlyBanned: (ip: string) => boolean;
  relayStatus: (ip: string, force?: boolean) => Promise<string>;
  alarm: () => Promise<void>;
}

function counterNamespace(fetchImpl: Fetch = () => Promise.resolve(relayFeedResponse())) {
  const BehaviorCounter = createBehaviorCounter(Base, fetchImpl);
  const instances = new Map<string, { counter: Counter; ctx: DurableContext }>();
  const env = {
    COUNTER: {
      getByName(name: string): Counter {
        if (!instances.has(name)) {
          const ctx = createDurableContext();
          instances.set(name, { counter: new BehaviorCounter(ctx, env) as Counter, ctx });
        }
        return instances.get(name)!.counter;
      },
    },
  };
  return { env, ctxOf: (name: string) => instances.get(name)!.ctx };
}

const NOW = 1_800_000_000_000;

describe('BehaviorCounter observe', () => {
  it('blocks the thirteenth load of the same page from one address within ten seconds', async () => {
    const counter = counterNamespace().env.COUNTER.getByName('ip:k');
    const results = [];
    for (let i = 0; i < 13; i += 1) results.push(await counter.observe('ip', 'k', 'p', NOW + i));
    expect(results.slice(0, 12).some((r) => r.block)).toBe(false);
    expect(results[12]).toEqual({ block: true, reason: 'rapid-same-page' });
  });

  it('flags a burst of one-page visitors sharing a browser fingerprint and queues their bans', async () => {
    const { env, ctxOf } = counterNamespace();
    const group = env.COUNTER.getByName('group:g');
    const results = [];
    for (let i = 0; i < 12; i += 1) {
      results.push(await group.observe('group', `ip${i}`, `page${i % 3}`, NOW + i));
    }
    expect(results[11]).toEqual({ block: true, reason: 'coordinated-pattern' });
    expect(await group.observe('group', 'late', 'page9', NOW + 100)).toEqual({
      block: true,
      reason: 'coordinated-pattern',
    });

    await group.alarm();
    expect(env.COUNTER.getByName('bans:ip').isPermanentlyBanned('ip0')).toBe(true);
    expect(env.COUNTER.getByName('bans:la').isPermanentlyBanned('late')).toBe(true);
    expect(await ctxOf('group:g').storage.getAlarm()).not.toBeNull();
  });

  it('wipes its storage once nothing is left to clean up', async () => {
    const { env, ctxOf } = counterNamespace();
    const counter = env.COUNTER.getByName('ip:k');
    await counter.observe('ip', 'k', 'p', 1000);
    await counter.alarm();
    const tables = ctxOf('ip:k').storage.sql.exec(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    expect(tables.toArray()).toEqual([]);
  });
});

describe('BehaviorCounter relayStatus', () => {
  it('recognises Apple relay addresses once the feed is loaded on demand', async () => {
    const registry = counterNamespace().env.COUNTER.getByName('relay-registry');
    expect(await registry.relayStatus(RELAY_IPV4, true)).toBe('relay');
    expect(await registry.relayStatus(RELAY_IPV6)).toBe('relay');
    expect(await registry.relayStatus(OTHER_IPV4)).toBe('other');
    expect(await registry.relayStatus('not-an-ip')).toBe('unknown');
  });

  it('answers unknown, never other, while the feed cannot be fetched', async () => {
    const { env, ctxOf } = counterNamespace(() =>
      Promise.resolve(new Response(null, { status: 503 })),
    );
    const registry = env.COUNTER.getByName('relay-registry');
    expect(await registry.relayStatus(OTHER_IPV4, true)).toBe('unknown');
    expect(await registry.relayStatus(OTHER_IPV4)).toBe('unknown');
    await Promise.all(ctxOf('relay-registry').background);
  });

  it('refreshes in the background instead of blocking a non-forced lookup', async () => {
    let calls = 0;
    const { env, ctxOf } = counterNamespace(() => {
      calls += 1;
      return Promise.resolve(relayFeedResponse());
    });
    const registry = env.COUNTER.getByName('relay-registry');
    expect(await registry.relayStatus(OTHER_IPV4)).toBe('unknown');
    await Promise.all(ctxOf('relay-registry').background);
    expect(calls).toBe(1);
    expect(await registry.relayStatus(OTHER_IPV4)).toBe('other');
  });
});
