/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';

const mockCreateClient = jest.fn();

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

describe('supabaseMiddleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('createSupabaseMiddlewareClient', () => {
    it('should create client with correct parameters', async () => {
      const { createSupabaseMiddlewareClient } = await import('@/lib/supabaseMiddleware');

      const mockClient = {};
      mockCreateClient.mockReturnValue(mockClient);

      const req = {} as unknown as Request;
      const res = {} as unknown as Response;
      const result = createSupabaseMiddlewareClient(req, res);

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        {
          auth: {
            persistSession: false,
          },
          global: {
            headers: { 'x-middleware-auth': 'true' },
          },
        },
      );
      expect(result).toBe(mockClient);
    });

    it('should use empty string when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const { createSupabaseMiddlewareClient } = await import('@/lib/supabaseMiddleware');

      const mockClient = {};
      mockCreateClient.mockReturnValue(mockClient);

      const req = {} as unknown as Request;
      const res = {} as unknown as Response;
      createSupabaseMiddlewareClient(req, res);

      expect(mockCreateClient).toHaveBeenCalledWith(
        '',
        'test-anon-key',
        expect.any(Object),
      );
    });

    it('should use empty string when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const { createSupabaseMiddlewareClient } = await import('@/lib/supabaseMiddleware');

      const mockClient = {};
      mockCreateClient.mockReturnValue(mockClient);

      const req = {} as unknown as Request;
      const res = {} as unknown as Response;
      createSupabaseMiddlewareClient(req, res);

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        '',
        expect.any(Object),
      );
    });
  });
});