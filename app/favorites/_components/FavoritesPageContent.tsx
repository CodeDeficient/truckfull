'use client';

import React from 'react';
import type { FavoriteTruckLite } from '@/lib/types';

interface FavoritesPageContentProps {
  readonly favorites: readonly FavoriteTruckLite[];
  readonly removingFavorite?: string;
  readonly onRemove: (id: string, name: string) => void;
  readonly onBack: () => void;
  readonly onProfile: () => void;
}

export function FavoritesPageContent({
  favorites,
  removingFavorite,
  onRemove,
  onBack,
  onProfile,
}: FavoritesPageContentProps) {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <button className="neon-border hover-neon px-3 py-1" onClick={onBack}>
          Back
        </button>
        <button className="neon-border hover-neon px-3 py-1" onClick={onProfile}>
          Profile
        </button>
      </div>

      {favorites.length === 0 ? (
        <p className="text-muted-foreground">No favorites yet.</p>
      ) : (
        <ul className="space-y-2">
          {favorites.map((f) => (
            <li
              key={f.favorite_id}
              className="flex items-center justify-between border rounded p-3"
            >
              <span>{f.name}</span>
              <button
                className="neon-border hover-neon px-3 py-1"
                onClick={() => onRemove(f.favorite_id, f.name)}
                disabled={removingFavorite === f.favorite_id}
              >
                {removingFavorite === f.favorite_id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
