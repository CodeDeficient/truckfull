/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockCreateServerClient = jest.fn();
const mockCookiesStore = {
  getAll: jest.fn().mockReturnValue([]),
  set: jest.fn(),
};

jest.unstable_mockModule('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}));

jest.unstable_mockModule('next/headers', () => ({
  cookies: jest.fn().mockImplementation(() => Promise.resolve(mockCookiesStore)),
}));

const { createClient, createClientForMiddleware } = await import(
  '@/lib/supabase/utils/server'
);

describe('lib/supabase/utils/server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookiesStore.getAll.mockReturnValue([]);
    mockCookiesStore.set.mockResolvedValue(undefined);
    delete globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  describe('createClient', () => {
    it('should create a server client', async () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');

      const result = createClient();

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(result).toBe('mock-server-client');
    });

    it('should handle setting cookies without response', async () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-server-client');

      const client = createClient();

      const setAll = mockCreateServerClient.mock.calls[0][2].cookies.setAll;
      await setAll([{ name: 'new-cookie', value: 'value' }]);

      expect(mockCookiesStore.set).toHaveBeenCalled();
    });
  });

  describe('createClientForMiddleware', () => {
    it('should create a client for middleware', () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-middleware-client');

      const mockRequest = {
        cookies: {
          getAll: jest.fn().mockReturnValue([{ name: 'session', value: 'token' }]),
        },
      } as any;
      const mockResponse = {
        cookies: {
          set: jest.fn(),
        },
      } as any;

      const result = createClientForMiddleware(mockRequest, mockResponse);

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        })
      );
      expect(result).toBe('mock-middleware-client');
    });

    it('should set cookies on response in middleware', () => {
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      globalThis.process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

      mockCreateServerClient.mockReturnValue('mock-middleware-client');

      const mockRequest = {
        cookies: {
          getAll: jest.fn().mockReturnValue([{ name: 'session', value: 'token' }]),
        },
      } as any;
      const mockResponse = {
        cookies: {
          set: jest.fn(),
        },
      } as any;

      createClientForMiddleware(mockRequest, mockResponse);

      const setAll = mockCreateServerClient.mock.calls[0][2].cookies.setAll;
      setAll([{ name: 'cookie', value: 'value', options: { path: '/' } }]);

      expect(mockResponse.cookies.set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'cookie',
          value: 'value',
        })
      );
    });
  });
});
