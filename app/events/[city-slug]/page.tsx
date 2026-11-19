import type { Metadata } from 'next';
import Link from '@/components/navigation/IntentLink';
import Image from 'next/image';
import type { JSX } from 'react';
import { notFound } from 'next/navigation';
import { getSupabasePublicReader } from '@/lib/supabase/admin';
import { parseCitySlug, slugifyCity } from '@/lib/utils/slugify';
import { safeJsonLdStringify } from '@/lib/utils/jsonUtils';
import { getEventsForCity } from '@/lib/events/eventPageData';
import { buildCityHubMetadata } from '@/lib/seo/eventMetadata';
import { generateCityHubJsonLd } from '@/lib/seo/eventJsonLd';
import { todayDate, horizonDate } from '@/lib/events/eventHorizon';
import { generateCityEventFaq } from '@/lib/seo/eventKeywords';
import { faqJsonLd } from '@/lib/seo/keywords';
import { loadCityTruckStrip } from '@/lib/events/cityTruckStrip.server';
import { CityTruckStrip } from '@/components/events/CityTruckStrip';
import { CityBackdrop } from '@/components/city/CityBackdrop';
import { HoloCityBackdrop } from '@/components/city/HoloCityBackdrop';
import { EventList } from '@/components/events/EventList';
import { EventFaq } from '@/components/events/EventFaq';
import { SocialFooter, SocialFooterSpacer } from '@/components/SocialFooter';

export const revalidate = 15_552_000;

interface CityHubProps {
  params: Promise<{ 'city-slug': string }>;
}

const NEARBY_CITIES: Record<string, { city: string; state: string }[]> = {
  'savannah-ga': [
    { city: 'Charleston', state: 'SC' },
    { city: 'Hilton Head', state: 'SC' },
    { city: 'Augusta', state: 'GA' },
  ],
  'charleston-sc': [
    { city: 'Savannah', state: 'GA' },
    { city: 'Columbia', state: 'SC' },
    { city: 'Myrtle Beach', state: 'SC' },
  ],
  'columbia-sc': [
    { city: 'Charleston', state: 'SC' },
    { city: 'Greenville', state: 'SC' },
    { city: 'Augusta', state: 'GA' },
  ],
  'greenville-sc': [
    { city: 'Columbia', state: 'SC' },
    { city: 'Augusta', state: 'GA' },
    { city: 'Charleston', state: 'SC' },
  ],
  'augusta-ga': [
    { city: 'Aiken', state: 'SC' },
    { city: 'North Augusta', state: 'SC' },
    { city: 'Columbia', state: 'SC' },
    { city: 'Savannah', state: 'GA' },
  ],
  'myrtle-beach-sc': [
    { city: 'Charleston', state: 'SC' },
    { city: 'Columbia', state: 'SC' },
    { city: 'Florence', state: 'SC' },
  ],
  'hilton-head-sc': [
    { city: 'Savannah', state: 'GA' },
    { city: 'Charleston', state: 'SC' },
    { city: 'Myrtle Beach', state: 'SC' },
  ],
  'florence-sc': [
    { city: 'Myrtle Beach', state: 'SC' },
    { city: 'Columbia', state: 'SC' },
    { city: 'Charleston', state: 'SC' },
  ],
  'aiken-sc': [
    { city: 'Augusta', state: 'GA' },
    { city: 'Columbia', state: 'SC' },
    { city: 'North Augusta', state: 'SC' },
  ],
  'spartanburg-sc': [
    { city: 'Greenville', state: 'SC' },
    { city: 'Columbia', state: 'SC' },
    { city: 'Charlotte', state: 'NC' },
  ],
  'macon-ga': [
    { city: 'Atlanta', state: 'GA' },
    { city: 'Augusta', state: 'GA' },
    { city: 'Savannah', state: 'GA' },
  ],
  'valdosta-ga': [
    { city: 'Macon', state: 'GA' },
    { city: 'Tallahassee', state: 'FL' },
    { city: 'Savannah', state: 'GA' },
  ],
  'columbus-ga': [
    { city: 'Macon', state: 'GA' },
    { city: 'Atlanta', state: 'GA' },
    { city: 'Augusta', state: 'GA' },
  ],
  'waynesboro-ga': [
    { city: 'Augusta', state: 'GA' },
    { city: 'Savannah', state: 'GA' },
    { city: 'Macon', state: 'GA' },
  ],
  'evans-ga': [
    { city: 'Augusta', state: 'GA' },
    { city: 'Martinez', state: 'GA' },
    { city: 'Columbia', state: 'SC' },
  ],
};

export async function generateStaticParams(): Promise<{ 'city-slug': string }[]> {
  if (process.env.NEXT_OUTPUT_STANDALONE === 'true') return [];

  const supabase = getSupabasePublicReader();
  const now = new Date();
  const todayStr = todayDate(now);
  const horizonStr = horizonDate(now);
  const { data } = await supabase
    .from('external_events')
    .select('city, state')
    .gte('event_start_date', todayStr)
    .lte('event_start_date', horizonStr)
    .eq('is_food_truck_relevant', true)
    .eq('is_hidden', false)
    .gte('vetting_score', 30);
  if (!data?.length) return [];
  const seen = new Set<string>();
  const out: { 'city-slug': string }[] = [];
  for (const row of data) {
    const s = slugifyCity(row.city, row.state);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push({ 'city-slug': s });
  }
  return out;
}

export async function generateMetadata({ params }: CityHubProps): Promise<Metadata> {
  const { 'city-slug': slug } = await params;
  const parsed = parseCitySlug(slug);
  if (!parsed) return { title: 'City Not Found | TruckFull' };
  const events = await getEventsForCity(parsed.cityName, parsed.stateName);
  return buildCityHubMetadata(parsed.cityName, parsed.stateName, events.length, slug);
}

export default async function CityHubPage({ params }: CityHubProps): Promise<JSX.Element> {
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
  const faqLd = faqJsonLd(faqItems);
  const hubSchemas = generateCityHubJsonLd(
    cityName,
    stateName,
    events,
    `https://www.truckfull.food/events/${slug}`,
  );
  const nearby = NEARBY_CITIES[slug] ?? [];

  return (
    <>
      {hubSchemas.map((schema, i) => (
        <script
          key={`hub-${i}`}
          type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(schema) }}
        />
      ))}
      <script
        type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLdStringify(faqLd) }}
      />
      <main className="dark min-h-screen bg-black">
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
          <span className="font-brand text-3xl font-bold text-white neon-glow glow-red">
            <Link href="/">TruckFull</Link>
          </span>
        </header>
        <section className="relative h-[clamp(380px,48vh,540px)] w-full overflow-hidden bg-black text-white">
          <CityBackdrop>
            <HoloCityBackdrop citySlug={slug} />
          </CityBackdrop>
          <div className="absolute inset-x-0 bottom-8 top-2 z-10 flex flex-col items-center justify-start px-6 text-center sm:px-10">
            <h1
              className="mx-auto max-w-4xl font-heading text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl md:text-6xl"
              style={{ letterSpacing: '-0.01em', textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
            >
              {cityName} Food Truck Events
            </h1>
            <p
              className="mx-auto mt-2 max-w-2xl font-heading text-base text-white sm:text-lg"
              style={{ textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}
            >
              Explore upcoming local markets and festivals.
            </p>
            <p
              className="mx-auto mt-2 inline-flex rounded-full bg-black/30 px-3 py-1 text-sm text-white backdrop-blur"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}
            >
              {events.length} Upcoming
            </p>
          </div>
        </section>

        <nav
          aria-label="Breadcrumb"
          className="sticky top-16 z-20 bg-black px-6 py-3 text-sm text-white/70 sm:px-10"
        >
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span aria-hidden> / </span>
          <Link href="/events" className="hover:underline">
            Events
          </Link>
          <span aria-hidden> / </span>
          <span className="font-semibold text-white">{cityName}</span>
        </nav>

        <section className="bg-black pb-14 pt-2 sm:pb-20">
          <div className="mx-auto max-w-4xl px-6 sm:px-10">
            <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
              Upcoming events
            </h2>
            <div className="mt-6">
              <EventList
                events={events}
                citySlug={slug}
                emptyMessage="No upcoming events are currently tracked in this city."
                sortable
              />
            </div>
          </div>
        </section>

        <CityTruckStrip cityName={cityName} stateName={stateName} citySlug={slug} strip={truckStrip} />

        {nearby.length > 0 && (
          <section className="bg-black py-10">
            <div className="mx-auto max-w-4xl px-6 sm:px-10">
              <h2 className="font-heading text-2xl font-bold text-white">
                Events in nearby cities
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {nearby.map((c) => (
                  <li key={slugifyCity(c.city, c.state)}>
                    <Link
                      href={`/events/${slugifyCity(c.city, c.state)}`}
                      className="inline-block rounded-full border border-white/40 px-4 py-1.5 text-sm font-semibold text-white transition-all hover:scale-105 hover:border-red-500 hover:bg-red-500"
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

        <SocialFooterSpacer />
        <SocialFooter />
      </main>
    </>
  );
}
