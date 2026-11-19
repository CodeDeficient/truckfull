/**
 * @jest-environment node
 */
import { afterAll, beforeAll, describe, expect, it, jest } from '@jest/globals';

type ClientOptions = { global?: { fetch?: typeof fetch } };
const created: ClientOptions[] = [];

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: (_url: string, _key: string, options: ClientOptions) => {
    created.push(options);
    return {};
  },
}));

const saved = { ...process.env };
let admin: typeof import('../../../lib/supabase/admin');
let limits: typeof import('../../../lib/supabase/fetchWithTimeout');

beforeAll(async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  admin = await import('../../../lib/supabase/admin');
  limits = await import('../../../lib/supabase/fetchWithTimeout');
});

afterAll(() => {
  process.env = saved;
});

describe('service-role clients', () => {
  it('leaves the general admin client without a time limit for long jobs', () => {
    created.length = 0;
    admin.getSupabaseAdmin();
    expect(created[0]?.global?.fetch).toBeUndefined();
  });

  it('gives public page reads a time limit on every database call', async () => {
    created.length = 0;
    admin.getSupabasePublicReader();
    const limitedFetch = created[0]?.global?.fetch;
    expect(limitedFetch).toBeDefined();
    const seen: Array<AbortSignal | null | undefined> = [];
    const real = globalThis.fetch;
    globalThis.fetch = ((_input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(init?.signal);
      return Promise.resolve(new Response('[]'));
    }) as typeof fetch;
    try {
      await limitedFetch!('https://example.supabase.co/rest/v1/food_trucks');
    } finally {
      globalThis.fetch = real;
    }
    expect(seen[0]).toBeInstanceOf(AbortSignal);
    expect(limits.PUBLIC_READ_TIMEOUT_MS).toBeLessThanOrEqual(15_000);
  });
});
