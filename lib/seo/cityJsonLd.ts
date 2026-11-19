import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';

export interface CityPageJsonLdInput {
  cityName: string;
  stateName: string;
  stateAbbr: string;
  slug: string;
  truckCount: number;
  cuisines: string[];
  pageUrl: string;
  baseUrl?: string;
}

interface JsonLdObject {
  '@context': string;
  '@type': string;
  [key: string]: unknown;
}

/**
 * Generate City + ItemList + FoodEstablishment JSON-LD for city landing pages.
 * Provides local SEO signals by linking the city to its state,
 * listing the number of food trucks available, and establishing
 * the page as a food establishment with geographic area served.
 */
export function generateCityPageJsonLd(input: CityPageJsonLdInput): JsonLdObject[] {
  const { cityName, stateName, stateAbbr, slug, truckCount, cuisines, pageUrl, baseUrl = 'https://www.truckfull.food' } = input;
  const orgId = `${baseUrl}/#organization`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'City',
      name: cityName,
      containedInPlace: {
        '@type': 'State',
        name: stateName,
      },
      url: pageUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FoodEstablishment',
      '@id': `${baseUrl}/city/${slug}#foodestablishment`,
      name: `Food Trucks in ${cityName}, ${stateAbbr}`,
      description: `Browse ${truckCount} food trucks in ${cityName}, ${stateAbbr} serving ${cuisines.length > 0 ? cuisines.slice(0, 5).join(', ') : 'diverse cuisines'}.`,
      parentOrganization: {
        '@id': orgId,
      },
      areaServed: {
        '@type': 'City',
        name: cityName,
        containedInPlace: {
          '@type': 'State',
          name: stateName,
        },
      },
      url: pageUrl,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Food trucks in ${cityName} ${stateName}`,
      url: pageUrl,
      numberOfItems: truckCount,
    },
  ];
}

/**
 * Serialize schema array to JSON string for script tag content.
 * Wraps in array brackets if multiple schemas.
 */
export function cityJsonLdString(schemas: JsonLdObject[]): string {
  return safeJsonLdStringify(schemas);
}
