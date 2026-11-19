/**
 * Mock for react-map-gl/mapbox library
 * Provides realistic mocks that maintain Mapbox GL JS API contracts
 */

import type { MapRef, ViewState } from 'react-map-gl/mapbox';
import { jest } from '@jest/globals';

/**
 * Creates a mock Mapbox map instance with all methods used by MapboxMapComponent
 * This matches the Mapbox GL JS API for methods used in the component
 */
export const createMockMapboxMap = () => {
  const mockMapInstance = {
    flyTo: jest.fn(),
    getZoom: jest.fn(() => 12),
    getCenter: jest.fn(() => ({ lng: -82.0105, lat: 33.4728 })),
    getBearing: jest.fn(() => 0),
    getPitch: jest.fn(() => 0),
    setRenderWorldCopies: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    getLayer: jest.fn(),
    setLayoutProperty: jest.fn(),
    setFilter: jest.fn(),
    getStyle: jest.fn(),
    setTerrain: jest.fn(),
    setPitch: jest.fn(),
    setBearing: jest.fn(),
    setPaintProperty: jest.fn(),
    setProjection: jest.fn(),
  };

  return mockMapInstance;
};

/**
 * Creates a mock MapRef with getMap method returning a mock map instance
 * @returns A MapRef mock compatible with react-map-gl
 */
export const createMockMapRef = (): MapRef => {
  const mockMapInstance = createMockMapboxMap();

  return {
    getMap: jest.fn(() => mockMapInstance),
  } as unknown as MapRef;
};

/**
 * Creates a mock ViewState with sensible defaults
 * @param overrides - Optional partial view state to override defaults
 * @returns A ViewState object
 */
export const createMockViewState = (overrides?: Partial<ViewState>): ViewState => {
  return {
    longitude: -82.0105,
    latitude: 33.4728,
    zoom: 12,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, left: 0, right: 0, bottom: 0 },
    ...overrides,
  };
};

/**
 * Mock the Map component from react-map-gl
 */
export const mockMapComponent = jest.fn(({ children, ...props }: any) => {
  return (
    <div data-testid="mapbox-map" {...props}>
      {children}
    </div>
  );
});

/**
 * Mock the Marker component from react-map-gl
 */
export const mockMarkerComponent = jest.fn(({ children, latitude, longitude, onClick }: any) => {
  return (
    <div data-testid="mapbox-marker" data-lat={latitude} data-lng={longitude} onClick={onClick}>
      {children}
    </div>
  );
});

/**
 * Mock the NavigationControl component from react-map-gl
 */
export const mockNavigationControl = jest.fn((props: any) => {
  return <div data-testid="navigation-control" {...props} />;
});

/**
 * Mock the GeolocateControl component from react-map-gl
 */
export const mockGeolocateControl = jest.fn((props: any) => {
  return <div data-testid="geolocate-control" {...props} />;
});

/**
 * Default export for use in mock module
 */
export default {
  Map: mockMapComponent,
  Marker: mockMarkerComponent,
  NavigationControl: mockNavigationControl,
  GeolocateControl: mockGeolocateControl,
};
