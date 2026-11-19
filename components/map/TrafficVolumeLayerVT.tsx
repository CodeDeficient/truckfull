'use client';

import { useEffect, useCallback } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/mapbox';
import type { MapMouseEvent } from 'react-map-gl/mapbox';
import type { HeatmapPaint, CirclePaint } from 'mapbox-gl';
import { SelectionPin } from './SelectionPin';

interface TrafficNode {
  id: string;
  station_id: string;
  aadt: number;
  lat: number;
  lng: number;
  state: string;
  score_percentile: number;
}

interface TrafficVolumeLayerVTProps {
  visible: boolean;
  userTier: 'free' | 'pro' | null;
  viewMode?: 'heatmap' | 'points';
  onLoadingChange?: (loading: boolean, nodeCount?: number) => void;
  onNodeClick?: (node: TrafficNode) => void;
  beforeId?: string;
  selectedNodeId?: string | null;
  selectedNodePosition?: [number, number] | null;
  onClearSelection?: () => void;
}

export const TRAFFIC_TILESET_URL = process.env.NEXT_PUBLIC_TRAFFIC_TILESET_URL ?? '';
export const TRAFFIC_SOURCE_LAYER = process.env.NEXT_PUBLIC_TRAFFIC_SOURCE_LAYER ?? '';

export function TrafficVolumeLayerVT({
  visible,
  userTier,
  viewMode = 'heatmap',
  onLoadingChange,
  onNodeClick,
  beforeId,
  selectedNodeId: _selectedNodeId,
  selectedNodePosition,
  onClearSelection,
}: TrafficVolumeLayerVTProps) {
  const { current: map } = useMap();

  // Vector tiles load progressively - no loading overlay needed
  useEffect(() => {
    const timer = setTimeout(() => {
      onLoadingChange?.(false, -1);
    }, 100);
    return () => clearTimeout(timer);
  }, [onLoadingChange]);

  // Click handler for circles
  const handleCircleClick = useCallback(
    (e: MapMouseEvent) => {
      if (!e.features || e.features.length === 0) return;

      const feature = e.features[0];

      if (feature.geometry?.type === 'Point' && 'coordinates' in feature.geometry) {
        const coords = feature.geometry.coordinates as [number, number];

        const node: TrafficNode = {
          id: feature.properties?.station_id || feature.id?.toString() || 'unknown',
          station_id: feature.properties?.station_id || '',
          aadt: feature.properties?.aadt || 0,
          lat: coords[1],
          lng: coords[0],
          state: feature.properties?.state || '',
          score_percentile: feature.properties?.score_percentile || 0,
        };

        onNodeClick?.(node);
      }
    },
    [onNodeClick],
  );

  // Setup click handlers on map
  useEffect(() => {
    if (!map) return;

    const onMouseEnter = () => {
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = 'pointer';
      }
    };

    const onMouseLeave = () => {
      if (map.getCanvas()) {
        map.getCanvas().style.cursor = '';
      }
    };

    // Wait for layer to be ready
    const setupHandlers = () => {
      if (map && typeof map.getLayer === 'function' && map.getLayer('traffic-circles')) {
        map.on('click', 'traffic-circles', handleCircleClick);
        map.on('mouseenter', 'traffic-circles', onMouseEnter);
        map.on('mouseleave', 'traffic-circles', onMouseLeave);
      }
    };

    // Try immediately or after a short delay
    if (map.getLayer('traffic-circles')) {
      setupHandlers();
    } else {
      const timer = setTimeout(setupHandlers, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      try {
        if (map && typeof map.getLayer === 'function' && map.getLayer('traffic-circles')) {
          map.off('click', 'traffic-circles', handleCircleClick);
          map.off('mouseenter', 'traffic-circles', onMouseEnter);
          map.off('mouseleave', 'traffic-circles', onMouseLeave);
        }
      } catch {
        // Map might be destroyed already, ignore
      }
    };
  }, [map, handleCircleClick]);

  // Clear selection when user zooms out or pans away from selected node
  useEffect(() => {
    if (!map || !selectedNodePosition || !onClearSelection) return;

    const [lng, lat] = selectedNodePosition;

    const checkViewport = () => {
      const zoom = map.getZoom();
      const center = map.getCenter();

      // Close if zoomed out below level 12
      if (zoom < 12) {
        onClearSelection();
        return;
      }

      // Close if panned more than 0.05 degrees (~5km) from selected node
      const distanceDegrees = Math.sqrt(
        Math.pow(center.lat - lat, 2) + Math.pow(center.lng - lng, 2),
      );

      if (distanceDegrees > 0.05) {
        onClearSelection();
      }
    };

    map.on('moveend', checkViewport);
    map.on('zoomend', checkViewport);

    return () => {
      map.off('moveend', checkViewport);
      map.off('zoomend', checkViewport);
    };
  }, [map, selectedNodePosition, onClearSelection]);

  if (!visible || !userTier || userTier === 'free') {
    return null;
  }

  // Heatmap paint style - uses normalized 'aadt' column
  const heatmapPaint: HeatmapPaint = {
    'heatmap-weight': ['interpolate', ['linear'], ['get', 'aadt'], 0, 0, 50_000, 1],
    'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
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
    'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 20, 9, 40, 12, 55, 15, 70],
    'heatmap-opacity':
      viewMode === 'points'
        ? 0
        : ['interpolate', ['linear'], ['zoom'], 10, 0.5, 12, 0.4, 14, 0.2, 15, 0],
  };

  // Circle paint style (for zoomed in view)
  const circlePaint: CirclePaint = {
    'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 4, 15, 10, 18, 14],
    'circle-color': [
      'interpolate',
      ['linear'],
      ['get', 'aadt'],
      0,
      'royalblue',
      10_000,
      'cyan',
      25_000,
      'lime',
      40_000,
      'yellow',
      60_000,
      'red',
    ],
    'circle-stroke-width': 1,
    'circle-stroke-color': 'white',
    'circle-opacity':
      viewMode === 'points' ? 0.85 : ['interpolate', ['linear'], ['zoom'], 12, 0.6, 14, 0.85],
  };

  return (
    <>
      <Source id="traffic-combined" type="vector" url={TRAFFIC_TILESET_URL}>
        <Layer id="traffic-heatmap" type="heatmap" source-layer={TRAFFIC_SOURCE_LAYER} beforeId={beforeId} paint={heatmapPaint} />
        <Layer
          id="traffic-circles"
          type="circle"
          source-layer={TRAFFIC_SOURCE_LAYER}
          beforeId={beforeId}
          minzoom={12}
          paint={circlePaint}
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
