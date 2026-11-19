import { describe, it, expect, jest } from '@jest/globals';
import { mapBraveResults, search } from '@/lib/research/brave';

function fakeFetch(response: unknown): typeof fetch {
  return jest.fn().mockResolvedValue(response as Response);
}

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

function errResponse(status: number): Response {
  return { ok: false, status } as unknown as Response;
}

describe('mapBraveResults', () => {
  it('maps description to snippet and sets engines to brave', () => {
    const raw = [
      { title: 'Test', url: 'https://example.com', description: 'snippet text' },
    ];
    const results = mapBraveResults(raw);

    expect(results).toEqual([
      { title: 'Test', url: 'https://example.com', snippet: 'snippet text', engines: ['brave'] },
    ]);
  });

  it('handles missing fields with defaults', () => {
    const raw = [
      { title: 'No URL', description: 'content' },
      { url: 'https://example.com', description: 'desc' },
      { title: 'Minimal', url: 'https://example.com/2' },
      {},
    ];

    const results = mapBraveResults(raw);

    expect(results).toHaveLength(4);
    expect(results[0].url).toBe('');
    expect(results[1].title).toBe('Untitled');
    expect(results[1].snippet).toBe('desc');
    expect(results[2].snippet).toBe('');
    expect(results[3].title).toBe('Untitled');
    expect(results[3].url).toBe('');
    expect(results[3].snippet).toBe('');
  });

  it('returns empty array for empty input', () => {
    expect(mapBraveResults([])).toEqual([]);
  });
});

describe('search', () => {
  beforeEach(() => {
    process.env.BRAVE_API_KEY = 'test-brave-key';
  });

  it('returns parsed results on successful search', async () => {
    const mockResults = [
      {
        title: 'Atlanta Food Truck Festival',
        url: 'https://example.com/festival',
        description: 'Annual food truck event in Atlanta with 100+ trucks',
      },
    ];

    const fetchFn = fakeFetch(okJson({ web: { results: mockResults } }));

    const results = await search('Atlanta Food Truck Festival', fetchFn);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Atlanta Food Truck Festival');
    expect(results[0].snippet).toBe('Annual food truck event in Atlanta with 100+ trucks');
    expect(results[0].engines).toEqual(['brave']);
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.search.brave.com/res/v1/web/search?q=Atlanta%20Food%20Truck%20Festival&count=5',
      expect.objectContaining({
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': 'test-brave-key',
        },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns empty array when BRAVE_API_KEY is not set', async () => {
    delete process.env.BRAVE_API_KEY;
    const fetchFn = fakeFetch(okJson({ web: { results: [] } }));
    const results = await search('test query', fetchFn);

    expect(results).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns empty array for empty query', async () => {
    const fetchFn = fakeFetch(okJson({ web: { results: [] } }));
    const results = await search('', fetchFn);

    expect(results).toEqual([]);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('returns empty array for whitespace-only query', async () => {
    const fetchFn = fakeFetch(okJson({ web: { results: [] } }));
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

  it('handles missing web.results gracefully', async () => {
    const fetchFn = fakeFetch(okJson({}));
    const results = await search('test query', fetchFn);

    expect(results).toEqual([]);
  });

  it('handles null web.results gracefully', async () => {
    const fetchFn = fakeFetch(okJson({ web: { results: null } }));
    const results = await search('test query', fetchFn);

    expect(results).toEqual([]);
  });
});
