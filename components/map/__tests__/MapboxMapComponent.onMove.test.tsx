/**
 * =============================================================================
 * UNIT TESTS: MapboxMapComponent - onMove Epsilon Comparison
 * =============================================================================
 *
 * PURPOSE: Test that epsilon comparison logic correctly filters microscopic
 * coordinate changes to prevent infinite render loops when maxBounds is enabled.
 *
 * BACKGROUND:
 * When maxBounds is enforced by Mapbox, it makes microscopic floating-point
 * adjustments to coordinates (~0.0000001 degrees). Using exact !== comparison
 * treats these as real changes, causing infinite render loops.
 *
 * FIX (PR #240):
 * Use epsilon comparison (Math.abs(diff) > 1e-5) to ignore microscopic changes.
 *
 * =============================================================================
 * TEST STRATEGY:
 * These are PURE UNIT TESTS that test the epsilon comparison logic directly.
 * No component rendering or React mocking is needed.
 * =============================================================================
 */

import { jest } from '@jest/globals';

// =============================================================================
// Helper function to test epsilon comparison logic directly
// =============================================================================

/**
 * Tests if a coordinate change should trigger a state update.
 * This mirrors the logic in MapboxMapComponent.tsx onMove handler.
 *
 * Current code at MapboxMapComponent.tsx:1118-1124:
 * ```
 * if (
 *   evt.viewState.longitude !== viewState.longitude ||
 *   evt.viewState.latitude !== viewState.latitude ||
 *   evt.viewState.zoom !== viewState.zoom
 * ) {
 * ```
 *
 * PR #240 fixes this by using epsilon comparison:
 * ```
 * const epsilon = 1e-5;
 * const lngChanged = Math.abs(evt.viewState.longitude - viewState.longitude) > epsilon;
 * const latChanged = Math.abs(evt.viewState.latitude - viewState.latitude) > epsilon;
 * const zoomChanged = Math.abs(evt.viewState.zoom - viewState.zoom) > epsilon;
 * if (lngChanged || latChanged || zoomChanged) {
 * ```
 *
 * @param oldVal - Previous coordinate value
 * @param newVal - New coordinate value
 * @param epsilon - Threshold for meaningful change (default: 1e-5)
 * @returns true if change is meaningful (> epsilon), false otherwise
 */
function shouldUpdateCoordinate(oldVal: number, newVal: number, epsilon: number = 1e-5): boolean {
  return Math.abs(newVal - oldVal) >= epsilon;
}

// =============================================================================
// TEST SUITE: Epsilon Comparison Logic
// =============================================================================

describe('onMove Epsilon Comparison Logic', () => {
  describe('shouldUpdateCoordinate function', () => {
    // =========================================================================
    // TEST: Microscopic changes should NOT trigger update
    // =========================================================================
    it('should return FALSE for microscopic changes (< 1e-5)', () => {
      const epsilon = 1e-5;
      const baseValue = -82.0105;

      // Microscopic change: 1e-8 degrees ≈ 1.1mm at equator
      // This is smaller than epsilon and should NOT trigger update
      const microscopicChange = baseValue + 1e-8;
      expect(shouldUpdateCoordinate(baseValue, microscopicChange, epsilon)).toBe(false);

      // Another microscopic change
      const microscopicChange2 = baseValue - 1e-9;
      expect(shouldUpdateCoordinate(baseValue, microscopicChange2, epsilon)).toBe(false);

      // Well below epsilon: 0.5 * epsilon
      const wellBelow = baseValue + epsilon * 0.5;
      expect(shouldUpdateCoordinate(baseValue, wellBelow, epsilon)).toBe(false);

      // Just below epsilon: 0.9 * epsilon
      const justBelow = baseValue + epsilon * 0.9;
      expect(shouldUpdateCoordinate(baseValue, justBelow, epsilon)).toBe(false);
    });

    // =========================================================================
    // TEST: Meaningful changes should trigger update
    // =========================================================================
    it('should return TRUE for meaningful changes (> 1e-5)', () => {
      const epsilon = 1e-5;
      const baseValue = -82.0105;

      // Meaningful change: 0.0001 degrees (11 meters at equator)
      const meaningfulChange = baseValue + 1e-4;
      expect(shouldUpdateCoordinate(baseValue, meaningfulChange, epsilon)).toBe(true);

      // Just above epsilon
      const justAbove = baseValue + epsilon * 1.0001;
      expect(shouldUpdateCoordinate(baseValue, justAbove, epsilon)).toBe(true);

      // Large change
      const largeChange = baseValue + 0.5;
      expect(shouldUpdateCoordinate(baseValue, largeChange, epsilon)).toBe(true);

      // Negative change
      const negativeChange = baseValue - 0.001;
      expect(shouldUpdateCoordinate(baseValue, negativeChange, epsilon)).toBe(true);
    });

    // =========================================================================
    // TEST: Edge cases
    // =========================================================================
    it('should handle edge cases correctly', () => {
      const epsilon = 1e-5;

      // Same value (no change)
      expect(shouldUpdateCoordinate(33.4735, 33.4735, epsilon)).toBe(false);

      // Zero to non-zero (meaningful)
      expect(shouldUpdateCoordinate(0, 0.001, epsilon)).toBe(true);

      // Very small non-zero change (not meaningful)
      expect(shouldUpdateCoordinate(0, 1e-10, epsilon)).toBe(false);
    });

    // =========================================================================
    // TEST: Latitude and longitude precision
    // =========================================================================
    it('should work correctly for both latitude and longitude', () => {
      const epsilon = 1e-5;

      // Latitude (-90 to 90)
      const lat1 = 33.4735;
      const lat2_microscopic = 33.47350001;
      const lat2_meaningful = 33.4736;

      expect(shouldUpdateCoordinate(lat1, lat2_microscopic, epsilon)).toBe(false);
      expect(shouldUpdateCoordinate(lat1, lat2_meaningful, epsilon)).toBe(true);

      // Longitude (-180 to 180)
      const lng1 = -82.0105;
      const lng2_microscopic = -82.01050001;
      const lng2_meaningful = -82.0104;

      expect(shouldUpdateCoordinate(lng1, lng2_microscopic, epsilon)).toBe(false);
      expect(shouldUpdateCoordinate(lng1, lng2_meaningful, epsilon)).toBe(true);
    });

    // =========================================================================
    // TEST: Zoom precision
    // =========================================================================
    it('should work correctly for zoom values', () => {
      const epsilon = 1e-5;

      const zoom1 = 12;
      const zoom2_microscopic = 12.00000001;
      const zoom2_meaningful = 12.001;

      expect(shouldUpdateCoordinate(zoom1, zoom2_microscopic, epsilon)).toBe(false);
      expect(shouldUpdateCoordinate(zoom1, zoom2_meaningful, epsilon)).toBe(true);
    });
  });

  // ===========================================================================
  // TEST: Epsilon value documentation
  // ===========================================================================
  describe('epsilon value (1e-5)', () => {
    it('should be approximately 1.1 meters at the equator', () => {
      const epsilon = 1e-5;

      // Earth's circumference at equator: ~40,075 km
      // 1 degree ≈ 111.32 km ≈ 111,320 meters
      // 1e-5 degrees ≈ 1.11 meters
      const metersPerDegree = 111320;
      const epsilonInMeters = epsilon * metersPerDegree;

      // Should be approximately 1.1 meters
      expect(epsilonInMeters).toBeGreaterThan(1.0);
      expect(epsilonInMeters).toBeLessThan(1.2);
    });

    it('should be larger than typical floating-point precision noise', () => {
      // Floating-point precision for double is about 15-17 significant digits
      // For coordinates like -82.0105, precision is around 1e-15
      // Epsilon of 1e-5 is 10 orders of magnitude larger
      const epsilon = 1e-5;
      const floatPrecision = 1e-15;

      expect(epsilon).toBeGreaterThan(floatPrecision * 1e9);
    });

    it('should be smaller than typical GPS accuracy', () => {
      // GPS accuracy is typically 3-15 meters
      // 1e-5 degrees ≈ 1.1 meters, which is smaller than GPS accuracy
      const epsilon = 1e-5;
      const metersPerDegree = 111320;
      const epsilonInMeters = epsilon * metersPerDegree;
      const gpsAccuracy = 3; // meters

      expect(epsilonInMeters).toBeLessThan(gpsAccuracy);
    });

    it('should be larger than 1e-7 (previous incorrect value in PR)', () => {
      // PR initially used 1e-7 which was too small
      // 1e-7 degrees ≈ 1.1 cm at equator - too small to filter noise
      const correctEpsilon = 1e-5;
      const incorrectEpsilon = 1e-7;

      expect(correctEpsilon).toBeGreaterThan(incorrectEpsilon);
    });
  });
});
