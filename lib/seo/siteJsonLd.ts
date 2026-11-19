/**
 * Site-level JSON-LD Structured Data generators for SEO
 * Uses Schema.org vocabulary for rich Google snippets
 */

import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';

interface SiteSchema {
  '@type': string;
  name: string;
  url: string;
  [key: string]: unknown;
}

interface WebSiteJsonLd extends SiteSchema {
  '@type': 'WebSite';
  applicationName: string;
  publisher: { '@id': string };
}

interface OrganizationJsonLd extends SiteSchema {
  '@type': 'Organization';
  '@id': string;
  logo: string;
  sameAs: string[];
  speakable: { '@type': 'SpeakableSpecification'; cssSelector: string[] };
}

interface GraphWrapper {
  '@context': 'https://schema.org';
  '@graph': [WebSiteJsonLd, OrganizationJsonLd];
}

/**
 * Generate site-level JSON-LD schemas (WebSite + Organization)
 * wrapped in @graph format with a single @context.
 */
export function generateSiteJsonLd(baseUrl: string): GraphWrapper {
  const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'TruckFull',
        url,
        applicationName: 'TruckFull',
        publisher: { '@id': 'https://www.truckfull.food/#organization' },
      },
      {
        '@type': 'Organization',
        '@id': 'https://www.truckfull.food/#organization',
        name: 'TruckFull',
        url,
        logo: `${url}/pwa-icon-512.png`,
        sameAs: ['https://www.facebook.com/TruckFull.food', 'https://x.com/truckfull_app'],
        speakable: {
          '@type': 'SpeakableSpecification',
          cssSelector: ['h1', '.seo-summary'],
        },
      },
    ],
  };
}

/**
 * Serialize GraphWrapper to JSON string for script tag content
 */
export function jsonLdScriptContent(schema: GraphWrapper): string {
  return safeJsonLdStringify(schema);
}
