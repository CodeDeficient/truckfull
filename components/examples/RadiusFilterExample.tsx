/* eslint-disable max-lines-per-function -- NOTE: Split example into smaller pieces later. */
'use client';

import { useState, useEffect } from 'react';
import { RadiusControl } from '@/components/filters/RadiusControl';
import { useRadiusFilter } from '@/hooks/useRadiusFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Loader2 } from 'lucide-react';
import type { FoodTruck } from '@/lib/types';
import { logError, logMessage } from '@/lib/logging';

// Nearby API may include distance_meters alongside FoodTruck fields
type NearbyTruck = FoodTruck & { distance_meters?: number };

/**
 * Example implementation of the enhanced radius control with debouncing,
 * URL synchronization, and API integration.
 *
 * This example demonstrates:
 * - Radius control with live updates (1-50 miles range)
 * - Debounced API calls to prevent excessive requests
 * - URL state synchronization for shareable filters
 * - Loading states during updates
 * - Integration with the filter store
 */
export function RadiusFilterExample() {
  const [trucks, setTrucks] = useState<NearbyTruck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Use the radius filter hook for complete integration
  const {
    radius,
    debouncedRadius,
    hasLocation,
    userLocation,
    isUpdating,
    setRadius,
    handleImmediateChange,
  } = useRadiusFilter({
    autoFetch: true,
    debounceDelay: 500,
    onFetchTrucks: async (radiusMiles, lat, lng) => {
      setLoading(true);
      setError(undefined);

      try {
        const response = await fetch(
          `/api/trucks/nearby?lat=${lat}&lng=${lng}&radius=${radiusMiles}`,
        );

        if (!response.ok) {
          throw new Error('Failed to fetch trucks');
        }

        const data = (await response.json()) as unknown as { trucks?: NearbyTruck[] };
        setTrucks(data.trucks ?? []);
        return data.trucks ?? [];
      } catch (error_) {
        setError('Failed to load food trucks. Please try again.');
        logError('Error fetching trucks:', error_);
        return [];
      } finally {
        setLoading(false);
      }
    },
  });

  // Fetch trucks when debounced radius changes
  useEffect(() => {
    if (hasLocation && debouncedRadius !== radius) {
      // The fetching is handled by the hook's autoFetch
      logMessage(`Fetching trucks within ${debouncedRadius} miles...`);
    }
  }, [debouncedRadius, radius, hasLocation]);

  return (
    <div className="space-y-6">
      {/* Radius Control Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Search Radius Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadiusControl
            value={radius}
            onChange={setRadius}
            hasLocation={hasLocation}
            min={1}
            max={50}
            step={1}
            debounce={true}
            debounceDelay={500}
            onImmediateChange={handleImmediateChange}
          />

          {/* Status indicators */}
          <div className="mt-4 space-y-2 text-sm">
            {userLocation && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                Location: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </div>
            )}

            {isUpdating && (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating search radius...
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-amber-600">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading food trucks...
              </div>
            )}

            {(error ?? '') !== '' && <div className="text-red-600">{error}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Search Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Current Radius:</span>
              <span className="font-semibold">
                {radius} {radius === 1 ? 'mile' : 'miles'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">API Radius (debounced):</span>
              <span className="font-semibold">
                {debouncedRadius} {debouncedRadius === 1 ? 'mile' : 'miles'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Trucks Found:</span>
              <span className="font-semibold">
                {trucks.length} {trucks.length === 1 ? 'truck' : 'trucks'}
              </span>
            </div>

            {trucks.length > 0 && (
              <div className="pt-3 border-t">
                <h4 className="font-medium mb-2">Nearby Trucks:</h4>
                <ul className="space-y-1">
                  {trucks.slice(0, 5).map((truck) => (
                    <li key={truck.id} className="text-sm">
                      • {truck.name}
                      {truck.distance_meters != undefined && (
                        <span className="text-muted-foreground ml-2">
                          ({(truck.distance_meters / 1609.34).toFixed(1)} mi)
                        </span>
                      )}
                    </li>
                  ))}
                  {trucks.length > 5 && (
                    <li className="text-sm text-muted-foreground">
                      ... and {trucks.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Implementation Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>✓ Radius adjustable from 1-50 miles with step of 1</p>
            <p>✓ Live miles label updates immediately as you drag</p>
            <p>✓ API calls are debounced by 500ms to prevent overload</p>
            <p>✓ State persists in FiltersStore and URL query params</p>
            <p>✓ Works with current user location or map center</p>
            <p>✓ Preset buttons for quick radius selection</p>
            <p>✓ Visual feedback during updates</p>
            <p>✓ Fully accessible with ARIA attributes</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
