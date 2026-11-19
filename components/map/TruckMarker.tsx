import React, { useEffect } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { logDebug } from '@/lib/logging';
import { getStatusRingClass } from '@/lib/utils/statusRing';
import Image from 'next/image';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';
import { resolveActiveLocation } from '@/lib/services/activeLocation';

export interface TruckMarkerProps {
  truck: FoodTruck | FoodTruckDomain;
  onClick: () => void;
}

export const TruckMarker = React.memo(({ truck, onClick }: TruckMarkerProps) => {
  const [imageError, setImageError] = React.useState(false);
  logDebug('TruckMarker truck object:', truck);
  // Note: getStatusRingClass handles type conversion internally
  // Status ring class is now handled by getStatusRingClass helper

  // Date-aware: on a dated event's service date the pin follows the event spot
  const activeLocation = resolveActiveLocation(truck);
  const lat = activeLocation?.lat;
  const lng = activeLocation?.lng;

  // Get profile image URL for avatar marker
  const profileImageUrl =
    (truck as FoodTruck).social_media?.photo_url ?? (truck as FoodTruck).image_url ?? null;

  // Reset image error state when profile image URL changes
  // FIXED: Moved useEffect BEFORE early return to comply with React Hooks rules (S6960)
  useEffect(() => {
    setImageError(false);
  }, [profileImageUrl]);

  // Validate coordinates before rendering marker
  if (
    lat == null ||
    lng == null ||
    Number.isNaN(lat) ||
    Number.isNaN(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return null; // Don't render marker if coordinates are invalid
  }

  return (
    <Marker latitude={lat} longitude={lng} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div
        className={`avatar-marker ${getStatusRingClass(truck)}`}
        style={{
          backgroundColor: '#1a1a1a',
        }}
      >
        {profileImageUrl && !imageError ? (
          <div className="relative w-full h-full">
            <Image
              src={profileImageUrl}
              alt={truck.name}
              fill
              sizes="64px"
              className="rounded-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="relative w-full h-full">
            <Image
              src={TRUCK_FALLBACK_IMAGE}
              alt="TruckFull"
              fill
              sizes="64px"
              className="rounded-full object-cover"
            />
          </div>
        )}
      </div>
    </Marker>
  );
});

TruckMarker.displayName = 'TruckMarker';
