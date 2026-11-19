import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { JSX } from 'react';
import { EventsDirectory } from '@/components/events/EventsDirectory';
import { getCityEventCounts } from '@/lib/events/eventPageData';

export const revalidate = 15_552_000;

const BASE_URL = 'https://www.truckfull.food';

export const metadata: Metadata = {
  title: 'Food Truck Events in Georgia & South Carolina | TruckFull',
  description:
    'Browse upcoming food truck events, festivals, and markets across Georgia and South Carolina. Find dates, locations, and food trucks on TruckFull.',
  alternates: { canonical: `${BASE_URL}/events` },
  openGraph: {
    title: 'Food Truck Events in Georgia & South Carolina | TruckFull',
    description: 'Browse upcoming food truck events, festivals, and markets across Georgia and South Carolina.',
    url: `${BASE_URL}/events`,
    siteName: 'TruckFull',
    type: 'website',
    images: [{ url: `${BASE_URL}/api/og/default`, width: 1200, height: 630, alt: 'Food Truck Events' }],
  },
};

export default async function EventsIndexPage(): Promise<JSX.Element> {
  if (process.env.NEXT_OUTPUT_STANDALONE === 'true') await connection();

  const cities = await getCityEventCounts();
  return <EventsDirectory cities={cities} />;
}
