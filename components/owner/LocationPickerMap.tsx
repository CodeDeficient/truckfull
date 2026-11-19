'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { Marker, type MapRef } from 'react-map-gl/mapbox';
import { MapPin } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { logDebug } from '@/lib/logging';

interface LocationPickerMapProps {
  readonly latitude?: number;
  readonly longitude?: number;
  readonly onLocationChange: (lat: number, lng: number) => void;
}

export default function LocationPickerMap({
  latitude,
  longitude,
  onLocationChange,
}: LocationPickerMapProps) {
  const mapRef = useRef<MapRef>(null);
   
  const mapboxAccessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

  logDebug('[LocationPickerMap] Mapbox token exists:', !!mapboxAccessToken);

  // Initialize with provided coords or default to Augusta, GA
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number }>({
    lat: latitude || 33.4735,
    lng: longitude || -81.9748,
  });

  const [viewState, setViewState] = useState({
    longitude: longitude || -81.9748,
    latitude: latitude || 33.4735,
    zoom: 18, // Increased zoom for better label visibility
  });

  // Update marker when props change
  useEffect(() => {
    if (latitude && longitude) {
      setMarkerPosition({ lat: latitude, lng: longitude });
      setViewState((prev) => ({
        ...prev,
        latitude,
        longitude,
      }));
    }
  }, [latitude, longitude]);

  const handleMapClick = useCallback(
    (event: { lngLat: { lat: number; lng: number } }) => {
      const { lngLat } = event;
      const newPosition = { lat: lngLat.lat, lng: lngLat.lng };

      setMarkerPosition(newPosition);
      onLocationChange(newPosition.lat, newPosition.lng);

      logDebug('[LocationPicker] New location selected:', newPosition);
    },
    [onLocationChange],
  );

  const handleMapLoad = useCallback(() => {
    logDebug('[LocationPickerMap] Map loaded successfully');
    logDebug('[LocationPickerMap] Map style: mapbox://styles/mapbox/streets-v12');
    logDebug('[LocationPickerMap] Current zoom:', viewState.zoom);
  }, [viewState.zoom]);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden border border-border relative">
      <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md shadow-lg border border-border">
        <p className="text-sm font-medium text-foreground">
          Click anywhere on the map to set location
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Current: {markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}
        </p>
      </div>

      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt: { viewState: typeof viewState }) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        onLoad={handleMapLoad}
        mapboxAccessToken={mapboxAccessToken}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        projection={{ name: 'mercator' }}
        maxZoom={20}
        minZoom={10}
        maxPitch={0}
        minPitch={0}
        dragRotate={false}
        attributionControl={false}
        cursor="crosshair"
      >
        {/* Marker at selected position */}
        <Marker latitude={markerPosition.lat} longitude={markerPosition.lng} anchor="bottom">
          <div className="relative">
            <MapPin
              className="h-10 w-10 text-red-500 fill-red-500 drop-shadow-lg animate-bounce"
              style={{ filter: 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.5))' }}
            />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500/30 rounded-full blur-sm"></div>
          </div>
        </Marker>
      </Map>
    </div>
  );
}
