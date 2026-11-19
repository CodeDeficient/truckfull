import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

let proxy: typeof import('@/proxy').proxy;

interface ClientFixture {
  readonly getUser: jest.Mock<() => Promise<{ data: { user: null } }>>;
}

const EVENT_PATH = '/events/atlanta-ga/summer-festival-2026-08-01';

function makeRequest(pathname: string, init?: RequestInit): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, init);
}

function configureServerClient(): ClientFixture {
  const getUser = jest.fn(async () => ({ data: { user: null } }));
  const serverClient = { auth: { getUser } } as unknown as ReturnType<typeof createServerClient>;
  jest.mocked(createServerClient).mockReturnValue(serverClient);
  return { getUser };
}

describe('proxy event-detail auth fast path', () => {
  const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalUpstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeAll(async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    ({ proxy } = await import('@/proxy'));
  });

  afterAll(() => {
    if (originalUpstashUrl) process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (originalUpstashToken) process.env.UPSTASH_REDIS_REST_TOKEN = originalUpstashToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('bypasses proxy Supabase work for an anonymous event-detail GET', async () => {
    const response = await proxy(makeRequest(EVENT_PATH));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('bypasses proxy Supabase work for an anonymous event-detail HEAD', async () => {
    const response = await proxy(makeRequest(EVENT_PATH, { method: 'HEAD' }));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('does not make canonical DB work for a cookie-bearing event-detail request', async () => {
    const fixture = configureServerClient();

    const response = await proxy(
      makeRequest(EVENT_PATH, {
        headers: { Cookie: 'session=1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(createServerClient).toHaveBeenCalledTimes(1);
    expect(fixture.getUser).toHaveBeenCalledTimes(1);
  });

  it('retains auth refresh for an Authorization-bearing event-detail request', async () => {
    const fixture = configureServerClient();

    const response = await proxy(
      makeRequest(EVENT_PATH, {
        headers: { Authorization: 'Bearer token' },
      }),
    );

    expect(response.status).toBe(200);
    expect(fixture.getUser).toHaveBeenCalledTimes(1);
  });

  it('does not vary proxy work for event-detail tracking queries', async () => {
    const response = await proxy(makeRequest(`${EVENT_PATH}?utm_source=crawler&ref=event-index`));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('returns 404 for a malformed event path without Supabase or auth work', async () => {
    const response = await proxy(makeRequest('/events/atlanta-ga/not-an-event'));

    expect(response.status).toBe(404);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('returns 404 for an over-segmented event path without Supabase or auth work', async () => {
    const response = await proxy(makeRequest(`${EVENT_PATH}/extra`));

    expect(response.status).toBe(404);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('retains auth refresh for protected routes', async () => {
    const fixture = configureServerClient();

    const response = await proxy(makeRequest('/owner-dashboard/settings'));

    expect(response.status).toBe(200);
    expect(fixture.getUser).toHaveBeenCalledTimes(1);
  });

  it('retains the API route path before auth refresh', async () => {
    const fixture = configureServerClient();

    const response = await proxy(makeRequest('/api/events'));

    expect(response.status).toBe(200);
    expect(fixture.getUser).toHaveBeenCalledTimes(1);
  });

  it('preserves exploit blocking', async () => {
    const response = await proxy(makeRequest('/.git/config'));

    expect(response.status).toBe(404);
  });

  it('preserves bare city redirects', async () => {
    const response = await proxy(makeRequest('/atlanta-ga'));

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('http://localhost/city/atlanta-ga');
  });
});
