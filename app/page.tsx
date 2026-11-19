import { Suspense } from 'react';
import type { Metadata } from 'next';
import FoodTruckFinder from '@/components/home/FoodTruckFinderDynamic';
import { HomeNoScriptContent } from '@/components/home/HomeNoScriptContent';
import { LoadingScreen } from '@/components/home/LoadingScreen';
import { getHomeInitialData } from '@/lib/server/homeInitialTrucks';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://www.truckfull.food/',
  },
};

export default async function HomePage() {
  const initialSeed = await getHomeInitialData();

  return (
    <>
      <h1 className="sr-only">Food Trucks Augusta GA & CSRA | TruckFull</h1>
      <Suspense fallback={<LoadingScreen />}>
        <FoodTruckFinder initialSeed={initialSeed} />
      </Suspense>
      <HomeNoScriptContent />
    </>
  );
}
