import { describe, it, expect } from '@jest/globals';
import { generateSiteJsonLd, jsonLdScriptContent } from '@/lib/seo/siteJsonLd';

describe('siteJsonLd', () => {
  const baseUrl = 'https://www.truckfull.food';

  describe('generateSiteJsonLd', () => {
    it('should return object with @context and @graph array', () => {
      const result = generateSiteJsonLd(baseUrl);
      expect(result).toHaveProperty('@context', 'https://schema.org');
      expect(result).toHaveProperty('@graph');
      expect(Array.isArray(result['@graph'])).toBe(true);
    });

    it('should contain exactly 2 items in @graph (WebSite + Organization)', () => {
      const result = generateSiteJsonLd(baseUrl);
      expect(result['@graph']).toHaveLength(2);
    });

    it('should generate WebSite schema with publisher and no SearchAction', () => {
      const result = generateSiteJsonLd(baseUrl);
      const webSite = result['@graph'].find((s) => s['@type'] === 'WebSite');
      expect(webSite).toBeDefined();
      expect(webSite!.name).toBe('TruckFull');
      expect(webSite!.url).toBe(baseUrl);
      expect(webSite).not.toHaveProperty('potentialAction');
      expect(webSite!.publisher).toEqual({ '@id': 'https://www.truckfull.food/#organization' });
    });

    it('should generate Organization schema with logo, social links, and speakable', () => {
      const result = generateSiteJsonLd(baseUrl);
      const org = result['@graph'].find((s) => s['@type'] === 'Organization');
      expect(org).toBeDefined();
      expect(org!.name).toBe('TruckFull');
      expect(org!.url).toBe(baseUrl);
      expect(org!.logo).toContain('pwa-icon-512.png');
      expect(org!.sameAs).toBeDefined();
      expect(org!.sameAs.length).toBeGreaterThan(0);
      expect(org!.speakable).toBeDefined();
      expect(org!.speakable['@type']).toBe('SpeakableSpecification');
      expect(org!.speakable.cssSelector).toEqual(['h1', '.seo-summary']);
    });

    it('should include applicationName in WebSite schema', () => {
      const result = generateSiteJsonLd(baseUrl);
      const webSite = result['@graph'].find((s) => s['@type'] === 'WebSite') as Record<
        string,
        unknown
      >;
      expect(webSite.applicationName).toBe('TruckFull');
    });

    it('should include sameAs array in Organization schema', () => {
      const result = generateSiteJsonLd(baseUrl);
      const org = result['@graph'].find((s) => s['@type'] === 'Organization');
      expect(org!.sameAs).toEqual([
        'https://www.facebook.com/TruckFull.food',
        'https://x.com/truckfull_app',
      ]);
    });

    it('gives the Organization the @id that WebSite.publisher points to', () => {
      const result = generateSiteJsonLd(baseUrl);
      const webSite = result['@graph'].find((s) => s['@type'] === 'WebSite');
      const org = result['@graph'].find((s) => s['@type'] === 'Organization');
      expect(org!['@id']).toBe(webSite!.publisher['@id']);
    });

    it('should strip trailing slash from URL', () => {
      const withSlash = generateSiteJsonLd('https://www.truckfull.food/');
      const withoutSlash = generateSiteJsonLd('https://www.truckfull.food');
      expect(withSlash['@graph'][0].url).toBe('https://www.truckfull.food');
      expect(withSlash['@graph'][0].url).toBe(withoutSlash['@graph'][0].url);
    });
  });

  describe('jsonLdScriptContent', () => {
    it('should serialize GraphWrapper to JSON string', () => {
      const schemas = generateSiteJsonLd(baseUrl);
      const content = jsonLdScriptContent(schemas);
      expect(typeof content).toBe('string');
      const parsed = JSON.parse(content);
      expect(parsed).toHaveProperty('@context', 'https://schema.org');
      expect(parsed).toHaveProperty('@graph');
      expect(parsed['@graph']).toHaveLength(2);
      expect(parsed['@graph'][0]['@type']).toBe('WebSite');
      expect(parsed['@graph'][1]['@type']).toBe('Organization');
    });
  });
});
