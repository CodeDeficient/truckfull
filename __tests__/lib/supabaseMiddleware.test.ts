import { describe, it, expect } from '@jest/globals';

describe('supabaseMiddleware', () => {
  it('should export createSupabaseMiddlewareClient function', async () => {
    const mod = await import('@/lib/supabaseMiddleware');
    expect(typeof mod.createSupabaseMiddlewareClient).toBe('function');
  });
});
