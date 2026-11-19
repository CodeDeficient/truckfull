/**
 * Centralized mock setup for MapboxMapComponent tests
 * Mocks all external dependencies to isolate the component under test
 */

import { jest } from '@jest/globals';

// Mock external dependencies to isolate component under test
jest.mock('@/hooks/useFavorites');
jest.mock('@/components/map/useMapLayerControl');
jest.mock('@/components/map/useMapClustering');
jest.mock('@/components/map/EnhancedTruckPopup');
jest.mock('@/components/ui/button');
jest.mock('@/components/ui/card');
jest.mock('@/components/map/MapErrorState');
// Note: react-map-gl/mapbox is mocked in individual test files
jest.mock('supercluster');
jest.mock('@/lib/logging');
jest.mock('@/lib/utils/foodTruckHelpers');
jest.mock('@/lib/utils/statusRing', () => ({
  getStatusRingClass: jest.fn(() => 'status-ring-open'),
}));

/**
 * This file must be imported BEFORE any test imports
 * to ensure mocks are set up before the component is loaded.
 *
 * Usage in test files:
 * ```typescript
 * import '@/components/map/__tests__/setup';
 * // ... other imports
 * ```
 */
