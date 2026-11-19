/**
 * Metadata builders for event landing pages.
 *
 * - buildEventMetadata: per-event Metadata with dynamic robots based on
 *   vetting score (score >= 30 indexed). Past events get a "Past Event:"
 *   title prefix and "has passed" description suffix.
 * - buildCityHubMetadata: city hub Metadata, always index, follow.
 */

import type { Metadata } from 'next';
import type { EventPageData } from '@/lib/events/eventPageData';
import type { NearbyCity } from '@/lib/events/nearbyCities';
import { buildEventKeywords, generateEventKeywords } from '@/lib/seo/eventKeywords';
import { metaKeywords } from '@/lib/seo/keywords';
import { isPastEvent } from '@/lib/events/eventHorizon';

const BASE_URL = 'https://www.truckfull.food';
const OG_IMAGE = `${BASE_URL}/api/og/default`;

function formatLongDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

const MAX_TITLE_LENGTH = 70;
const MIN_EVENT_NAME_LENGTH = 15;
const TITLE_BRAND = ' | TruckFull';

function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, Math.max(maxLength - 1, 1)).trimEnd()}…`;
}

export function buildEventTitle(
  name: string,
  startDate: string | null,
  city: string,
  state: string,
  past: boolean,
): string {
  const prefix = past ? 'Past Event: ' : '';
  const details = [startDate ? formatShortDate(startDate) : '', `${city}, ${state}`]
    .filter(Boolean)
    .join(', ');
  const cleanName = name.trim();
  const branded = `${prefix}${cleanName}, ${details}${TITLE_BRAND}`;
  if (branded.length <= MAX_TITLE_LENGTH) return branded;
  const fixedLength = `${prefix}, ${details}`.length;
  const room = Math.max(MAX_TITLE_LENGTH - fixedLength, MIN_EVENT_NAME_LENGTH);
  return `${prefix}${truncateName(cleanName, room)}, ${details}`;
}

/** Build Metadata for an event detail page with dynamic robots directives. */
export function buildEventMetadata(
  event: EventPageData,
  citySlug: string,
  eventSlug: string,
  canonicalCitySlug?: string | null,
  nearbyCities: readonly NearbyCity[] = [],
): Metadata {
  const canonicalCity = canonicalCitySlug ?? citySlug;
  const canonicalUrl = `${BASE_URL}/events/${canonicalCity}/${eventSlug}`;
  const formattedDate = event.eventStartDate ? formatLongDate(event.eventStartDate) : '';
  const past = isPastEvent(event.eventStartDate, event.eventEndDate);
  const title = buildEventTitle(event.title, event.eventStartDate, event.city, event.state, past);

  const descriptionSource =
    event.description && event.description.trim().length > 0
      ? event.description
      : `Food truck event in ${event.city}, ${event.state} on ${formattedDate}. Find event details, location, participating food trucks, and more on TruckFull.`;
  const maxLen = past ? 135 : 160;
  const description = descriptionSource.slice(0, maxLen);
  const indexable = event.vettingScore !== null && event.vettingScore >= 30;
  const robots = indexable ? { index: true, follow: true } : { index: false, follow: true };

  const pastDescription = past ? `${description} This event has passed.` : description;

  const keywords = generateEventKeywords(event, nearbyCities);

  return {
    title: title,
    description: pastDescription,
    keywords: metaKeywords(keywords),
    alternates: { canonical: canonicalUrl },
    robots,
    openGraph: {
      title: title,
      description: pastDescription,
      url: canonicalUrl,
      siteName: 'TruckFull',
      type: 'website',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: event.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: pastDescription,
      images: [OG_IMAGE],
    },
  };
}

/** Build Metadata for a city hub page. Always index, follow. */
export function buildCityHubMetadata(
  city: string,
  state: string,
  eventCount: number,
  citySlug: string,
): Metadata {
  const canonicalUrl = `${BASE_URL}/events/${citySlug}`;
  const title = `Food Truck Events in ${city}, ${state} | TruckFull`;
  const description =
    eventCount > 0
      ? `Find ${eventCount} upcoming food truck events, festivals, and markets in ${city}, ${state}. Browse dates, locations, and food trucks on TruckFull.`
      : `Browse upcoming food truck events and festivals in ${city}, ${state} on TruckFull.`;

  const keywords = buildEventKeywords(city, state, eventCount);

  return {
    title,
    description,
    keywords: metaKeywords(keywords),
    alternates: { canonical: canonicalUrl },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'TruckFull',
      type: 'website',
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}
