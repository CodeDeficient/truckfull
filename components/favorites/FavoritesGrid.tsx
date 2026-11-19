import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Star, Phone, Globe, Trash2 } from 'lucide-react';
import Link from '@/components/navigation/IntentLink';
import type { PublicFoodTruck, FoodTruckOperatingHours, FavoriteTruckLite } from '@/lib/types';
import { shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';

import { convertToDomain } from '@/lib/utils/foodTruckUtils';

interface FavoritesGridProps {
  readonly favorites: FavoriteTruckLite[];
  readonly removingFavorite?: string;
  readonly onRemove: (favoriteId: string, truckName: string) => void;
}

const formatHours = (hours: FoodTruckOperatingHours | null | undefined) => {
  if (!hours || typeof hours !== 'object') return 'Hours not available';
  // Get today's hours
  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  const today = days[new Date().getDay()];
  const todayHours = hours[today];

  if (!todayHours || todayHours.closed === true) return 'Closed';
  if (typeof todayHours === 'object' && 'open' in todayHours && 'close' in todayHours) {
    return `${todayHours.open} - ${todayHours.close}`;
  }
  return 'Hours not available';
};

const isOpenNow = (truck: FavoriteTruckLite) => {
  // Convert FavoriteTruckLite to FoodTruckDomain for compatibility with getTruckOpenStatus
  // Create a minimal FoodTruck object first, then convert using the utility function
  // Using Partial<FoodTruck> since we only need fields used by convertToDomain
  const minimalTruck: Partial<PublicFoodTruck> = {
    id: truck.id,
    name: truck.name,
    description: truck.description ?? '',
    operating_hours: truck.operating_hours,
    current_location: truck.current_location ?? undefined,
    cuisine_type: truck.cuisine_type ?? [],
    average_rating: truck.average_rating ?? 0,
    review_count: undefined,
    contact_info: {},
    social_media: {},
    is_active: undefined,
    is_claimed: truck.is_claimed ?? null,
  };

  const truckDomain = convertToDomain(minimalTruck as PublicFoodTruck);

  // Get the subscription tier from the truck data if available
  const rawTier = (truck as FavoriteTruckLite & { subscription_tier?: string }).subscription_tier;
  // Only use the tier if it's a valid, non-empty string value
  const ownerTier =
    rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;

  // Use the new enhanced function that considers both owner and tier
  return shouldShowTruckStatus(truckDomain, ownerTier);
};

export const FavoritesGrid: React.FC<FavoritesGridProps> = ({
  favorites,
  removingFavorite,
  onRemove,
}) => {
  return (
    <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
      {favorites.map((truck) => (
        <Card key={truck.favorite_id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2 flex items-center gap-3">
                  {truck.name}
                  {isOpenNow(truck) === null ? null : (
                    <Badge variant={isOpenNow(truck) ? 'default' : 'secondary'}>
                      {isOpenNow(truck) ? 'Open' : 'Closed'}
                    </Badge>
                  )}
                </CardTitle>

                {typeof truck.current_location?.address === 'string' &&
                  truck.current_location.address.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <MapPin className="size-4" />
                      {truck.current_location.address}
                    </div>
                  )}

                {Array.isArray(truck.cuisine_type) && truck.cuisine_type.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {truck.cuisine_type.slice(0, 3).map((cuisine, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {cuisine}
                      </Badge>
                    ))}
                    {truck.cuisine_type.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{truck.cuisine_type.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onRemove(truck.favorite_id, truck.name);
                }}
                disabled={removingFavorite === truck.favorite_id}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                {removingFavorite === truck.favorite_id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {truck.operating_hours != undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-muted-foreground" />
                <span>{formatHours(truck.operating_hours)}</span>
              </div>
            )}

            {typeof truck.average_rating === 'number' && (
              <div className="flex items-center gap-2 text-sm">
                <Star className="size-4 text-yellow-500 fill-current" />
                <span>{truck.average_rating.toFixed(1)} / 5.0</span>
                {typeof truck.total_reviews === 'number' && (
                  <span className="text-muted-foreground">({truck.total_reviews} reviews)</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-4 text-sm">
              {typeof truck.contact_info?.phone === 'string' &&
                truck.contact_info.phone.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Phone className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Phone</span>
                  </div>
                )}
              {typeof truck.contact_info?.website === 'string' &&
                truck.contact_info.website.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Globe className="size-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Website</span>
                  </div>
                )}
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Added{' '}
                {truck.favorited_at
                  ? new Date(truck.favorited_at).toLocaleDateString()
                  : 'Date unknown'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/trucks/${truck.id}`}>View Details</Link>
                </Button>
                {typeof truck.contact_info?.phone === 'string' &&
                  truck.contact_info.phone.length > 0 && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`tel:${truck.contact_info.phone}`}>Call</a>
                    </Button>
                  )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
