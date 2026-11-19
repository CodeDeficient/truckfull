/**
 * Pure metadata builder for truck detail pages.
 * Extracted from app/[slug]/page.tsx for testability (Strangler Fig pattern).
 */
import type { Metadata } from 'next';
import { generateTruckKeywords, metaKeywords } from './keywords';

const FOOD_OR_CUISINE_WORD = /(food|cuisine)\b/i;

const CUISINE_ADJECTIVES = new Set([
  'american', 'mexican', 'italian', 'chinese', 'japanese', 'korean',
  'vietnamese', 'thai', 'indian', 'greek', 'mediterranean', 'french',
  'spanish', 'cajun', 'southern', 'caribbean', 'cuban', 'turkish',
  'ethiopian', 'moroccan', 'lebanese', 'taiwanese', 'filipino',
  'indonesian', 'malaysian', 'brazilian', 'peruvian', 'australian',
  'british', 'irish', 'german', 'russian', 'swedish', 'norwegian',
  'danish', 'dutch', 'swiss', 'austrian', 'polish', 'hungarian',
  'israeli', 'egyptian', 'nigerian', 'ghanaian', 'south african',
  'middle eastern', 'latin american',
]);

const DEFAULT_OG_URL = 'https://www.truckfull.food/api/og/default';

/** Minimal row shape needed to build metadata */
export interface TruckMetadataRow {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  cuisine_type: string[] | null;
  city: string | null;
  state: string | null;
  image_url: string | null;
  social_media: Record<string, unknown> | null;
  is_active: boolean;
  has_menu?: boolean;
  has_hours?: boolean;
}

/**
 * Build Next.js Metadata for a food-truck detail page.
 * @param row — truck database row
 * @param slug — resolved slug (fallback if row.slug is null)
 */
export function buildTruckMetadata(row: TruckMetadataRow, slug: string): Metadata {
  const cuisines = row.cuisine_type ?? [];
  const location = row.city && row.state ? `${row.city}, ${row.state}` : (row.city || 'Your Area');

  // Build title — cap at ≤60 chars by trying progressively shorter templates
  const MAX_TITLE_LEN = 60;
  const templates = cuisines.length > 0
    ? [
        `${row.name} | ${cuisines[0]} Mobile Food Truck in ${location} | TruckFull`,
        `${row.name} | ${cuisines[0]} Food Truck in ${location} | TruckFull`,
        `${row.name} | Mobile Food Truck in ${location} | TruckFull`,
        `${row.name} | Food Truck in ${location} | TruckFull`,
        `${row.name} | ${location} | TruckFull`,
        `${row.name} | TruckFull`,
      ]
    : [
        `${row.name} | Mobile Food Truck in ${location} | TruckFull`,
        `${row.name} | Food Truck in ${location} | TruckFull`,
        `${row.name} | ${location} | TruckFull`,
        `${row.name} | TruckFull`,
      ];

  let title = templates[0];
  for (const t of templates) {
    if (t.length <= MAX_TITLE_LEN) {
      title = t;
      break;
    }
  }

  const locationForDescription = row.city && row.state ? `${row.city} ${row.state}` : row.city || 'your area';

  const rawCuisine = cuisines.length > 0 ? cuisines[0] : null;
  const cuisineLabel = rawCuisine && !FOOD_OR_CUISINE_WORD.test(rawCuisine) && CUISINE_ADJECTIVES.has(rawCuisine.toLowerCase())
    ? `${rawCuisine} cuisine`
    : rawCuisine;
  const cuisineSuffix = cuisineLabel ? `Serving ${cuisineLabel}. ` : '';

  const features: string[] = [];
  if (row.has_menu) features.push('menu');
  if (row.has_hours) features.push('hours');
  features.push('contact information');
  const featureStr = features.join(', ');

  const description = row.city || row.state
    ? `Find ${row.name} mobile food truck in ${locationForDescription}. ${cuisineSuffix}Check ${featureStr} and operating hours on TruckFull.`
    : `Check ${row.name} on TruckFull. ${cuisineSuffix}View menu, ${featureStr}, and more.`;

  const keywords = generateTruckKeywords(row.name, row.city, row.state, cuisines);
  const canonicalUrl = `https://www.truckfull.food/${row.slug ?? slug}`;

  // OG / Twitter image resolution
  const imageUrl: string =
    row.image_url ||
    (typeof row.social_media?.photo_url === 'string'
      ? row.social_media.photo_url
      : null) ||
    DEFAULT_OG_URL;

  return {
    title,
    description,
    keywords: metaKeywords(keywords),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: row.name,
      description,
      url: canonicalUrl,
      siteName: 'TruckFull',
      type: 'website',
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: row.name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: row.name,
      description,
      images: [imageUrl],
    },
  };
}
