/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCreateServerClient = jest.fn();
const mockCookiesStore = {
  get: jest.fn(),
  set: jest.fn(),
};

jest.unstable_mockModule('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

jest.unstable_mockModule('next/headers', () => ({
  cookies: jest.fn().mockImplementation(() => Promise.resolve(mockCookiesStore)),
}));

const { createServerSupabaseClient, getSupabase } = await import('@/lib/supabase/server');

describe('lib/supabase/server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    mockCookiesStore.get.mockResolvedValue(undefined);
    mockCookiesStore.set.mockResolvedValue(undefined);
  });

  describe('createServerSupabaseClient', () => {
    it('should create a server client', () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');

      const result = createServerSupabaseClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            get: expect.any(Function),
            set: expect.any(Function),
            remove: expect.any(Function),
          }),
        })
      );
      expect(result).toBe('mock-server-client');
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      expect(() => createServerSupabaseClient()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable'
      );
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';

      expect(() => createServerSupabaseClient()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable'
      );
    });

    it('should handle cookies get', async () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');
      mockCookiesStore.get.mockResolvedValue('cookie-value');

      createServerSupabaseClient();

      const cookiesInterface = mockCreateServerClient.mock.calls[0][2].cookies;
      const result = await cookiesInterface.get('session');

      expect(mockCookiesStore.get).toHaveBeenCalledWith('session');
    });

    it('should handle cookies set', async () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');

      createServerSupabaseClient();

      const cookiesInterface = mockCreateServerClient.mock.calls[0][2].cookies;
      await cookiesInterface.set('session', 'value', { path: '/' });

      expect(mockCookiesStore.set).toHaveBeenCalled();
    });

    it('should handle cookies set error silently', async () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');
      mockCookiesStore.set.mockImplementation(() => {
        throw new Error('Cannot set cookies in this context');
      });

      createServerSupabaseClient();

      const cookiesInterface = mockCreateServerClient.mock.calls[0][2].cookies;
      await expect(cookiesInterface.set('session', 'value', { path: '/' })).resolves.not.toThrow();
    });

    it('should handle cookies remove', async () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');

      createServerSupabaseClient();

      const cookiesInterface = mockCreateServerClient.mock.calls[0][2].cookies;
      await cookiesInterface.remove('session', { path: '/' });

      expect(mockCookiesStore.set).toHaveBeenCalled();
    });

    it('should handle cookies remove error silently', async () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');
      mockCookiesStore.set.mockImplementation(() => {
        throw new Error('Cannot remove cookies in this context');
      });

      createServerSupabaseClient();

      const cookiesInterface = mockCreateServerClient.mock.calls[0][2].cookies;
      await expect(cookiesInterface.remove('session', { path: '/' })).resolves.not.toThrow();
    });
  });

  describe('getSupabase', () => {
    it('should be an alias for createServerSupabaseClient', () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');

      expect(getSupabase).toBe(createServerSupabaseClient);
    });
  });
});
