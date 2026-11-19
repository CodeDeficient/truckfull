/**
 * Pure metadata builder for city landing pages.
 * Extracted from app/city/[slug]/page.tsx for testability.
 */
import type { Metadata } from 'next';
import { generateCityKeywords, metaKeywords } from './keywords';
import { countCuisines } from '@/lib/city/cityGuide';

export interface CityTruckRow {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  cuisine_type: string[] | null;
  city: string | null;
  state: string | null;
  photo_url: string | null;
  operating_hours: unknown;
  is_claimed: boolean | null;
  view_count: number | null;
}

export interface CityMetadataInput {
  slug: string;
  cityName: string;
  stateName: string;
  trucks: CityTruckRow[];
  eventCount?: number;
}

function joinNames(names: readonly string[]): string {
  if (names.length < 3) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}

export function buildCityTitle(cityName: string, stateName: string, eventCount: number): string {
  const topics = eventCount > 0 ? 'Menus, Catering & Events' : 'Menus, Hours & Catering';
  return `Food Trucks in ${cityName} ${stateName}: ${topics} | TruckFull`;
}

export function buildCityDescription(
  cityName: string,
  stateName: string,
  trucks: readonly CityTruckRow[],
  eventCount: number,
): string {
  const top = countCuisines(trucks)
    .slice(0, 3)
    .map(([cuisine]) => cuisine);
  const noun = trucks.length === 1 ? 'food truck' : 'food trucks';
  const serving = top.length > 0 ? ` serving ${joinNames(top)}` : '';
  const eventNoun = eventCount === 1 ? 'event' : 'events';
  const events = eventCount > 0 ? `, and find ${eventCount} upcoming food truck ${eventNoun}` : '';
  return `Find ${trucks.length} ${noun} in ${cityName} ${stateName}${serving}. See menus, hours and contact details, book a truck directly with no middleman fees${events}.`;
}

export function buildCityMetadata(input: CityMetadataInput): Metadata {
  const { slug, cityName, stateName, trucks, eventCount = 0 } = input;

  const cuisineSet = new Set<string>();
  for (const truck of trucks) {
    if (Array.isArray(truck.cuisine_type)) {
      for (const c of truck.cuisine_type) cuisineSet.add(c);
    }
  }
  const cuisineList = [...cuisineSet];

  const location = `${cityName} ${stateName}`;
  const title = buildCityTitle(cityName, stateName, eventCount);
  const description = buildCityDescription(cityName, stateName, trucks, eventCount);
  const keywords = generateCityKeywords(cityName, stateName, cuisineList, trucks.length);
  const canonicalUrl = `https://www.truckfull.food/city/${slug}`;
  const ogImageUrl = 'https://www.truckfull.food/api/og/default';

  return {
    title,
    description,
    keywords: metaKeywords(keywords),
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'TruckFull',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Food trucks in ${location}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}
