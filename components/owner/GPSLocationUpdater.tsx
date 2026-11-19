'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGPSLocation } from '@/hooks/useGpsLocation';
import { MapPin, Loader2, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { FoodTruckDomain } from '@/lib/types';

interface GPSLocationUpdaterProps {
  readonly truck: FoodTruckDomain;
  readonly onLocationUpdate: (lat: number, lng: number, address?: string) => Promise<void>;
}

export default function GPSLocationUpdater({ truck, onLocationUpdate }: GPSLocationUpdaterProps) {
  const {
    latitude,
    longitude,
    accuracy,
    error,
    loading,
    permission,
    getCurrentLocation,
    isGeolocationSupported,
  } = useGPSLocation();

  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleUpdateLocation = async () => {
    if (!latitude || !longitude) {
      setUpdateError('No location data available. Please get your current location first.');
      return;
    }

    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(false);

    try {
      await onLocationUpdate(latitude, longitude);
      setUpdateSuccess(true);
      setUpdateError(null);
    } catch (error_) {
      setUpdateError(
        error_ instanceof Error ? error_.message : 'Failed to update location. Please try again.',
      );
      setUpdateSuccess(false);
    } finally {
      setIsUpdating(false);
    }
  };

  const getPermissionBadge = () => {
    switch (permission) {
      case 'granted': {
        return <Badge variant="default" className="bg-green-600">Granted</Badge>;
      }
      case 'denied': {
        return <Badge variant="destructive">Denied</Badge>;
      }
      case 'prompt': {
        return <Badge variant="secondary">Needed</Badge>;
      }
      case 'unsupported': {
        return <Badge variant="outline">Not Supported</Badge>;
      }
      default: {
        return <Badge variant="secondary">Unknown</Badge>;
      }
    }
  };

  if (!isGeolocationSupported) {
    return (
      <div className="bg-card rounded-lg p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">GPS Location Not Supported</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Your browser does not support geolocation services. Please update your browser or try a
          different device.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-4 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">{truck.name}</h3>
      </div>

      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
        <span className="text-sm">Location Permission:</span>
        {getPermissionBadge()}
      </div>

      <Button
        onClick={() => {
          void getCurrentLocation(true);
        }}
        disabled={loading}
        variant="ghost"
        className="w-full bg-primary/10 text-primary font-semibold hover:bg-primary/15 no-hover-effects"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting Location...
          </>
        ) : (
          <>
            <MapPin className="mr-2 h-4 w-4" />
            Get Current Location
          </>
        )}
      </Button>

      {latitude && longitude && (
        <div className="space-y-1 p-3 bg-muted/50 rounded-md">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Coordinates:</span>
            <span className="font-mono text-xs">
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </span>
          </div>
          {accuracy && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Accuracy:</span>
              <span>{accuracy.toFixed(2)}m</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {latitude && longitude && (
        <Button
          onClick={() => void handleUpdateLocation()}
          disabled={isUpdating}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isUpdating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating Location...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Update Truck Location
            </>
          )}
        </Button>
      )}

      {updateSuccess && (
        <div className="flex items-center gap-2 p-3 bg-green-600/10 text-green-500 rounded-md">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">Location updated successfully!</span>
        </div>
      )}

      {updateError && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{updateError}</span>
        </div>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setUpdateSuccess(false);
          setUpdateError(null);
        }}
        className="w-full text-muted-foreground hover:bg-muted"
      >
        <RefreshCw className="mr-2 h-4 w-4" />
        Clear Status
      </Button>
    </div>
  );
}
