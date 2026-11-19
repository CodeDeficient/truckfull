import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('react-map-gl/mapbox', () => ({
  Marker: ({ children, latitude, longitude }: any) =>
    React.createElement(
      'div',
      { 'data-testid': 'marker', 'data-lat': latitude, 'data-lng': longitude },
      children,
    ),
}));

const { ClusterMarker } = await import('@/components/map/ClusterMarker');

describe('ClusterMarker', () => {
  const mockCluster = {
    geometry: {
      type: 'Point' as const,
      coordinates: [-97.7431, 30.2672],
    },
    properties: {
      cluster: true,
      cluster_id: 1,
      point_count: 5,
      point_count_abbreviated: '5',
    },
  };

  it('renders cluster marker with correct coordinates', () => {
    const onClick = jest.fn();
    render(React.createElement(ClusterMarker, { cluster: mockCluster, onClick }));

    const marker = screen.getByTestId('marker');
    expect(marker).toHaveAttribute('data-lat', '30.2672');
    expect(marker).toHaveAttribute('data-lng', '-97.7431');
  });

  it('displays point count', () => {
    const onClick = jest.fn();
    render(React.createElement(ClusterMarker, { cluster: mockCluster, onClick }));

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onClick with cluster and coordinates when clicked', () => {
    const onClick = jest.fn();
    render(React.createElement(ClusterMarker, { cluster: mockCluster, onClick }));

    fireEvent.click(screen.getByText('5'));

    expect(onClick).toHaveBeenCalledWith(mockCluster, -97.7431, 30.2672);
  });

  it('renders with different cluster sizes', () => {
    const onClick = jest.fn();
    const largeCluster = {
      ...mockCluster,
      properties: { ...mockCluster.properties, point_count: 50 },
    };

    render(React.createElement(ClusterMarker, { cluster: largeCluster, onClick }));

    expect(screen.getByText('50')).toBeInTheDocument();
  });
});
