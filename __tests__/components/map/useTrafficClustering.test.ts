import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react';

jest.unstable_mockModule('react-map-gl/mapbox', () => ({
  __esModule: true,
}));

jest.unstable_mockModule('supercluster', () => ({
  default: jest.fn().mockImplementation(function Supercluster() {
    this.load = jest.fn();
    this.getClusters = jest.fn().mockReturnValue([]);
    this.getLeaves = jest.fn().mockReturnValue([]);
  }),
}));

const { useTrafficClustering } = await import('@/components/map/useTrafficClustering');

describe('useTrafficClustering', () => {
  const mockViewState = {
    longitude: -81.9748,
    latitude: 33.4735,
    zoom: 10,
  };

  const mockNodes = [
    {
      id: '1',
      station_id: 'S1',
      aadt: 1000,
      lat: 33.5,
      lng: -82.0,
      location_description: 'Test Location',
      score_percentile: 75,
    },
    {
      id: '2',
      station_id: 'S2',
      aadt: 2000,
      lat: 33.6,
      lng: -82.1,
      location_description: 'Test Location 2',
      score_percentile: 85,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return null clusterIndex when nodes array is empty', () => {
      const { result } = renderHook(() =>
        useTrafficClustering({ nodes: [], viewState: mockViewState }),
      );

      expect(result.current.clusterIndex).toBeNull();
      expect(result.current.clusters).toEqual([]);
    });

    it('should create clusterIndex when nodes are provided', () => {
      const { result } = renderHook(() =>
        useTrafficClustering({ nodes: mockNodes, viewState: mockViewState }),
      );

      expect(result.current.clusterIndex).not.toBeNull();
    });
  });

  describe('isCluster type guard', () => {
    it('should return true for cluster features', () => {
      const { result } = renderHook(() =>
        useTrafficClustering({ nodes: mockNodes, viewState: mockViewState }),
      );

      const clusterFeature = {
        type: 'Feature' as const,
        properties: { cluster: true, cluster_id: 1, point_count: 2 },
        geometry: { type: 'Point' as const, coordinates: [-82.0, 33.5] },
      };

      expect(result.current.isCluster(clusterFeature)).toBe(true);
      expect(result.current.isPoint(clusterFeature)).toBe(false);
    });

    it('should return true for point features', () => {
      const { result } = renderHook(() =>
        useTrafficClustering({ nodes: mockNodes, viewState: mockViewState }),
      );

      const pointFeature = {
        type: 'Feature' as const,
        properties: { cluster: false, nodeId: '1', node: mockNodes[0] },
        geometry: { type: 'Point' as const, coordinates: [-82.0, 33.5] },
      };

      expect(result.current.isPoint(pointFeature)).toBe(true);
      expect(result.current.isCluster(pointFeature)).toBe(false);
    });
  });

  describe('getClusterLeaves', () => {
    it('should return empty array when clusterIndex is null', () => {
      const { result } = renderHook(() =>
        useTrafficClustering({ nodes: [], viewState: mockViewState }),
      );

      const leaves = result.current.getClusterLeaves(1);
      expect(leaves).toEqual([]);
    });
  });

  describe('cluster radius and maxZoom options', () => {
    it('should use custom cluster radius', () => {
      const { result } = renderHook(() =>
        useTrafficClustering({
          nodes: mockNodes,
          viewState: mockViewState,
          clusterRadius: 100,
          maxZoom: 14,
        }),
      );

      expect(result.current.clusterIndex).not.toBeNull();
    });
  });
});
