'use client';

import React from 'react';
import dynamicImport from 'next/dynamic';

// Dynamically import the truck details component to avoid server-side rendering issues
const TruckDetails = dynamicImport(() => import('./TruckDetails'), {
  loading: () => (
    <div className="flex items-center justify-center h-screen">Loading truck details...</div>
  ),
  ssr: false,
});

export const dynamic = 'force-dynamic';

export default function TruckDetailsPage() {
  return <TruckDetails />;
}
