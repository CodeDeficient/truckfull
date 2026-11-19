'use client';

import React from 'react';
import dynamicImport from 'next/dynamic';

// Dynamically import the discover food trucks component to avoid server-side rendering issues
const DiscoverFoodTrucks = dynamicImport(() => import('./DiscoverFoodTrucks'), {
  loading: () => (
    <div className="flex items-center justify-center h-screen">Loading food trucks...</div>
  ),
  ssr: false,
});

export const dynamic = 'force-dynamic';

export default function DiscoverFoodTrucksPage() {
  return <DiscoverFoodTrucks />;
}
