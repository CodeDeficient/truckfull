import { slugifyCity, slugifyCuisine } from '@/lib/utils/slugify';

const SCRIPT_CLOSE = /<\/script/gi;

interface KeywordLink {
  href: string;
  label: string;
}

/**
 * Programmatic keyword generation from truck data.
 * Combines cities, cuisines, and qualifiers to produce
 * keyword-rich internal link hubs and meta keywords.
 */

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.filter(Boolean))];
}

/** City-level keyword variants */
export function generateCityKeywords(
  cityName: string,
  stateName: string,
  cuisines: string[],
  truckCount: number,
): string[] {
  const city = cityName;
  const state = stateName;

  const base = [
    `food trucks in ${city} ${state}`,
    `${city} food truck finder`,
    `${city} ${state} food trucks`,
    `food trucks near ${city}`,
    `${city} lunch trucks`,
    `${city} street food`,
    `${city} mobile food vendors`,
    `${truckCount} food trucks in ${city}`,
  ];

  const cuisineKeywords = cuisines.slice(0, 5).flatMap((c) => [
    `${c} food trucks ${city}`,
    `${c} food trucks in ${city} ${state}`,
    `${c} near ${city} ${state}`,
    `${city} ${c} trucks`,
  ]);

  return dedupe([...base, ...cuisineKeywords]);
}

/** Cuisine-level keyword variants */
export function generateCuisineKeywords(
  cuisine: string,
  cities: { city: string; state: string }[],
  truckCount: number,
): string[] {
  const base = [
    `${cuisine} food trucks`,
    `find ${cuisine} food trucks`,
    `${cuisine} food truck catering`,
    `${cuisine} trucks in Georgia and South Carolina`,
    `${truckCount} ${cuisine} food trucks`,
  ];

  const cityKeywords = cities.slice(0, 5).flatMap((c) => [
    `${cuisine} food trucks ${c.city}`,
    `${cuisine} trucks in ${c.city} ${c.state}`,
    `${cuisine} near ${c.city}`,
  ]);

  return dedupe([...base, ...cityKeywords]);
}

/** Truck-level keyword variants */
export function generateTruckKeywords(
  truckName: string,
  city: string | null,
  state: string | null,
  cuisines: string[],
): string[] {
  const base = [
    `${truckName} food truck`,
    `${truckName} menu`,
    `${truckName} location`,
    ...cuisines.map((c) => `${truckName} ${c}`),
  ];

  if (city && state) {
    base.push(
      `${truckName} ${city} ${state}`,
      `${truckName} food truck ${city}`,
      ...cuisines.map((c) => `${c} food truck ${city} ${state}`),
    );
  }

  return dedupe(base);
}

/** Build keyword-rich "Discover more" internal links for city pages */
export function getCityExploreLinks(
  cityName: string,
  stateName: string,
  cuisines: string[],
  relatedCities: { city: string; state: string }[],
): { cityLinks: KeywordLink[]; cuisineLinks: KeywordLink[] } {
  const cityLinks = relatedCities.slice(0, 6).map((c) => ({
    href: `/city/${slugifyCity(c.city, c.state)}`,
    label: `Food Trucks in ${c.city}, ${c.state}`,
  }));

  const cuisineLinks = cuisines.slice(0, 5).map((c) => ({
    href: `/cuisine/${slugifyCuisine(c)}`,
    label: `${c} Food Trucks in ${cityName}`,
  })).filter((link) => !link.href.endsWith('/cuisine/'));

  return { cityLinks, cuisineLinks };
}

/** Build keyword-rich "Discover more" internal links for cuisine pages */
export function getCuisineExploreLinks(
  cuisine: string,
  cities: { city: string; state: string }[],
  relatedCuisines: string[] = [],
): { cityLinks: KeywordLink[]; relatedCuisineLinks: KeywordLink[] } {
  const cityLinks = cities.slice(0, 6).map((c) => ({
    href: `/city/${slugifyCity(c.city, c.state)}`,
    label: `${cuisine} Food Trucks in ${c.city}`,
  }));

  const filtered = relatedCuisines
    .filter((c) => c.toLowerCase() !== cuisine.toLowerCase())
    .slice(0, 5);

  const relatedCuisineLinks = filtered.map((c) => ({
    href: `/cuisine/${slugifyCuisine(c)}`,
    label: `${c} Food Trucks`,
  })).filter((link) => !link.href.endsWith('/cuisine/'));

  return { cityLinks, relatedCuisineLinks };
}

/** Build keyword-rich "Discover more" internal links for truck pages */
export function getTruckExploreLinks(
  truckName: string,
  city: string | null,
  state: string | null,
  cuisines: string[],
): KeywordLink[] {
  const links: KeywordLink[] = [];

  if (city && state) {
    links.push({
      href: `/city/${slugifyCity(city, state)}`,
      label: `Food Trucks in ${city} ${state}`,
    });
  }

  for (const c of cuisines.slice(0, 3)) {
    const slug = slugifyCuisine(c);
    if (slug) {
      links.push({
        href: `/cuisine/${slug}`,
        label: `${c} Food Trucks`,
      });
    }
  }

  links.push({ href: '/', label: 'Find Food Trucks Near Me' });

  return links;
}

/** Generate meta keywords string (comma-separated) from keyword array */
export function metaKeywords(keywords: string[]): string {
  return keywords.slice(0, 20).join(', ');
}

/** Current month and year for freshness signals (e.g. "May 2026") */
export function getCurrentMonthYear(): string {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CityFaqSignals {
  readonly withPhone: number;
  readonly eventCount: number;
}

function cityBookingFaq(cityName: string, truckCount: number, withPhone: number): FaqItem {
  const phones =
    withPhone > 0
      ? ` ${withPhone} of the ${truckCount} ${cityName} listings on TruckFull include a phone number.`
      : '';
  return {
    question: `How do I book a food truck for an event in ${cityName}?`,
    answer: `Contact the truck directly to agree on the menu, date and price.${phones} TruckFull is not a booking agency and adds no fees.`,
  };
}

function cityEventsFaq(cityName: string, eventCount: number): FaqItem[] {
  if (eventCount === 0) return [];
  const events = `${eventCount} upcoming food truck ${eventCount === 1 ? 'event' : 'events'}`;
  return [
    {
      question: `Are there food truck events in ${cityName}?`,
      answer: `Yes. TruckFull lists ${events} in ${cityName}, with the date and location for each.`,
    },
  ];
}

/** FAQ items for city landing pages */
export function generateCityFaq(
  cityName: string,
  stateName: string,
  truckCount: number,
  topCuisines: string[],
  signals?: CityFaqSignals,
): FaqItem[] {
  const withPhone = signals?.withPhone ?? 0;
  const eventCount = signals?.eventCount ?? 0;
  const cuisineNames = topCuisines.slice(0, 3);
  const cuisineList = cuisineNames.length > 0 ? cuisineNames.join(', ') : 'various cuisines';
  const trucks = `${truckCount} ${truckCount === 1 ? 'food truck' : 'food trucks'}`;

  return [
    {
      question: `What food trucks are listed in ${cityName}?`,
      answer: `TruckFull lists ${trucks} in ${cityName} serving ${cuisineList}. Each listing shows the menu, hours, and contact details we have on file.`,
    },
    {
      question: `How many food trucks are in ${cityName}, ${stateName}?`,
      answer: `TruckFull currently lists ${trucks} in ${cityName}, ${stateName}. New trucks are added regularly.`,
    },
    {
      question: `Where can I find food trucks in ${cityName}?`,
      answer: `You can find food trucks throughout ${cityName} on the TruckFull interactive map. Browse by cuisine, check real-time locations, and view menus and operating hours all in one place.`,
    },
    {
      question: `What types of cuisine do ${cityName} food trucks serve?`,
      answer: `${cityName} food trucks serve a wide variety including ${cuisineList}. Use TruckFull to filter by cuisine type and find exactly what you're craving.`,
    },
    cityBookingFaq(cityName, truckCount, withPhone),
    ...cityEventsFaq(cityName, eventCount),
  ];
}

/** FAQ items for cuisine landing pages */
export function generateCuisineFaq(
  cuisine: string,
  cities: { city: string; state: string }[],
  truckCount: number,
): FaqItem[] {
  const cityList = cities.slice(0, 3).map((c) => c.city).join(', ');

  return [
    {
      question: `Where can I find ${cuisine} food trucks near me?`,
      answer: `TruckFull lists over ${truckCount} ${cuisine} food trucks across ${cityList} and other cities in Georgia and South Carolina. Browse the map to find ${cuisine} trucks in your area.`,
    },
    {
      question: `Where can I find ${cuisine} food trucks in Georgia and South Carolina?`,
      answer: `${cuisine} food trucks are available in ${cityList} and other cities. Use the TruckFull interactive map to find ${cuisine} trucks near you with real-time locations, menus, and hours.`,
    },
    {
      question: `How many ${cuisine} food trucks are on TruckFull?`,
      answer: `There are currently ${truckCount} ${cuisine} food trucks listed on TruckFull across Georgia and South Carolina. The list is updated regularly as new trucks join the platform.`,
    },
    {
      question: `Do ${cuisine} food trucks offer catering?`,
      answer: `Many ${cuisine} food trucks offer catering services for events like corporate lunches, weddings, private parties, and community gatherings. Contact individual trucks through TruckFull for booking details.`,
    },
  ];
}

function sanitizeJsonLdString(str: string): string {
  return str.replaceAll(SCRIPT_CLOSE, String.raw`<\/script`);
}

/** Build FAQPage JSON-LD from FAQ items */
export function faqJsonLd(items: FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: sanitizeJsonLdString(item.question),
      acceptedAnswer: {
        '@type': 'Answer',
        text: sanitizeJsonLdString(item.answer),
      },
    })),
  };
}

/** Generate a keyword-rich description for a cuisine within a specific city */
export function cuisineCityDescription(cuisine: string, cityName: string, count: number): string {
  return `Find ${count} ${cuisine} food trucks in ${cityName}. View ${cuisine.toLowerCase()} truck profiles with menus, hours, and location details on TruckFull.`;
}
