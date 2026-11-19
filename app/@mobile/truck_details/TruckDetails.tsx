'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import MobilePageHeader from '@/components/shared/MobilePageHeader';
import { MapPin, Phone, Globe, Heart, Share2, Navigation } from 'lucide-react';
import { PublicTruckDetailHeader } from '@/components/trucks/PublicTruckDetailHeader';
import { TruckMenuSection } from '@/components/trucks/MenuSection';
import { TruckRatingSection } from '@/components/trucks/TruckRatingSection';
import { OperatingHoursSection } from '@/components/trucks/OperatingHoursSection';
import { TruckBasicInfo } from '@/components/trucks/TruckBasicInfo';
import { useIsClient } from '@/hooks/useIsClient';
import type { FoodTruck, DailyOperatingHours, MenuItem } from '@/lib/types';
import { logError } from '@/lib/logging';

interface TruckDetailsProps {
  readonly truckId?: string;
  readonly truck?: FoodTruck;
  readonly onBack?: () => void;
}

// Format hours function to match existing pattern
const formatHours = (hours: DailyOperatingHours | undefined): string => {
  if (!hours || typeof hours !== 'object') return 'Hours not available';
  if ('closed' in hours && hours.closed === true) return 'Closed';
  if (typeof hours === 'object' && 'open' in hours && 'close' in hours) {
    const typedHours = hours as { open: string; close: string; closed?: boolean };
    return `${typedHours.open} - ${typedHours.close}`;
  }
  return 'Hours not available';
};

// Get today's hours function - client-only with proper SSR handling
const getTodayHours = (
  operatingHours: FoodTruck['operating_hours'],
  currentDay?: number,
): DailyOperatingHours | undefined => {
  if (!operatingHours) return undefined;

  const days = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;
  // Use provided currentDay or default to 0 (Sunday) for SSR compatibility
  const today = days[currentDay ?? 0];

  return operatingHours[today];
};

// Type guard functions for safe property access
const hasValidOperatingHours = (hours: unknown): hours is FoodTruck['operating_hours'] => {
  return hours != undefined && typeof hours === 'object';
};

const hasValidMenuItems = (items: unknown): items is MenuItem[] => {
  return Array.isArray(items);
};

const hasValidRating = (rating: unknown): rating is number => {
  return typeof rating === 'number' && !Number.isNaN(rating);
};

const hasValidReviewCount = (count: unknown): count is number => {
  return typeof count === 'number' && !Number.isNaN(count) && Number.isInteger(count);
};

const hasValidLocation = (
  location: unknown,
): location is NonNullable<FoodTruck['current_location']> => {
  return (
    location != undefined &&
    typeof location === 'object' &&
    ('address' in location || 'lat' in location || 'lng' in location)
  );
};

const hasValidContactInfo = (
  contact: unknown,
): contact is NonNullable<FoodTruck['contact_info']> => {
  return contact != undefined && typeof contact === 'object';
};

// Fallback method for older browsers - moved to outer scope
const fallbackCopyTextToClipboard = (text: string): void => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';

  document.body.append(textArea);
  textArea.focus();
  textArea.select();

  try {
    // Use modern clipboard API directly
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch((error_) => {
        logError('Modern clipboard API failed:', error_);
        // In the event that clipboard API is not available or fails,
        // we can prompt the user to copy manually
        globalThis.prompt('Copy to clipboard: Ctrl+C or Cmd+C, Enter to close', text);
      });
    } else {
      // If clipboard API is not available, prompt user to copy manually
      globalThis.prompt('Copy to clipboard: Ctrl+C or Cmd+C, Enter to close', text);
    }

    // Could add toast notification here
  } catch (error_) {
    logError('Fallback: Unable to copy', error_);
  }

  textArea.remove();
};

export default function TruckDetails({ truckId, truck: propTruck, onBack }: TruckDetailsProps) {
  const [truck, setTruck] = useState<FoodTruck | null>(propTruck ?? null);
  const [loading, setLoading] = useState(!propTruck);
  const [error, setError] = useState<string | null>(null);
  const [currentDay, setCurrentDay] = useState<number | undefined>();

  const [isFavorited, setIsFavorited] = useState(false);
  const isClient = useIsClient();

  // Set current day on client-side only to prevent hydration mismatch
  useEffect(() => {
    if (isClient) {
      setCurrentDay(new Date().getDay());
    }
  }, [isClient]);

  // This is a simplified version - in a real implementation, this would fetch from an API
  useEffect(() => {
    if (!propTruck && truckId) {
      // In a real implementation, fetch from API
      // For now, ensure we have proper handling without hardcoded values
      setError('Truck ID provided but no implementation to fetch truck details');
      setLoading(false);
    } else if (propTruck) {
      setTruck(propTruck);
      setError(null);
      setLoading(false);
    } else if (!truckId && !propTruck) {
      setError('No truck ID or truck object provided');
      setLoading(false);
    }
  }, [propTruck, truckId]);

  const handleBack = (): void => {
    if (onBack) {
      onBack();
    } else {
      globalThis.history.back();
    }
  };

  const handleFavorite = (): void => {
    setIsFavorited(!isFavorited);
    // Actual favorite functionality would be implemented via API
  };

  // Client-only clipboard function to prevent SSR issues
  const copyToClipboard = React.useCallback(async (text: string): Promise<void> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        // Could add toast notification here
      } catch (clipboardError) {
        logError('Error copying to clipboard:', clipboardError);
        // Final fallback: select text method
        fallbackCopyTextToClipboard(text);
      }
    } else {
      fallbackCopyTextToClipboard(text);
    }
  }, []);

  const handleShare = async (): Promise<void> => {
    // Check if Web Share API is available
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function' && truck) {
      try {
        await navigator.share({
          title: truck.name ?? 'Food Truck',
          text: truck.description ?? 'Food truck details',
          url: globalThis.location?.href ?? 'http://localhost:3000',
        });
      } catch (error_) {
        logError('Error sharing:', error_);
        // Fallback: copy to clipboard
        try {
          await copyToClipboard(
            globalThis.location?.href ?? 'http://localhost:3000',
          );
        } catch (copyError) {
          logError('Error copying to clipboard:', copyError);
        }
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await copyToClipboard(
          globalThis.location?.href ?? 'http://localhost:3000',
        );
      } catch (copyError) {
        logError('Error copying to clipboard:', copyError);
      }
    }
  };

  const handleGetDirections = (): void => {
    if (truck?.current_location && hasValidLocation(truck.current_location)) {
      const { lat, lng } = truck.current_location;
      if (lat != undefined && lng != undefined) {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        globalThis.open(url, '_blank');
      } else {
        logError('Missing coordinates for directions');
      }
    }
  };

  const handleCall = (): void => {
    if (hasValidContactInfo(truck?.contact_info) && truck?.contact_info?.phone) {
      globalThis.open(`tel:${truck.contact_info.phone}`, '_self');
    } else {
      logError('No phone number available');
    }
  };

  const handleVisitWebsite = (): void => {
    if (hasValidContactInfo(truck?.contact_info) && truck?.contact_info?.website) {
      globalThis.open(truck.contact_info.website, '_blank');
    } else {
      logError('No website available');
    }
  };

  if (loading) {
    return (
      <div
        className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow flex items-center justify-center">
          <div className="text-white text-lg">Loading truck details...</div>
        </div>
      </div>
    );
  }

  if (error || !truck) {
    return (
      <div
        className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
       
      >
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-lg mb-4">{error ?? 'Truck not found'}</div>
            <Button
              size="mobile"
              onClick={handleBack}
              className="bg-[var(--primary-color)] text-white"
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const todayHours = hasValidOperatingHours(truck.operating_hours)
    ? getTodayHours(truck.operating_hours, currentDay)
    : undefined;
  // Get menu data - check both menu and menu_items properties like desktop version
  const truckWithMenu = truck as { menu?: unknown; menu_items?: unknown };
  const menuData = truckWithMenu.menu ?? truck.menu_items;
  const allMenuItems = (hasValidMenuItems(menuData) ? menuData : []).map((item) => ({
    ...item,
    category: item.category ?? 'Menu',
  }));

  return (
    <TruckDetailsContent
      truck={truck}
      todayHours={todayHours}
      allMenuItems={allMenuItems}
      isFavorited={isFavorited}
      handleBack={handleBack}
      handleFavorite={handleFavorite}
      handleShare={handleShare}
      handleCall={handleCall}
      handleVisitWebsite={handleVisitWebsite}
      handleGetDirections={handleGetDirections}
      hasValidRating={hasValidRating}
      hasValidReviewCount={hasValidReviewCount}
    />
  );
}

const TruckDetailsContent = ({
  truck,
  todayHours,
  allMenuItems,
  isFavorited,
  handleBack,
  handleFavorite,
  handleShare,
  handleCall,
  handleVisitWebsite,
  handleGetDirections,
  hasValidRating,
  hasValidReviewCount,
}: {
  truck: FoodTruck | null;
  todayHours: DailyOperatingHours | undefined;
  allMenuItems: MenuItem[];
  isFavorited: boolean;
  handleBack: () => void;
  handleFavorite: () => void;
  handleShare: () => void;
  handleCall: () => void;
  handleVisitWebsite: () => void;
  handleGetDirections: () => void;
  hasValidRating: (rating: unknown) => rating is number;
  hasValidReviewCount: (count: unknown) => count is number;
}) => {
  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-black dark justify-between group/design-root overflow-x-hidden"
     
    >
      {/* Header */}
      <MobilePageHeader title="Truck Details" onBack={handleBack} />

      {/* Content */}
      <div className="flex-grow overflow-y-auto">
        <div className="p-4 space-y-6">
          {truck && (
            <>
              {/* Truck Header */}
              <PublicTruckDetailHeader truckName={truck.name} />

              {/* Quick Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="mobile"
                  onClick={handleFavorite}
                  className="flex-1 text-white border-white/20 hover:bg-white/10"
                >
                  <Heart
                    className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  {isFavorited ? 'Favorited' : 'Add to Favorites'}
                </Button>
                <Button
                  variant="outline"
                  size="mobile-icon"
                  onClick={handleShare}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {/* Basic Info */}
              <TruckBasicInfo truck={truck} />

              {/* Operating Hours & Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <OperatingHoursSection todayHours={todayHours} formatHours={formatHours} />
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <TruckRatingSection
                      averageRating={
                        hasValidRating(truck.average_rating) ? truck.average_rating : undefined
                      }
                      reviewCount={
                        hasValidReviewCount(truck.review_count) ? truck.review_count : undefined
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Menu */}
              {allMenuItems.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Menu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TruckMenuSection popularItems={allMenuItems} />
                  </CardContent>
                </Card>
              )}

              {/* Contact & Actions */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Contact & Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {truck?.current_location?.address && (
                    <div className="flex items-start gap-3 text-gray-300">
                      <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div>
                        <p className="text-white font-medium">Location</p>
                        <p className="text-sm">{truck?.current_location?.address}</p>
                      </div>
                    </div>
                  )}

                  <Separator className="bg-white/10" />

                  <div className="flex flex-wrap gap-2">
                    {truck?.contact_info?.phone && (
                      <Button
                        variant="outline"
                        size="mobile"
                        onClick={handleCall}
                        className="text-white border-white/20 hover:bg-white/10"
                      >
                        <Phone className="w-4 h-4 mr-2" />
                        Call
                      </Button>
                    )}

                    {truck?.contact_info?.website && (
                      <Button
                        variant="outline"
                        size="mobile"
                        onClick={handleVisitWebsite}
                        className="text-white border-white/20 hover:bg-white/10"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="mobile"
                      onClick={handleGetDirections}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Directions
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
