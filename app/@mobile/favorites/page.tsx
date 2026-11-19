'use client';

import React from 'react';
import { FavoritesDisplay } from '@/components/ui/favorites/FavoritesDisplay';

export const dynamic = 'force-dynamic';

export default function FavoritesPage() {
  return (
    <FavoritesDisplay
      onBack={() => globalThis.history.back()}
      onDiscoverTrucks={() => (globalThis.location.href = '/@mobile')}
      showHeader={true}
    />
  );
}
