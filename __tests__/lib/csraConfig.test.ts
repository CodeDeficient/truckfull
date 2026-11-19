/**
 * CSRA Config Tests
 */

import { CSRA_TARGET_CITIES, CSRA_DISCOVERY_CONFIG } from '@/lib/csraConfig';

describe('csraConfig', () => {
  describe('CSRA_TARGET_CITIES', () => {
    it('should be an array of city names', () => {
      expect(Array.isArray(CSRA_TARGET_CITIES)).toBe(true);
    });

    it('should contain expected CSRA cities', () => {
      expect(CSRA_TARGET_CITIES).toContain('Augusta');
      expect(CSRA_TARGET_CITIES).toContain('Martinez');
      expect(CSRA_TARGET_CITIES).toContain('Evans');
      expect(CSRA_TARGET_CITIES).toContain('Grovetown');
      expect(CSRA_TARGET_CITIES).toContain('Aiken');
      expect(CSRA_TARGET_CITIES).toContain('North Augusta');
    });

    it('should have 20 cities total', () => {
      expect(CSRA_TARGET_CITIES).toHaveLength(20);
    });

    it('should contain only string values', () => {
      CSRA_TARGET_CITIES.forEach((city: unknown) => {
        expect(typeof city).toBe('string');
      });
    });
  });

  describe('CSRA_DISCOVERY_CONFIG', () => {
    it('should be an object', () => {
      expect(typeof CSRA_DISCOVERY_CONFIG).toBe('object');
    });

    it('should have maxUrlsPerRun set to 50', () => {
      expect(CSRA_DISCOVERY_CONFIG.maxUrlsPerRun).toBe(50);
    });

    it('should have maxDepthCrawl set to 2', () => {
      expect(CSRA_DISCOVERY_CONFIG.maxDepthCrawl).toBe(2);
    });

    it('should have searchResultsLimit set to 15', () => {
      expect(CSRA_DISCOVERY_CONFIG.searchResultsLimit).toBe(15);
    });

    it('should have batchSize set to 10', () => {
      expect(CSRA_DISCOVERY_CONFIG.batchSize).toBe(10);
    });

    it('should have rateLimitDelayMs set to 1000', () => {
      expect(CSRA_DISCOVERY_CONFIG.rateLimitDelayMs).toBe(1000);
    });

    it('should have all expected properties', () => {
      expect(CSRA_DISCOVERY_CONFIG).toHaveProperty('maxUrlsPerRun');
      expect(CSRA_DISCOVERY_CONFIG).toHaveProperty('maxDepthCrawl');
      expect(CSRA_DISCOVERY_CONFIG).toHaveProperty('searchResultsLimit');
      expect(CSRA_DISCOVERY_CONFIG).toHaveProperty('batchSize');
      expect(CSRA_DISCOVERY_CONFIG).toHaveProperty('rateLimitDelayMs');
    });
  });
});
