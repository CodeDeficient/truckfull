import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

function makeRequest(pathname: string, init?: RequestInit): NextRequest {
  return new NextRequest(`http://localhost${pathname}`, init);
}

function configureServerClient(slugRedirect: { readonly to_slug: string } | null = null) {
  const getUser = jest.fn(async () => ({ data: { user: null } }));
  let slugLookupCalls = 0;
  const query = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(async () => ({ data: slugRedirect, error: null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  const serverClient = {
    from: jest.fn(() => {
      slugLookupCalls += 1;
      return query;
    }),
    auth: { getUser },
  } as unknown as ReturnType<typeof createServerClient>;
  jest.mocked(createServerClient).mockReturnValue(serverClient);
  return { getUser, slugLookupCount: () => slugLookupCalls };
}

describe('proxy anonymous public fast path', () => {
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeAll(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterAll(() => {
    if (originalServiceRoleKey) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }

    if (originalAppUrl === undefined) {
      delete process.env.NEXT_PUBLIC_APP_URL;
    } else {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it('skips Supabase client creation for an anonymous approved public route', async () => {
    const response = await proxy(makeRequest('/city/atlanta-ga'));

    expect(response.status).toBe(200);
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it('retains session refresh for a Cookie-bearing approved public route', async () => {
    const { getUser } = configureServerClient();

    const response = await proxy(
      makeRequest('/city/atlanta-ga', {
        headers: { Cookie: 'session=1' },
      }),
    );

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('retains session refresh for protected routes', async () => {
    const { getUser } = configureServerClient();

    const response = await proxy(makeRequest('/owner-dashboard/settings'));

    expect(response.status).toBe(200);
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('skips slug redirects for known application routes', async () => {
    const fixture = configureServerClient();

    const response = await proxy(makeRequest('/events'));

    expect(response.status).toBe(200);
    expect(fixture.slugLookupCount()).toBe(0);
    expect(fixture.getUser).not.toHaveBeenCalled();
  });

  it.each(['/trucks', '/trucks/', '/cuisine', '/best', '/data-api', '/profile', '/settings'])(
    'skips slug redirects for the %s application route',
    async (pathname) => {
      const fixture = configureServerClient({ to_slug: 'replacement' });

      const response = await proxy(makeRequest(pathname));

      expect(response.status).toBe(200);
      expect(fixture.slugLookupCount()).toBe(0);
    },
  );

  it('preserves slug redirects for unknown one-segment routes', async () => {
    const fixture = configureServerClient({ to_slug: 'replacement' });

    const response = await proxy(makeRequest('/some-unknown-slug'));

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('http://localhost/replacement');
    expect(fixture.slugLookupCount()).toBe(1);
    expect(fixture.getUser).not.toHaveBeenCalled();
  });
});
