import { describe, expect, it } from '@jest/globals';
import { createPosthogReadiness } from '@/lib/analytics/posthogReady';

describe('createPosthogReadiness', () => {
  it('waits until PostHog initialization succeeds', async () => {
    const readiness = createPosthogReadiness();
    let resolved = false;
    const result = readiness.wait().then((ready) => {
      resolved = true;
      return ready;
    });

    await Promise.resolve();
    expect(resolved).toBe(false);

    readiness.markReady();
    await expect(result).resolves.toBe(true);
  });

  it('releases waiters without reporting ready when initialization fails', async () => {
    const readiness = createPosthogReadiness();
    const result = readiness.wait();
    readiness.markFailed();
    await expect(result).resolves.toBe(false);
  });
});
