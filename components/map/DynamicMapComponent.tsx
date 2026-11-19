'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import type { ComponentProps } from 'react';

const MapLoadingPlaceholder = () => (
  <div
    className="map-loading rounded-lg shadow-md flex items-center justify-center"
    style={{
      height: '400px',
      width: '100%',
      backgroundColor: '#f3f4f6',
    }}
  >
    <div className="flex items-center gap-2">
      <div className="w-5 h-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
      <p className="text-gray-600">Loading map...</p>
    </div>
  </div>
);

const DynamicMapComponentInternal = dynamic(() => import('./MapboxMapComponent'), {
  ssr: false,
  loading: MapLoadingPlaceholder,
});

export type MapComponentProps = ComponentProps<typeof DynamicMapComponentInternal>;

function DeferredMount({ children }: { children: React.ReactNode }) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setShouldRender(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!shouldRender) {
    return <MapLoadingPlaceholder />;
  }

  return <>{children}</>;
}

export const DynamicMapComponent = (props: MapComponentProps) => (
  <DeferredMount>
    <DynamicMapComponentInternal {...props} />
  </DeferredMount>
);

export const OptimizedMapComponent = (props: MapComponentProps) => (
  <DeferredMount>
    <Suspense fallback={<MapLoadingPlaceholder />}>
      <DynamicMapComponentInternal {...props} />
    </Suspense>
  </DeferredMount>
);
