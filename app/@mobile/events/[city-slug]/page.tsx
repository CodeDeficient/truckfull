import type { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';
import type { JSX } from 'react';
export { generateStaticParams } from '@/app/events/[city-slug]/page';
import { notFound } from 'next/navigation';
import { parseCitySlug, slugifyCity } from '@/lib/utils/slugify';
import { getEventsForCity } from '@/lib/events/eventPageData';
import { buildCityHubMetadata } from '@/lib/seo/eventMetadata';
import { loadCityTruckStrip } from '@/lib/events/cityTruckStrip.server';
import { CityTruckStrip } from '@/components/events/CityTruckStrip';
import { CityBackdrop } from '@/components/city/CityBackdrop';
import { HoloCityBackdrop } from '@/components/city/HoloCityBackdrop';
import { EventList } from '@/components/events/EventList';
import { EventFaq } from '@/components/events/EventFaq';
import { generateCityEventFaq } from '@/lib/seo/eventKeywords';

const NEARBY_CITIES: Record<string, { city: string; state: string }[]> = {
  'savannah-ga': [{ city: 'Charleston', state: 'SC' }, { city: 'Hilton Head', state: 'SC' }, { city: 'Augusta', state: 'GA' }],
  'charleston-sc': [{ city: 'Savannah', state: 'GA' }, { city: 'Columbia', state: 'SC' }, { city: 'Myrtle Beach', state: 'SC' }],
  'columbia-sc': [{ city: 'Charleston', state: 'SC' }, { city: 'Greenville', state: 'SC' }, { city: 'Augusta', state: 'GA' }],
  'greenville-sc': [{ city: 'Columbia', state: 'SC' }, { city: 'Augusta', state: 'GA' }, { city: 'Charleston', state: 'SC' }],
  'augusta-ga': [{ city: 'Aiken', state: 'SC' }, { city: 'North Augusta', state: 'SC' }, { city: 'Columbia', state: 'SC' }, { city: 'Savannah', state: 'GA' }],
  'myrtle-beach-sc': [{ city: 'Charleston', state: 'SC' }, { city: 'Columbia', state: 'SC' }, { city: 'Florence', state: 'SC' }],
  'hilton-head-sc': [{ city: 'Savannah', state: 'GA' }, { city: 'Charleston', state: 'SC' }, { city: 'Myrtle Beach', state: 'SC' }],
  'florence-sc': [{ city: 'Myrtle Beach', state: 'SC' }, { city: 'Columbia', state: 'SC' }, { city: 'Charleston', state: 'SC' }],
  'aiken-sc': [{ city: 'Augusta', state: 'GA' }, { city: 'Columbia', state: 'SC' }, { city: 'North Augusta', state: 'SC' }],
  'spartanburg-sc': [{ city: 'Greenville', state: 'SC' }, { city: 'Columbia', state: 'SC' }, { city: 'Charlotte', state: 'NC' }],
  'macon-ga': [{ city: 'Atlanta', state: 'GA' }, { city: 'Augusta', state: 'GA' }, { city: 'Savannah', state: 'GA' }],
  'waynesboro-ga': [{ city: 'Augusta', state: 'GA' }, { city: 'Savannah', state: 'GA' }, { city: 'Macon', state: 'GA' }],
};

interface CityHubProps {
  params: Promise<{ 'city-slug': string }>;
}

export async function generateMetadata({ params }: CityHubProps): Promise<Metadata> {
  const { 'city-slug': slug } = await params;
  const parsed = parseCitySlug(slug);
  if (!parsed) return { title: 'City Not Found | TruckFull' };
  const events = await getEventsForCity(parsed.cityName, parsed.stateName);
  return buildCityHubMetadata(parsed.cityName, parsed.stateName, events.length, slug);
}

export default async function MobileCityHubPage({ params }: CityHubProps): Promise<JSX.Element> {
  const { 'city-slug': slug } = await params;
  const parsed = parseCitySlug(slug);
  if (!parsed) notFound();
  const [events, truckStrip] = await Promise.all([
    getEventsForCity(parsed.cityName, parsed.stateName),
    loadCityTruckStrip(parsed.cityName, parsed.stateName),
  ]);
  if (events.length === 0) notFound();

  const cityName = parsed.cityName;
  const stateName = parsed.stateName;
  const faqItems = generateCityEventFaq(cityName, stateName, events.length, []);
  const nearby = NEARBY_CITIES[slug] ?? [];

  return (
    <div className="dark flex h-full flex-col bg-black">
      <header className="sticky top-0 z-30 flex shrink-0 items-center gap-2 bg-black px-4 py-2 shadow-md">
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
        <span className="font-brand text-2xl font-bold text-white neon-glow glow-red">
          <Link href="/">TruckFull</Link>
        </span>
      </header>

      <div className="overflow-y-auto">
        <section className="relative h-[44vh] min-h-[320px] w-full overflow-hidden bg-black text-white">
          <CityBackdrop>
            <HoloCityBackdrop citySlug={slug} />
          </CityBackdrop>
          <div className="absolute inset-x-0 bottom-6 top-2 z-10 flex flex-col items-center justify-start px-4 text-center">
            <h1
              className="mx-auto max-w-4xl font-heading text-3xl font-bold leading-tight tracking-tight text-white"
              style={{ letterSpacing: '-0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
            >
              {cityName} Food Truck Events
            </h1>
            <p
              className="mx-auto mt-2 max-w-2xl font-heading text-sm text-white"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
            >
              Explore upcoming local markets and festivals.
            </p>
            <p
              className="mx-auto mt-2 inline-flex rounded-full bg-black/30 px-3 py-1 text-xs text-white backdrop-blur"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              {events.length} Upcoming
            </p>
          </div>
        </section>

        <nav
          aria-label="Breadcrumb"
          className="sticky top-0 z-20 bg-black px-4 py-3 text-sm text-white/70"
        >
          <Link href="/" className="hover:underline">Home</Link>
          <span aria-hidden> / </span>
          <Link href="/events" className="hover:underline">Events</Link>
          <span aria-hidden> / </span>
          <span className="font-semibold text-white">{cityName}</span>
        </nav>

        <section className="bg-black pb-8 pt-1">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="font-heading text-2xl font-bold text-white">
              Upcoming events
            </h2>
            <div className="mt-4">
              <EventList
                events={events}
                citySlug={slug}
                emptyMessage="No upcoming events are currently tracked in this city."
                sortable
              />
            </div>
          </div>
        </section>

        <CityTruckStrip cityName={cityName} stateName={stateName} citySlug={slug} strip={truckStrip} compact />

        {nearby.length > 0 && (
          <section className="bg-black py-8">
            <div className="mx-auto max-w-4xl px-4">
              <h2 className="font-heading text-xl font-bold text-white">
                Events in nearby cities
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {nearby.map((c) => (
                  <li key={slugifyCity(c.city, c.state)}>
                    <Link
                      href={`/events/${slugifyCity(c.city, c.state)}`}
                      className="inline-block rounded-full border border-white/30 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:border-red-500 hover:bg-red-500"
                    >
                      {c.city}, {c.state}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <EventFaq items={faqItems} />

        <div className="h-4" aria-hidden />
      </div>
    </div>
  );
}
