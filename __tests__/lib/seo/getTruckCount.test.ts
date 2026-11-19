/**
 * @jest-environment node
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

import { resolveTruckCount, truckCountWithFallback } from '@/lib/seo/getTruckCount';

let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

const failingQuery = async () => ({
  count: null,
  error: { message: 'connection refused' },
});

const succeedingQuery = async () => ({
  count: 375,
  error: null,
});

describe('resolveTruckCount (cached fetch decision boundary)', () => {
  it('throws when the query reports an error, so the failure is never cached', async () => {
    await expect(resolveTruckCount(failingQuery)).rejects.toMatchObject({
      message: 'connection refused',
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it('resolves the rounded count when the query succeeds and does not log', async () => {
    await expect(resolveTruckCount(succeedingQuery)).resolves.toEqual({
      rounded: 370,
      exact: 375,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('treats a null count as zero without an error', async () => {
    await expect(resolveTruckCount(async () => ({ count: null, error: null }))).resolves.toEqual({
      rounded: 0,
      exact: 0,
    });
  });
});

describe('truckCountWithFallback (display wrapper)', () => {
  it('returns null outside the cached function on a transient failure', async () => {
    const fetchCount = () => Promise.reject(new Error('connection refused'));

    await expect(truckCountWithFallback(fetchCount)).resolves.toBeNull();
  });

  it('returns the real count on the next call after a transient failure', async () => {
    let calls = 0;
    const fetchCount = (): Promise<{ rounded: number; exact: number }> => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('connection refused'));
      return Promise.resolve({ rounded: 370, exact: 375 });
    };

    await expect(truckCountWithFallback(fetchCount)).resolves.toBeNull();
    await expect(truckCountWithFallback(fetchCount)).resolves.toEqual({
      rounded: 370,
      exact: 375,
    });
    expect(calls).toBe(2);
  });

  it('never substitutes the fallback when the fetch succeeds', async () => {
    const fetchCount = async () => ({ rounded: 370, exact: 375 });

    await expect(truckCountWithFallback(fetchCount)).resolves.toEqual({
      rounded: 370,
      exact: 375,
    });
  });
});
