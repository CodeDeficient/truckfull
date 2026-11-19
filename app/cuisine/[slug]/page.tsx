import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/navigation/IntentLink';
import {
  getCachedPublicTruckCatalog,
  type PublicTruckCatalogRow,
} from '@/lib/services/publicTruckData.server';
import { filterTrucksWithCuisine } from '@/lib/services/publicTruckFilters';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import { slugifyCuisine, slugifyCity } from '@/lib/utils/slugify';
import {
  generateCuisineKeywords,
  metaKeywords,
  generateCuisineFaq,
  faqJsonLd,
} from '@/lib/seo/keywords';

export const revalidate = 15_552_000;

interface CuisinePageProps {
  params: Promise<{ slug: string }>;
}

type CuisineTruck = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  cuisine_type: string[] | null;
  city: string | null;
  state: string | null;
  price_range: string | null;
  view_count: number | null;
};

interface CuisineCount {
  cuisine: string;
  count: number;
  slug: string;
}

function toCuisineTruck(row: PublicTruckCatalogRow): CuisineTruck {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    cuisine_type: row.cuisine_type,
    city: row.city,
    state: row.state,
    price_range: row.price_range,
    view_count: row.view_count,
  };
}

async function getCuisinesWithMinTrucks(): Promise<CuisineCount[]> {
  const catalog = await getCachedPublicTruckCatalog();

  const cuisineMap = new Map<string, number>();
  for (const truck of catalog) {
    const cuisines = Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [];
    for (const c of cuisines) {
      const normalized = c.trim();
      if (!normalized) continue;
      cuisineMap.set(normalized, (cuisineMap.get(normalized) ?? 0) + 1);
    }
  }

  return [...cuisineMap.entries()]
    .filter(([, count]) => count >= 2)
    .map(([cuisine, count]) => ({
      cuisine,
      count,
      slug: slugifyCuisine(cuisine),
    }))
    .filter((entry) => entry.slug.length > 0);
}

async function getTrucksByCuisine(cuisineName: string): Promise<CuisineTruck[]> {
  const catalog = await getCachedPublicTruckCatalog();
  return filterTrucksWithCuisine(catalog, cuisineName).map((row) => toCuisineTruck(row));
}

function getCitiesForTrucks(trucks: CuisineTruck[]): { city: string; state: string | null; slug: string }[] {
  const seen = new Map<string, { city: string; state: string | null; slug: string }>();
  for (const truck of trucks) {
    if (!truck.city || !truck.state) continue;
    const key = truck.city.toLowerCase();
    if (seen.has(key)) continue;
    const state = truck.state;
    seen.set(key, {
      city: truck.city,
      state,
      slug: slugifyCity(truck.city, state),
    });
  }
  return [...seen.values()];
}

function getRelatedCuisines(
  trucks: CuisineTruck[],
  currentCuisine: string,
): CuisineCount[] {
  const relatedCounts = new Map<string, number>();
  for (const truck of trucks) {
    const cuisines = Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [];
    for (const c of cuisines) {
      if (c.toLowerCase() === currentCuisine.toLowerCase()) continue;
      relatedCounts.set(c, (relatedCounts.get(c) ?? 0) + 1);
    }
  }

  return [...relatedCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({
      cuisine: name,
      count,
      slug: slugifyCuisine(name),
    }))
    .filter((c) => c.slug !== slugifyCuisine(currentCuisine) && c.slug.length > 0);
}

export function generateStaticParams(): { slug: string }[] {
  return [];
}

export async function generateMetadata({ params }: CuisinePageProps): Promise<Metadata> {
  const { slug } = await params;
  const allCuisines = await getCuisinesWithMinTrucks();
  const match = allCuisines.find((c) => c.slug === slug);

  if (!match) {
    return {
      title: 'Cuisine Not Found | TruckFull',
      description: 'The requested cuisine page could not be found.',
    };
  }

  const trucks = await getTrucksByCuisine(match.cuisine);
  const cities = getCitiesForTrucks(trucks);
  const cityNames = cities.slice(0, 5).map((c) => c.city);
  const cityListStr =
    cityNames.length > 1
      ? cityNames.slice(0, -1).join(', ') + ', and ' + cityNames.at(-1)
      : cityNames[0] ?? 'Georgia and South Carolina';

  const title = `${match.cuisine} Food Trucks in GA & SC | TruckFull`;
  const description = `Find ${trucks.length} ${match.cuisine} mobile food trucks across ${cityListStr}. View profiles, menus, hours, locations, and catering info on TruckFull.`;
  const keywords = generateCuisineKeywords(
    match.cuisine,
    cities.filter((c): c is { city: string; state: string; slug: string } => c.state !== null),
    trucks.length,
  );

  const canonicalUrl = `https://www.truckfull.food/cuisine/${slug}`;
  const ogImageUrl = 'https://www.truckfull.food/api/og/default';

  return {
    title,
    description,
    keywords: metaKeywords(keywords),
    alternates: {
      canonical: canonicalUrl,
    },
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
          alt: `${match.cuisine} food trucks in Georgia and South Carolina`,
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

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trimEnd() + '...';
}

export default async function CuisinePage({ params }: CuisinePageProps) {
  const { slug } = await params;
  const allCuisines = await getCuisinesWithMinTrucks();
  const match = allCuisines.find((c) => c.slug === slug);

  if (!match) {
    notFound();
  }

  const trucks = await getTrucksByCuisine(match.cuisine);
  const cities = getCitiesForTrucks(trucks);
  const relatedCuisines = getRelatedCuisines(trucks, match.cuisine);

  const topTrucks = [...trucks]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 3);

  const citiesWithState = cities.filter(
    (c): c is { city: string; state: string; slug: string } => c.state !== null,
  );
  const faqItems = generateCuisineFaq(match.cuisine, citiesWithState.slice(0, 5), trucks.length);
  const faqLd = faqJsonLd(faqItems);

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://www.truckfull.food',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: match.cuisine,
        item: `https://www.truckfull.food/cuisine/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqLd) }}
      />
      <main className="min-h-screen bg-gray-50 dark:bg-black">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <nav className="mb-6 text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1">
              <li>
                <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-gray-900 dark:text-white">{match.cuisine}</li>
            </ol>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white sm:text-4xl">
            {match.cuisine}{' '}Food Trucks in Georgia &amp; South Carolina
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Find {trucks.length}{' '}{match.cuisine.toLowerCase()} food trucks serving
            {cities.length > 0
              ? ` ${cities.map((c) => c.city).join(', ')}`
              : ' Georgia and South Carolina'}
            .
          </p>

          {topTrucks.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Top {match.cuisine} Food Trucks
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {topTrucks.map((truck) => (
                  <Link
                    key={truck.id}
                    href={`/${truck.slug ?? truck.id}`}
                    className="rounded-lg bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:bg-gray-900"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {truck.name}
                    </h3>
                    {truck.city && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {truck.city}{truck.state ? `, ${truck.state}` : ''}
                      </p>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {match.cuisine}{' '}Food Trucks
            </h2>
            <ul className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
              {trucks.map((truck) => (
                <li key={truck.id} className="py-4">
                  <Link
                    href={`/${truck.slug ?? truck.id}`}
                    className="text-lg font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                  >
                    {truck.name}
                  </Link>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {[truck.city, truck.state].filter(Boolean).join(', ')}
                    {truck.price_range ? ` · ${truck.price_range}` : ''}
                  </p>
                  {truck.description && (
                    <p className="mt-2 text-gray-700 dark:text-gray-300">
                      {truncate(truck.description, 150)}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {cities.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Cities with {match.cuisine}{' '}Food Trucks
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {cities.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/city/${c.slug}`}
                      className="rounded-full bg-orange-100 px-4 py-1.5 text-sm font-medium text-orange-800 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
                    >
                      {c.city}{c.state ? `, ${c.state}` : ''}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {relatedCuisines.length > 0 && (
            <section className="mt-10">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Explore More Food Truck Cuisines
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {relatedCuisines.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/cuisine/${c.slug}`}
                      className="rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      {c.cuisine}{' '}Food Trucks
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Frequently Asked Questions About {match.cuisine}{' '}Food Trucks
            </h2>
            <dl className="mt-4 space-y-4">
              {faqItems.map((item) => (
                <div key={item.question} className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-900">
                  <dt className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.question}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {item.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <footer className="mt-16 border-t border-gray-200 pt-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} TruckFull. All rights reserved.</p>
          </footer>
        </div>
      </main>
    </>
  );
}
