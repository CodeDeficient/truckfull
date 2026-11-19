import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

jest.unstable_mockModule('react-map-gl/mapbox', () => ({
  useMap: jest.fn(() => ({ current: null })),
  Source: ({ children }: any) => React.createElement('div', { 'data-testid': 'source' }, children),
  Layer: () => React.createElement('div', { 'data-testid': 'layer' }),
}));

const { TrafficVolumeLayerVT } = await import('@/components/map/TrafficVolumeLayerVT');

const defaultProps = {
  visible: true,
  userTier: 'pro' as const,
};

describe('TrafficVolumeLayerVT', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing when visible and user is pro', () => {
    render(React.createElement(TrafficVolumeLayerVT, defaultProps));
  });

  it('returns null when visible is false', () => {
    const { container } = render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, visible: false }));
    expect(container.firstChild).toBeNull();
  });

  it('returns null when userTier is free', () => {
    const { container } = render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, userTier: 'free' }));
    expect(container.firstChild).toBeNull();
  });

  it('returns null when userTier is null', () => {
    const { container } = render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, userTier: null }));
    expect(container.firstChild).toBeNull();
  });

  it('accepts onNodeClick callback', () => {
    const onNodeClick = jest.fn();
    render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, onNodeClick }));
  });

  it('accepts onLoadingChange callback', () => {
    const onLoadingChange = jest.fn();
    render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, onLoadingChange }));
  });

  it('accepts viewMode prop as points', () => {
    render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, viewMode: 'points' }));
  });

  it('accepts viewMode prop as heatmap', () => {
    render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, viewMode: 'heatmap' }));
  });

  it('accepts free tier but returns null', () => {
    render(React.createElement(TrafficVolumeLayerVT, { ...defaultProps, userTier: 'free' }));
  });
});
