'use client';

import React from 'react';

interface FavoritesErrorCardProps {
  readonly message: string;
  readonly onRetry: () => void;
}

export function FavoritesErrorCard({ message, onRetry }: FavoritesErrorCardProps) {
  return (
    <div className="p-6 border rounded-md bg-red-50 border-red-200 text-red-700">
      <p className="mb-3">{message}</p>
      <button className="neon-border hover-neon px-4 py-2" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
}
