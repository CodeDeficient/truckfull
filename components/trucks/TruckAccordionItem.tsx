'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import { Badge } from '@/components/ui/badge';
import {
  Heart,
  Pizza,
  Coffee,
  Soup,
  CookingPot,
  Fish,
  Sandwich,
  Cake,
  Salad,
  Apple,
  ChefHat,
  Beef,
  Drumstick,
} from 'lucide-react';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { getCuisineIcon as getStandardCuisineIcon } from '@/lib/utils/cuisineIcons';
import { TruckDetailsModal } from '@/components/TruckDetailsModal';
import { calculateDistance, shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';
import { Taco } from '@/components/icons/Taco';

interface TruckAccordionItemProps {
  readonly truck: FoodTruck | FoodTruckDomain;
  readonly selectedTruckId: string | undefined;
  readonly setSelectedTruckId: (id: string | undefined) => void;
  readonly isOpen: (truck: FoodTruck | FoodTruckDomain) => boolean;
  readonly userLocation: { lat: number; lng: number } | undefined;
  readonly isFavorited?: boolean;
  readonly onToggleFavorite?: () => void;
  readonly isFirst?: boolean;
  readonly onViewDetails?: () => void;
}

/**
 * Renders a simplified sidebar item displaying truck details and provides interaction handlers.
 * @example
 * TruckAccordionItem({ truck, selectedTruckId, setSelectedTruckId, isOpen, userLocation })
 * Returns a React component representing a simple card item.
 * @param {Object} truck - The truck object containing details like id, name, and location.
 * @param {function} setSelectedTruckId - Function used to update the selected truck ID.
 * @param {boolean} isOpen - Function that determines the open state of the truck.
 * @param {Object} userLocation - The user's current location used in truck comparisons.
 * @returns {JSX.Element} The rendered card item component.
 * @description
 *   - A lightweight card for quick scanning without detailed information or accordions.
 *   - Focuses on essential elements: avatar, name, cuisine tags, open/closed badge, distance, and favorites icon.
 *   - Includes subtle "View Details" link at the bottom.
 */
export function TruckAccordionItem({
  truck,
  selectedTruckId: _selectedTruckId,
  setSelectedTruckId: _setSelectedTruckId,
  isOpen,
  userLocation: _userLocation,
  isFavorited,
  onToggleFavorite,
  isFirst = false,
  onViewDetails,
}: TruckAccordionItemProps) {
  // Local modal state for when no onViewDetails callback is provided (desktop fallback)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  isOpen(truck);

  const paddingY = 'py-1';

  // Calculate distance if user location is available using proper Haversine formula
  let distanceText = '';
  if (_userLocation && truck.current_location?.lat && truck.current_location?.lng) {
    const distanceInMiles = calculateDistance(
      _userLocation.lat,
      _userLocation.lng,
      truck.current_location.lat,
      truck.current_location.lng,
    );
    distanceText = `${distanceInMiles.toFixed(1)} mi`;
  }

  // Cuisine tags to calculate overflow for
  const allCuisineTags = truck.cuisine_type || [];

  // Maximum of 2 cuisine tags visible, rest shown as +N indicator
  const maxVisibleTags = 2;
  const visibleCuisineTags = allCuisineTags.slice(0, maxVisibleTags);
  const overflowCount = Math.max(0, allCuisineTags.length - maxVisibleTags);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className={`${paddingY} px-3 hover:bg-muted/50 cursor-pointer transition-colors${isFirst ? ' mt-2' : ''}`}
        onClick={() => {
          // When clicked, trigger the parent component to select this truck
          // This should center the map on the truck and open the popup
          _setSelectedTruckId(truck.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _setSelectedTruckId(truck.id);
          }
        }}
      >
        <div className="flex items-start gap-3">
          {/* Avatar with status ring */}
          {(() => {
            // Get subscription tier for status check
            const rawTier = (truck as { subscription_tier?: string }).subscription_tier;
            const ownerTier =
              rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;
            const truckDomain =
              'description' in truck
                ? (truck as FoodTruckDomain)
                : convertToDomain(truck as FoodTruck);
            const openStatus = shouldShowTruckStatus(truckDomain, ownerTier);

            // Determine border color based on status
            const borderStyle =
              openStatus === true
                ? { borderColor: '#22c55e', boxShadow: '0 0 6px rgba(34, 197, 94, 0.3)' }
                : openStatus === false
                  ? { borderColor: '#ef4444', boxShadow: '0 0 6px rgba(239, 68, 68, 0.3)' }
                  : { borderColor: '#6b7280' };

            return (
              <div
                className="flex-shrink-0 w-14 h-14 rounded-full bg-muted flex items-center justify-center relative"
                style={{ border: '3px solid', ...borderStyle }}
              >
                {(() => {
                  const photoUrl = truck.social_media?.photo_url;

                  return photoUrl && !imgError ? (
                    <Image
                      src={photoUrl}
                      alt={`${truck.name} logo`}
                      fill
                      sizes="56px"
                      className="rounded-full object-cover"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <Image
                      src={TRUCK_FALLBACK_IMAGE}
                      alt="TruckFull"
                      fill
                      sizes="56px"
                      className="rounded-full object-cover"
                    />
                  );
                })()}
                {/* Info button in bottom-right corner */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewDetails) {
                      onViewDetails();
                    } else {
                      setIsModalOpen(true);
                    }
                  }}
                  className="absolute -bottom-2 -right-0.5 bg-muted text-muted-foreground rounded-full w-4 h-4 flex items-center justify-center text-xs hover:bg-secondary transition-colors z-10"
                >
                  i
                </button>
              </div>
            );
          })()}

          {/* Content area - all rows extend to include right-aligned items */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {/* Row 1: Name and Favorites */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground truncate mr-2">{truck.name}</h4>
              {onToggleFavorite && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite();
                  }}
                  className="flex-shrink-0 cursor-pointer hover:scale-110 transition-transform"
                  title={isFavorited === true ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    className={`size-5 ${isFavorited === true ? 'fill-current text-primary' : 'stroke-muted-foreground hover:stroke-primary'}`}
                  />
                </button>
              )}
            </div>

            {/* Row 2: Cuisine tags and +N indicator */}
            <div className="flex items-center justify-between gap-0.5">
              <div className="flex flex-nowrap gap-0.5 min-w-0 overflow-hidden">
                {visibleCuisineTags.map((cuisine: string, index: number) => {
                  const iconType = getStandardCuisineIcon(cuisine);
                  // Map the icon type to a Lucide icon
                  const iconMap: Record<string, React.ElementType> = {
                    american: () => React.createElement(Beef, { className: 'w-3 h-3 mr-1' }),
                    asian: () => React.createElement(Soup, { className: 'w-3 h-3 mr-1' }),
                    chinese: () => React.createElement(Soup, { className: 'w-3 h-3 mr-1' }),
                    japanese: () => React.createElement(Soup, { className: 'w-3 h-3 mr-1' }),
                    korean: () => React.createElement(Soup, { className: 'w-3 h-3 mr-1' }),
                    thai: () => React.createElement(Soup, { className: 'w-3 h-3 mr-1' }),
                    vietnamese: () => React.createElement(Soup, { className: 'w-3 h-3 mr-1' }),
                    indian: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    mexican: () => React.createElement(Taco, { className: 'w-3 h-3 mr-1' }),
                    italian: () => React.createElement(Pizza, { className: 'w-3 h-3 mr-1' }),
                    french: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    mediterranean: () => React.createElement(Salad, { className: 'w-3 h-3 mr-1' }),
                    greek: () => React.createElement(Salad, { className: 'w-3 h-3 mr-1' }),
                    spanish: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    'latin-american': () =>
                      React.createElement(Drumstick, { className: 'w-3 h-3 mr-1' }),
                    caribbean: () => React.createElement(Drumstick, { className: 'w-3 h-3 mr-1' }),
                    'middle-eastern': () =>
                      React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    turkish: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    persian: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    african: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    ethiopian: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    moroccan: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    european: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    german: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    'eastern-european': () =>
                      React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    polish: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    scandinavian: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    seafood: () => React.createElement(Fish, { className: 'w-3 h-3 mr-1' }),
                    bbq: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    steak: () => React.createElement(CookingPot, { className: 'w-3 h-3 mr-1' }),
                    pizza: () => React.createElement(Pizza, { className: 'w-3 h-3 mr-1' }),
                    sandwich: () => React.createElement(Sandwich, { className: 'w-3 h-3 mr-1' }),
                    salad: () => React.createElement(Salad, { className: 'w-3 h-3 mr-1' }),
                    dessert: () => React.createElement(Cake, { className: 'w-3 h-3 mr-1' }),
                    cafe: () => React.createElement(Coffee, { className: 'w-3 h-3 mr-1' }),
                    vegetarian: () => React.createElement(Salad, { className: 'w-3 h-3 mr-1' }),
                    vegan: () => React.createElement(Salad, { className: 'w-3 h-3 mr-1' }),
                    'gluten-free': () => React.createElement(Apple, { className: 'w-3 h-3 mr-1' }),
                    healthy: () => React.createElement(Salad, { className: 'w-3 h-3 mr-1' }),
                    'fast-food': () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    breakfast: () => React.createElement(Coffee, { className: 'w-3 h-3 mr-1' }),
                    diner: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    'food-truck': () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                    other: () => React.createElement(ChefHat, { className: 'w-3 h-3 mr-1' }),
                  };

                  const IconComponent = iconMap[iconType] || iconMap['other'];
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 flex-shrink-0 whitespace-nowrap"
                    >
                      <IconComponent />
                      {cuisine}
                    </span>
                  );
                })}
              </div>
              {/* +N cuisine overflow indicator */}
              {overflowCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground flex-shrink-0 whitespace-nowrap">
                  +{overflowCount}
                </span>
              )}
            </div>

            {/* Row 3: Distance and Open/Closed */}
            <div className="flex items-center justify-between">
              {/* Distance - left aligned */}
              <span className="text-xs text-muted-foreground">{distanceText}</span>
              {(() => {
                // Get the actual truck domain object to determine subscription tier
                const truckDomain =
                  'description' in truck && typeof truck.description === 'string'
                    ? (truck as FoodTruckDomain)
                    : convertToDomain(truck as FoodTruck);

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
            </div>
          </div>
        </div>

        {/* Subtle View Details link at the bottom */}
      </div>

      {/* Fallback modal for desktop when onViewDetails is not provided */}
      {!onViewDetails && (
        <TruckDetailsModal
          truck={
            'description' in truck && typeof truck.description === 'string'
              ? (truck as FoodTruck)
              : ({
                  ...truck,
                  description: truck.description ?? null,
                  created_at: typeof truck.created_at === 'string' ? truck.created_at : null,
                  updated_at: typeof truck.updated_at === 'string' ? truck.updated_at : null,
                  cuisine_type: Array.isArray(truck.cuisine_type) ? truck.cuisine_type : null,
                  current_location: truck.current_location ?? null,
                  operating_hours: truck.operating_hours ?? null,
                  menu_items: Array.isArray(truck.menu_items) ? truck.menu_items : null,
                  data_quality_score:
                    typeof truck.data_quality_score === 'number' ? truck.data_quality_score : null,
                  average_rating:
                    typeof truck.average_rating === 'number' ? truck.average_rating : null,
                  review_count: typeof truck.review_count === 'number' ? truck.review_count : null,
                  last_synced_at:
                    typeof truck.last_synced_at === 'string' ? truck.last_synced_at : null,
                  verification_status:
                    typeof truck.verification_status === 'string'
                      ? truck.verification_status
                      : null,
                  is_active: typeof truck.is_active === 'boolean' ? truck.is_active : null,
                } as FoodTruck)
          }
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
}
