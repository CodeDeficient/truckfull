import { calculateDistance } from '@/lib/utils/geoUtils';

describe('geoUtils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points correctly', () => {
      // New York City (approx) to Los Angeles (approx)
      const lat1 = 40.7128;
      const lon1 = -74.006;
      const lat2 = 34.0522;
      const lon2 = -118.2437;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Expected distance is approximately 2445 miles
      expect(distance).toBeGreaterThan(2400);
      expect(distance).toBeLessThan(2500);
    });

    it('should return 0 for identical points', () => {
      const lat = 33.749;
      const lon = -84.388;

      const distance = calculateDistance(lat, lon, lat, lon);

      expect(distance).toBe(0);
    });

    it('should handle points on the equator', () => {
      // Point on equator (0, 0) to (0, 10)
      const lat1 = 0;
      const lon1 = 0;
      const lat2 = 0;
      const lon2 = 10;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // 1 degree of longitude at equator is approx 69 miles
      // 10 degrees should be approx 690 miles
      expect(distance).toBeGreaterThan(680);
      expect(distance).toBeLessThan(700);
    });

    it('should handle points on the prime meridian', () => {
      // Point on prime meridian (0, 0) to (10, 0)
      const lat1 = 0;
      const lon1 = 0;
      const lat2 = 10;
      const lon2 = 0;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // 1 degree of latitude is approx 69 miles
      // 10 degrees should be approx 690 miles
      expect(distance).toBeGreaterThan(680);
      expect(distance).toBeLessThan(700);
    });

    it('should handle negative coordinates (southern hemisphere)', () => {
      // Sydney, Australia to Melbourne, Australia
      const lat1 = -33.8688;
      const lon1 = 151.2093;
      const lat2 = -37.8136;
      const lon2 = 144.9631;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Expected distance is approximately 443 miles
      expect(distance).toBeGreaterThan(400);
      expect(distance).toBeLessThan(500);
    });

    it('should handle points near the poles', () => {
      // North Pole to a point near the pole
      const lat1 = 90;
      const lon1 = 0;
      const lat2 = 89;
      const lon2 = 0;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Distance should be roughly 69 miles (1 degree latitude)
      expect(distance).toBeGreaterThan(60);
      expect(distance).toBeLessThan(80);
    });

    it('should handle points across the antimeridian', () => {
      // Point near 179E to point near 179W (close in longitude but far in calculation)
      // Actually, let's test a simple case: 179, 0 to -179, 0
      // This is a 2 degree difference across the 180th meridian
      const lat1 = 0;
      const lon1 = 179;
      const lat2 = 0;
      const lon2 = -179;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // 2 degrees longitude at equator is approx 138 miles
      expect(distance).toBeGreaterThan(130);
      expect(distance).toBeLessThan(150);
    });
  });
});
