'use client';

import { DynamicMapComponent } from '@/components/map/DynamicMapComponent';
import type { PublicFoodTruck, FoodTruckDomain } from '@/lib/types';
import { REGION_FALLBACK } from '@/lib/utils/geocoding';
import { logWarning } from '@/lib/logging';

interface MapSectionProps {
  readonly filteredTrucks: (PublicFoodTruck | FoodTruckDomain)[];
  readonly userLocation: { lat: number; lng: number } | undefined;
  readonly selectedTruckId: string | undefined;
  readonly setSelectedTruckId: (id: string | undefined) => void;
  readonly theme: string | undefined;
  readonly className?: string;
  readonly shouldSkipUserCenter?: boolean;
  readonly onUserLocate?: (location: { lat: number; lng: number }) => void;
}

/**
 * MapSection component responsible for rendering the map with truck locations and user location.
 * @example
 * MapSection({
 *   filteredTrucks: [{ id: 1, location: { lat: 37.7749, lng: -122.4194 } }],
 *   userLocation: { lat: 37.7749, lng: -122.4194 },
 *   selectedTruckId: 1,
 *   setSelectedTruckId: (id) => logDebug(id),
 * })
 * // Returns a div component containing a DynamicMap component
 * @param {Array<Object>} filteredTrucks - List of filtered truck objects with their id and location.
 * @param {Object} userLocation - Object containing the latitude and longitude of the user's location.
 * @param {number} selectedTruckId - Identifier for the currently selected truck on the map.
 * @param {Function} setSelectedTruckId - Callback function to set the ID of the selected truck.
 * @returns {JSX.Element} Returns a div container with embedded DynamicMap component.
 * @description
 *   - Uses DynamicMap component to render trucks and user on the map.
 *   - Falls back to a default location if userLocation is not provided.
 *   - Highlights selected truck's location on the map.
 *   - Applies styling to ensure responsive map dimensions.
 */
// Helper function to get selected truck location
// Returns coordinates in [longitude, latitude] format for Mapbox
function getSelectedTruckLocation(
  selectedTruckId: string | undefined,
  filteredTrucks: (PublicFoodTruck | FoodTruckDomain)[],
): [number, number] | undefined {
  if (selectedTruckId == undefined) return undefined;

  const truck = filteredTrucks.find((t) => t.id === selectedTruckId);
  const location = truck?.current_location;
  if (location?.lat == null || location.lng == null) return undefined;

  // Ensure coordinates are valid numbers and within reasonable ranges
  const lat = Number(location.lat);
  const lng = Number(location.lng);

  // Validate coordinates are within valid ranges
  if (Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    logWarning(
      `Invalid coordinates for truck ${truck?.name ?? truck?.id}: lat=${location.lat}, lng=${location.lng}`,
    );
    return undefined;
  }

  return [lng, lat]; // [longitude, latitude] for Mapbox
}

export function MapSection({
  filteredTrucks,
  userLocation,
  selectedTruckId,
  setSelectedTruckId,
  theme: _theme,
  className,
  shouldSkipUserCenter = false,
  onUserLocate,
}: Readonly<MapSectionProps>) {
  // FLOW: When URL has truck param, defaultCenter uses truck location instead of user GPS
  // This prevents map from initializing on user location before truck centering happens
  return (
    <div
      className={`h-full w-full bg-muted rounded-lg shadow overflow-hidden ${className ?? ''}`}
    >
      <div className="h-full w-full">
        <DynamicMapComponent
          trucks={filteredTrucks}
          userLocation={userLocation}
          selectedTruckId={selectedTruckId}
          onSelectTruck={setSelectedTruckId}
          defaultCenter={
            getSelectedTruckLocation(selectedTruckId, filteredTrucks) ?? [
              userLocation?.lng ?? REGION_FALLBACK.lng,
              userLocation?.lat ?? REGION_FALLBACK.lat,
            ]
          }
          selectedTruckLocation={getSelectedTruckLocation(selectedTruckId, filteredTrucks)}
          shouldSkipUserCenter={shouldSkipUserCenter}
          onUserLocate={onUserLocate}
        />
      </div>
    </div>
  );
}
