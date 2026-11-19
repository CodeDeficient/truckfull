/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { fetchWithTimeout } from '@/lib/supabase/fetchWithTimeout';

function answerAfter(delayMs: number): typeof fetch {
  return (_input, init) =>
    new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(new Response('done')), delayMs);
      init?.signal?.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(init.signal?.reason);
      });
    });
}

describe('fetchWithTimeout', () => {
  it('returns answers that arrive in time', async () => {
    const response = await fetchWithTimeout(1000, answerAfter(10))('https://db.example');
    expect(await response.text()).toBe('done');
  });

  it('gives up on a request that hangs', async () => {
    await expect(
      fetchWithTimeout(50, answerAfter(5000))('https://db.example'),
    ).rejects.toMatchObject({
      name: 'TimeoutError',
    });
  });

  it('still honours a caller cancelling first', async () => {
    const caller = new AbortController();
    const pending = fetchWithTimeout(5000, answerAfter(2000))('https://db.example', {
      signal: caller.signal,
    });
    caller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
