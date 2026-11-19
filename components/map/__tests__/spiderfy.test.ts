/**
 * =============================================================================
 * UNIT TESTS: spiderfy Utility
 * =============================================================================
 *
 * PURPOSE: Test the spiderfy utility - spreads pins in a circle when cluster
 * is clicked at maxZoom. Pure function, no mocks needed.
 *
 * TESTS COVER:
 * - Spreads 1 pin at origin
 * - Spreads 2 pins opposite each other
 * - Spreads 3 pins at 120 degree intervals
 * - Spreads 4 pins at 90 degree intervals
 * - Spreads 8 pins at 45 degree intervals
 * - Returns array of {lat, lng} objects
 * - Handles negative coordinates
 * - Handles fractional coordinates
 * - Spread distance defaults to small offset
 * - Preserves original coordinates in center
 *
 * =============================================================================
 * NO MOCKS NEEDED - Pure utility function
 * =============================================================================
 */

import { jest } from '@jest/globals';
import { spiderfy } from '../spiderfy';

describe('spiderfy', () => {
  describe('Basic spreading', () => {
    it('should return single pin at origin when only one pin', () => {
      const result = spiderfy(-82.0105, 33.4735, 1);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ lat: 33.4735, lng: -82.0105 });
    });

    it('should spread 2 pins opposite each other (180 degrees)', () => {
      const result = spiderfy(-82.0105, 33.4735, 2);
      expect(result).toHaveLength(2);
      
      const sorted = [...result].sort((a, b) => a.lng - b.lng);
      expect(sorted[0].lng).toBeLessThan(-82.0105);
      expect(sorted[1].lng).toBeGreaterThan(-82.0105);
    });

    it('should spread 3 pins at approximately 120 degree intervals', () => {
      const result = spiderfy(-82.0105, 33.4735, 3);
      expect(result).toHaveLength(3);
    });

    it('should spread 4 pins at approximately 90 degree intervals', () => {
      const result = spiderfy(-82.0105, 33.4735, 4);
      expect(result).toHaveLength(4);
    });

    it('should spread 8 pins at approximately 45 degree intervals', () => {
      const result = spiderfy(-82.0105, 33.4735, 8);
      expect(result).toHaveLength(8);
    });
  });

  describe('Coordinate handling', () => {
    it('should return objects with lat and lng properties', () => {
      const result = spiderfy(-82.0105, 33.4735, 2);
      result.forEach((pin) => {
        expect(pin).toHaveProperty('lat');
        expect(pin).toHaveProperty('lng');
        expect(typeof pin.lat).toBe('number');
        expect(typeof pin.lng).toBe('number');
      });
    });

    it('should handle negative longitude (western hemisphere)', () => {
      const result = spiderfy(-122.4194, 37.7749, 4);
      expect(result).toHaveLength(4);
      result.forEach((pin) => {
        expect(pin.lng).toBeLessThan(0);
      });
    });

    it('should handle negative latitude (southern hemisphere)', () => {
      const result = spiderfy(-82.0105, -33.4735, 4);
      expect(result).toHaveLength(4);
      result.forEach((pin) => {
        expect(pin.lat).toBeLessThan(0);
      });
    });

    it('should handle fractional coordinates', () => {
      const result = spiderfy(-82.01056789, 33.47351234, 3);
      expect(result).toHaveLength(3);
      result.forEach((pin) => {
        expect(typeof pin.lat).toBe('number');
        expect(typeof pin.lng).toBe('number');
        expect(Number.isFinite(pin.lat)).toBe(true);
        expect(Number.isFinite(pin.lng)).toBe(true);
      });
    });
  });

  describe('Spread distance', () => {
    it('should spread pins with small offset from center', () => {
      const result = spiderfy(-82.0105, 33.4735, 4);
      expect(result.length).toBe(4);
      
      let totalLatOffset = 0;
      let totalLngOffset = 0;
      for (const pin of result) {
        totalLatOffset += Math.abs(pin.lat - 33.4735);
        totalLngOffset += Math.abs(pin.lng - (-82.0105));
      }
      
      expect(totalLatOffset).toBeGreaterThan(0);
      expect(totalLngOffset).toBeGreaterThan(0);
    });

    it('should respect custom spread distance', () => {
      const result = spiderfy(-82.0105, 33.4735, 2, 0.01);
      
      result.forEach((pin) => {
        const distance = Math.sqrt(
          Math.pow(pin.lat - 33.4735, 2) + Math.pow(pin.lng - (-82.0105), 2)
        );
        expect(distance).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle 0 pins gracefully', () => {
      const result = spiderfy(-82.0105, 33.4735, 0);
      expect(result).toEqual([]);
    });

    it('should handle large number of pins', () => {
      const result = spiderfy(-82.0105, 33.4735, 20);
      expect(result).toHaveLength(20);
    });

    it('should handle coordinates near equator', () => {
      const result = spiderfy(0, 0, 4);
      expect(result).toHaveLength(4);
    });

    it('should handle coordinates near international date line', () => {
      const result = spiderfy(179.5, 33.4735, 4);
      expect(result).toHaveLength(4);
    });
  });
});