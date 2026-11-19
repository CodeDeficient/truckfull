import type { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache, type JSX } from 'react';
import { parseCitySlug } from '@/lib/utils/slugify';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import {
  getEventCityTrucks,
  getEventBySlug,
  getOtherEventsInCity,
  type EventPageData,
} from '@/lib/events/eventPageData';
import { getConfidenceBadge } from '@/lib/events/confidenceBadge';
import { buildEventMetadata } from '@/lib/seo/eventMetadata';
import { isPastEvent } from '@/lib/events/eventHorizon';
import {
  generateEventJsonLd,
  generateEventBreadcrumbJsonLd,
  easternOffset,
} from '@/lib/seo/eventJsonLd';
import { generateEventFaq } from '@/lib/seo/eventKeywords';
import { getNearbyCities } from '@/lib/events/nearbyCities';
import {
  EVENT_EVENT_NOT_FOUND,
  isEventCanonicalRedirect,
  resolveEventCanonicalRedirect,
} from '@/lib/events/eventCanonicalization';
import { faqJsonLd } from '@/lib/seo/keywords';
import { getSourceDisplay } from '@/lib/events/sourceDisplay';
import { detectEventCategory, getEventHero } from '@/lib/events/eventHero';
import { cleanAddress } from '@/lib/utils/addressCleaner';
import { EventHero } from '@/components/event/EventHero';
import { AboutSection } from '@/components/events/AboutSection';
import { TruckStrip } from '@/components/events/TruckStrip';
import { AcquisitionSection } from '@/components/events/AcquisitionSection';
import { MapBand } from '@/components/events/MapBand';
import { EventList } from '@/components/events/EventList';
import { EventFaq } from '@/components/events/EventFaq';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';
import { NearbyCities } from '@/components/events/NearbyCities';

const WWW_PREFIX = /^www\./;

export const revalidate = false;
export const dynamicParams = true;
export const dynamic = 'force-static';

interface EventDetailProps {
  params: Promise<{ 'city-slug': string; 'event-slug': string }>;
}

const BASE_URL = 'https://www.truckfull.food';

const getEventCanonicalResult = cache(resolveEventCanonicalRedirect);

export async function generateStaticParams(): Promise<
  { 'city-slug': string; 'event-slug': string }[]
> {
  // Generate event pages on demand instead of querying every eligible event during navigation/build.
  return [];
}

export async function generateMetadata({ params }: EventDetailProps): Promise<Metadata> {
  const { 'city-slug': citySlug, 'event-slug': eventSlug } = await params;
  const canonicalResult = await getEventCanonicalResult(citySlug, eventSlug);
  if (canonicalResult === EVENT_EVENT_NOT_FOUND) notFound();
  if (isEventCanonicalRedirect(canonicalResult)) permanentRedirect(canonicalResult);

  const event = await getEventBySlug(citySlug, eventSlug);
  if (!event) return { title: 'Event Not Found | TruckFull' };
  const nearbyCities = await getNearbyCities(
    event.id,
    event.city,
    event.state,
    event.locationLat,
    event.locationLng,
  );
  return buildEventMetadata(event, citySlug, eventSlug, null, nearbyCities);
}

export default async function EventDetailPage({ params }: EventDetailProps): Promise<JSX.Element> {
  const { 'city-slug': citySlug, 'event-slug': eventSlug } = await params;
  const canonicalResult = await getEventCanonicalResult(citySlug, eventSlug);
  if (canonicalResult === EVENT_EVENT_NOT_FOUND) notFound();
  if (isEventCanonicalRedirect(canonicalResult)) permanentRedirect(canonicalResult);

  const event = await getEventBySlug(citySlug, eventSlug);
  if (!event || !event.eventStartDate) notFound();

  const cityName = parseCitySlug(citySlug)?.cityName ?? event.city;
  const badge = getConfidenceBadge(event.vettingScore ?? 0);
  const past = isPastEvent(event.eventStartDate, event.eventEndDate);
  const category = detectEventCategory(event.title);
  const hero = getEventHero(category);
  const [trucks, otherEvents, nearbyCities] = await Promise.all([
    getEventCityTrucks(event.city, event.state),
    getOtherEventsInCity(event.city, event.state, event.id, 8),
    getNearbyCities(event.id, event.city, event.state, event.locationLat, event.locationLng),
  ]);

  const canonicalUrl = `${BASE_URL}/events/${citySlug}/${eventSlug}`;
  const eventSchema = generateEventJsonLd(event, canonicalUrl);
  const breadcrumbSchema = generateEventBreadcrumbJsonLd(
    citySlug,
    cityName,
    event.title,
    canonicalUrl,
  );
  const faqItems = generateEventFaq(event);
  const faqLd = faqJsonLd(faqItems);

  const dateLine = buildDateLine(event);
  const subtitle = buildSubtitle(event);
  const cleanedAddress = event.locationAddress ? cleanAddress(event.locationAddress) : null;
  const trimmedDescription = event.description?.trim();
  const description =
    trimmedDescription && trimmedDescription.length > 0
      ? trimmedDescription
      : buildFallbackDescription(event, cityName);
  const sourceDisplay = event.source ? getSourceDisplay(event.source, event.sourceType) : null;
  // NOTE: Only eproval source currently has permit data. Other sources may have permitStatus set but it's not trusted yet.
  const isSavannahApproved =
    event.city.toLowerCase() === 'savannah' &&
    event.state.toUpperCase() === 'GA' &&
    event.permitStatus === 'Approved' &&
    event.sourceType === 'eproval'; // Only eproval data is currently trusted for permits
  const mapsUrl = buildMapsUrl(event);

  const info = buildInfoList(event, cityName, sourceDisplay, cleanedAddress);
  const organizerUrl = isDifferentFromSource(event.website, event.sourceUrl) ? event.website : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(eventSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqLd) }}
      />
      <main className="min-h-screen bg-white dark:bg-black" data-testid="event-detail-page">
        <header className="sticky top-0 z-30 flex items-center gap-2 bg-black px-4 py-2 shadow-md">
          <Link href="/" className="block">
            <Image
              src="/truckfull-icon-transparent.webp"
              alt="TruckFull Logo"
              width={92}
              height={64}
              className="h-12 w-auto object-contain"
              sizes="92px"
              priority
            />
          </Link>
          <span className="font-brand text-2xl font-bold text-white neon-glow glow-red sm:text-3xl">
            <Link href="/">TruckFull</Link>
          </span>
        </header>
        <EventHero
          title={event.title}
          subtitle={subtitle}
          dateLine={dateLine}
          hero={hero}
          badge={badge}
          isPast={past}
          variant="responsive"
        />

        <nav
          aria-label="Breadcrumb"
          className="sticky top-0 z-20 bg-black px-4 py-3 text-sm text-white/70 sm:top-16 sm:px-10"
        >
          <ol className="flex flex-wrap items-center gap-1">
            <li>
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span aria-hidden> / </span>
            </li>
            <li>
              <Link href="/events" className="hover:underline">
                Events
              </Link>
              <span aria-hidden> / </span>
            </li>
            <li>
              <Link href={`/events/${citySlug}`} className="hover:underline">
                {cityName}
              </Link>
              <span aria-hidden> / </span>
            </li>
            <li className="font-semibold text-white">{event.title}</li>
          </ol>
        </nav>

        <AboutSection
          description={description}
          info={info}
          hasSavannahPermit={isSavannahApproved}
          organizerUrl={organizerUrl}
        />

        <TruckStrip trucks={trucks} cityName={cityName} eventTitle={event.title} />

        <AcquisitionSection />

        <MapBand
          address={cleanedAddress ?? 'Address TBA'}
          cityName={cityName}
          stateName={event.state}
          mapsUrl={mapsUrl}
          lat={event.locationLat}
          lng={event.locationLng}
        />

        {otherEvents.length > 0 && (
          <section className="bg-white pb-12 pt-10 dark:bg-black sm:pb-28 sm:pt-20">
            <div className="mx-auto max-w-4xl px-4 sm:px-10">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-white sm:text-4xl">
                More events in {cityName}, {event.state}
              </h2>
              <div className="mt-4 sm:mt-6">
                <EventList events={otherEvents} citySlug={citySlug} />
              </div>
            </div>
          </section>
        )}

        <NearbyCities cities={nearbyCities} variant="responsive" />

        <EventFaq items={faqItems} />
        <div className="hidden sm:block">
          <SocialFooterSpacer />
          <SocialFooter />
        </div>
      </main>
    </>
  );
}

function buildDateLine(event: EventPageData): string {
  if (!event.eventStartDate) return '';
  const d = new Date(`${event.eventStartDate}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return event.eventStartDate;
  const longDate = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  const timeRange = formatTimeRange(event);
  return timeRange ? `${longDate} · ${timeRange}` : longDate;
}

function formatTimeRange(event: EventPageData): string {
  if (!event.eventStartTime) return '';
  const tz = event.eventStartDate ? tzAbbr(event.eventStartDate) : '';
  const start = formatTime12h(event.eventStartTime, event.eventStartDate!);
  const end = event.eventEndTime
    ? formatTime12h(event.eventEndTime, event.eventEndDate ?? event.eventStartDate!)
    : null;
  return end ? `${start} – ${end} ${tz}` : `${start} ${tz}`;
}

function formatTime12h(timeStr: string, dateStr: string): string {
  const d = new Date(`${dateStr}T${timeStr}Z`);
  if (Number.isNaN(d.getTime())) return timeStr;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  });
}

function tzAbbr(dateStr: string): string {
  return easternOffset(dateStr) === '-04:00' ? 'EDT' : 'EST';
}

function buildSubtitle(event: EventPageData): string {
  if (event.locationAddress) return cleanAddress(event.locationAddress);
  return `${event.city}, ${event.state}`;
}

function buildFallbackDescription(event: EventPageData, cityName: string): string {
  const date = event.eventStartDate ? formatLongDate(event.eventStartDate) : 'the scheduled date';
  const loc = event.locationAddress ?? 'a location to be confirmed';
  return `TruckFull is tracking this event at ${loc} on ${date} in ${cityName}, ${event.state}. Check back as the event date approaches, or visit the original listing for the latest details.`;
}

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

function buildMapsUrl(event: EventPageData): string | null {
  if (event.locationLat !== null && event.locationLng !== null) {
    return `https://www.google.com/maps?q=${event.locationLat},${event.locationLng}`;
  }
  if (event.locationAddress) {
    return `https://www.google.com/maps?q=${encodeURIComponent(event.locationAddress)}`;
  }
  return null;
}

interface AboutInfo {
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}

function buildInfoList(
  event: EventPageData,
  cityName: string,
  sourceDisplay: ReturnType<typeof getSourceDisplay> | null,
  cleanedAddress: string | null,
): readonly AboutInfo[] {
  const items: AboutInfo[] = [];
  if (event.eventStartDate) {
    const longDate = formatLongDate(event.eventStartDate);
    const timeRange = formatTimeRange(event);
    items.push({
      label: 'When',
      value: timeRange ? `${longDate} · ${timeRange}` : longDate,
    });
  }
  if (cleanedAddress) {
    items.push({
      label: 'Where',
      value: cleanedAddress,
    });
  }
  if (event.organization) {
    items.push({ label: 'Organizer', value: event.organization });
  }
  if (event.sourceUrl) {
    try {
      const hostname = new URL(event.sourceUrl).hostname.replace(WWW_PREFIX, '');
      items.push({
        label: 'Source',
        value: hostname,
        href: event.sourceUrl,
      });
    } catch {
      items.push({
        label: 'Source',
        value: event.sourceUrl,
        href: event.sourceUrl,
      });
    }
  } else if (event.source === 'savannah_eproval') {
    items.push({
      label: 'Source',
      value: 'City of Savannah events calendar',
      href: 'https://www.savannahga.gov/3271/Special-Event-Calendar',
    });
  }
  return items;
}

/**
 * Returns false when `url` is null, malformed, or points to the same host
 * as `sourceUrl` (modulo www. prefix and trailing slash). Used to suppress
 * a redundant "Organizer website" row when it duplicates the Source row.
 */
function isDifferentFromSource(url: string | null, sourceUrl: string | null): boolean {
  if (!url) return false;
  try {
    const a = new URL(url);
    const sourceHost = sourceUrl ? new URL(sourceUrl).hostname.replace(WWW_PREFIX, '') : '';
    return a.hostname.replace(WWW_PREFIX, '') !== sourceHost;
  } catch {
    return false;
  }
}
