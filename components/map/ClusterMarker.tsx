import React from 'react';
import { Marker } from 'react-map-gl/mapbox';
import type { ClusterFeature } from './useMapClustering';

/**
 * Helper function for cluster sizing based on truck count
 * @param count - Number of trucks in the cluster
 * @returns Tailwind CSS size classes
 */
export const getClusterSize = (count: number): string => {
  if (count >= 10) return 'w-14 h-14';
  if (count >= 5) return 'w-12 h-12';
  return 'w-10 h-10';
};

/**
 * Helper function for font sizing based on truck count
 * @param count - Number of trucks in the cluster
 * @returns Tailwind CSS text size classes
 */
export const getFontSize = (count: number): string => {
  if (count >= 10) return 'text-sm';
  return 'text-xs';
};

export interface ClusterMarkerProps {
  cluster: ClusterFeature;
  onClick: (cluster: ClusterFeature, longitude: number, latitude: number) => void;
}

/**
 * ClusterMarker component for displaying grouped truck markers
 * Renders a cluster with count, dynamic sizing, and glow effect
 */
export const ClusterMarker = React.memo(({ cluster, onClick }: ClusterMarkerProps) => {
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
      >
        <span
          className={`${fontSize} font-bold text-rose-200`}
          style={{ textShadow: '0 0 6px #dc2626, 0 0 12px #dc2626' }}
        >
          {point_count}
        </span>
      </button>
    </Marker>
  );
});

ClusterMarker.displayName = 'ClusterMarker';
