'use client';

import React from 'react';

/**
 * Error state component displayed when Mapbox access token is missing or invalid
 */
export function MapErrorState() {
  return (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center">
      <div className="text-center p-6">
        <div className="text-2xl mb-2">🗺️</div>
        <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Please configure your Mapbox access token to enable the map.
        </p>
        <a
          href="https://account.mapbox.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Get Mapbox Token
        </a>
      </div>
    </div>
  );
}
