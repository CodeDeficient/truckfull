import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { withRetry, withHttpRetry, createRetryFetch, HttpError } from '@/lib/utils/withRetry';

describe('withRetry', () => {
  it('should return result on successful operation', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout error'))
      .mockRejectedValueOnce(new Error('timeout error'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation, { maxAttempts: 3 });

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
    expect(result.attempts).toBe(3);
  });

  it('should return error after max attempts', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('timeout error'));

    const result = await withRetry(operation, { maxAttempts: 3 });

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.attempts).toBe(3);
  });

  it('should not retry when shouldRetry returns false', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Some error'));
    const shouldRetry = jest.fn().mockReturnValue(false);

    const result = await withRetry(operation, { shouldRetry });

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('should handle retry on network errors', async () => {
    const operation = jest
      .fn()
      .mockRejectedValue(new TypeError('Network error'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
  });

  it('should handle retry on HTTP 500 errors', async () => {
    const error = new Error('Server error');
    (error as { status: number }).status = 500;

    const operation = jest
      .fn()
      .mockRejectedValue(error)
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
  });

  it('should handle retry on HTTP 429 errors', async () => {
    const error = new Error('Rate limited');
    (error as { status: number }).status = 429;

    const operation = jest
      .fn()
      .mockRejectedValue(error)
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
  });

  it('should include totalTimeMs in result', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await withRetry(operation);

    expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should handle errors with timeout in message', async () => {
    const operation = jest
      .fn()
      .mockRejectedValue(new Error('Request timeout'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
  });

  it('should handle errors with network in message', async () => {
    const operation = jest
      .fn()
      .mockRejectedValue(new Error('Network connection lost'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
  });

  it('should retry on TypeError with fetch in message', async () => {
    const operation = jest
      .fn()
      .mockRejectedValue(new TypeError('fetch failed'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
  });

  it('should retry on error with rate limit in message', async () => {
    const operation = jest
      .fn()
      .mockRejectedValue(new Error('Rate limit exceeded'))
      .mockResolvedValueOnce('success');

    const result = await withRetry(operation);

    expect(result.success).toBe(true);
  });
});

describe('withHttpRetry', () => {
  it('should retry on HTTP errors', async () => {
    const error = new Error('Server error');
    (error as { status: number }).status = 500;

    const operation = jest
      .fn()
      .mockRejectedValue(error)
      .mockResolvedValueOnce('success');

    const result = await withHttpRetry(operation);

    expect(result.success).toBe(true);
  });

  it('should not retry on HTTP 400 errors', async () => {
    const error = new Error('Bad request');
    (error as { status: number }).status = 400;

    const operation = jest.fn().mockRejectedValue(error);

    const result = await withHttpRetry(operation);

    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('should use custom retryStatuses', async () => {
    const error = new Error('Gateway timeout');
    (error as { status: number }).status = 504;

    const operation = jest
      .fn()
      .mockRejectedValue(error)
      .mockResolvedValueOnce('success');

    const result = await withHttpRetry(operation, {
      retryStatuses: [504],
    });

    expect(result.success).toBe(true);
  });

  it('should retry on HTTP 408 errors', async () => {
    const error = new Error('Request timeout');
    (error as { status: number }).status = 408;

    const operation = jest
      .fn()
      .mockRejectedValue(error)
      .mockResolvedValueOnce('success');

    const result = await withHttpRetry(operation);

    expect(result.success).toBe(true);
  });
});

describe('createRetryFetch', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch as unknown as typeof fetch;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a retry fetch function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const retryFetch = createRetryFetch();
    const response = await retryFetch('/api/test');

    expect(response.ok).toBe(true);
  });

  it('should throw HttpError on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const retryFetch = createRetryFetch();

    await expect(retryFetch('/api/test')).rejects.toThrow(HttpError);
  });

  it('should throw original error after retries exhausted', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));

    const retryFetch = createRetryFetch({ maxAttempts: 1 });

    await expect(retryFetch('/api/test')).rejects.toThrow('Network failure');
  });

  it('should return response on success', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const retryFetch = createRetryFetch();
    const response = await retryFetch('/api/test');

    expect(response).toBe(mockResponse);
  });
});

describe('HttpError', () => {
  it('should create error with status and message', () => {
    const error = new HttpError(404, 'Not Found', 'Truck not found');

    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.message).toBe('Truck not found');
    expect(error.name).toBe('HttpError');
  });

  it('should use default message when not provided', () => {
    const error = new HttpError(500, 'Internal Server Error');

    expect(error.message).toBe('HTTP 500: Internal Server Error');
  });
});