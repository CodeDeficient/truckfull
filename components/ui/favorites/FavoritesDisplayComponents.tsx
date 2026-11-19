import React from 'react';
import { Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FavoriteTruck } from '@/lib/services/favorites';
import Image from 'next/image';

export const FavoritesList = ({
  favorites,
  onRemoveFavorite,
}: {
  favorites: FavoriteTruck[];
  onRemoveFavorite: (favoriteId: string) => Promise<void>;
}) => (
  <div className="space-y-6">
    {/* Favorites Summary */}
    <div className="bg-white/5 rounded-lg p-4">
      <h3 className="text-white text-lg font-bold mb-3">Favorites Summary</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-400">Total Favorites</div>
          <div className="text-white font-medium">{favorites.length}</div>
        </div>
        <div>
          <div className="text-gray-400">Currently Open</div>
          <div className="text-white font-medium">
            {favorites.filter((fav) => fav.is_open).length}
          </div>
        </div>
      </div>
    </div>

    {/* Favorites List */}
    <div>
      <h3 className="text-white text-lg font-bold mb-3">Your Favorite Trucks</h3>
      <div className="space-y-3">
        {favorites.map((favorite) => (
          <div
            key={favorite.favorite_id}
            className="bg-white/5 rounded-lg p-4 border border-white/10"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-grow">
                <div className="text-white font-medium">{favorite.name}</div>
                {(() => {
                  const cuisineDisplay = Array.isArray(favorite.cuisine_type)
                    ? favorite.cuisine_type.join(', ')
                    : favorite.cuisine_type;
                  return <div className="text-gray-400 text-sm">{cuisineDisplay}</div>;
                })()}
                {favorite.average_rating && (
                  <div className="flex items-center text-yellow-400 text-sm">
                    <Star className="w-3 h-3 mr-1" />
                    {favorite.average_rating.toFixed(1)}
                    {favorite.total_reviews !== undefined && (
                      <span className="text-gray-500 ml-1">({favorite.total_reviews})</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${favorite.is_open ? 'bg-green-400' : 'bg-gray-400'}`}
                />
                <Button
                  variant="ghost"
                  size="mobile-icon"
                  onClick={() => {
                    void onRemoveFavorite(favorite.favorite_id);
                  }}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </Button>
              </div>
            </div>

            {favorite.image_url && (
              <div className="mt-3">
                <Image
                  src={favorite.image_url}
                  alt={favorite.name}
                  width={400}
                  height={128}
                  className="w-full h-32 object-cover rounded-lg"
                  priority={false}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  </div>
);
