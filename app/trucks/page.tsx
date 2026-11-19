import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { JSX } from 'react';
import { getCachedPublicTruckCatalog } from '@/lib/services/publicTruckData.server';
import { countTrucksByCity } from '@/lib/services/publicTruckFilters';
import { countCities, groupCitiesByState, pickTopCities } from '@/lib/city/cityDirectory';
import { getCitySlug } from '@/lib/events/eventHero';
import { holoStillPath } from '@/lib/holo/holoCities';
import { pickShowcasePhotos } from '@/lib/city/hubShowcase';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import { BrandHeader } from '@/components/city/CityHero';
import { CityHub } from '@/components/city/CityHub';
import { TopCityCards } from '@/components/city/TopCityCards';
import { TruckMarquee } from '@/components/city/TruckMarquee';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';

export const revalidate = 15_552_000;

const BASE_URL = 'https://www.truckfull.food';
const TITLE = 'Food Trucks by City in NC, SC, GA & More | TruckFull';
const DESCRIPTION =
  'Find food trucks in every city we cover across North Carolina, South Carolina, Georgia, Alabama, Tennessee and Virginia. Browse by state and city for menus, hours, locations and catering.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${BASE_URL}/trucks` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/trucks`,
    siteName: 'TruckFull',
    type: 'website',
    images: [
      { url: `${BASE_URL}/api/og/default`, width: 1200, height: 630, alt: 'Food Trucks by City' },
    ],
  },
};

function buildBreadcrumbJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Food Trucks by City', item: `${BASE_URL}/trucks` },
    ],
  };
}

const TOP_CITY_LIMIT = 8;

function cityStill(city: string, state: string): string {
  return holoStillPath(getCitySlug(city, state));
}

function HubIntro({
  truckCount,
  cityCount,
  stateCount,
}: {
  readonly truckCount: number;
  readonly cityCount: number;
  readonly stateCount: number;
}): JSX.Element {
  return (
    <>
      <h1
        className="font-heading text-4xl font-bold leading-tight tracking-tight sm:text-5xl"
        style={{ textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
      >
        Food Trucks by City
      </h1>
      <p
        className="mx-auto mt-2 max-w-2xl font-heading text-base text-gray-100 sm:text-lg"
        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
      >
        {truckCount.toLocaleString('en-US')} food trucks, caterers and mobile vendors in{' '}
        {cityCount.toLocaleString('en-US')} cities across {stateCount}{' '}
        {stateCount === 1 ? 'state' : 'states'} in the Southeast.
      </p>
    </>
  );
}

export default async function TrucksHubPage(): Promise<JSX.Element> {
  if (process.env.NEXT_OUTPUT_STANDALONE === 'true') await connection();

  const catalog = await getCachedPublicTruckCatalog();
  const groups = groupCitiesByState(countTrucksByCity(catalog));
  const truckCount = groups.reduce((total, group) => total + group.truckCount, 0);
  const topCities = pickTopCities(groups, cityStill, TOP_CITY_LIMIT);

  return (
    <main data-city-hub className="min-h-screen bg-black text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(buildBreadcrumbJsonLd()) }}
      />
      <BrandHeader />
      <CityHub
        groups={groups}
        backdrop={<TruckMarquee photos={pickShowcasePhotos(catalog)} />}
        intro={
          <HubIntro
            truckCount={truckCount}
            cityCount={countCities(groups)}
            stateCount={groups.length}
          />
        }
        topCities={<TopCityCards cities={topCities} />}
      />
      <SocialFooterSpacer />
      <SocialFooter />
    </main>
  );
}
