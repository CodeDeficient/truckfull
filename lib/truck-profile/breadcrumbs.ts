import { parseCitySlug, slugifyCity } from '@/lib/utils/slugify';

const BASE_URL = 'https://www.truckfull.food';

export interface TruckBreadcrumb {
  readonly name: string;
  readonly path: string;
}

interface TruckBreadcrumbInput {
  readonly name: string;
  readonly slug: string;
  readonly city: string | null;
  readonly state: string | null;
}

function resolveCityPath(city: string | null, state: string | null): string | null {
  if (!city || !state) return null;
  const citySlug = slugifyCity(city, state);
  const parsed = parseCitySlug(citySlug);
  if (!parsed) return null;
  const roundTrips =
    parsed.stateName === state && parsed.cityName.toLowerCase() === city.toLowerCase();
  return roundTrips ? `/city/${citySlug}` : null;
}

export function buildTruckBreadcrumbs(truck: TruckBreadcrumbInput): TruckBreadcrumb[] {
  const crumbs: TruckBreadcrumb[] = [{ name: 'Home', path: '/' }];
  const cityPath = resolveCityPath(truck.city, truck.state);
  if (cityPath && truck.city) {
    crumbs.push(
      { name: 'Food Trucks by City', path: '/trucks' },
      { name: `${truck.city} Food Trucks`, path: cityPath },
    );
  }
  crumbs.push({ name: truck.name, path: `/${truck.slug}` });
  return crumbs;
}

export function truckBreadcrumbJsonLd(crumbs: readonly TruckBreadcrumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.path === '/' ? BASE_URL : `${BASE_URL}${crumb.path}`,
    })),
  };
}
