import { describe, it, expect, afterEach } from '@jest/globals';
import { search } from '@/lib/research/searxng';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function fakeFetch(response: unknown) {
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return response as Response;
  }) as unknown as typeof fetch;
  return Object.assign(fn, { calls });
}

function okJson(body: unknown): Response {
  return { ok: true, json: async () => body } as unknown as Response;
}

describe('search authentication header', () => {
  it('sends the proxy token header when SEARXNG_PROXY_TOKEN is configured', async () => {
    process.env.SEARXNG_URL = 'https://searxng.example.workers.dev';
    process.env.SEARXNG_PROXY_TOKEN = 'proxy-token';

    const fetchFn = fakeFetch(okJson({ results: [] }));
    await search('tacos', fetchFn);

    const headers = new Headers(fetchFn.calls[0].init?.headers);
    expect(headers.get('x-truckfull-searxng-key')).toBe('proxy-token');
  });

  it('omits the header when SEARXNG_PROXY_TOKEN is unset, preserving local SearXNG', async () => {
    process.env.SEARXNG_URL = 'http://localhost:8888';
    delete process.env.SEARXNG_PROXY_TOKEN;

    const fetchFn = fakeFetch(okJson({ results: [] }));
    await search('tacos', fetchFn);

    const headers = new Headers(fetchFn.calls[0].init?.headers);
    expect(headers.has('x-truckfull-searxng-key')).toBe(false);
  });

  it('still returns results when the header is sent', async () => {
    process.env.SEARXNG_URL = 'https://searxng.example.workers.dev';
    process.env.SEARXNG_PROXY_TOKEN = 'proxy-token';

    const fetchFn = fakeFetch(
      okJson({
        results: [{ title: 'Taco Fest', url: 'https://example.com', content: 'great', engines: ['brave'] }],
      }),
    );
    const results = await search('tacos', fetchFn);

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Taco Fest');
  });
});
