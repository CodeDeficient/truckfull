'use client';

import { Source, Layer } from 'react-map-gl/mapbox';

interface MapboxTrafficLayerProps {
  visible?: boolean;
  beforeId?: string;
}

export function MapboxTrafficLayer({ visible = true, beforeId }: MapboxTrafficLayerProps) {
  if (!visible) return null;

  return (
    <Source id="mapbox-traffic" type="vector" url="mapbox://mapbox.mapbox-traffic-v1">
      <Layer
        id="traffic-flow"
        type="line"
        source="mapbox-traffic"
        source-layer="traffic"
        beforeId={beforeId}
        minzoom={6}
        paint={{
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6,
            1.5,
            9,
            2,
            14,
            3,
            18,
            4,
          ],
          'line-color': [
            'match',
            ['get', 'congestion'],
            'low',
            '#22c55e',
            'moderate',
            '#f59e0b',
            'heavy',
            '#ef4444',
            'severe',
            '#7f1d1d',
            '#22c55e',
          ],
          'line-opacity': 0.5,
        }}
      />
    </Source>
  );
}
