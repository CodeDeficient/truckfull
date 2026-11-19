import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { retryWithBackoff } from '@/lib/utils/retryWrapper';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('succeeds on first attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const resultPromise = retryWithBackoff(fn, 'test');

    await jest.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on transient error ECONNRESET', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', { initialDelayMs: 100 });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries on ETIMEDOUT error', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ETIMEDOUT'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', { initialDelayMs: 100 });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('retries on ENOTFOUND error', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', { initialDelayMs: 100 });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('retries on timeout error message', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Request timeout'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', { initialDelayMs: 100 });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('retries on 503 error message', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Service unavailable with 503'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', { initialDelayMs: 100 });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('retries on 502 error message', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('Bad gateway 502'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', { initialDelayMs: 100 });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('throws error on non-retryable error', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Invalid input'));

    const resultPromise = retryWithBackoff(fn, 'test');

    await expect(resultPromise).rejects.toThrow('Invalid input');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws after max attempts exceeded', async () => {
    jest.useRealTimers();

    const error = new Error('ECONNRESET');
    const fn = jest
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error);

    await expect(
      retryWithBackoff(fn, 'test', { maxAttempts: 3, initialDelayMs: 1 }),
    ).rejects.toThrow('ECONNRESET');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses custom shouldRetry function', async () => {
    const customShouldRetry = jest.fn(() => true);
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('custom error'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', {
      shouldRetry: customShouldRetry,
      initialDelayMs: 100,
    });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
    expect(customShouldRetry).toHaveBeenCalledWith(expect.any(Error));
  });

  it('does not retry when shouldRetry returns false', async () => {
    const customShouldRetry = jest.fn(() => false);
    const fn = jest.fn().mockRejectedValue(new Error('custom error'));

    const resultPromise = retryWithBackoff(fn, 'test', {
      shouldRetry: customShouldRetry,
    });

    await expect(resultPromise).rejects.toThrow('custom error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses custom maxAttempts', async () => {
    jest.useRealTimers();

    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockRejectedValueOnce(new Error('ECONNRESET'));

    await expect(
      retryWithBackoff(fn, 'test', { maxAttempts: 3, initialDelayMs: 1 }),
    ).rejects.toThrow('ECONNRESET');

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses custom initialDelayMs', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', {
      initialDelayMs: 200,
      maxAttempts: 2,
    });

    await jest.advanceTimersByTimeAsync(200);

    const result = await resultPromise;
    expect(result).toBe('success');
  });

  it('uses custom backoffMultiplier', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValue('success');

    const resultPromise = retryWithBackoff(fn, 'test', {
      initialDelayMs: 100,
      backoffMultiplier: 3,
      maxAttempts: 2,
    });

    await jest.advanceTimersByTimeAsync(100);

    const result = await resultPromise;
    expect(result).toBe('success');
  });
});