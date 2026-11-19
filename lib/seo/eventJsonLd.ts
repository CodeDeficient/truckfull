/**
 * Schema.org JSON-LD generators for event landing pages.
 *
 * - generateEventJsonLd: Event/FoodEvent/Festival schema for detail pages
 * - generateCityHubJsonLd: ItemList + BreadcrumbList schemas for city hubs
 *
 * GA and SC are in US Eastern time. EDT is -04:00 (March-November),
 * EST is -05:00 (November-March). For dates without a known time we
 * emit date-only values (e.g. "2026-07-04") — Google explicitly warns
 * against using T00:00:00 for unknown times.
 */

import type { EventPageData } from '@/lib/events/eventPageData';
import { safeBuildEventSlug } from '@/lib/events/eventSlug';
import { isPastEvent } from '@/lib/events/eventHorizon';

const SCRIPT_CLOSE = /<\/script/gi;
const FOOD_EVENT_TERMS = /food|truck|bbq|barbecue|cookout|taco|burger|culinary/;

const SCHEMA_CONTEXT = 'https://schema.org';
const BASE_URL = 'https://www.truckfull.food';

function sanitize(str: string): string {
  return str.replaceAll(SCRIPT_CLOSE, String.raw`<\/script`);
}

/** Determine the US Eastern timezone offset for a given ISO date (YYYY-MM-DD). */
export function easternOffset(dateStr: string): '-04:00' | '-05:00' {
  const date = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return '-05:00';
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  // DST: second Sunday of March -> first Sunday of November
  if (month < 3 || month > 11) return '-05:00';
  if (month > 3 && month < 11) return '-04:00';
  if (month === 3) {
    const secondSunday = 8 + ((14 - new Date(Date.UTC(date.getUTCFullYear(), 2, 1)).getUTCDay()) % 7);
    return day >= secondSunday ? '-04:00' : '-05:00';
  }
  // month === 11
  const firstSunday = 1 + ((7 - new Date(Date.UTC(date.getUTCFullYear(), 10, 1)).getUTCDay()) % 7);
  return day < firstSunday ? '-04:00' : '-05:00';
}

/** Truncate at the last sentence boundary (`.` `!` `?`) within maxChars, else hard-trim. */
export function truncateAtSentence(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastSentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
  );
  if (lastSentenceEnd > maxChars / 2) {
    return slice.slice(0, lastSentenceEnd + 1);
  }
  return slice;
}

/** Build an ISO 8601 start/end datetime with Eastern offset, or date-only when no time. */
function buildIsoDateTime(dateStr: string, timeStr: string | null): string {
  if (!dateStr) return '';
  if (!timeStr) return dateStr;
  return `${dateStr}T${timeStr}${easternOffset(dateStr)}`;
}

/** Detect the most specific Schema.org @type from the event title. */
export function detectEventType(title: string): string {
  const t = title.toLowerCase();
  const hasFoodTruck = t.includes('food truck');
  const hasFest = t.includes('festival') || t.includes('fest');
  const hasFoodWord = FOOD_EVENT_TERMS.test(t);
  if (hasFoodTruck && hasFest) return 'FoodEvent';
  if (hasFest && hasFoodWord) return 'Festival';
  return 'Event';
}

/**
 * Generate the Schema.org Event (or subtype) JSON-LD for an event detail page.
 * Includes required + recommended properties for Google Event rich results.
 *
 * Throws if the event has no startDate — Schema.org requires a non-empty
 * startDate on Event, and emitting an empty string would disqualify the page
 * from Google Event rich results. Callers should ensure events with no
 * startDate never reach this function (the detail page calls notFound()
 * when startDate is null).
 */
export function generateEventJsonLd(
  event: EventPageData,
  canonicalUrl: string,
): Record<string, unknown> {
  if (!event.eventStartDate) {
    throw new Error(`generateEventJsonLd: event "${event.title}" has no startDate`);
  }
  const past = isPastEvent(event.eventStartDate, event.eventEndDate);
  const type = detectEventType(event.title);
  const start = buildIsoDateTime(event.eventStartDate, event.eventStartTime);
  const end = event.eventEndDate
    ? buildIsoDateTime(event.eventEndDate, event.eventEndTime ?? event.eventStartTime)
    : '';

  const schema: Record<string, unknown> = {
    '@context': SCHEMA_CONTEXT,
    '@type': type,
    name: sanitize(event.title),
    startDate: start,
    eventStatus: past
      ? 'https://schema.org/EventCompleted'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: canonicalUrl,
  };

  if (end) schema['endDate'] = end;

  if (event.description) {
    schema['description'] = sanitize(truncateAtSentence(event.description, 500));
  }

  if (event.locationLat !== null && event.locationLng !== null && event.locationAddress) {
    schema['location'] = {
      '@type': 'Place',
      name: event.organization ?? event.locationAddress,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.locationAddress,
        addressLocality: event.city,
        addressRegion: event.state,
        addressCountry: 'US',
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: event.locationLat,
        longitude: event.locationLng,
      },
    };
  } else if (event.locationAddress) {
    schema['location'] = {
      '@type': 'Place',
      name: event.organization ?? event.locationAddress,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.locationAddress,
        addressLocality: event.city,
        addressRegion: event.state,
        addressCountry: 'US',
      },
    };
  }

  if (event.organization) {
    schema['organizer'] = {
      '@type': 'Organization',
      name: sanitize(event.organization),
      ...(event.website ? { url: event.website } : {}),
    };
  }

  // Free by default — we don't have price data; Google requires an Offers block.
  const validFromIso = event.vettedAt ?? `${event.eventStartDate}T00:00:00${easternOffset(event.eventStartDate)}`;
  schema['offers'] = {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: past
      ? 'https://schema.org/SoldOut'
      : 'https://schema.org/InStock',
    url: canonicalUrl,
    validFrom: validFromIso,
  };

  schema['image'] = `${BASE_URL}/api/og/default`;

  return schema;
}

/** Generate ItemList + BreadcrumbList JSON-LD schemas for a city hub page. */
export function generateCityHubJsonLd(
  city: string,
  state: string,
  events: EventPageData[],
  canonicalUrl: string,
): Record<string, unknown>[] {
  const itemList = {
    '@context': SCHEMA_CONTEXT,
    '@type': 'ItemList',
    name: `Food Truck Events in ${city}, ${state}`,
    numberOfItems: events.length,
    url: canonicalUrl,
    itemListElement: events.slice(0, 20).map((event, index) => {
      const slug = event.eventStartDate ? safeBuildEventSlug(event.title, event.eventStartDate) : null;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: sanitize(event.title),
        url: slug ? `${canonicalUrl}/${slug}` : canonicalUrl,
      };
    }),
  };

  const breadcrumb = {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Events', item: `${BASE_URL}/events` },
      { '@type': 'ListItem', position: 3, name: `${city} Events`, item: canonicalUrl },
    ],
  };

  return [itemList, breadcrumb];
}

/** Generate a BreadcrumbList JSON-LD for an event detail page. */
export function generateEventBreadcrumbJsonLd(
  citySlug: string,
  cityName: string,
  eventTitle: string,
  canonicalUrl: string,
): Record<string, unknown> {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Events', item: `${BASE_URL}/events` },
      { '@type': 'ListItem', position: 3, name: `${cityName} Events`, item: `${BASE_URL}/events/${citySlug}` },
      { '@type': 'ListItem', position: 4, name: sanitize(eventTitle), item: canonicalUrl },
    ],
  };
}