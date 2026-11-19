import { describe, it, expect } from '@jest/globals';
import { getSiteJsonLdMarkup } from '@/lib/seo/layoutJsonLd';

describe('layoutJsonLd', () => {
  describe('getSiteJsonLdMarkup', () => {
    it('should return a raw JSON string (not wrapped in script tag)', () => {
      const markup = getSiteJsonLdMarkup('https://www.truckfull.food');
      expect(markup).not.toContain('<script');
      expect(markup).not.toContain('</script>');
      expect(() => JSON.parse(markup)).not.toThrow();
    });

    it('should wrap schemas in @graph container', () => {
      const markup = getSiteJsonLdMarkup('https://www.truckfull.food');
      const parsed = JSON.parse(markup);
      expect(parsed['@context']).toBe('https://schema.org');
      expect(parsed['@graph']).toBeDefined();
      expect(parsed['@graph']).toHaveLength(2);
    });

    it('should include WebSite schema in @graph without SearchAction', () => {
      const markup = getSiteJsonLdMarkup('https://www.truckfull.food');
      const parsed = JSON.parse(markup);
      const webSite = parsed['@graph'].find((s: Record<string, unknown>) => s['@type'] === 'WebSite');
      expect(webSite).toBeDefined();
      expect(webSite.name).toBe('TruckFull');
      expect(webSite).not.toHaveProperty('potentialAction');
    });

    it('should include Organization schema in @graph with logo', () => {
      const markup = getSiteJsonLdMarkup('https://www.truckfull.food');
      const parsed = JSON.parse(markup);
      const org = parsed['@graph'].find((s: Record<string, unknown>) => s['@type'] === 'Organization');
      expect(org).toBeDefined();
      expect(org.logo).toContain('pwa-icon-512.png');
      expect(org.sameAs.length).toBeGreaterThan(0);
    });

    it('should strip trailing slash from baseUrl', () => {
      const withSlash = getSiteJsonLdMarkup('https://www.truckfull.food/');
      const withoutSlash = getSiteJsonLdMarkup('https://www.truckfull.food');
      expect(withSlash).toBe(withoutSlash);
    });
  });
});
