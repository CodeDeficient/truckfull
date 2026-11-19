import React from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { logDebug, logWarning } from '@/lib/logging';

/**
 * Custom hook for managing Mapbox layer visibility to reduce visual clutter
 * in food truck finder applications.
 *
 * This hook hides map details that aren't useful for food truck discovery:
 * - Building footprints and extrusions
 * - Topography, contours, and elevation
 * - Wildlife, park, and nature reserve boundaries
 * - Micro-landcover (grass, wood, sand, etc.)
 * - Land-use fills (residential, commercial, industrial)
 * - Water depth/bathymetry and undersea features
 * - Ferries and aerialways
 *
 * Roads, street names, POI labels, and admin boundaries are kept visible.
 */
export const useMapLayerControl = (mapRef: React.RefObject<MapRef | null>) => {
  // Layers to hide for reduced visual clutter
  const layersToHide = [
    // Building and structure details
    'building',
    'building-outline',
    'building-extrusion',

    // Water labels (road/pedestrian layers stay visible)
    'water-label',
    'natural-label',

    // Topography and terrain details (including ocean depth)
    'contour-line',
    'hillshade',
    'terrain-landcover',
    'terrain-water-pattern',
    'water-depth',
    'undersea-features-points',
    'undersea-features-lines',
    'depth',

    // Wildlife and nature details (unnecessary for food trucks)
    'wildlife-park',
    'wildlife-park-label',
    'national-park',
    'national-park-label',
    'nature-reserve',
    'nature-reserve-label',

    // Micro-landcover details (tiny grass/icons that add clutter)
    'landcover-grass',
    'landcover-wood',
    'landcover-crop',
    'landcover-snow',
    'landcover-sand',
    'landcover-rock',
    'landcover-wetland',
    'landcover-wood-pattern',

    // Land use details that add visual noise
    'landuse-residential',
    'landuse-commercial',
    'landuse-industrial',
    'landuse-residential-pattern',
    'landuse-commercial-pattern',
    'landuse-industrial-pattern',

    // Water feature labels that may show depth information
    'water-line-label',
    'water-point-label',

    // Miscellaneous details
    'ferry',
    'ferry-label',
    'aerialway',
    'aerialway-label',
  ];

  /**
   * Hide layers that add visual clutter for food truck applications
   */
  const hideClutterLayers = () => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();

    for (const layerId of layersToHide) {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      } catch (error) {
        // Layer may not exist in current style, silently ignore
        logDebug(
          `Could not hide layer ${layerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  };

  /**
   * Show layers that were previously hidden (useful for cleanup)
   */
  const showClutterLayers = () => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();

    for (const layerId of layersToHide) {
      try {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'visible');
        }
      } catch (error) {
        logDebug(
          `Could not show layer ${layerId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  };

  /**
   * Filter POIs to show only food truck relevant categories
   */
  const filterFoodRelatedPOIs = () => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();

    try {
      // Filter to show only food-related POIs
      if (map.getLayer('poi-label')) {
        map.setFilter('poi-label', [
          'any',
          // Restaurants and food establishments
          ['==', ['get', 'subclass'], 'restaurant'],
          ['==', ['get', 'subclass'], 'cafe'],
          ['==', ['get', 'subclass'], 'fast_food'],
          ['==', ['get', 'subclass'], 'food_court'],
          ['==', ['get', 'subclass'], 'marketplace'],
          ['==', ['get', 'subclass'], 'convenience'],
          ['==', ['get', 'subclass'], 'supermarket'],
          ['==', ['get', 'subclass'], 'grocery'],
          ['==', ['get', 'subclass'], 'pub'],
          ['==', ['get', 'subclass'], 'bar'],
          ['==', ['get', 'subclass'], 'brewery'],
          ['==', ['get', 'subclass'], 'wine'],
          ['==', ['get', 'subclass'], 'ice_cream'],
          ['==', ['get', 'subclass'], 'bakery'],
          ['==', ['get', 'subclass'], 'butcher'],
          ['==', ['get', 'subclass'], 'deli'],
          ['==', ['get', 'subclass'], 'seafood'],
          ['==', ['get', 'subclass'], 'farm'],
          ['==', ['get', 'subclass'], 'farmyard'],

          // Food truck specific venues
          ['==', ['get', 'subclass'], 'food_truck'],
          ['==', ['get', 'subclass'], 'street_vendor'],
          ['==', ['get', 'subclass'], 'market'],
          ['==', ['get', 'subclass'], 'public_market'],

          // Event venues where food trucks commonly operate
          ['==', ['get', 'subclass'], 'stadium'],
          ['==', ['get', 'subclass'], 'sports_centre'],
          ['==', ['get', 'subclass'], 'convention_centre'],
          ['==', ['get', 'subclass'], 'conference_centre'],
          ['==', ['get', 'subclass'], 'exhibition_centre'],
          ['==', ['get', 'subclass'], 'fairground'],
          ['==', ['get', 'subclass'], 'amusement_arcade'],
          ['==', ['get', 'subclass'], 'theme_park'],
          ['==', ['get', 'subclass'], 'zoo'],
          ['==', ['get', 'subclass'], 'aquarium'],
          ['==', ['get', 'subclass'], 'botanical_garden'],

          // Transportation hubs where food trucks often operate
          ['==', ['get', 'subclass'], 'bus_station'],
          ['==', ['get', 'subclass'], 'train_station'],
          ['==', ['get', 'subclass'], 'subway'],
          ['==', ['get', 'subclass'], 'light_rail'],
          ['==', ['get', 'subclass'], 'tram_stop'],
          ['==', ['get', 'subclass'], 'airport'],
          ['==', ['get', 'subclass'], 'ferry_terminal'],
          ['==', ['get', 'subclass'], 'park_and_ride'],

          // Educational institutions where food trucks are common
          ['==', ['get', 'subclass'], 'university'],
          ['==', ['get', 'subclass'], 'college'],
          ['==', ['get', 'subclass'], 'school'],
          ['==', ['get', 'subclass'], 'kindergarten'],
        ]);
      }
    } catch (error) {
      logWarning(
        'Could not filter POIs for food-related categories:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  /**
   * Adjust layer styling for better food truck visibility
   */
  const adjustLayerStyling = () => {
    if (!mapRef.current) return;

    const map = mapRef.current.getMap();

    try {
      // Ensure 2D map projection - disable globe view
      // Force Mercator projection for flat 2D view
      if (map.getStyle && typeof map.getStyle === 'function') {
        const currentStyle = map.getStyle();
        if (currentStyle?.metadata) {
          // Check if style uses globe projection and override if needed
          const metadata = currentStyle.metadata as Record<string, unknown>;
          const origin = metadata['mapbox:origin'];
          if (origin && typeof origin === 'string' && origin.includes('globe')) {
            // Force flat projection
            map.setProjection({ name: 'mercator' });
          }
        }
      }

      // Ensure 2D map - disable any 3D features
      if (map.getTerrain()) {
        map.setTerrain(null); // Disable terrain/3D
      }

      // Ensure flat map view
      if (map.getPitch() !== 0) {
        map.setPitch(0); // Set pitch to 0 for flat 2D view
      }

      if (map.getBearing() !== 0) {
        map.setBearing(0); // Set bearing to 0 for north-up view
      }

      // Reduce building opacity to minimize visual clutter
      if (map.getLayer('building')) {
        map.setPaintProperty('building', 'fill-opacity', 0.3);
        map.setPaintProperty('building', 'fill-color', '#cccccc');
      }

      // Simplify water labels
      if (map.getLayer('water-label')) {
        map.setFilter('water-label', ['>=', ['zoom'], 12]);
      }

      // Simplify natural feature labels
      if (map.getLayer('natural-label')) {
        map.setFilter('natural-label', ['>=', ['zoom'], 13]);
      }

      // Reduce park/landuse opacity for better contrast
      if (map.getLayer('landuse-park')) {
        map.setPaintProperty('landuse-park', 'fill-opacity', 0.4);
      }

      if (map.getLayer('landuse-cemetery')) {
        map.setPaintProperty('landuse-cemetery', 'fill-opacity', 0.3);
      }

      if (map.getLayer('landuse-hospital')) {
        map.setPaintProperty('landuse-hospital', 'fill-opacity', 0.3);
      }

      // Simplify place labels - reduce density
      if (map.getLayer('place-label')) {
        map.setFilter('place-label', [
          'all',
          ['>=', ['zoom'], 10],
          ['!=', ['get', 'class'], 'neighbourhood'],
        ]);
      }

      // Reduce waterway complexity
      if (map.getLayer('waterway')) {
        map.setPaintProperty('waterway', 'line-width', [
          'interpolate',
          ['linear'],
          ['zoom'],
          8,
          0.5,
          12,
          1,
          16,
          2,
        ]);
      }

      // Simplify water appearance - hide depth details
      if (map.getLayer('water')) {
        // Ensure water has a solid color without depth variations
        map.setPaintProperty('water', 'fill-color', '#d3e6ff');
      }

      // Explicitly hide water depth layers if they exist
      const waterDepthLayers = [
        'water-depth',
        'undersea-features-points',
        'undersea-features-lines',
      ];
      for (const layerId of waterDepthLayers) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none');
        }
      }
    } catch (error) {
      logWarning(
        'Could not adjust layer styling:',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  /**
   * Configure map layers for optimal food truck finder experience
   */
  const optimizeMapForFoodTrucks = () => {
    if (!mapRef.current) return;

    // Hide visual clutter layers
    hideClutterLayers();

    // Adjust layer styling for better visibility
    adjustLayerStyling();
  };

  return {
    /**
     * Apply all optimizations for food truck finder map
     */
    optimizeMapForFoodTrucks,

    /**
     * Hide layers that create visual clutter
     */
    hideClutterLayers,

    /**
     * Show previously hidden layers
     */
    showClutterLayers,

    /**
     * Filter map POIs to food truck relevant categories
     */
    filterFoodRelatedPOIs,

    /**
     * Adjust layer styling for better food truck visibility
     */
    adjustLayerStyling,
  };
};
