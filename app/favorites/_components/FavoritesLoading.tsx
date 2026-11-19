'use client';

import React from 'react';

export function FavoritesLoading() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-24 bg-muted rounded" />
      </div>
    </div>
  );
}
