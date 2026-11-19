import { describe, it, expect } from '@jest/globals';
import { TRAFFIC_CONFIG, getNodeLimitForTier, getMaxRadiusForTier } from '@/lib/config/trafficConfig';

describe('trafficConfig', () => {
  describe('TRAFFIC_CONFIG', () => {
    it('should have correct MAX_NODES_PRO', () => {
      expect(TRAFFIC_CONFIG.MAX_NODES_PRO).toBe(40_000);
    });

    it('should have correct MAX_RADIUS_FREE', () => {
      expect(TRAFFIC_CONFIG.MAX_RADIUS_FREE).toBe(0);
    });

    it('should have correct MAX_RADIUS_PRO', () => {
      expect(TRAFFIC_CONFIG.MAX_RADIUS_PRO).toBe(300);
    });

    it('should have correct DEFAULT_RADIUS_METERS', () => {
      expect(TRAFFIC_CONFIG.DEFAULT_RADIUS_METERS).toBe(5000);
    });

    it('should have correct DEFAULT_LIMIT', () => {
      expect(TRAFFIC_CONFIG.DEFAULT_LIMIT).toBe(50);
    });
  });

  describe('getNodeLimitForTier', () => {
    it('should return MAX_NODES_PRO for pro tier', () => {
      expect(getNodeLimitForTier('pro')).toBe(40_000);
    });

    it('should return 0 for free tier', () => {
      expect(getNodeLimitForTier('free')).toBe(0);
    });

    it('should return 0 for null tier', () => {
      expect(getNodeLimitForTier(null)).toBe(0);
    });
  });

  describe('getMaxRadiusForTier', () => {
    it('should return MAX_RADIUS_PRO for pro tier', () => {
      expect(getMaxRadiusForTier('pro')).toBe(300);
    });

    it('should return MAX_RADIUS_FREE for free tier', () => {
      expect(getMaxRadiusForTier('free')).toBe(0);
    });

    it('should return MAX_RADIUS_FREE for null tier', () => {
      expect(getMaxRadiusForTier(null)).toBe(0);
    });
  });
});
