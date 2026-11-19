import { describe, it, expect, jest } from '@jest/globals';
import { mapRawResults, search } from '@/lib/research/searxng';

function fakeFetch(response: unknown): typeof fetch {
  return jest.fn().mockResolvedValue(response as Response);
}

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

function errResponse(status: number): Response {
  return { ok: false, status } as unknown as Response;
}

describe('mapRawResults', () => {
  it('maps content to snippet and engines correctly', () => {
    const raw = [
      { title: 'Test', url: 'https://example.com', content: 'snippet text', engines: ['google'] },
    ];
    const results = mapRawResults(raw);

    expect(results).toEqual([
      { title: 'Test', url: 'https://example.com', snippet: 'snippet text', engines: ['google'] },
    ]);
  });

  it('handles missing fields with defaults', () => {
    const raw = [
      { title: 'No URL', content: 'content', engines: ['google'] },
      { url: 'https://example.com', engines: ['bing'] },
      { title: 'Minimal', url: 'https://example.com/2' },
      {},
    ];

    const results = mapRawResults(raw);

    expect(results).toHaveLength(4);
    expect(results[0].url).toBe('');
    expect(results[1].title).toBe('Untitled');
    expect(results[1].snippet).toBe('');
    expect(results[2].engines).toEqual([]);
    expect(results[3].title).toBe('Untitled');
    expect(results[3].url).toBe('');
    expect(results[3].snippet).toBe('');
    expect(results[3].engines).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(mapRawResults([])).toEqual([]);
  });
});

describe('search', () => {
  it('returns parsed results on successful search', async () => {
    const mockResults = [
      {
        title: 'Atlanta Food Truck Festival',
        url: 'https://example.com/festival',
        content: 'Annual food truck event in Atlanta with 100+ trucks',
        engines: ['google', 'bing'],
      },
    ];

    const fetchFn = fakeFetch(okJson({ results: mockResults }));
    process.env.SEARXNG_URL = 'http://localhost:8888';

    const results = await search('Atlanta Food Truck Festival', fetchFn);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Atlanta Food Truck Festival');
    expect(results[0].snippet).toBe('Annual food truck event in Atlanta with 100+ trucks');
    expect(results[0].engines).toEqual(['google', 'bing']);
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:8888/search?q=Atlanta%20Food%20Truck%20Festival&format=json',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns empty array for empty query', async () => {
    const fetchFn = fakeFetch(okJson({ results: [] }));
    const results = await search('', fetchFn);

    expect(results).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns empty array for whitespace-only query', async () => {
    const fetchFn = fakeFetch(okJson({ results: [] }));
    const results = await search('   ', fetchFn);

    expect(results).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns empty array on network error', async () => {
    const fetchFn = fakeFetch(Promise.reject(new Error('Network error')));
    const results = await search('test query', fetchFn);

    expect(results).toEqual([]);
  });

  it('returns empty array on timeout abort', async () => {
    const fetchFn = fakeFetch(Promise.reject(new DOMException('Aborted', 'AbortError')));
    const results = await search('test query', fetchFn);

    expect(results).toEqual([]);
  });

  it('returns empty array on non-ok response', async () => {
    const fetchFn = fakeFetch(errResponse(500));
    const results = await search('test query', fetchFn);

    expect(results).toEqual([]);
  });

  it('returns empty array on malformed JSON response', async () => {
    const fetchFn = fakeFetch({ ok: true, json: async () => { throw new Error('Invalid JSON'); } });
    const results = await search('test query', fetchFn);

    expect(results).toEqual([]);
  });

  it('uses SEARXNG_URL env var', async () => {
    process.env.SEARXNG_URL = 'http://custom-searxng:9999';
    const fetchFn = fakeFetch(okJson({ results: [] }));

    await search('test', fetchFn);

    expect(fetchFn).toHaveBeenCalledWith(
      'http://custom-searxng:9999/search?q=test&format=json',
      expect.anything(),
    );
  });
});
