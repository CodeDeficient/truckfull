import { jest, describe, it, expect } from '@jest/globals';

describe('usePWAInstall', () => {
  it('should export the hook', async () => {
    const hookModule = await import('@/hooks/usePWAInstall');
    expect(typeof hookModule.usePWAInstall).toBe('function');
  });
});
