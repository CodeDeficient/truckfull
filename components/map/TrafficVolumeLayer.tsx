'use client';

/**
 * Traffic Volume Layer Component
 *
 * Displays DOT traffic nodes as markers on the map.
 * Shows AADT (Annual Average Daily Traffic) data from SCDOT/GDOT.
 *
 * Tier access:
 * - Pro: See nodes + full details + foot traffic
 */

import { useEffect, useState, useCallback } from 'react';
import { useMap, Source, Layer } from 'react-map-gl/mapbox';
import { SelectionPin } from './SelectionPin';
import { parseLocationName } from '@/lib/utils/trafficUtils';
import type { MapMouseEvent, GeoJSONFeature } from 'mapbox-gl';

type TrafficGeoJSONFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Point';
      coordinates: [number, number];
    };
    properties: {
      id: string;
      aadt: number;
      percentile: number;
      description: string | null;
      station_id: string;
      parsed_name: string;
    };
  }>;
};

interface TrafficNode {
  id: string;
  station_id: string;
  aadt: number;
  lat: number;
  lng: number;
  location_description: string | null;
  score_percentile: number;
  distance_meters: number;
}

interface TrafficFeatureProperties {
  id: string;
  aadt: number;
  percentile: number;
  station_id: string;
  description: string;
}

interface TrafficVolumeLayerProps {
  visible: boolean;
  userTier: 'free' | 'pro' | null;
  mapCenter: { lat: number; lng: number };
  selectedNodeId?: string | null;
  selectedNodePosition?: [number, number] | null;
  onNodeClick?: (node: TrafficNode) => void;
  onClearSelection?: () => void;
  onLoadingChange?: (loading: boolean, nodeCount?: number) => void;
  radius?: number;
  viewMode?: 'heatmap' | 'points';
}

// Client-side cache for traffic data - avoids re-fetching same radius
// Key format: "lat,lng,radius" -> nodes
const trafficCache = new Map<string, TrafficNode[]>();

function getCacheKey(lat: number, lng: number, radius: number): string {
  // Round to 2 decimal places to allow for minor GPS drift
  return `${lat.toFixed(2)},${lng.toFixed(2)},${radius}`;
}

export function TrafficVolumeLayer({
  visible,
  userTier,
  mapCenter,
  selectedNodeId,
  selectedNodePosition,
  onNodeClick,
  onClearSelection,
  onLoadingChange,
  radius = 5000,
  viewMode = 'heatmap',
}: TrafficVolumeLayerProps) {
  const { current: map } = useMap();
  const [nodes, setNodes] = useState<TrafficNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentCenter, setCurrentCenter] = useState(mapCenter);

  // Sync currentCenter with mapCenter prop changes (e.g. GPS load)
  useEffect(() => {
    // Only update if significantly different to avoid fighting with map pan
    const dist = Math.sqrt(
      Math.pow(mapCenter.lat - currentCenter.lat, 2) +
        Math.pow(mapCenter.lng - currentCenter.lng, 2),
    );
    if (dist > 0.0001) {
      // approx 10m
      setCurrentCenter(mapCenter);
    }
  }, [mapCenter.lat, mapCenter.lng]);

  // REMOVED: Auto-update on map move (viewport-based fetching)
  // This ensures we only search from the "anchor" location (User/Search) within the Radius.

  const fetchNodes = useCallback(async () => {
    if (!visible || !userTier || userTier === 'free') return;

    const cacheKey = getCacheKey(currentCenter.lat, currentCenter.lng, radius);

    // Check cache first - instant load if we have this data
    const cached = trafficCache.get(cacheKey);
    if (cached) {
      setNodes(cached);
      return;
    }

    // Clear old nodes immediately to prevent stale data from larger radius
    setNodes([]);
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: currentCenter.lat.toString(),
        lng: currentCenter.lng.toString(),
        radius: radius.toString(),
        limit: userTier === 'pro' ? '40000' : '20',
      });

      const url = `/api/field-guide/nodes?${params}`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 403) {
          setError('Upgrade to Pro tier to access Field Guide');
        } else {
          setError('Failed to load traffic data');
        }
        return;
      }

      const data = (await response.json()) as { nodes: TrafficNode[] };
      const fetchedNodes = data.nodes ?? [];

      // Store in cache
      trafficCache.set(cacheKey, fetchedNodes);
      setNodes(fetchedNodes);
    } catch {
      setError('Failed to load traffic data');
    } finally {
      setLoading(false);
    }
  }, [visible, userTier, currentCenter.lat, currentCenter.lng, radius]);

  // Fetch nodes when parameters change
  useEffect(() => {
    void fetchNodes();
  }, [fetchNodes]);

  // Notify parent of loading state changes
  useEffect(() => {
    onLoadingChange?.(loading, nodes.length);
  }, [loading, nodes.length, onLoadingChange]);

  // Handle interactions with the traffic-point (circle) layer
  useEffect(() => {
    if (!map) return;

    const onLayerClick = (e: MapMouseEvent) => {
      const feature = e.features?.[0] as GeoJSONFeature | undefined;
      if (feature && feature.geometry?.type === 'Point') {
        const coords = feature.geometry.coordinates as [number, number] | undefined;
        if (!coords || coords.length < 2) return;
        // Mapbox features properties come back as JSON/serialized
        const props = feature.properties as Record<string, unknown>;
        const typedProps = props as Partial<TrafficFeatureProperties>;
        const node: TrafficNode = {
          id: typedProps.id || '',
          aadt: typedProps.aadt || 0,
          lat: coords[1],
          lng: coords[0],
          station_id: typedProps.station_id || '',
          location_description: typedProps.description || null,
          score_percentile: typedProps.percentile || 0,
          distance_meters: 0, // Distance isn't stored in feature, but not critical for selection
        };

        setSelectedNode(node.id);
        onNodeClick?.(node);
      }
    };

    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    // Add listeners specifically for the traffic-point layer
    // Note: This requires the layer to be rendered, which might take a tick.
    // react-map-gl usually handles this if we use their interactiveLayerIds prop on the Map,
    // but since we are a child component, we bind directly or need to wait.
    // Binding directly usually works if the layer exists.

    // We'll wrap in a timeout or just try binding. Mapbox is robust.
    if (map.getLayer('traffic-circles')) {
      map.on('click', 'traffic-circles', onLayerClick);
      map.on('mouseenter', 'traffic-circles', onMouseEnter);
      map.on('mouseleave', 'traffic-circles', onMouseLeave);
    } else {
      // Retry once if layer not ready (race condition with source/layer mount)
      setTimeout(() => {
        if (map.getLayer('traffic-circles')) {
          map.on('click', 'traffic-circles', onLayerClick);
          map.on('mouseenter', 'traffic-circles', onMouseEnter);
          map.on('mouseleave', 'traffic-circles', onMouseLeave);
        }
      }, 500);
    }

    return () => {
      // Robust cleanup - check map, method exists, and layer exists
      if (map && typeof map.getLayer === 'function' && map.getLayer('traffic-circles')) {
        map.off('click', 'traffic-circles', onLayerClick);
        map.off('mouseenter', 'traffic-circles', onMouseEnter);
        map.off('mouseleave', 'traffic-circles', onMouseLeave);
      }
    };
  }, [map, onNodeClick, nodes]); // Re-bind if nodes change (though layer ID is constant)

  // Close selection when zooming out or panning far from selected node
  useEffect(() => {
    if (!map || (!selectedNode && !selectedNodeId)) return;

    const nodeId = selectedNodeId || selectedNode;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const checkViewport = () => {
      const zoom = map.getZoom();
      const center = map.getCenter();

      // Close if zoomed out below level 12
      if (zoom < 12) {
        setSelectedNode(null);
        onClearSelection?.();
        return;
      }

      // Close if panned more than 0.05 degrees (~5km) from selected node
      const distanceDegrees = Math.sqrt(
        Math.pow(center.lat - node.lat, 2) + Math.pow(center.lng - node.lng, 2),
      );

      if (distanceDegrees > 0.05) {
        setSelectedNode(null);
        onClearSelection?.();
      }
    };

    map.on('moveend', checkViewport);
    map.on('zoomend', checkViewport);

    return () => {
      map.off('moveend', checkViewport);
      map.off('zoomend', checkViewport);
    };
  }, [map, selectedNode, selectedNodeId, onClearSelection, nodes]);

  // Don't render for free users or when not visible
  if (!visible || !userTier || userTier === 'free') {
    return null;
  }

  if (loading && nodes.length === 0) {
    return null;
  }

  if (error) {
    return null; // Error handled silently on map
  }

  // Convert nodes to GeoJSON for Source
  const geoJson: TrafficGeoJSONFeatureCollection = {
    type: 'FeatureCollection',
    features: nodes.map((node) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [node.lng, node.lat],
      },
      properties: {
        id: node.id,
        aadt: node.aadt,
        percentile: node.score_percentile,
        description: node.location_description,
        station_id: node.station_id,
        // Pre-parsed name for cleaner labels
        parsed_name: parseLocationName(node.location_description, node.station_id),
      },
    })),
  };

  return (
    <>
      <Source id="traffic-source" type="geojson" data={geoJson}>
        {/* Heatmap Layer - Hidden in 'points' mode */}
        <Layer
          id="traffic-heatmap"
          type="heatmap"
          paint={{
            // Increase the heatmap weight based on AADT
            'heatmap-weight': ['interpolate', ['linear'], ['get', 'aadt'], 0, 0, 50_000, 1],
            // Increase the heatmap color weight weight by zoom level
            // heatmap-intensity is a multiplier on top of heatmap-weight
            'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
            // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
            // Thermal Gradient: Blue -> Cyan -> Lime -> Yellow -> Red
            'heatmap-color': [
              'interpolate',
              ['linear'],
              ['heatmap-density'],
              0,
              'rgba(0,0,255,0)',
              0.1,
              'royalblue',
              0.3,
              'cyan',
              0.5,
              'lime',
              0.7,
              'yellow',
              1,
              'red',
            ],
            // Adjust the heatmap radius by zoom level - larger for smoother coverage
            'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 40, 12, 55, 15, 70],
            // Transition from heatmap to circle layer by zoom level
            // Reduced base opacity to make map text more readable
            'heatmap-opacity':
              viewMode === 'points'
                ? 0
                : ['interpolate', ['linear'], ['zoom'], 10, 0.5, 12, 0.4, 14, 0.2, 15, 0],
          }}
        />

        {/* Circle/Point Layer - Hidden until zoom 12+ for performance (Grok recommendation) */}
        <Layer
          id="traffic-circles"
          type="circle"
          minzoom={12}
          paint={{
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 15, 10, 18, 14],
            // Match the heatmap thermal feel for points
            'circle-color': [
              'interpolate',
              ['linear'],
              ['get', 'percentile'],
              0,
              'royalblue', // low
              25,
              'cyan', // moderate
              50,
              'lime', // medium
              75,
              'yellow', // high
              90,
              'red', // very high
            ],
            'circle-stroke-width': 1,
            'circle-stroke-color': 'white',
            'circle-opacity':
              viewMode === 'points'
                ? 0.85 // Always visible in points mode
                : ['interpolate', ['linear'], ['zoom'], 12, 0.6, 14, 0.85],
          }}
        />

        {/* Label Layer - Visible at higher zooms to show location names and AADT */}
        <Layer
          id="traffic-labels"
          type="symbol"
          layout={{
            'text-field': [
              'concat',
              ['get', 'parsed_name'],
              '\n',
              ['concat', ['to-string', ['/', ['get', 'aadt'], 1000]], 'K/day'],
            ],
            'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 16, 13],
            'text-anchor': 'top',
            'text-offset': [0, 1],
            'text-max-width': 10,
            'text-allow-overlap': false,
            'text-optional': true,
          }}
          paint={{
            'text-color': '#1f2937',
            'text-halo-color': 'rgba(255, 255, 255, 0.9)',
            'text-halo-width': 1.5,
            'text-opacity': ['interpolate', ['linear'], ['zoom'], 13.5, 0, 14, 1],
          }}
        />
      </Source>
      {selectedNodePosition && (
        <SelectionPin
          longitude={selectedNodePosition[0]}
          latitude={selectedNodePosition[1]}
        />
      )}
    </>
  );
}
