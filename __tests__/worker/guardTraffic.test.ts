/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import {
  forgetTraffic,
  observeTraffic,
  recordTraffic,
  trafficDecision,
} from '../../worker/guardTraffic.mjs';
import { createDurableContext } from './support/sqliteDurableStorage';

const quiet = { requests10: 1, requests60: 1, prefetch10: 0, prefetch60: 0 };

describe('trafficDecision', () => {
  it('lets ordinary traffic through', () => {
    expect(trafficDecision(quiet, quiet, false).block).toBe(false);
  });

  it('sheds prefetches from one client past its own limit', () => {
    const client = { ...quiet, prefetch10: 11, prefetch60: 11 };
    const result = trafficDecision(client, client, true);
    expect(result).toMatchObject({ block: true, reason: 'prefetch-overload' });
    expect(trafficDecision(client, client, false).block).toBe(false);
  });

  it('sheds the heaviest clients first when the whole site is busy', () => {
    const totals = { ...quiet, requests10: 81 };
    expect(trafficDecision(totals, { ...quiet, requests10: 7 }, false)).toMatchObject({
      block: true,
      reason: 'aggregate-fair-share',
    });
    expect(trafficDecision(totals, { ...quiet, requests10: 2 }, false).block).toBe(false);
  });

  it('turns everyone away past the emergency ceiling', () => {
    expect(trafficDecision({ ...quiet, requests60: 241 }, quiet, false)).toMatchObject({
      block: true,
      reason: 'aggregate-emergency',
    });
  });
});

describe('recordTraffic', () => {
  it('counts the last 10 and 60 seconds separately and forgets older buckets', () => {
    const { storage } = createDurableContext();
    const start = 1_000_000_000;
    recordTraffic(storage.sql, 'a', true, start);
    recordTraffic(storage.sql, 'b', false, start + 30_000);
    const now = recordTraffic(storage.sql, 'a', false, start + 55_000);
    expect(now.totals).toEqual({ requests10: 1, requests60: 3, prefetch10: 0, prefetch60: 1 });
    expect(now.client).toEqual({ requests10: 1, requests60: 2, prefetch10: 0, prefetch60: 1 });
    const later = recordTraffic(storage.sql, 'a', false, start + 61_000);
    expect(later.totals.requests60).toBe(3);
  });

  it('blocks the eleventh prefetch from one client inside ten seconds', () => {
    const { storage } = createDurableContext();
    const results = Array.from({ length: 11 }, (_, i) =>
      observeTraffic(storage.sql, 'a', true, 2_000_000_000 + i),
    );
    expect(results.slice(0, 10).every((r) => !r.block)).toBe(true);
    expect(results[10].block).toBe(true);
  });

  it('takes back one counted request from the second it was counted in', () => {
    const { storage } = createDurableContext();
    const at = 3_000_000_000;
    recordTraffic(storage.sql, 'a', false, at);
    recordTraffic(storage.sql, 'a', false, at);
    expect(forgetTraffic(storage.sql, 'a', false, at)).toBeNull();
    expect(forgetTraffic(storage.sql, 'a', false, at, true).requests10).toBe(0);
    forgetTraffic(storage.sql, 'a', false, at);
    expect(recordTraffic(storage.sql, 'a', false, at + 1000).totals.requests10).toBe(1);
  });
});
