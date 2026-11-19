import { generateSiteJsonLd, jsonLdScriptContent } from './siteJsonLd';

/**
 * Returns the raw JSON-LD string for site-level schema.
 * Inject into a <script type="application/ld+json"> tag in your layout.
 */
export function getSiteJsonLdMarkup(baseUrl: string): string {
  const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const schemas = generateSiteJsonLd(url);
  return jsonLdScriptContent(schemas);
}
