import { isRetryableNetworkError, withFetchRetry } from '@/lib/services/fetchRetry';

const fetchFailed = () => new TypeError('fetch failed');
const successAfter = (value: number, ms: number) =>
  new Promise<number>((resolve) => setTimeout(() => resolve(value), ms));

describe('isRetryableNetworkError', () => {
  it('treats undici fetch failure as retryable', () => {
    expect(isRetryableNetworkError(fetchFailed())).toBe(true);
  });

  it('treats network error codes as retryable', () => {
    const error = Object.assign(new Error('request failed'), { code: 'ECONNRESET' });
    expect(isRetryableNetworkError(error)).toBe(true);
  });

  it('treats an undici cause chain as retryable', () => {
    const cause = Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' });
    const error = new TypeError('fetch failed', { cause });
    expect(isRetryableNetworkError(error)).toBe(true);
  });

  it('does not retry application errors', () => {
    expect(isRetryableNetworkError(new Error('Missing SUPABASE_SERVICE_ROLE_KEY'))).toBe(false);
    expect(isRetryableNetworkError({ message: 'Invalid API key' })).toBe(false);
    expect(isRetryableNetworkError(null)).toBe(false);
  });
});

describe('withFetchRetry', () => {
  it('returns the first successful result without retrying', async () => {
    let calls = 0;
    const result = await withFetchRetry(async () => {
      calls += 1;
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries on a retryable error and then succeeds', async () => {
    let calls = 0;
    const result = await withFetchRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw fetchFailed();
        return 'recovered';
      },
      [1],
    );
    expect(result).toBe('recovered');
    expect(calls).toBe(2);
  });

  it('throws immediately on a non-retryable error', async () => {
    let calls = 0;
    await expect(
      withFetchRetry(
        async () => {
          calls += 1;
          throw new Error('PGRST301 JWT expired');
        },
        [1, 1],
      ),
    ).rejects.toThrow('PGRST301 JWT expired');
    expect(calls).toBe(1);
  });

  it('exhausts the retry budget before rethrowing', async () => {
    let calls = 0;
    await expect(
      withFetchRetry(
        async () => {
          calls += 1;
          throw fetchFailed();
        },
        [1, 1],
      ),
    ).rejects.toBeInstanceOf(TypeError);
    expect(calls).toBe(3);
  });

  it('awaits the delay between attempts', async () => {
    let calls = 0;
    const start = Date.now();
    await withFetchRetry(
      async () => {
        calls += 1;
        if (calls === 1) throw fetchFailed();
        return Date.now() - start;
      },
      [30],
    ).then((elapsed) => {
      expect(elapsed).toBeGreaterThanOrEqual(25);
      expect(calls).toBe(2);
    });
  });

  it('propagates slow success values untouched', async () => {
    const result = await withFetchRetry(() => new Promise((resolve) => setTimeout(() => resolve(7), 5)));
    expect(result).toBe(7);
  });

  it('handles rejected promises thrown synchronously by the caller', async () => {
    const boom = async (): Promise<never> => {
      throw fetchFailed();
    };
    await expect(withFetchRetry(boom, [])).rejects.toBeInstanceOf(TypeError);
  });

  it('returns without awaiting more work after success', async () => {
    let calls = 0;
    const later = successAfter(42, 10);
    const result = await withFetchRetry(async () => {
      calls += 1;
      return calls === 1 ? Promise.reject(fetchFailed()) : later;
    }, [1]);
    expect(result).toBe(42);
    expect(calls).toBe(2);
  });
});
