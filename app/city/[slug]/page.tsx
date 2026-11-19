import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/navigation/IntentLink';
import {
  getCachedPublicTruckCatalog,
  type PublicTruckCatalogRow,
} from '@/lib/services/publicTruckData.server';
import { countTrucksByCity, filterTrucksInCity } from '@/lib/services/publicTruckFilters';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import { slugifyCity, parseCitySlug } from '@/lib/utils/slugify';
import { generateCityFaq, faqJsonLd, type FaqItem } from '@/lib/seo/keywords';
import { buildCityMetadata } from '@/lib/seo/cityMetadata';
import { generateCityPageJsonLd, cityJsonLdString } from '@/lib/seo/cityJsonLd';
import type { JSX } from 'react';
import { EventFaq } from '@/components/events/EventFaq';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';
import { BrandHeader, CityBreadcrumb, CityHero } from '@/components/city/CityHero';
import { CityTruckDirectory, type DirectoryTruck } from '@/components/city/CityTruckDirectory';
import { getCityTruckCompleteness } from '@/lib/city/truckCompleteness.server';
import { getCompletenessFlags, type CompletenessFlags } from '@/lib/city/truckCompleteness';
import {
  buildCityGuideStats,
  buildCityIntro,
  countCuisines,
  type CityGuideStats,
  type CuisineCount,
} from '@/lib/city/cityGuide';
import { getCityPageEvents, type CityPageEvents } from '@/lib/city/cityEvents.server';
import { BookDirectSection, CityEventsSection } from '@/components/city/CityActionSections';
import {
  CityIntroSection,
  CuisineBreakdownSection,
  HowCompiledSection,
} from '@/components/city/CityGuideSections';

export const revalidate = 15_552_000;

interface CityPageProps {
  params: Promise<{ slug: string }>;
}

type CityTruckRow = {
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
};

function toCityTruck(row: PublicTruckCatalogRow): CityTruckRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    cuisine_type: row.cuisine_type,
    city: row.city,
    state: row.state,
    photo_url: row.photo_url,
    operating_hours: row.operating_hours,
    is_claimed: row.is_claimed,
    view_count: row.view_count,
  };
}

type CityTrucks = { trucks: CityTruckRow[]; cityName: string; stateName: string };

async function getCityTrucks(cityName: string, stateName: string): Promise<CityTrucks | null> {
  const catalog = await getCachedPublicTruckCatalog();
  const rows = filterTrucksInCity(catalog, cityName, stateName);

  if (rows.length === 0) return null;
  return {
    trucks: rows.map((row) => toCityTruck(row)),
    cityName: rows[0].city ?? cityName,
    stateName,
  };
}

async function getRelatedCities(
  stateName: string,
  excludeCity: string,
): Promise<{ city: string; state: string; count: number }[]> {
  const catalog = await getCachedPublicTruckCatalog();
  return countTrucksByCity(catalog, { state: stateName, excludeCity })
    .filter((c) => c.count >= 3)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function generateStaticParams(): { slug: string }[] {
  return [];
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseCitySlug(slug);
  if (!parsed) {
    return { title: 'City Not Found | TruckFull' };
  }

  const result = await getCityTrucks(parsed.cityName, parsed.stateName);
  if (!result) {
    return { title: 'City Not Found | TruckFull' };
  }

  const { trucks, cityName, stateName } = result;
  const events = await getCityPageEvents(slug, cityName, stateName);
  return buildCityMetadata({ slug, cityName, stateName, trucks, eventCount: events.total });
}

type RelatedCity = { city: string; state: string; count: number };

interface CityGuideData {
  readonly cuisines: CuisineCount[];
  readonly cuisineNames: string[];
  readonly stats: CityGuideStats;
  readonly relatedCities: RelatedCity[];
  readonly directory: DirectoryTruck[];
  readonly events: CityPageEvents;
  readonly withPhone: number;
  readonly faqItems: FaqItem[];
}

function buildBreadcrumbJsonLd(slug: string, cityName: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.truckfull.food' },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Food Trucks by City',
        item: 'https://www.truckfull.food/trucks',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: `${cityName} Food Trucks`,
        item: `https://www.truckfull.food/city/${slug}`,
      },
    ],
  };
}

const SECTION_HEADING = 'font-heading text-3xl font-bold text-white sm:text-4xl';
const PILL =
  'rainbow-hover inline-block rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-white/15 focus:outline-none';

function NearbyCitiesSection({
  cityName,
  cities,
}: {
  readonly cityName: string;
  readonly cities: readonly RelatedCity[];
}): JSX.Element | null {
  if (cities.length === 0) return null;
  return (
    <section className="py-10">
      <div className="mx-auto max-w-5xl px-6 sm:px-10">
        <h2 className={SECTION_HEADING}>Food trucks near {cityName}</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {cities.map(({ city, state, count }) => (
            <li key={slugifyCity(city, state)}>
              <Link href={`/city/${slugifyCity(city, state)}`} className={PILL}>
                {city}, {state} ({count})
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function JsonLdScripts({
  slug,
  cityName,
  stateName,
  truckCount,
  cuisines,
  faqLd,
}: {
  readonly slug: string;
  readonly cityName: string;
  readonly stateName: string;
  readonly truckCount: number;
  readonly cuisines: readonly string[];
  readonly faqLd: unknown;
}): JSX.Element {
  const cityLd = generateCityPageJsonLd({
    cityName,
    stateName,
    stateAbbr: stateName,
    slug,
    truckCount,
    cuisines: [...cuisines],
    pageUrl: `https://www.truckfull.food/city/${slug}`,
  });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: safeJsonLdStringify(buildBreadcrumbJsonLd(slug, cityName)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: cityJsonLdString(cityLd) }}
      />
    </>
  );
}

function toDirectory(
  trucks: readonly CityTruckRow[],
  completeness: Readonly<Record<string, CompletenessFlags>>,
): DirectoryTruck[] {
  return trucks.map((truck) => ({
    truck: {
      id: truck.id,
      name: truck.name,
      slug: truck.slug,
      description: truck.description,
      cuisine_type: truck.cuisine_type,
      photo_url: truck.photo_url,
      operating_hours: truck.operating_hours,
      is_claimed: truck.is_claimed,
    },
    flags:
      completeness[truck.id] ??
      getCompletenessFlags({
        street_address: null,
        contact_info: null,
        social_media: null,
        menu: null,
        is_claimed: truck.is_claimed,
      }),
  }));
}

async function loadCityGuide(slug: string, result: CityTrucks): Promise<CityGuideData> {
  const { trucks, cityName, stateName } = result;
  const cuisines = countCuisines(trucks);
  const cuisineNames = cuisines.slice(0, 5).map(([c]) => c);
  const [relatedCities, completeness, events] = await Promise.all([
    getRelatedCities(stateName, cityName),
    getCityTruckCompleteness(
      slug,
      trucks.map((t) => t.id),
    ),
    getCityPageEvents(slug, cityName, stateName),
  ]);
  const directory = toDirectory(trucks, completeness);
  const withPhone = directory.filter((entry) => entry.flags.phone).length;
  return {
    cuisines,
    cuisineNames,
    stats: buildCityGuideStats(trucks.length, cuisines),
    relatedCities,
    directory,
    events,
    withPhone,
    faqItems: generateCityFaq(cityName, stateName, trucks.length, cuisineNames, {
      withPhone,
      eventCount: events.total,
    }),
  };
}

export default async function CityPage({ params }: CityPageProps): Promise<JSX.Element> {
  const { slug } = await params;
  const parsed = parseCitySlug(slug);
  if (!parsed) notFound();
  const result = await getCityTrucks(parsed.cityName, parsed.stateName);
  if (!result) notFound();

  const { trucks, cityName, stateName } = result;
  const guide = await loadCityGuide(slug, result);

  return (
    <>
      <JsonLdScripts
        slug={slug}
        cityName={cityName}
        stateName={stateName}
        truckCount={trucks.length}
        cuisines={guide.cuisineNames}
        faqLd={faqJsonLd(guide.faqItems)}
      />
      <main className="min-h-screen bg-black text-white">
        <BrandHeader eventsHref={guide.events.total > 0 ? `/events/${slug}` : '/events'} />
        <CityHero
          cityName={cityName}
          stateName={stateName}
          truckCount={trucks.length}
          topCuisines={guide.cuisineNames}
          citySlug={slug}
        />
        <CityBreadcrumb cityName={cityName} />
        <CityIntroSection
          intro={buildCityIntro(cityName, stateName, guide.stats, guide.cuisines)}
          stats={guide.stats}
        />
        <CityEventsSection cityName={cityName} citySlug={slug} events={guide.events} />
        <CityTruckDirectory title={`${cityName} food truck listings`} trucks={guide.directory} />
        <BookDirectSection cityName={cityName} withPhone={guide.withPhone} total={trucks.length} />
        <CuisineBreakdownSection cityName={cityName} cuisines={guide.cuisines} />
        <HowCompiledSection cityName={cityName} />
        <NearbyCitiesSection cityName={cityName} cities={guide.relatedCities} />
        <EventFaq title={`${cityName} food truck questions`} items={guide.faqItems} />
        <SocialFooterSpacer />
        <SocialFooter />
      </main>
    </>
  );
}
