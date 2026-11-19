'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { useTruckCard } from '@/hooks/useTruckCard';
import { formatPrice, shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { safe } from '@/lib/utils/safeObject';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';
import { Eye, MapPin, Heart } from 'lucide-react';
import { GenericMenuSection } from '@/components/ui/GenericMenuSection';
import { SocialMediaSection } from '@/components/ui/SocialMediaSection';
import { ContactSection } from '@/components/ui/ContactSection';
import { BaseTruckCard } from '@/components/ui/truck-cards/BaseTruckCard';

interface TruckCardProps {
  readonly truck: FoodTruck;
  readonly onSelectTruck: () => void;
  readonly userLocation?: { lat: number; lng: number };
  readonly hideHeader?: boolean;
  readonly isFavorite?: boolean;
  readonly onToggleFavorite?: () => void;
  readonly condensed?: boolean; // Show minimal info for accordion view
}

// Header subcomponent
function TruckCardHeader({
  truck,
  isFavorite,
  onToggleFavorite,
  popularItems: _popularItems,
  priceRange: _priceRange,
  onToggleFavoriteClick,
}: {
  readonly truck: FoodTruck;
  readonly isFavorite: boolean;
  readonly onToggleFavorite?: () => void;
  readonly popularItems: Array<{ name: string; price?: number }>;
  readonly priceRange?: string;
  readonly onToggleFavoriteClick: (e: React.MouseEvent) => void;
}) {
  return (
    <CardHeader>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <CardTitle className="text-lg dark:text-gray-100">{truck.name}</CardTitle>
          {truck.current_location?.address != undefined && (
            <CardDescription className="flex items-center mt-1 dark:text-gray-400">
              <MapPin className="size-4 mr-1" />
              {truck.current_location.address}
            </CardDescription>
          )}
        </div>
        <div className="flex flex-col items-end space-y-1">
          <div className="flex items-center gap-2">
            {(() => {
              // Get the actual truck domain object to determine subscription tier
              const truckDomain =
                'description' in truck && typeof truck.description === 'string'
                  ? (truck as FoodTruckDomain)
                  : convertToDomain(truck); // Convert to domain using utility function

              // Use the subscription tier from the truck data
              const rawTier = (truck as FoodTruck & { subscription_tier?: string })
                .subscription_tier;
              // Only use the tier if it's a valid, non-empty string value
              const ownerTier =
                rawTier && typeof rawTier === 'string' && rawTier.trim() !== ''
                  ? rawTier
                  : undefined;
              const actualIsOpen = shouldShowTruckStatus(truckDomain, ownerTier);

              return actualIsOpen === null ? null : (
                <Badge variant={actualIsOpen ? 'open' : 'secondary'}>
                  {actualIsOpen ? 'Open' : 'Closed'}
                </Badge>
              );
            })()}
            {onToggleFavorite && (
              <Button
                variant="ghost"
                size="icon"
                className={`hover:scale-110 transition-all duration-200 ${isFavorite ? 'neon-text' : 'hover-neon'}`}
                onClick={onToggleFavoriteClick}
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`size-4 ${isFavorite ? 'fill-current' : ''}`} />
              </Button>
            )}
          </div>
          {/* Price range removed - not useful in current state */}
        </div>
      </div>
    </CardHeader>
  );
}

// Main content subcomponent
function TruckCardMain({
  name,
  todayHours,
  popularItems,
  socialMedia,
  phone,
  email,
  website,
  image_url,
  average_rating,
  description,
  cuisine_type,
  condensed,
}: {
  readonly name: string;
  readonly todayHours?: { open?: string; close?: string; closed?: boolean };
  readonly popularItems: Array<{ name: string; price?: number }>;
  readonly socialMedia: Record<string, unknown>;
  readonly phone?: string;
  readonly email?: string;
  readonly website?: string;
  readonly image_url?: string;
  readonly average_rating?: number;
  readonly description: string;
  readonly cuisine_type: string[];
  readonly condensed?: boolean;
}) {
  const baseTruckCardData = {
    id: 'temp', // This is used just for display in the expanded view, not for any functionality
    name,
    description,
    cuisine_type: cuisine_type?.join(', ') || undefined,
    image_url,
    average_rating,
    schedule: undefined, // We'll use the todayHours instead of full schedule in the base card
    events: undefined, // Events are not shown in the expanded view
  };

  return (
    <CardContent>
      <main className="ui-truck-container">
        {/* Use the enhanced BaseTruckCard for consistent styling with photo and rating */}
        <BaseTruckCard
          truck={baseTruckCardData}
          renderCustomContent={() => (
            <>
              {condensed ? (
                /* Condensed view for accordion - minimal info to encourage clicking "View Details" */
                <>
                  {todayHours != undefined && todayHours.closed === false && (
                    <div className="hours-display mt-3">
                      <strong>Today:</strong> {todayHours.open} - {todayHours.close}
                    </div>
                  )}
                  {/* Show truncated description or just a teaser */}
                  {description && description.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {description}
                    </p>
                  )}
                </>
              ) : (
                /* Full view - show all information */
                <>
                  {typeof name === 'string' && name.length > 0 && (
                    <>
                      {todayHours != undefined && todayHours.closed === false && (
                        <div className="hours-display mt-3">
                          <strong>Today:</strong> {todayHours.open} - {todayHours.close}
                        </div>
                      )}
                    </>
                  )}

                  {popularItems.length > 0 && (
                    <GenericMenuSection
                      items={popularItems
                        .filter((item) => typeof item.name === 'string' && item.name.length > 0) // Only include items with valid names
                        .map((item) => ({
                          name: item.name,
                          price: formatPrice(item.price ?? 0),
                        }))}
                    />
                  )}

                  {Object.keys(socialMedia).length > 0 && (
                    <SocialMediaSection socialMedia={socialMedia} />
                  )}

                  {((typeof phone === 'string' && phone.length > 0) ||
                    (typeof email === 'string' && email.length > 0) ||
                    (typeof website === 'string' && website.length > 0)) && (
                    <ContactSection contactInfo={{ phone, website }} />
                  )}
                </>
              )}
            </>
          )}
        />
      </main>
    </CardContent>
  );
}

// Footer subcomponent
function TruckCardFooter({
  onViewDetails,
  isVerified,
}: {
  readonly onViewDetails: (e: React.MouseEvent) => void;
  readonly isVerified: boolean;
}) {
  return (
    <CardFooter>
      <div className="flex gap-2 w-full">
        <Button className="flex-1" variant="neon" onClick={onViewDetails}>
          <Eye className="size-4 mr-2" />
          View Details
        </Button>
        {isVerified && (
          <Button className="flex-1" variant="default" disabled>
            Book Me
          </Button>
        )}
      </div>
    </CardFooter>
  );
}

export function PublicTruckCard({
  truck,
  onSelectTruck,
  hideHeader = false,
  isFavorite = false,
  onToggleFavorite,
  condensed = false,
}: TruckCardProps) {
  // Defensive checks for required data
  if (!truck?.id) {
    return (
      <Card className="hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-800 dark:border-slate-700">
        <CardContent className="p-4">
          <p className="text-muted-foreground">Invalid truck data</p>
        </CardContent>
      </Card>
    );
  }

  const { popularItems, priceRange, todayHours } = useTruckCard(truck);

  // Convert null to undefined for the component props
  const todayHoursForProps = todayHours ?? undefined;
  const { name = 'Unnamed Truck' } = truck;

  // Safely extract social media and contact info with safe utility
  const socialMedia = safe(truck.social_media);
  const { phone = '', email = '', website = '' } = safe(truck.contact_info);

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Select the truck - parent component handles modal opening
    onSelectTruck();
  };
  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleFavorite) onToggleFavorite();
  };

  return (
    <Card
      className={`hover:shadow-md transition-shadow cursor-pointer dark:bg-slate-800 dark:border-slate-700 ${hideHeader ? 'shadow-none border-none bg-transparent dark:bg-transparent' : ''}`}
      onClick={onSelectTruck}
    >
      {!hideHeader && (
        <TruckCardHeader
          truck={truck}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          popularItems={popularItems}
          priceRange={priceRange}
          onToggleFavoriteClick={handleToggleFavorite}
        />
      )}

      <TruckCardMain
        name={name}
        todayHours={todayHoursForProps}
        popularItems={popularItems}
        socialMedia={socialMedia}
        phone={phone}
        email={email}
        website={website}
        image_url={truck.image_url}
        average_rating={truck.average_rating ?? undefined}
        description={truck.description ?? ''}
        cuisine_type={Array.isArray(truck.cuisine_type) ? truck.cuisine_type : []}
        condensed={condensed}
      />

      <TruckCardFooter
        onViewDetails={handleViewDetails}
        isVerified={truck.verification_status === 'verified'}
      />
    </Card>
  );
}
