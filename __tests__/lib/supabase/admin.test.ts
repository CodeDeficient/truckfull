/**
 * @jest-environment node
 */

import { jest, describe, it, expect, beforeEach, afterAll } from '@jest/globals';

const mockCreateClient = jest.fn();

jest.unstable_mockModule('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}));

describe('supabase/admin', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getSupabaseAdmin', () => {
    it('should create admin client with correct parameters', async () => {
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      const mockClient = {};
      mockCreateClient.mockReturnValue(mockClient);

      const result = getSupabaseAdmin();

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-role-key',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        },
      );
      expect(result).toBe(mockClient);
    });

    it('should throw error when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      expect(() => getSupabaseAdmin()).toThrow(
        'Missing SUPABASE_SERVICE_ROLE_KEY environment variable',
      );
    });

    it('should throw error when NEXT_PUBLIC_SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');

      expect(() => getSupabaseAdmin()).toThrow(
        'Missing NEXT_PUBLIC_SUPABASE_URL environment variable',
      );
    });
  });
});
