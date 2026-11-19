import { describe, it, expect } from '@jest/globals';

describe('API: /api/trucks - Radius Support', () => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  describe('GET /api/trucks with location parameters', () => {
    it('should fetch trucks within radius with valid params', async () => {
      const params = new URLSearchParams({
        lat: '37.7749',
        lng: '-122.4194',
        radius: '5', // 5 miles
      });

      const response = await fetch(`${API_BASE}/api/trucks?${params}`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('trucks');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('query');
      expect(data.query).toMatchObject({
        lat: 37.7749,
        lng: -122.4194,
        radiusMiles: 5,
      });

      // Check that trucks have distance information
      if (data.trucks.length > 0) {
        const firstTruck = data.trucks[0];
        expect(firstTruck).toHaveProperty('distance_miles');
        expect(firstTruck).toHaveProperty('distance_meters');
        expect(firstTruck.distance_miles).toBeLessThanOrEqual(5);
      }
    });

    it('should return 400 for invalid latitude', async () => {
      const params = new URLSearchParams({
        lat: '999', // Invalid latitude
        lng: '-122.4194',
        radius: '5',
      });

      const response = await fetch(`${API_BASE}/api/trucks?${params}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid coordinates');
    });

    it('should return 400 for invalid longitude', async () => {
      const params = new URLSearchParams({
        lat: '37.7749',
        lng: '999', // Invalid longitude
        radius: '5',
      });

      const response = await fetch(`${API_BASE}/api/trucks?${params}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid coordinates');
    });

    it('should return 400 for invalid radius', async () => {
      const params = new URLSearchParams({
        lat: '37.7749',
        lng: '-122.4194',
        radius: '150', // Too large
      });

      const response = await fetch(`${API_BASE}/api/trucks?${params}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Radius must be between 0 and 100 miles');
    });

    it('should return 400 for negative radius', async () => {
      const params = new URLSearchParams({
        lat: '37.7749',
        lng: '-122.4194',
        radius: '-5',
      });

      const response = await fetch(`${API_BASE}/api/trucks?${params}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Radius must be between 0 and 100 miles');
    });

    it('should return 400 for non-numeric parameters', async () => {
      const params = new URLSearchParams({
        lat: 'abc',
        lng: 'xyz',
        radius: 'five',
      });

      const response = await fetch(`${API_BASE}/api/trucks?${params}`);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toContain('Invalid location or radius parameters');
    });

    it('should sort trucks by distance', async () => {
      const params = new URLSearchParams({
        lat: '37.7749',
        lng: '-122.4194',
        radius: '10',
      });

      const response = await fetch(`${API_BASE}/api/trucks?${params}`);
      const data = await response.json();

      expect(response.status).toBe(200);

      if (data.trucks.length > 1) {
        // Check that trucks are sorted by distance
        for (let i = 1; i < data.trucks.length; i++) {
          expect(data.trucks[i].distance_miles).toBeGreaterThanOrEqual(
            data.trucks[i - 1].distance_miles,
          );
        }
      }
    });
  });
});
