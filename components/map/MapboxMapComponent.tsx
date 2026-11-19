import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Map,
  Marker,
  NavigationControl,
  GeolocateControl,
  type ViewState,
  type MapRef,
} from 'react-map-gl/mapbox';
import Supercluster from 'supercluster';
import type { FoodTruck, FoodTruckDomain } from '@/lib/types';
import { calculateDistance } from '@/lib/utils/foodTruckHelpers';
import { getStatusRingClass } from '@/lib/utils/statusRing';
import { TRUCK_FALLBACK_IMAGE } from '@/lib/utils/photoTransform';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useMapLayerControl } from './useMapLayerControl';
import { EnhancedTruckPopup } from './EnhancedTruckPopup';
import { resolveActiveLocation, hasValidCoordinates } from '@/lib/services/activeLocation';
import { TruckAccordionItem } from '@/components/trucks/TruckAccordionItem';
import { logDebug, logMessage } from '@/lib/logging';
import { REGION_FALLBACK } from '@/lib/utils/geocoding';
import { useFavorites } from '@/hooks/useFavorites';
import { MapErrorState } from './MapErrorState';
import {
  useMapClustering,
  type SuperClusterFeature,
  type ClusterFeature,
  type PointFeature,
  type SuperClusterProperties,
} from './useMapClustering';

// Helper function to safely get Mapbox access token
const getMapboxAccessToken = (propAccessToken?: string): string | undefined => {
  // Priority 1: Environment variable (standard Next.js way)
  if (process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
    return process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  }

  // Priority 2: Injected window property (fallback for legacy/testing)
  if (typeof globalThis !== 'undefined' && globalThis.window) {
    // Extend the Window interface to include our custom property
    interface ExtendedWindow extends Window {
      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?: string;
    }
    const extendedWindow = globalThis.window as ExtendedWindow;
    if (extendedWindow.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) {
      return extendedWindow.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    }
  }

  // Priority 3: Provided prop
  return propAccessToken;
};

// Helper functions for cluster styling (outside component to avoid recreating on each render)
const getClusterSize = (count: number): string => {
  if (count >= 10) return 'w-14 h-14';
  if (count >= 5) return 'w-12 h-12';
  return 'w-10 h-10';
};

const getFontSize = (count: number): string => {
  if (count >= 10) return 'text-sm';
  return 'text-xs';
};

const extractClusterTrucks = (
  cluster: ClusterFeature,
  clusterIndex: Supercluster<Record<string, unknown>, SuperClusterProperties> | undefined,
): FoodTruck[] => {
  if (!clusterIndex || cluster.id == null) return [];
  try {
    const leaves: SuperClusterFeature[] = clusterIndex.getLeaves(cluster.id as number, Infinity, 0);
    return leaves
      .filter((leaf: SuperClusterFeature) => !leaf.properties?.cluster)
      .map((leaf: SuperClusterFeature) => leaf.properties.truck)
      .filter((truck): truck is FoodTruck => truck !== undefined);
  } catch {
    return [];
  }
};

export interface MapboxMapComponentProps {
  readonly trucks: (FoodTruck | FoodTruckDomain)[];
  readonly userLocation?: { lat: number; lng: number };
  readonly defaultCenter?: [number, number];
  readonly defaultZoom?: number;
  readonly onSelectTruck?: (truckId: string | undefined) => void;
  readonly selectedTruckId?: string;
  readonly selectedTruckLocation?: [number, number];
  readonly mapStyle?: string;
  readonly onMapLoad?: (map: MapRef) => void;
  // Mobile-specific layout flag
  readonly isMobile?: boolean; // Added for mobile-specific behavior
  // Control visibility flags
  readonly attributionControl?: boolean;
  readonly hideLogo?: boolean;
  readonly onClusterSelect?: (clusterId: number, trucks: FoodTruck[]) => void;
  readonly allowBottomNavOffset?: boolean; // Control if mobile offset for nav bar is applied
  readonly customOffset?: [number, number]; // Added for smart centering offset
  readonly externalCenter?: [number, number]; // Added for imperative centering (e.g. from sidebar)
  readonly customMapStyle?: string; // Custom Mapbox style URL (e.g. satellite)
  readonly maxBounds?: [[number, number], [number, number]]; // Override default US bounds (e.g. SC/GA only for Field Guide)
  readonly children?: React.ReactNode;
  readonly shouldSkipUserCenter?: boolean; // Skip auto-centering on user location when URL param exists
  readonly hideGeolocate?: boolean;
  readonly onUserLocate?: (location: { lat: number; lng: number }) => void;
}

interface TruckMarkerProps {
  truck: FoodTruck | FoodTruckDomain;
  onClick: () => void;
}

const TruckMarker = React.memo(({ truck, onClick }: TruckMarkerProps) => {
  logDebug('TruckMarker truck object:', truck);

  const [imgError, setImgError] = useState(false);

  // Date-aware: on a dated event's service date the pin follows the event spot
  const activeLocation = resolveActiveLocation(truck);
  const lat = activeLocation?.lat;
  const lng = activeLocation?.lng;
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
    return null;
  }

  const profileImageUrl =
    (truck as FoodTruck).social_media?.photo_url ?? (truck as FoodTruck).image_url ?? null;

  const src = profileImageUrl && !imgError ? profileImageUrl : TRUCK_FALLBACK_IMAGE;

  return (
    <Marker latitude={lat} longitude={lng} onClick={onClick} style={{ cursor: 'pointer' }}>
      <div
        className={`avatar-marker ${getStatusRingClass(truck)}`}
        style={{
          backgroundColor: '#1a1a1a',
          position: 'relative',
        }}
      >
        <Image
          src={src}
          alt={truck.name}
          fill
          sizes="48px"
          className="rounded-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    </Marker>
  );
});

// Cluster marker component
interface ClusterMarkerProps {
  cluster: ClusterFeature;
  onClick: (cluster: ClusterFeature, longitude: number, latitude: number) => void;
}

const ClusterMarker = React.memo(({ cluster, onClick }: ClusterMarkerProps) => {
  const [longitude, latitude] = cluster.geometry.coordinates;
  const { point_count } = cluster.properties;

  const clusterSize = getClusterSize(point_count ?? 0);
  const fontSize = getFontSize(point_count ?? 0);

  return (
    <Marker latitude={latitude} longitude={longitude}>
      <button
        type="button"
        className={`flex items-center justify-center rounded-full border-[3px] ${clusterSize} bg-black border-white shadow-lg cursor-pointer transition-transform hover:scale-110`}
        onClick={() => onClick(cluster, longitude, latitude)}
        aria-label={`Cluster with ${point_count} trucks`}
      >
        <span
          className={`${fontSize} font-bold text-rose-200`}
          data-testid="cluster-count"
          style={{ textShadow: '0 0 6px #dc2626, 0 0 12px #dc2626' }}
        >
          {point_count}
        </span>
      </button>
    </Marker>
  );
});

const MapboxMapComponent: React.FC<MapboxMapComponentProps> = ({
  trucks,
  userLocation,
  defaultCenter,
  defaultZoom = 12,
  selectedTruckId,
  selectedTruckLocation,
  onSelectTruck,
  onClusterSelect,
  mapStyle = 'mapbox://styles/mapbox/streets-v11',
  onMapLoad,
  isMobile = false,
  attributionControl = true,
  hideLogo = false,
  allowBottomNavOffset = true,
  customOffset,
  externalCenter,
  customMapStyle,
  maxBounds,
  children,
  shouldSkipUserCenter = false,
  hideGeolocate = false,
  onUserLocate,
}) => {
  const { favoriteIds, toggleFavorite } = useFavorites();
  logDebug('🗺️ MapboxMapComponent render - selectedTruckId:', selectedTruckId);

  // Use the provided token or fall back to the injected environment variable
  // The token is injected in the layout file for client-side access
  const mapboxAccessToken = getMapboxAccessToken(); // Removed propAccessToken from here

  // Check if we have a valid Mapbox access token
  const hasValidMapboxToken = Boolean(
    mapboxAccessToken && mapboxAccessToken !== 'your_mapbox_access_token_here',
  );

  // Hooks must be called unconditionally - error state is rendered at end
  const isProcessingTruckClick = useRef(false);
  const recentlyClickedTruckId = useRef<string | null>(null);
  const viewStateRef = useRef<ViewState>({
    longitude: 0,
    latitude: 0,
    zoom: 0,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, left: 0, right: 0, bottom: 0 },
  });
  const [selectedTruck, setSelectedTruck] = useState<FoodTruck | FoodTruckDomain | null>(null);
  const [navigatedFromCluster, setNavigatedFromCluster] = useState<boolean>(false);
  const [viewState, setViewState] = useState<ViewState>(() => {
    // Initialize with default location, let GeolocateControl handle user location
    // defaultCenter is [longitude, latitude]
    const initialLongitude = defaultCenter?.[0]; // longitude
    const initialLatitude = defaultCenter?.[1]; // latitude

    // Validate coordinates before setting initial view state
    const longitude =
      initialLongitude != null &&
      !Number.isNaN(initialLongitude) &&
      initialLongitude >= -180 &&
      initialLongitude <= 180
        ? initialLongitude
        : REGION_FALLBACK.lng;
    const latitude =
      initialLatitude != null &&
      !Number.isNaN(initialLatitude) &&
      initialLatitude >= -90 &&
      initialLatitude <= 90
        ? initialLatitude
        : REGION_FALLBACK.lat;

    return {
      longitude,
      latitude,
      zoom: defaultZoom,
      bearing: 0,
      pitch: 0,
      padding: { top: 0, left: 0, right: 0, bottom: 0 },
    };
  });

  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const isUpdatingFromHandler = useRef(false);

  useEffect(() => {
    isProcessingTruckClick.current = false;
    recentlyClickedTruckId.current = null;
    return () => {
      isProcessingTruckClick.current = false;
      recentlyClickedTruckId.current = null;
    };
  }, []);

  // Use the clustering hook for all SuperCluster logic
  const { clusterIndex, clusters, offsetIdenticalLocations } = useMapClustering({
    trucks,
    viewState,
  });

  // Track truck and cluster counts for component logic
  // Note: These variables are tracked but not currently used in the component logic
  // They are kept for future debugging and monitoring purposes

  // Handle truck selection
  const handleTruckClick =
    (truck: FoodTruck | FoodTruckDomain, fromCluster: boolean = false, fromMap: boolean = true) =>
    () => {
      if (fromCluster && clusterDetails) {
        // Store the current cluster details so we can return to them later
        previousClusterDetailsRef.current = clusterDetails;
      }

      // Set the flag to indicate we're processing a truck click
      isProcessingTruckClick.current = true;

      // Only track as recently clicked from map if it was actually clicked on the map
      recentlyClickedTruckId.current = fromMap ? truck.id : null;

      setSelectedTruck(truck);
      setNavigatedFromCluster(fromCluster);
      // Pass a flag to indicate this is a map pin click (which should not trigger re-centering)
      onSelectTruck?.(truck.id);

      // Use Mapbox's flyTo with offset to properly center the popup in the viewport
      // This dynamically accounts for popup size and positions it optimally
      // Only fly to when the click came from the map, otherwise the parent will handle centering
      const clickedLocation = resolveActiveLocation(truck);
      if (fromMap && hasValidCoordinates(clickedLocation) && mapRef.current) {
        const map = mapRef.current.getMap();

        // Fly to the truck location with an offset to center appropriately
        // For mobile: negative offset shifts view up so pin is above bottom sheet (like clusters)
        // For desktop: positive offset shifts view down so popup appears above the pin
        const yOffset = isMobile ? -150 : 150;

        map.flyTo({
          center: [clickedLocation.lng, clickedLocation.lat],
          zoom: Math.max(map.getZoom(), 14),
          offset: [0, yOffset],
          duration: 800,
          essential: true,
        });
      }

      // Reset the flag after a delay to allow the flyTo animation to complete
      setTimeout(() => {
        isProcessingTruckClick.current = false;
      }, 1000); // Allow up to 1 second for the flyTo animation to complete
    };

  // State for cluster details modal
  const [clusterDetails, setClusterDetails] = useState<{
    cluster: ClusterFeature;
    trucks: FoodTruck[];
    position: [number, number];
  } | null>(null);

  // Ref to store previous cluster details when navigating from cluster to truck
  const previousClusterDetailsRef = useRef<{
    cluster: ClusterFeature;
    trucks: FoodTruck[];
    position: [number, number];
  } | null>(null);

  // Helper function to handle cluster expansion logic to reduce nesting
  const handleSmallClusterExpansion = useCallback(
    (
      cluster: ClusterFeature,
      clusterIndex: Supercluster<Record<string, unknown>, SuperClusterProperties> | undefined,
      longitude: number,
      latitude: number,
    ): boolean => {
      if (cluster.id == null || !clusterIndex) return false;

      const trucks = extractClusterTrucks(cluster, clusterIndex);

      if (trucks.length > 0) {
        setClusterDetails({
          cluster,
          trucks,
          position: [longitude, latitude],
        });
        return true;
      }

      const expansionZoom =
        clusterIndex && cluster.id != null
          ? Math.min(clusterIndex.getClusterExpansionZoom(cluster.id as number), 16)
          : 15;

      setViewState((prev) => ({
        ...prev,
        longitude,
        latitude,
        zoom: expansionZoom,
      }));

      return true;
    },
    [setClusterDetails, setViewState],
  );

  // Handle mobile cluster click - delegate to parent with truck list
  const handleMobileClusterClick = useCallback(
    (cluster: ClusterFeature) => {
      if (!clusterIndex || cluster.id == null) return;
      logDebug('📱 Mobile cluster click, delegating to parent immediately');

      const geometry = cluster.geometry as GeoJSON.Point;
      const [clusterLng, clusterLat] = geometry.coordinates;

      mapRef.current?.flyTo({
        center: [clusterLng, clusterLat],
        zoom: viewState.zoom,
        offset: [0, -150],
        duration: 800,
      });

      const trucks = extractClusterTrucks(cluster, clusterIndex);
      onClusterSelect?.(cluster.id as number, trucks);
    },
    [clusterIndex, viewState.zoom, onClusterSelect],
  );

  // Handle large cluster - show modal with truck list
  const handleLargeClusterModal = useCallback(
    (cluster: ClusterFeature, longitude: number, latitude: number) => {
      if (!clusterIndex) return;
      const trucks = extractClusterTrucks(cluster, clusterIndex);
      logDebug('🔵 Opening cluster modal with', trucks.length, 'trucks');
      setClusterDetails({
        cluster,
        trucks,
        position: [longitude, latitude],
      });
    },
    [clusterIndex],
  );

  // Expand cluster to appropriate zoom level
  const expandCluster = useCallback(
    (cluster: ClusterFeature, longitude: number, latitude: number) => {
      if (!clusterIndex || cluster.id == null) return;
      const expansionZoom = Math.min(
        clusterIndex.getClusterExpansionZoom(cluster.id as number),
        16,
      );
      setViewState((prev) => ({
        ...prev,
        longitude,
        latitude,
        zoom: expansionZoom,
      }));
    },
    [clusterIndex, setViewState],
  );

  const handleClusterClick = useCallback(
    (cluster: ClusterFeature, longitude: number, latitude: number) => {
      logDebug('🔵 CLUSTER CLICKED', { cluster, longitude, latitude });
      const isCluster = cluster.properties?.cluster === true;

      if (!isCluster) {
        const truck = cluster.properties.truck;
        if (truck) {
          handleTruckClick(truck, false, true)();
        }
        return;
      }

      const clusterSize = cluster.properties.point_count ?? 0;
      logDebug('🔵 Cluster size:', clusterSize, 'zoom:', viewState.zoom);

      if (isMobile && onClusterSelect && cluster.id != null && clusterIndex) {
        handleMobileClusterClick(cluster);
        return;
      }

      if (clusterSize <= 10) {
        if (clusterIndex && viewState.zoom < 15 && cluster.id != null) {
          expandCluster(cluster, longitude, latitude);
          return;
        }

        const expanded = handleSmallClusterExpansion(cluster, clusterIndex, longitude, latitude);
        if (!expanded) {
          expandCluster(cluster, longitude, latitude);
        }
        return;
      }

      if (clusterSize > 10 && viewState.zoom >= 15 && cluster.id != null && clusterIndex) {
        handleLargeClusterModal(cluster, longitude, latitude);
        return;
      }

      expandCluster(cluster, longitude, latitude);
    },
    [
      clusterIndex,
      handleTruckClick,
      viewState.zoom,
      handleSmallClusterExpansion,
      isMobile,
      onClusterSelect,
      handleMobileClusterClick,
      handleLargeClusterModal,
      expandCluster,
    ],
  );

  // Close popup
  const handlePopupClose = () => {
    setSelectedTruck(null);
    // eslint-disable-next-line unicorn/no-useless-undefined -- TypeScript requires the argument
    onSelectTruck?.(undefined);

    // Reset the tracking refs when popup is closed to ensure proper behavior on next selection
    recentlyClickedTruckId.current = null;
    isProcessingTruckClick.current = false;
  };

  // Sync viewStateRef with current viewState
  useEffect(() => {
    viewStateRef.current = viewState;
  }, [viewState]);

  // Ref to track previous selectedTruckId to prevent re-triggering on every trucks array change
  const prevSelectedTruckId = useRef<string | undefined>(undefined);
  // Ref to track previous selectedTruckLocation to prevent re-centering on window focus
  const prevSelectedTruckLocation = useRef<[number, number] | undefined>(undefined);
  // Ref to track if we've successfully centered on the selected truck
  // This helps handle the case where selectedTruckId is set before trucks load
  // Ref to track if we've successfully centered on the selected truck
  // This helps handle the case where selectedTruckId is set before trucks load
  const hasCenteredOnSelectedTruck = useRef<string | undefined>(undefined);

  // Ref to track if we've centered on user location
  const hasCenteredOnUser = useRef(false);

  // Ref to track if a truck has been selected (from URL or any source)
  // Once a truck is selected, we never auto-center on user location again
  const hasTruckEverBeenSelected = useRef(false);

  // Ref to track a truck that needs centering when map becomes ready
  // Used for retry mechanism when selectedTruckId is set before map loads
  const pendingTruckId = useRef<string | undefined>(undefined);

  // Track when a truck is selected
  useEffect(() => {
    logDebug('🚚 TRUCK SELECTION CHANGED', {
      selectedTruckId,
      hasTruckEverBeenSelected: hasTruckEverBeenSelected.current,
    });
    if (selectedTruckId) {
      hasTruckEverBeenSelected.current = true;
      logDebug('✅ SET hasTruckEverBeenSelected = true');
    }
  }, [selectedTruckId]);

  // Auto-center on user location (only if no truck was ever selected)
  // FLOW: shouldSkipUserCenter prop → skips GPS centering when URL has truck param
  useEffect(() => {
    logDebug('📍 USER LOCATION EFFECT', {
      hasUserLocation: !!userLocation,
      hasCenteredOnUser: hasCenteredOnUser.current,
      hasMap: !!mapRef.current,
      hasTruckEverBeenSelected: hasTruckEverBeenSelected.current,
      shouldSkipUserCenter,
      selectedTruckId,
      userLocation,
    });
    logDebug('📍 User location effect triggered:', {
      hasUserLocation: !!userLocation,
      hasCenteredOnUser: hasCenteredOnUser.current,
      hasMap: !!mapRef.current,
      hasTruckEverBeenSelected: hasTruckEverBeenSelected.current,
      shouldSkipUserCenter,
      selectedTruckId,
      userLocation,
    });

    if (!userLocation || shouldSkipUserCenter || !mapReady || !mapRef.current) {
      logDebug('📍 SKIPPING USER LOCATION CENTERING', {
        hasUserLocation: !!userLocation,
        shouldSkipUserCenter,
        hasMap: !!mapRef.current,
      });
      return;
    }

    // Don't center on user location if a truck was selected (from URL or otherwise)
    // This prevents GPS permission grant from re-centering away from the selected truck
    if (!hasCenteredOnUser.current && !hasTruckEverBeenSelected.current) {
      logDebug('📍 AUTO-CENTERING ON USER LOCATION:', userLocation);
      const map = mapRef.current.getMap();
      map.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 12,
        duration: 2000,
      });
      hasCenteredOnUser.current = true;
    } else if (hasTruckEverBeenSelected.current) {
      logDebug('⏭️ SKIPPING USER LOCATION CENTERING - truck was selected');
    }
  }, [userLocation, shouldSkipUserCenter, mapReady]);

  useEffect(() => {
    if (externalCenter && mapRef.current) {
      // Once the user has explicitly targeted anything via externalCenter,
      // permanently prevent GPS auto-center from overriding it
      hasTruckEverBeenSelected.current = true;
      const map = mapRef.current.getMap();
      const targetZoom = Math.max(map.getZoom(), 14);

      // Use same offset pattern as truck click for consistent centering
      // customOffset from parent takes precedence if provided
      let yOffset: number;
      if (customOffset) {
        yOffset = customOffset[1];
      } else if (isMobile) {
        yOffset = -150;
      } else {
        yOffset = 150;
      }
      const xOffset = customOffset ? customOffset[0] : 0;

      map.flyTo({
        center: externalCenter,
        zoom: targetZoom,
        offset: [xOffset, yOffset],
        duration: 800,
        essential: true,
      });
    }
  }, [externalCenter, customOffset, isMobile]);

  // Determine if we should center on truck or skip due to map click
  const shouldCenterOnTruck = useCallback((truckId: string): boolean => {
    return !(
      isProcessingTruckClick.current &&
      recentlyClickedTruckId.current !== null &&
      recentlyClickedTruckId.current === truckId
    );
  }, []);

  // Reset click processing state
  const resetClickProcessing = useCallback(() => {
    isProcessingTruckClick.current = false;
    recentlyClickedTruckId.current = null;
  }, []);

  // Setup moveend handler to reset click processing after animation
  const setupMoveEndHandler = useCallback(
    (map: mapboxgl.Map) => {
      const handleMoveEnd = () => {
        logDebug('📍 flyTo animation completed');
        resetClickProcessing();
        map.off('moveend', handleMoveEnd);
      };
      map.on('moveend', handleMoveEnd);
    },
    [resetClickProcessing],
  );

  // Fly to truck location with proper offset
  const flyToTruck = useCallback(
    (lng: number, lat: number, offset: [number, number], duration: number) => {
      if (!mapRef.current) return;
      const map = mapRef.current.getMap();
      setupMoveEndHandler(map);
      map.flyTo({
        center: [lng, lat],
        zoom: Math.max(map.getZoom(), 14),
        offset,
        duration,
        essential: true,
      });
    },
    [setupMoveEndHandler],
  );

  // Handle truck centering by ID
  const handleTruckCenteringById = useCallback(
    (truckToSelect: FoodTruck | FoodTruckDomain, truckId: string) => {
      const activeLocation = resolveActiveLocation(truckToSelect);
      if (!hasValidCoordinates(activeLocation)) return;
      const { lat, lng } = activeLocation;

      prevSelectedTruckId.current = truckId;

      if (truckToSelect.id !== selectedTruck?.id) {
        setSelectedTruck(truckToSelect);
      }

      if (!isProcessingTruckClick.current) {
        recentlyClickedTruckId.current = null;
      }

      if (!shouldCenterOnTruck(truckId)) {
        logDebug('⚠️ Skipping centering due to processing truck click');
        resetClickProcessing();
        return;
      }

      const offset: [number, number] = customOffset || (isMobile ? [0, -150] : [0, 100]);
      const duration = isMobile ? 600 : 800;

      logDebug('🚀 Flying to truck location:', [lng, lat]);
      flyToTruck(lng, lat, offset, duration);
      hasCenteredOnSelectedTruck.current = truckId;
    },
    [customOffset, isMobile, shouldCenterOnTruck, resetClickProcessing, flyToTruck],
  );

  // Handle truck centering by location (fallback)
  const handleTruckCenteringByLocation = useCallback(
    (location: [number, number]) => {
      const locationChanged =
        prevSelectedTruckLocation.current?.[0] !== location[0] ||
        prevSelectedTruckLocation.current?.[1] !== location[1];

      if (!locationChanged) return;

      prevSelectedTruckLocation.current = location;

      if (!isProcessingTruckClick.current) {
        recentlyClickedTruckId.current = null;
      }

      const currentSelectedTruckId = selectedTruck?.id;
      const shouldCenter = !(
        currentSelectedTruckId &&
        isProcessingTruckClick.current &&
        recentlyClickedTruckId.current === currentSelectedTruckId
      );

      if (!shouldCenter) {
        logDebug('⚠️ Skipping centering in fallback due to processing truck click');
        resetClickProcessing();
        return;
      }

      const [lng, lat] = location;

      if (
        Number.isNaN(lng) ||
        Number.isNaN(lat) ||
        lng < -180 ||
        lng > 180 ||
        lat < -90 ||
        lat > 90
      ) {
        return;
      }

      if (!selectedTruckId) {
        const truckAtLocation = trucks.find(
          (truck) => truck.current_location?.lng === lng && truck.current_location?.lat === lat,
        );

        if (truckAtLocation && truckAtLocation.id !== selectedTruck?.id) {
          setSelectedTruck(truckAtLocation);
        }
      }

      if (mapRef.current) {
        const map = mapRef.current.getMap();
        const handleMoveEnd = () => {
          logDebug('📍 flyTo animation (fallback) completed');
          resetClickProcessing();
          map.off('moveend', handleMoveEnd);
        };
        map.on('moveend', handleMoveEnd);

        const yOffset = isMobile ? -150 : 0;
        map.flyTo({
          center: [lng, lat],
          zoom: Math.max(map.getZoom(), 14),
          offset: [0, yOffset],
          duration: isMobile ? 600 : 800,
          essential: true,
        });
      }
    },
    [selectedTruckId, selectedTruck, trucks, isMobile, resetClickProcessing],
  );

  // Ref to track previous selectedTruckId to detect transitions to undefined (popup close)
  const prevSelectedTruckIdForClear = useRef<string | undefined>(undefined);

  // Update view when selected truck ID changes - but only when not already processing a truck click from the map
  useEffect(() => {
    const truckIdChanged = selectedTruckId !== prevSelectedTruckId.current;
    const needsInitialCenter =
      selectedTruckId &&
      hasCenteredOnSelectedTruck.current !== selectedTruckId &&
      trucks.length > 0;

    logDebug('🔍 Truck selection effect triggered:', {
      selectedTruckId,
      truckIdChanged,
      needsInitialCenter,
      trucksCount: trucks.length,
      prevSelectedTruckId: prevSelectedTruckId.current,
      isProcessingTruckClick: isProcessingTruckClick.current,
      hasMapRef: !!mapRef.current,
    });

    if (selectedTruckId && (truckIdChanged || needsInitialCenter)) {
      const truckToSelect = trucks.find((truck) => truck.id === selectedTruckId);
      logDebug('🎯 Found truck:', truckToSelect?.name || 'NOT FOUND');

      if (!mapRef.current) {
        logDebug('🚫 SKIPPING TRUCK CENTERING - mapRef is null, map not ready');
        pendingTruckId.current = selectedTruckId;
        return;
      }

      if (truckToSelect && hasValidCoordinates(resolveActiveLocation(truckToSelect))) {
        handleTruckCenteringById(truckToSelect, selectedTruckId);
      }
    } else if (
      selectedTruckId === undefined &&
      prevSelectedTruckIdForClear.current !== undefined &&
      selectedTruck?.id
    ) {
      // Only clear when selectedTruckId transitions from a value to undefined (popup close)
      // Don't clear when selectedTruckId has always been undefined (marker click flow)
      logDebug('🔄 selectedTruckId explicitly set to undefined, clearing selected truck');
      prevSelectedTruckId.current = undefined;
      setSelectedTruck(null);
    } else if (selectedTruckLocation?.[0] != null && selectedTruckLocation[1] != null) {
      handleTruckCenteringByLocation(selectedTruckLocation);
    }

    // Track previous value for transition detection
    prevSelectedTruckIdForClear.current = selectedTruckId;
  }, [
    selectedTruckId,
    selectedTruckLocation,
    trucks,
    handleTruckCenteringById,
    handleTruckCenteringByLocation,
  ]);

  // Use the map layer control hook for optimization
  const layerControl = useMapLayerControl(mapRef);

  // NOTE: ResizeObserver removed - was causing unwanted re-centering on window focus.
  // Initial centering when truck is clicked/selected is sufficient.
  // Popup position is tied to lat/lng, so container resize doesn't affect it.

  // Handle map load with optimization
  const handleMapLoad = useCallback(() => {
    setMapReady(true);
    logDebug('🗺️ MAP LOADED - MapboxMapComponent map is ready');
    logDebug('Map loaded - Mapbox map is ready');

    layerControl.optimizeMapForFoodTrucks();

    // Reduce tile loading by not rendering duplicate world copies
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      map.setRenderWorldCopies(false);
    }
    onMapLoad?.(mapRef.current!);

    // FLOW: Map loads → check pendingTruckId → setSelectedTruck → truck selection effect re-runs → flyTo
    if (pendingTruckId.current) {
      logDebug('🔄 RETRYING TRUCK CENTERING - Map is now ready', {
        pendingTruckId: pendingTruckId.current,
      });

      const truckToSelect = trucks.find((truck) => truck.id === pendingTruckId.current);
      if (truckToSelect) {
        setSelectedTruck(truckToSelect);
      }

      pendingTruckId.current = undefined;
    }
  }, [layerControl, onMapLoad, trucks]);

  // Map style - use custom if provided, otherwise streets-v12
  const finalMapStyle = useMemo(() => {
    const style = customMapStyle || mapStyle;
    logMessage('MapboxMapComponent - Using map style:', style);
    return style;
  }, [customMapStyle, mapStyle]);

  // Render error state if no valid Mapbox token
  if (!hasValidMapboxToken) {
    return <MapErrorState />;
  }
  // No longer blocking rendering on valid token, handling simplified error state internally

  return (
    <div className="mapbox-component-wrapper relative w-full h-full rounded-xl overflow-hidden shadow-sm border border-border">
      {/* Dynamic style for control positioning - handled within component to access state */}
      <style jsx>{`
        /* Desktop / Wide Screens */
        @media (min-width: 769px) {
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-bottom-left),
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-bottom-right) {
            position: absolute !important;
            bottom: 6px !important; /* Adjusted per user feedback (10 -> 6) to match mobile Field Guide */
            top: auto !important;
            z-index: 10 !important; /* Ensure on top */
          }
        }

        /* Mobile Screens */
        @media (max-width: 768px) {
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-bottom-left),
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-bottom-right) {
            ${allowBottomNavOffset
              ? `
                    position: fixed !important;
                    bottom: 83px !important; /* Adjusted per user feedback (85 -> 83) */
                    z-index: 20 !important;
                    display: flex !important;
                    align-items: flex-end !important;
                    top: auto !important;
                `
              : `
                    position: absolute !important;
                    bottom: 6px !important; /* Adjusted per user feedback (8 -> 6) */
                    right: 10px !important; /* Force right alignment */
                    top: auto !important;
                    z-index: 50 !important; /* High Z to ensure visibility */
                `}
          }
        }

        /* Force visibility for attribution unless explicitly hidden */
        ${attributionControl
          ? `
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-attrib) {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
           /* Ensure the inner button is visible and has contrast */
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-attrib button) {
             display: block !important;
             visibility: visible !important;
             opacity: 1 !important;
          }
        `
          : ''}
        ${attributionControl
          ? ''
          : `
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-attrib) {
            display: none !important;
          }
        `}
        
        /* Explicitly hide logo if requested */
        ${hideLogo
          ? `
          .mapbox-component-wrapper :global(.mapboxgl-ctrl-logo) {
            display: none !important;
          }
        `
          : ''}
      `}</style>
      <Map
        ref={mapRef}
        {...viewState}
        onMove={(evt) => {
          // Skip if we're currently updating from this handler to prevent loops
          if (isUpdatingFromHandler.current) {
            return;
          }

          // Check if bearing or pitch are not as constrained
          const needsConstraintUpdate =
            Math.abs(evt.viewState.bearing) > 0.1 || Math.abs(evt.viewState.pitch) > 0.1;

          if (needsConstraintUpdate) {
            // Set the flag to indicate we're updating from this handler
            isUpdatingFromHandler.current = true;

            // Update the state with constrained values
            setViewState({
              longitude: Number.isFinite(evt.viewState.longitude)
                ? evt.viewState.longitude
                : viewState.longitude,
              latitude: Number.isFinite(evt.viewState.latitude)
                ? evt.viewState.latitude
                : viewState.latitude,
              zoom: Number.isFinite(evt.viewState.zoom) ? evt.viewState.zoom : viewState.zoom,
              bearing: 0, // Force bearing to 0 to maintain north-up orientation
              pitch: 0, // Force pitch to 0 to maintain overhead view
              padding: evt.viewState.padding || { top: 0, left: 0, right: 0, bottom: 0 },
            });

            // Reset the flag after a short time to allow future updates
            setTimeout(() => {
              isUpdatingFromHandler.current = false;
            }, 0);
          } else {
            // Only update if other properties (longitude, latitude, zoom) have changed significantly
            // Use an epsilon threshold to ignore negligible floating-point coordinate changes
            // that can cause infinite render loops when maxBounds are enforced
            const epsilon = 1e-5;
            const lngChanged = Math.abs(evt.viewState.longitude - viewState.longitude) > epsilon;
            const latChanged = Math.abs(evt.viewState.latitude - viewState.latitude) > epsilon;
            const zoomChanged = Math.abs(evt.viewState.zoom - viewState.zoom) > epsilon;

            if (lngChanged || latChanged || zoomChanged) {
              setViewState({
                longitude: evt.viewState.longitude,
                latitude: evt.viewState.latitude,
                zoom: evt.viewState.zoom,
                bearing: 0,
                pitch: 0,
                padding: evt.viewState.padding || { top: 0, left: 0, right: 0, bottom: 0 },
              });
            }
          }
        }}
        mapboxAccessToken={mapboxAccessToken}
        style={{ width: '100%', height: '100%' }}
        mapStyle={finalMapStyle}
        // Ensure flat 2D projection to avoid globe view
        projection={{ name: 'mercator' }}
        // Restrict map - use custom bounds if provided (e.g. SC/GA for Field Guide), otherwise US
        maxBounds={
          maxBounds ?? [
            [-179.2, 17.8], // Southwest corner (including Hawaii)
            [-66.8, 71.4], // Northeast corner (including Alaska)
          ]
        }
        // Remove touchAction prop as it's not supported
        maxZoom={18}
        minZoom={3}
        // Set pitch constraints to maintain overhead view
        maxPitch={0}
        minPitch={0}
        // Disable rotation gestures to maintain north-up orientation
        dragRotate={false}
        // Enable default attribution control to show both logo and text
        attributionControl={attributionControl}
        // Disable cooperative gestures on mobile to allow single-finger panning
        cooperativeGestures={false}
        onLoad={() => {
          handleMapLoad();
        }}
        onError={(_error) => {
          // Map error is handled by the map component
        }}
        onStyleData={() => {
          // Style data loaded
        }}
      >
        {/* Navigation controls - optimized for desktop */}
        {/* Geolocation control - hidden in Field Guide mode */}
        {!hideGeolocate && (
          <GeolocateControl
            positionOptions={{ enableHighAccuracy: true }}
            trackUserLocation={false} // Don't continuously track, just center on click
            position="top-right"
            onGeolocate={(position) => {
              // Update the view state to center on the user's location when geolocate is triggered
              // Add proper null checks to prevent 'Cannot read properties of undefined' error
              if (position && position.coords) {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;

                // Validate coordinates before updating view state
                if (
                  !Number.isNaN(lat) &&
                  !Number.isNaN(lng) &&
                  lat >= -90 &&
                  lat <= 90 &&
                  lng >= -180 &&
                  lng <= 180
                ) {
                  onUserLocate?.({ lat, lng });
                  setViewState((prev) => ({
                    longitude: lng, // Ensure longitude is always a number
                    latitude: lat, // Ensure latitude is always a number
                    zoom: 15, // Set a reasonable zoom level when centering on user
                    bearing: prev.bearing,
                    pitch: prev.pitch,
                    padding: prev.padding,
                  }));
                } else {
                  // Invalid geolocation coordinates
                }
              } else {
                // Geolocation position or coordinates are undefined
              }
            }}
            onError={(_error) => {
              // If geolocation fails, keep the default view
            }}
          />
        )}
        {/* Navigation controls - positioned just below geolocate control on desktop */}
        <NavigationControl
          position="top-right"
          showCompass={false} // Hide compass to reduce clutter
          visualizePitch={false}
        />

        {/* Render injected children first (e.g. Traffic Layer) */}
        {children}

        {/* Render clusters and individual markers, with offset applied for identical locations */}
        {(() => {
          const features = offsetIdenticalLocations(clusters, viewState);
          const clusterCount = features.filter(
            (f) => 'cluster' in f.properties && f.properties.cluster === true,
          ).length;
          const individualCount = features.length - clusterCount;
          logDebug('🗺️ Rendering markers:', {
            totalFeatures: features.length,
            clusters: clusterCount,
            individuals: individualCount,
            zoom: viewState.zoom,
          });

          return features.map((cluster) => {
            // Check if this feature is a cluster by seeing if it has the 'cluster' property and it's true
            const isCluster =
              'cluster' in cluster.properties && cluster.properties.cluster === true;

            if (isCluster) {
              const clusterFeature = cluster as ClusterFeature;
              logDebug(
                '🔵 Rendering cluster with',
                clusterFeature.properties.point_count,
                'trucks at',
                clusterFeature.geometry.coordinates,
              );
              return (
                <ClusterMarker
                  key={`cluster-${cluster.id}`}
                  cluster={clusterFeature}
                  onClick={handleClusterClick}
                />
              );
            } else {
              // Individual marker - cast as PointFeature since it's not a cluster
              const pointFeature = cluster as PointFeature;
              const truck = pointFeature.properties.truck;
              logDebug(
                '🔴 Rendering individual truck:',
                truck.name,
                'at',
                pointFeature.geometry.coordinates,
              );
              return (
                <TruckMarker
                  key={pointFeature.properties.truckId ?? `truck-${pointFeature.id}`}
                  truck={truck}
                  onClick={handleTruckClick(truck, false, true)} // fromCluster=false, fromMap=true
                />
              );
            }
          });
        })()}

        {/* Note: User location marker is handled by GeolocateControl, no need for custom marker */}

        {/* Selected truck popup - Enhanced version */}
        {(() => {
          // Date-aware anchor: on a dated event's service date the popup
          // anchors at the event spot; otherwise the base location.
          const activeLocation = selectedTruck ? resolveActiveLocation(selectedTruck) : null;
          const shouldShowPopup = hasValidCoordinates(activeLocation);

          if (shouldShowPopup) {
            logDebug('✅ RENDERING POPUP for truck:', selectedTruck?.name);
          } else if (selectedTruck) {
            logDebug('❌ NOT rendering popup - invalid coordinates:', selectedTruck.current_location);
          }

          if (shouldShowPopup && isMobile) {
            logDebug('📱 Mobile view: EnhancedTruckPopup suppressed (delegated to parent)');
            return null;
          }

          return shouldShowPopup ? (
            <EnhancedTruckPopup
              truck={selectedTruck as FoodTruck}
              latitude={activeLocation?.lat ?? 0}
              longitude={activeLocation?.lng ?? 0}
              onClose={handlePopupClose}
              showBackButton={navigatedFromCluster}
              onBack={() => {
                // Go back to cluster modal
                setSelectedTruck(null);
                setNavigatedFromCluster(false);
                // Restore the previous cluster details if available
                if (previousClusterDetailsRef.current) {
                  setClusterDetails(previousClusterDetailsRef.current);
                }
              }}
            />
          ) : null;
        })()}
      </Map>

      {/* Cluster details modal check (!isMobile) */}
      {clusterDetails && !isMobile && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* Reduced max-width and padding for tighter layout */}
          <Card className="max-w-sm w-full mx-4 max-h-[500px] flex flex-col overflow-hidden">
            <div className="flex flex-col space-y-1.5 p-4 pb-2">
              <h3 className="font-semibold leading-none tracking-tight flex justify-between items-center text-lg">
                {(() => {
                  let suffix = '';
                  if (
                    userLocation &&
                    clusterDetails.trucks[0]?.current_location?.lat != null &&
                    clusterDetails.trucks[0]?.current_location?.lng != null
                  ) {
                    const dist = calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      clusterDetails.trucks[0].current_location.lat,
                      clusterDetails.trucks[0].current_location.lng,
                    );
                    suffix = ` (${dist.toFixed(1)} mi away)`;
                  }
                  return `${clusterDetails.trucks.length} Trucks${suffix}`;
                })()}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  onClick={() => setClusterDetails(null)}
                >
                  Close
                </Button>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 p-4 pt-0">
              <div className="space-y-1">
                {clusterDetails.trucks.length > 0 ? (
                  clusterDetails.trucks.map((truck: FoodTruck, index) => (
                    <TruckAccordionItem
                      key={truck.id}
                      truck={truck}
                      isFirst={index === 0}
                      // Pass dummy values or partials since we handle selection manually
                      selectedTruckId={selectedTruck?.id}
                      setSelectedTruckId={(id) => {
                        logDebug('🟢 TRUCK CLICKED IN CLUSTER MODAL', truck.name, id);
                        // Store cluster details first, then select truck
                        const currentCluster = clusterDetails;
                        if (currentCluster) {
                          previousClusterDetailsRef.current = currentCluster;
                        }
                        // Close cluster modal and select truck
                        setClusterDetails(null);
                        setSelectedTruck(truck);
                        setNavigatedFromCluster(true);
                      }}
                      isOpen={() => true} // Logic handled internally by component for badge
                      userLocation={undefined} // Hide distance in list items
                      isFavorited={favoriteIds.has(truck.id)}
                      onToggleFavorite={() => toggleFavorite(truck.id)}
                    />
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                    Loading truck details...
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default MapboxMapComponent;
