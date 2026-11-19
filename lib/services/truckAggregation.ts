import { getCachedPublicTruckCatalog } from '@/lib/services/publicTruckData.server';
import { slugifyCity, slugifyCuisine } from '@/lib/utils/slugify';
import { logError } from '@/lib/logging';

const STATE_AND_COUNT_SUFFIX = /, [^(]+\(\d+\)$/;
const COUNT_SUFFIX = / \(\d+\)$/;

interface SeoLink {
  href: string;
  label: string;
}

interface TruckAggregation {
  topCities: SeoLink[];
  topCuisines: SeoLink[];
  truckCount: number;
}

export async function getTruckAggregation(
  cityLimit: number = 10,
  cuisineMinCount: number = 2,
  cuisineLimit: number = 10,
): Promise<TruckAggregation> {
  let trucks: Awaited<ReturnType<typeof getCachedPublicTruckCatalog>>;
  try {
    trucks = await getCachedPublicTruckCatalog();
  } catch (error) {
    logError('getTruckAggregation: failed to load public truck catalog', error);
    return { topCities: [], topCuisines: [], truckCount: 0 };
  }

  const cityCounts = new Map<string, number>();
  const cuisineCounts = new Map<string, number>();
  for (const truck of trucks) {
    if (truck.city && truck.state) {
      const key = `${truck.city}-${truck.state}`;
      cityCounts.set(key, (cityCounts.get(key) ?? 0) + 1);
    }
    const cuisines = Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [];
    for (const c of cuisines) {
      const normalized = c.trim();
      if (normalized) cuisineCounts.set(normalized, (cuisineCounts.get(normalized) ?? 0) + 1);
    }
  }

  const topCities = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, cityLimit)
    .map(([key, count]) => {
      const lastDash = key.lastIndexOf('-');
      const city = key.slice(0, lastDash);
      const state = key.slice(lastDash + 1);
      return { href: `/city/${slugifyCity(city, state)}`, label: `${city}, ${state} (${count})` };
    });

  const topCuisines = [...cuisineCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, count]) => count >= cuisineMinCount)
    .slice(0, cuisineLimit)
    .map(([cuisine, count]) => ({
      href: `/cuisine/${slugifyCuisine(cuisine)}`,
      label: `${cuisine} (${count})`,
    }))
    .filter((link) => link.href.length > '/cuisine/'.length);

  return { topCities, topCuisines, truckCount: trucks.length };
}

export async function getExploreLinks(): Promise<{
  cities: SeoLink[];
  cuisines: SeoLink[];
}> {
  const { topCities, topCuisines } = await getTruckAggregation(3, 1, 3);
  return {
    cities: topCities.map(({ href, label }) => {
      const labelWithoutCount = label.replace(STATE_AND_COUNT_SUFFIX, ' Food Trucks');
      return { href, label: labelWithoutCount };
    }),
    cuisines: topCuisines.map(({ href, label }) => ({
      href,
      label: label.replace(COUNT_SUFFIX, ' Trucks'),
    })),
  };
}