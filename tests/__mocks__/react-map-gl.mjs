import React from 'react';

const MapContext = React.createContext(null);

const Map = React.forwardRef(({ children, onLoad, ...props }, forwardedRef) => {
  React.useEffect(() => {
    onLoad?.();
  }, [onLoad]);

  return React.createElement(
    'div',
    {
      'data-testid': 'mapbox-map',
      ref: forwardedRef,
    },
    children,
  );
});

Map.displayName = 'Map';

const Marker = React.forwardRef(({ children, onClick, longitude, latitude, ref }, forwardedRef) => {
  return React.createElement(
    'div',
    {
      onClick,
      'data-testid': 'marker',
      'data-latitude': latitude,
      'data-longitude': longitude,
      ref: forwardedRef,
    },
    children,
  );
});

Marker.displayName = 'Marker';

const NavigationControl = ({ position, showCompass, visualizePitch }) => {
  return React.createElement('div', {
    'data-testid': 'navigation-control',
    'data-position': position,
    'data-show-compass': showCompass,
  });
};

const GeolocateControl = ({
  onGeolocate,
  onError,
  positionOptions,
  trackUserLocation,
  position,
}) => {
  React.useEffect(() => {
    const mockPosition = {
      coords: {
        latitude: 33.4735,
        longitude: -82.0105,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    onGeolocate?.(mockPosition);
  }, [onGeolocate]);

  return React.createElement('div', {
    'data-testid': 'geolocate-control',
    'data-position': position,
    'data-track-user': trackUserLocation,
  });
};

const Popup = ({ children, longitude, latitude, onClose }) => {
  return React.createElement(
    'div',
    {
      'data-testid': 'popup',
      'data-lng': longitude,
      'data-lat': latitude,
    },
    children,
  );
};

const Source = ({ children, id, type, data, cluster, ...props }) => {
  return React.createElement('div', {
    'data-testid': 'map-source',
    'data-id': id,
    'data-type': type,
    'data-cluster': cluster,
    ...props,
  }, children);
};

const Layer = ({ id, type, ...props }) => {
  return React.createElement('div', {
    'data-testid': 'map-layer',
    'data-id': id,
    'data-type': type,
    ...props,
  });
};

const useMap = () => {
  return React.useContext(MapContext) || { current: null };
};

// Type stubs for TypeScript
const MapRef = {};
const ViewState = {};

// Named exports
export {
  MapContext, Map, Marker, NavigationControl, GeolocateControl,
  Popup, Source, Layer, MapRef, ViewState, useMap,
};

// Default export (react-map-gl/mapbox exports Map as default)
export default Map;
