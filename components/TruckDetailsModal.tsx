'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type {
  PublicFoodTruck,
  FoodTruckDomain,
  SocialMedia,
  DailyOperatingHours,
} from '@/lib/types';
import { useTruckCard } from '@/hooks/useTruckCard';
import { formatPrice, formatTime12Hour, shouldShowTruckStatus } from '@/lib/utils/foodTruckHelpers';
import { safe } from '@/lib/utils/safeObject';
import { convertToDomain } from '@/lib/utils/foodTruckUtils';
import { X, MapPin, Clock, Phone, Star, ArrowLeft } from 'lucide-react';
import { GenericMenuSection } from '@/components/ui/GenericMenuSection';
import { SocialMediaSection } from '@/components/ui/SocialMediaSection';
import { ContactSection } from '@/components/ui/ContactSection';
import { logWarning } from '@/lib/logging';
import { useTruckContact } from '@/hooks/useTruckContact';

interface TruckDetailsModalProps {
  readonly truck: PublicFoodTruck | FoodTruckDomain | null | undefined;
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onBack?: () => void;
}

const TruckModalHeader = ({
  truck,
  name,
  cuisine_type,
  average_rating,
  review_count,
  onClose,
  onBack,
}: {
  truck: PublicFoodTruck;
  name: string;
  cuisine_type: string[];
  average_rating: number;
  review_count: number;
  onClose: () => void;
  onBack?: () => void;
}) => (
  <DialogHeader className="text-left">
    {/* Top row: Title on left, Badge + X button on right */}
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 h-8 w-8 hover:bg-transparent"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}
        <DialogTitle className="text-xl sm:text-2xl font-bold neon-text leading-tight truncate">
          {name}
        </DialogTitle>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {(() => {
          // Get the actual truck domain object to determine subscription tier
          // Use the discriminant property to reliably distinguish between types
          const truckDomain =
            '_type' in truck && truck._type === 'domain'
              ? (truck as FoodTruckDomain)
              : convertToDomain(truck); // convertToDomain now accepts both FoodTruck and PublicFoodTruck

          // Get the subscription tier from the truck data if available
          const rawTier = (truck as PublicFoodTruck & { subscription_tier?: string })
            .subscription_tier;
          // Only use the tier if it's a valid, non-empty string value
          const ownerTier =
            rawTier && typeof rawTier === 'string' && rawTier.trim() !== '' ? rawTier : undefined;

          // Use the new enhanced function that considers both owner and tier
          const actualIsOpen = shouldShowTruckStatus(truckDomain, ownerTier);

          return actualIsOpen === null ? null : (
            <Badge variant={actualIsOpen ? 'open' : 'secondary'}>
              {actualIsOpen ? 'Open Now' : 'Closed'}
            </Badge>
          );
        })()}
        <Button variant="ghost" size="icon" className="h-8 w-8 hover:neon-border" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
    </div>

    {/* Address row */}
    {truck.current_location?.address != undefined && truck.current_location.address !== '' && (
      <div className="flex items-start text-muted-foreground mt-1">
        <MapPin className="size-4 mr-2 mt-0.5 flex-shrink-0" />
        <span className="text-sm leading-snug">{truck.current_location.address}</span>
      </div>
    )}

    {/* Cuisine badges */}
    {cuisine_type.length > 0 && (
      <div className="flex flex-wrap gap-1.5 mt-3">
        {cuisine_type.map((cuisine) => (
          <Badge key={cuisine} variant="secondary" className="text-xs">
            {cuisine}
          </Badge>
        ))}
      </div>
    )}

    {/* Rating - optional */}
    {average_rating > 0 && (
      <div className="flex items-center text-sm text-muted-foreground mt-2">
        <Star className="size-4 mr-1 fill-yellow-400 text-yellow-400" />
        <span>{average_rating.toFixed(1)}</span>
        {review_count > 0 && <span className="ml-1">({review_count} reviews)</span>}
      </div>
    )}
  </DialogHeader>
);

const TruckModalContent = ({
  description,
  todayHours,
  popularItems,
  phone,
  email,
  website,
  social_media,
}: {
  description: string;
  todayHours: DailyOperatingHours | { closed: true } | undefined;
  popularItems: Array<{ name: string; price?: number }>;
  phone: string;
  email: string;
  website: string;
  social_media: Record<string, string | undefined> | SocialMedia;
}) => (
  <div className="space-y-5 mt-4">
    {description !== '' && (
      <div>
        <h3 className="text-base font-semibold mb-1.5">About</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
    )}

    {todayHours != undefined &&
      todayHours.closed !== true &&
      'open' in todayHours &&
      'close' in todayHours && (
        <div>
          <h3 className="text-base font-semibold mb-1.5 flex items-center">
            <Clock className="size-4 mr-2" />
            Today's Hours
          </h3>
          <p className="text-sm text-muted-foreground">
            {formatTime12Hour(todayHours.open)} - {formatTime12Hour(todayHours.close)}
          </p>
        </div>
      )}

    {/* Price Range removed - not using this field anymore */}

    {popularItems.length > 0 && (
      <div>
        <h3 className="text-base font-semibold mb-2">Popular Items</h3>
        <GenericMenuSection
          items={popularItems.map((item) => ({
            name: item.name,
            price: formatPrice(item.price ?? 0),
          }))}
        />
      </div>
    )}

    {(phone !== '' || email !== '' || website !== '') && (
      <div>
        <h3 className="text-base font-semibold mb-2 flex items-center">
          <Phone className="size-4 mr-2" />
          Contact Information
        </h3>
        <ContactSection contactInfo={{ phone, website }} />
      </div>
    )}

    {Object.keys(social_media).length > 0 && (
      <div>
        <h3 className="text-base font-semibold mb-2">Follow Us</h3>
        <SocialMediaSection socialMedia={social_media} />
      </div>
    )}
  </div>
);

export function TruckDetailsModal({
  truck,
  isOpen,
  onClose,
  onBack,
}: Omit<TruckDetailsModalProps, 'isTruckOpen'>) {
  // Call hooks unconditionally to comply with React Rules of Hooks
  // Use a minimal fallback object when truck is null/undefined (hook result unused in that case)
  const truckForHook = (truck?.id == undefined ? { id: '', name: '' } : truck) as PublicFoodTruck;
  const { popularItems, todayHours } = useTruckCard(truckForHook);
  const directContact = useTruckContact(isOpen ? truck?.id : undefined);

  // Defensive checks for required data (after hooks)
  if (truck?.id == undefined) {
    logWarning('TruckDetailsModal open but truck data missing');
    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle>Error</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Unable to load truck details. Invalid data.</p>
          <Button onClick={onClose} variant="default">
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
  // Cast to PublicFoodTruck for internal components - safe since we checked truck.id above
  const truckData = truck as PublicFoodTruck;

  // Convert null to undefined for the component props
  const todayHoursForProps = todayHours ?? undefined;

  // Normalize fields to handle undefined/null values safely
  const name = truck.name ?? 'Unnamed Truck';
  const description = truck.description ?? '';
  const cuisine_type = Array.isArray(truck.cuisine_type) ? truck.cuisine_type : [];
  const average_rating =
    typeof (truck as { average_rating?: unknown }).average_rating === 'number'
      ? (truck as { average_rating?: number }).average_rating!
      : 0; // supports nullable values
  const review_count =
    typeof (truck as { review_count?: unknown }).review_count === 'number'
      ? (truck as { review_count?: number }).review_count!
      : 0; // supports nullable values

  // Safely extract social media and contact info with safe utility
  const socialMedia = safe(truck.social_media);
  const safeContact = safe(truck.contact_info);
  const phone = directContact.phone ?? '';
  const email = directContact.email ?? '';
  const website = safeContact.website ?? '';

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="glass w-[calc(100%-2rem)] sm:w-auto sm:max-w-2xl max-h-[85vh] overflow-y-auto z-[10001]">
        <TruckModalHeader
          truck={truckData}
          name={name}
          cuisine_type={cuisine_type}
          average_rating={average_rating}
          review_count={review_count}
          onClose={onClose}
          onBack={onBack}
        />
        <TruckModalContent
          description={description}
          todayHours={todayHoursForProps}
          popularItems={popularItems}
          phone={phone}
          email={email}
          website={website}
          social_media={socialMedia}
        />
        {/* Book Catering - Coming Soon (hidden for now)
            Will be enabled for paid tiers (pro) once payment processor is decided
        */}
      </DialogContent>
    </Dialog>
  );
}
