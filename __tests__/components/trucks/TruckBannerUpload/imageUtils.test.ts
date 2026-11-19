import { jest, describe, it, expect } from '@jest/globals';

describe('imageUtils', () => {
  it('should export processImage function', async () => {
    const imageUtils = await import('@/components/trucks/TruckBannerUpload/imageUtils');
    expect(typeof imageUtils.processImage).toBe('function');
  });
});
