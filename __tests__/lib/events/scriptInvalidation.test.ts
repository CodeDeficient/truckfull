import { afterEach, describe, expect, it, jest } from '@jest/globals';
import {
  buildScriptInvalidator,
  collectRowTargets,
  rowToCacheTarget,
} from '@/lib/events/scriptInvalidation';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';

const VALID_TARGET: EventCacheTarget = {
  citySlug: 'augusta-ga',
  eventSlug: 'food-fest-2026-05-01',
  city: 'Augusta',
  state: 'GA',
  eventId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
};

const OK_RESPONSE = {
  ok: true,
  status: 200,
  headers: new Headers(),
  arrayBuffer: async () => new ArrayBuffer(0),
};

const ERROR_RESPONSE = {
  ok: false,
  status: 500,
  headers: new Headers(),
  arrayBuffer: async () => new ArrayBuffer(0),
};

const responseForStatus = (status: number) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: new Headers(),
  arrayBuffer: async () => new ArrayBuffer(0),
});

const ROW = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  title: 'Food Fest',
  city: 'Augusta',
  state: 'GA',
  event_start_date: '2026-05-01',
};

const CREDS: NodeJS.ProcessEnv = {
  NEXT_PUBLIC_APP_URL: 'https://app.truckfull.food',
  CRON_SECRET: 'cron-secret',
  TRUCKFULL_EDGE_SECRET: 'edge-secret',
};

describe('rowToCacheTarget', () => {
  it('builds a target from a full identity row', () => {
    expect(rowToCacheTarget(ROW)).toEqual(VALID_TARGET);
  });

  it('returns null for rows missing identity parts', () => {
    expect(
      rowToCacheTarget({
        id: 'x',
        title: null,
        city: 'A',
        state: 'GA',
        event_start_date: '2026-01-01',
      }),
    ).toBeNull();
    expect(
      rowToCacheTarget({
        id: null,
        title: 'T',
        city: 'A',
        state: 'GA',
        event_start_date: '2026-01-01',
      }),
    ).toBeNull();
  });
});

describe('collectRowTargets', () => {
  it('dedupes identical targets from multiple rows', () => {
    expect(collectRowTargets([ROW, ROW])).toHaveLength(1);
  });

  it('drops rows that cannot form a target', () => {
    const targets = collectRowTargets([
      ROW,
      { id: 'b', title: null, city: 'A', state: 'GA', event_start_date: '2026-01-01' },
    ]);
    expect(targets).toHaveLength(1);
    expect(targets[0]!.eventId).toBe(ROW.id);
  });
});

describe('buildScriptInvalidator', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('POSTs chunked targets to the event revalidation endpoint', async () => {
    const fetchMock = jest.fn().mockResolvedValue(OK_RESPONSE);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      await invalidate([VALID_TARGET, VALID_TARGET, VALID_TARGET]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('https://app.truckfull.food/api/revalidate/event');
      const headers = new Headers(init.headers);
      expect(headers.get('authorization')).toBe('Bearer cron-secret');
      expect(headers.get('x-truckfull-internal')).toBe('edge-secret');
      expect(JSON.parse(String(init.body))).toEqual({
        events: [VALID_TARGET, VALID_TARGET, VALID_TARGET],
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('chunks more than 100 targets into multiple POSTs', async () => {
    const fetchMock = jest.fn().mockResolvedValue(OK_RESPONSE);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      const many = Array.from({ length: 150 }, () => VALID_TARGET);
      await invalidate(many);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('does nothing when there are no targets', async () => {
    const fetchMock = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      await invalidate([]);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('fails open (skips with a warning) when the edge secret is missing', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = jest.fn();
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator({
        NEXT_PUBLIC_APP_URL: 'https://app.truckfull.food',
        CRON_SECRET: 'cron-secret',
      });
      await invalidate([VALID_TARGET]);
      expect(fetchMock).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('TRUCKFULL_EDGE_SECRET'));
    } finally {
      global.fetch = originalFetch;
      warnSpy.mockRestore();
    }
  });

  it('continues to later chunks after an exhausted transient failure', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(ERROR_RESPONSE)
      .mockResolvedValueOnce(ERROR_RESPONSE)
      .mockResolvedValueOnce(ERROR_RESPONSE)
      .mockResolvedValueOnce(OK_RESPONSE);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      const promise = invalidate(Array.from({ length: 150 }, () => VALID_TARGET));
      await jest.advanceTimersByTimeAsync(20_000);
      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(4);
      expect(JSON.parse(String(fetchMock.mock.calls[3]![1].body))).toMatchObject({
        events: Array.from({ length: 50 }, () => VALID_TARGET),
      });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('1/2 chunks successful'));
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('100 targets were not invalidated'),
      );
    } finally {
      global.fetch = originalFetch;
      warnSpy.mockRestore();
    }
  });

  it('does not retry a payload-specific 4xx and continues to later chunks', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(responseForStatus(400))
      .mockResolvedValueOnce(OK_RESPONSE);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      await invalidate(Array.from({ length: 150 }, () => VALID_TARGET));
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('1/2 chunks successful'));
    } finally {
      global.fetch = originalFetch;
      warnSpy.mockRestore();
    }
  });

  it('retries a request-timeout response before succeeding', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(responseForStatus(408))
      .mockResolvedValueOnce(OK_RESPONSE);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      const promise = invalidate([VALID_TARGET]);
      await jest.advanceTimersByTimeAsync(5_000);
      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
      warnSpy.mockRestore();
    }
  });

  it.each([401, 403])(
    'stops subsequent chunks after a global authentication failure (%i)',
    async (status) => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const fetchMock = jest.fn().mockResolvedValue(responseForStatus(status));
      const originalFetch = global.fetch;
      global.fetch = fetchMock as unknown as typeof fetch;

      try {
        const invalidate = buildScriptInvalidator(CREDS);
        await expect(invalidate(Array.from({ length: 150 }, () => VALID_TARGET))).rejects.toThrow(
          new RegExp(`status ${status}`),
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
      } finally {
        global.fetch = originalFetch;
        errorSpy.mockRestore();
      }
    },
  );

  it('latches a global authentication failure across later invalidation calls', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = jest.fn().mockResolvedValue(responseForStatus(401));
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      await expect(invalidate([VALID_TARGET])).rejects.toThrow(/status 401/);
      await invalidate([VALID_TARGET]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
      errorSpy.mockRestore();
    }
  });

  it('prevents concurrent calls from repeating a global authentication failure', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = jest.fn().mockResolvedValue(responseForStatus(403));
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      const first = invalidate([VALID_TARGET]);
      const second = invalidate([VALID_TARGET]);
      await expect(first).rejects.toThrow(/status 403/);
      await expect(second).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
      errorSpy.mockRestore();
    }
  });

  it('preserves targets from concurrent calls after authentication succeeds', async () => {
    const fetchMock = jest.fn().mockResolvedValue(OK_RESPONSE);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      await Promise.all([invalidate([VALID_TARGET]), invalidate([VALID_TARGET])]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('does not let an empty call consume the authentication gate', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const fetchMock = jest.fn().mockResolvedValue(responseForStatus(401));
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      const empty = invalidate([]);
      const first = invalidate([VALID_TARGET]);
      const second = invalidate([VALID_TARGET]);
      await empty;
      await expect(first).rejects.toThrow(/status 401/);
      await expect(second).resolves.toBeUndefined();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
      errorSpy.mockRestore();
    }
  });

  it('times out stalled requests and records the exhausted chunk failure', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = jest.fn(
      (_url: string, init: RequestInit) =>
        new Promise<never>((_, reject) => {
          init.signal?.addEventListener('abort', () => reject(new Error('request timed out')), {
            once: true,
          });
        }),
    );
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      const promise = invalidate([VALID_TARGET]);
      await jest.advanceTimersByTimeAsync(110_000);
      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('0/1 chunks successful'));
    } finally {
      global.fetch = originalFetch;
      warnSpy.mockRestore();
    }
  });

  it('counts successful chunks before and after a recoverable failure', async () => {
    jest.useFakeTimers();
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(OK_RESPONSE)
      .mockResolvedValueOnce(ERROR_RESPONSE)
      .mockResolvedValueOnce(ERROR_RESPONSE)
      .mockResolvedValueOnce(ERROR_RESPONSE)
      .mockResolvedValueOnce(OK_RESPONSE);
    const originalFetch = global.fetch;
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const invalidate = buildScriptInvalidator(CREDS);
      const promise = invalidate(Array.from({ length: 250 }, () => VALID_TARGET));
      await jest.advanceTimersByTimeAsync(20_000);
      await promise;
      expect(fetchMock).toHaveBeenCalledTimes(5);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('2/3 chunks successful'));
    } finally {
      global.fetch = originalFetch;
      warnSpy.mockRestore();
    }
  });
});
