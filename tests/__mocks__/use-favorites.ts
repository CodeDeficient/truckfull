/**
 * Mock for useFavorites hook that doesn't depend on AuthProvider
 * This allows testing MapboxMapComponent without AuthProvider context issues
 */

import React from 'react';

// Mock toggle favorite function
export const mockToggleFavorite = jest.fn().mockResolvedValue({ success: true });

// Mock is favorited function
export const mockIsFavorited = jest.fn(() => false);

// Mock useFavorites hook
export function useFavorites() {
  return useMockFavorites();
}

// Default export
export default useFavorites;
