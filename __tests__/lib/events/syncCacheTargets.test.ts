import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildInvalidationFetchInit,
  computeInvalidationRetryDelayMs,
  createCallPacer,
  INVALIDATION_EDGE_HEADER,
  INVALIDATION_EDGE_SECRET_ENV,
  INVALIDATION_RETRY_BASE_DELAY_MS,
  INVALIDATION_RETRY_MAX_ATTEMPTS,
  INVALIDATION_RETRY_MAX_DELAY_MS,
  parseRetryAfterSeconds,
  resolveInvalidationCredentials,
  toEventCacheTarget,
} from '@/lib/events/syncCacheTargets';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';

const VALID_TARGET: EventCacheTarget = {
  citySlug: 'augusta-ga',
  eventSlug: 'food-fest-2026-05-01',
  city: 'Augusta',
  state: 'GA',
  eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
};

describe('parseRetryAfterSeconds', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('parses a positive integer header', () => {
    expect(parseRetryAfterSeconds('30')).toBe(30);
  });

  it('parses a positive decimal header', () => {
    expect(parseRetryAfterSeconds('2.5')).toBe(2.5);
  });

  it('parses an HTTP-date header relative to the current time', () => {
    expect(parseRetryAfterSeconds('Fri, 14 Aug 2026 12:00:30 GMT')).toBe(30);
  });

  it('returns null for an HTTP-date header in the past', () => {
    expect(parseRetryAfterSeconds('Fri, 14 Aug 2026 11:59:59 GMT')).toBeNull();
  });

  it('returns null for a missing header', () => {
    expect(parseRetryAfterSeconds(null)).toBeNull();
  });

  it('returns null for a non-numeric header', () => {
    expect(parseRetryAfterSeconds('abc')).toBeNull();
  });

  it('returns null for a zero or negative header', () => {
    expect(parseRetryAfterSeconds('0')).toBeNull();
    expect(parseRetryAfterSeconds('-5')).toBeNull();
  });
});

describe('computeInvalidationRetryDelayMs', () => {
  it('uses the Retry-After value when it exceeds the fallback backoff', () => {
    expect(computeInvalidationRetryDelayMs(1, 30)).toBe(30_000);
  });

  it('uses the fallback backoff when Retry-After is absent', () => {
    expect(computeInvalidationRetryDelayMs(1, null)).toBe(INVALIDATION_RETRY_BASE_DELAY_MS);
  });

  it('uses the fallback backoff when Retry-After is shorter than it', () => {
    expect(computeInvalidationRetryDelayMs(2, 1)).toBe(INVALIDATION_RETRY_BASE_DELAY_MS * 2);
  });

  it('caps the Retry-After value at the max delay', () => {
    expect(computeInvalidationRetryDelayMs(1, 600)).toBe(INVALIDATION_RETRY_MAX_DELAY_MS);
  });

  it('caps the fallback backoff at the max delay', () => {
    expect(computeInvalidationRetryDelayMs(5, null)).toBe(INVALIDATION_RETRY_MAX_DELAY_MS);
  });

  it('exposes a bounded retry budget', () => {
    expect(INVALIDATION_RETRY_MAX_ATTEMPTS).toBe(3);
    expect(INVALIDATION_RETRY_MAX_DELAY_MS).toBeGreaterThan(INVALIDATION_RETRY_BASE_DELAY_MS);
  });
});

describe('resolveInvalidationCredentials', () => {
  const baseEnv = {
    NEXT_PUBLIC_APP_URL: 'https://truckfull.food/',
    CRON_SECRET: 'cron-secret',
    TRUCKFULL_EDGE_SECRET: 'edge-secret',
  };

  it('normalizes a trailing slash and returns all three credentials', () => {
    const credentials = resolveInvalidationCredentials(baseEnv);
    expect(credentials.appUrl).toBe('https://truckfull.food');
    expect(credentials.cronSecret).toBe('cron-secret');
    expect(credentials.edgeSecret).toBe('edge-secret');
  });

  it('throws when CRON_SECRET is absent', () => {
    const { CRON_SECRET: _unused, ...env } = baseEnv;
    expect(() => resolveInvalidationCredentials(env)).toThrow(/CRON_SECRET/);
  });

  it('throws when the edge secret is absent, keeping the app-level boundary mandatory', () => {
    const { TRUCKFULL_EDGE_SECRET: _unused, ...env } = baseEnv;
    expect(() => resolveInvalidationCredentials(env)).toThrow(
      new RegExp(`Missing ${INVALIDATION_EDGE_SECRET_ENV}`),
    );
  });

  it('throws when the app URL is absent', () => {
    const { NEXT_PUBLIC_APP_URL: _unused, ...env } = baseEnv;
    expect(() => resolveInvalidationCredentials(env)).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});

describe('buildInvalidationFetchInit', () => {
  const credentials = {
    appUrl: 'https://truckfull.food',
    cronSecret: 'cron-secret',
    edgeSecret: 'edge-secret',
  };

  it('sends the edge credential header only to the event invalidation endpoint', () => {
    const { url, init } = buildInvalidationFetchInit([VALID_TARGET], credentials);
    expect(url).toBe('https://truckfull.food/api/revalidate/event');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer cron-secret');
    expect(headers.get(INVALIDATION_EDGE_HEADER)).toBe('edge-secret');
    expect(headers.get('content-type')).toBe('application/json');
  });

  it('serializes the targets as the endpoint events payload', () => {
    const { init } = buildInvalidationFetchInit([VALID_TARGET], credentials);
    expect(JSON.parse(String(init.body))).toEqual({ events: [VALID_TARGET] });
  });

  it('keeps CRON_SECRET authorization independent of the edge credential', () => {
    const { init } = buildInvalidationFetchInit([VALID_TARGET], credentials);
    const headers = new Headers(init.headers);
    expect(headers.get('authorization')).toBe('Bearer cron-secret');
    expect(headers.get(INVALIDATION_EDGE_HEADER)).not.toBe(credentials.cronSecret);
  });
});

describe('toEventCacheTarget', () => {
  const baseEvent = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    city: 'Augusta',
    state: 'GA',
    title: 'Food Fest',
    event_start_date: '2026-05-01',
  };

  it('builds a target the endpoint will accept for a conforming row', () => {
    const target = toEventCacheTarget(baseEvent);
    expect(target).toEqual({
      eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
    });
  });

  it('preserves a canonicalization invalidation marker when building a target', () => {
    expect(toEventCacheTarget(baseEvent, { canonicalizationChanged: true })).toEqual({
      eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      city: 'Augusta',
      state: 'GA',
      citySlug: 'augusta-ga',
      eventSlug: 'food-fest-2026-05-01',
      canonicalizationChanged: true,
    });
  });

  it('returns null for a row whose state is outside the platform footprint', () => {
    expect(toEventCacheTarget({ ...baseEvent, state: 'TX' })).toBeNull();
    expect(toEventCacheTarget({ ...baseEvent, state: 'MI' })).toBeNull();
  });

  it('returns null for a row with a non-UUID event id', () => {
    expect(toEventCacheTarget({ ...baseEvent, id: 'event-1' })).toBeNull();
  });

  it('returns null when a required field is missing', () => {
    const { title: _unused, ...withoutTitle } = baseEvent;
    expect(toEventCacheTarget(withoutTitle)).toBeNull();
  });
});

describe('createCallPacer', () => {
  function fakeClock(): { now: () => number; sleep: (ms: number) => Promise<void>; waits: number[] } {
    let clock = 0;
    const waits: number[] = [];
    return {
      now: () => clock,
      sleep: (ms) => {
        waits.push(ms);
        clock += ms;
        return Promise.resolve();
      },
      waits,
    };
  }

  it('spaces back-to-back calls at least the gap apart', async () => {
    const clock = fakeClock();
    const pace = createCallPacer(1000, clock.now, clock.sleep);

    await pace();
    await pace();
    await pace();

    expect(clock.waits).toEqual([1000, 1000]);
    expect(clock.now()).toBe(2000);
  });

  it('spaces calls that start at the same moment instead of letting them run together', async () => {
    const clock = fakeClock();
    const pace = createCallPacer(1000, clock.now, (ms) => {
      clock.waits.push(ms);
      return Promise.resolve();
    });

    await Promise.all([pace(), pace(), pace()]);

    expect(clock.waits).toEqual([1000, 2000]);
  });

  it('does not wait when the previous call was long enough ago', async () => {
    let now = 0;
    const waits: number[] = [];
    const pace = createCallPacer(1000, () => now, (ms) => {
      waits.push(ms);
      return Promise.resolve();
    });

    await pace();
    now = 5000;
    await pace();

    expect(waits).toEqual([]);
  });
});
