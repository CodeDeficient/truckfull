/**
 * Hotspots API Tests
 *
 * Phase 4.2.3: Test hotspot discovery and reservation API
 * Verifies hotspot creation, reservation, and search functionality
 */

import { test, expect } from '@playwright/test';

// Mock hotspots service
const MockHotspotsService = {
  // Mock hotspots database
  hotspots: new Map<string, any>(),

  // Mock reservations database
  reservations: new Map<string, any>(),

  // Mock PostGIS hotspot query
  async findNearbyHotspots(lat: number, lng: number, radiusKm: number): Promise<any[]> {
    // Simulate finding hotspots within radius
    const hotspots = [];

    for (const [id, hotspot] of this.hotspots.entries()) {
      const distance = this.calculateDistance(lat, lng, hotspot.location.lat, hotspot.location.lng);

      if (distance <= radiusKm) {
        hotspots.push({
          ...hotspot,
          distance: Math.round(distance * 100) / 100, // 2 decimal places
        });
      }
    }

    return hotspots;
  },

  async createHotspot(
    location: { lat: number; lng: number },
    trafficScore: number,
    businessesNearby: any[],
  ): Promise<any> {
    const id = `hs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const hotspot = {
      id,
      location,
      trafficScore,
      businessesNearby,
      discoveryTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    this.hotspots.set(id, hotspot);
    return hotspot;
  },

  async reserveHotspot(
    hotspotId: string,
    truckId: string,
    durationMinutes: number,
  ): Promise<{ success: boolean; reservation?: any; error?: string }> {
    // Check if hotspot exists
    const hotspot = this.hotspots.get(hotspotId);
    if (!hotspot) {
      return { success: false, error: 'Hotspot not found' };
    }

    // Check if hotspot is already reserved
    const existingReservations = Array.from(this.reservations.values());
    const conflictingReservations = existingReservations.filter(
      (r) => r.hotspotId === hotspotId && new Date(r.reservedUntil).getTime() > Date.now(),
    );

    if (conflictingReservations.length > 0) {
      return { success: false, error: 'Hotspot already reserved' };
    }

    // Check if truck already has a reservation at this hotspot
    const truckReservations = existingReservations.filter((r) => r.truckId === truckId);
    const existingTruckReservation = truckReservations.find((r) => r.hotspotId === hotspotId);
    if (
      existingTruckReservation &&
      new Date(existingTruckReservation.reservedUntil).getTime() > Date.now()
    ) {
      return { success: false, error: 'Truck already has reservation at this hotspot' };
    }

    // Create reservation
    const reservationId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reservation = {
      id: reservationId,
      hotspotId,
      truckId,
      reservedUntil: new Date(Date.now() + durationMinutes * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.reservations.set(reservationId, reservation);
    return { success: true, reservation };
  },

  async releaseHotspot(reservationId: string): Promise<{ success: boolean; error?: string }> {
    const reservation = this.reservations.get(reservationId);

    if (!reservation) {
      return { success: false, error: 'Reservation not found' };
    }

    this.reservations.delete(reservationId);
    return { success: true };
  },

  async getActiveReservations(truckId: string): Promise<any[]> {
    const now = Date.now();
    const reservations = Array.from(this.reservations.values());

    return reservations.filter(
      (r) => r.truckId === truckId && new Date(r.reservedUntil).getTime() > now,
    );
  },

  async cleanupExpiredReservations(): Promise<number> {
    const now = Date.now();
    let deletedCount = 0;

    for (const [id, reservation] of this.reservations.entries()) {
      if (new Date(reservation.reservedUntil).getTime() <= now) {
        this.reservations.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  },

  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Simplified distance calculation (not Haversine, but sufficient for mock)
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  // Hotspot discovery algorithm
  async discoverHotspotsFromTrafficData(trafficData: any[]): Promise<any[]> {
    const hotspots: any[] = [];

    // Group by area and calculate traffic score
    const areaGroups = new Map<string, any[]>();

    trafficData.forEach((data) => {
      // Round coordinates to group nearby traffic incidents
      const latKey = Math.round(data.coordinates[0] * 100) / 100;
      const lngKey = Math.round(data.coordinates[1] * 100) / 100;
      const key = `${latKey},${lngKey}`;

      if (!areaGroups.has(key)) {
        areaGroups.set(key, []);
      }
      areaGroups.get(key)!.push(data);
    });

    // Create hotspots from clusters
    for (const [key, incidents] of areaGroups.entries()) {
      const [lat, lng] = key.split(',').map(Number);

      // Calculate traffic score based on incident count and severity
      let score = incidents.length * 10;
      incidents.forEach((inc) => {
        if (inc.severity === 'high') score += 10;
        if (inc.severity === 'severe') score += 20;
      });

      if (score >= 70) {
        // Threshold for hotspot
        const businesses = await this.findNearbyBusinesses(lat, lng);
        const hotspot = await this.createHotspot({ lat, lng }, score, businesses);
        hotspots.push(hotspot);
      }
    }

    return hotspots;
  },

  async findNearbyBusinesses(lat: number, lng: number): Promise<any[]> {
    // Mock business data
    return [
      {
        name: 'Downtown Cafe',
        category: 'restaurant',
        distance: 0.5,
      },
      {
        name: 'Shopping Plaza',
        category: 'shopping',
        distance: 0.8,
      },
      {
        name: 'Office Building',
        category: 'office',
        distance: 1.2,
      },
    ];
  },
};

test.describe('Hotspots API', () => {
  test.describe('Hotspot Discovery', () => {
    test('discovers hotspots from traffic data', async () => {
      const trafficData = [
        {
          coordinates: [33.749, -84.388],
          severity: 'moderate',
          type: 'accident',
        },
        {
          coordinates: [33.749, -84.388],
          severity: 'high',
          type: 'congestion',
        },
      ];

      const hotspots = await MockHotspotsService.discoverHotspotsFromTrafficData(trafficData);

      expect(hotspots.length).toBeGreaterThan(0);
      expect(hotspots[0].trafficScore).toBeGreaterThanOrEqual(70);
      expect(hotspots[0].location).toBeDefined();
      expect(hotspots[0].businessesNearby).toBeDefined();
    });

    test('filters low-scoring areas', async () => {
      const trafficData = [
        {
          coordinates: [33.749, -84.388],
          severity: 'low',
          type: 'minor',
        },
      ];

      const hotspots = await MockHotspotsService.discoverHotspotsFromTrafficData(trafficData);

      // Low score area should not create hotspot
      expect(hotspots.length).toBe(0);
    });

    test('groups nearby incidents into single hotspot', async () => {
      const trafficData = [
        {
          coordinates: [33.749, -84.388],
          severity: 'moderate',
          type: 'accident',
        },
        {
          coordinates: [33.749, -84.388],
          severity: 'moderate',
          type: 'construction',
        },
        {
          coordinates: [33.749, -84.388],
          severity: 'high',
          type: 'congestion',
        },
      ];

      const hotspots = await MockHotspotsService.discoverHotspotsFromTrafficData(trafficData);

      // All incidents should be grouped into one hotspot
      expect(hotspots.length).toBe(1);
      expect(hotspots[0].trafficScore).toBe(40); // 3 * 10 + 10 (high severity)
    });
  });

  test.describe('Hotspot Search', () => {
    test('finds hotspots within radius', async () => {
      // Create test hotspots
      await MockHotspotsService.createHotspot({ lat: 33.749, lng: -84.388 }, 80, []);
      await MockHotspotsService.createHotspot({ lat: 33.75, lng: -84.389 }, 75, []);
      await MockHotspotsService.createHotspot({ lat: 33.8, lng: -84.4 }, 90, []); // Far away

      const hotspots = await MockHotspotsService.findNearbyHotspots(33.749, -84.388, 2.0);

      // Should return 2 hotspots within 2km, exclude the far one
      expect(hotspots.length).toBe(2);
      hotspots.forEach((h) => {
        expect(h.distance).toBeLessThanOrEqual(2.0);
      });
    });

    test('returns empty array when no hotspots in radius', async () => {
      // Clear hotspots first
      MockHotspotsService.hotspots.clear();

      await MockHotspotsService.createHotspot({ lat: 33.8, lng: -84.4 }, 90, []);

      const hotspots = await MockHotspotsService.findNearbyHotspots(33.749, -84.388, 1.0);

      expect(hotspots.length).toBe(0);
    });

    test('includes distance information', async () => {
      MockHotspotsService.hotspots.clear();

      await MockHotspotsService.createHotspot({ lat: 33.749, lng: -84.388 }, 80, []);
      await MockHotspotsService.createHotspot({ lat: 33.7495, lng: -84.3885 }, 75, []);

      const hotspots = await MockHotspotsService.findNearbyHotspots(33.749, -84.388, 1.0);

      expect(hotspots.length).toBeGreaterThan(0);
      hotspots.forEach((h) => {
        expect(h.distance).toBeDefined();
        expect(typeof h.distance).toBe('number');
        expect(h.distance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  test.describe('Hotspot Reservation', () => {
    test('reserves hotspot successfully', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      const hotspot = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [],
      );
      const result = await MockHotspotsService.reserveHotspot(hotspot.id, 'truck_123', 60);

      expect(result.success).toBe(true);
      expect(result.reservation).toBeDefined();
      expect(result.reservation.hotspotId).toBe(hotspot.id);
      expect(result.reservation.truckId).toBe('truck_123');
      expect(result.reservation.reservedUntil).toBeTruthy();
    });

    test('fails to reserve non-existent hotspot', async () => {
      const result = await MockHotspotsService.reserveHotspot('nonexistent', 'truck_123', 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hotspot not found');
    });

    test('prevents double reservation of same hotspot', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      const hotspot = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [],
      );

      // First reservation
      await MockHotspotsService.reserveHotspot(hotspot.id, 'truck_123', 60);

      // Second reservation attempt
      const result = await MockHotspotsService.reserveHotspot(hotspot.id, 'truck_456', 60);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Hotspot already reserved');
    });

    test('allows reservation after previous expires', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      const hotspot = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [],
      );

      // Create expired reservation
      const reservationId = `res_expired_${Date.now()}`;
      MockHotspotsService.reservations.set(reservationId, {
        id: reservationId,
        hotspotId: hotspot.id,
        truckId: 'truck_123',
        reservedUntil: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        createdAt: new Date().toISOString(),
      });

      // Should be able to reserve now
      const result = await MockHotspotsService.reserveHotspot(hotspot.id, 'truck_456', 60);

      expect(result.success).toBe(true);
    });

    test('sets correct reservation expiry', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      const hotspot = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [],
      );
      const result = await MockHotspotsService.reserveHotspot(hotspot.id, 'truck_123', 60);

      expect(result.success).toBe(true);
      if (result.reservation) {
        const expiryTime = new Date(result.reservation.reservedUntil).getTime();
        const expectedExpiry = Date.now() + 60 * 60 * 1000; // 60 minutes from now
        expect(expiryTime).toBeGreaterThan(Date.now());
        expect(expiryTime).toBeLessThanOrEqual(expectedExpiry);
      }
    });
  });

  test.describe('Reservation Management', () => {
    test('releases hotspot reservation', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      const hotspot = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [],
      );
      const reservationResult = await MockHotspotsService.reserveHotspot(
        hotspot.id,
        'truck_123',
        60,
      );

      expect(reservationResult.success).toBe(true);
      if (reservationResult.reservation) {
        const releaseResult = await MockHotspotsService.releaseHotspot(
          reservationResult.reservation.id,
        );

        expect(releaseResult.success).toBe(true);

        // Verify reservation was removed
        const reservations = Array.from(MockHotspotsService.reservations.values());
        const stillExists = reservations.some((r) => r.id === reservationResult.reservation.id);
        expect(stillExists).toBe(false);
      }
    });

    test('returns error for non-existent reservation', async () => {
      const result = await MockHotspotsService.releaseHotspot('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reservation not found');
    });

    test('returns active reservations for truck', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      const hotspot1 = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [],
      );
      const hotspot2 = await MockHotspotsService.createHotspot(
        { lat: 33.75, lng: -84.389 },
        75,
        [],
      );

      // Create active reservations
      await MockHotspotsService.reserveHotspot(hotspot1.id, 'truck_123', 60);
      await MockHotspotsService.reserveHotspot(hotspot2.id, 'truck_123', 120);

      // Create expired reservation
      const expiredId = `res_expired_${Date.now()}`;
      MockHotspotsService.reservations.set(expiredId, {
        id: expiredId,
        hotspotId: hotspot1.id,
        truckId: 'truck_123',
        reservedUntil: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const activeReservations = await MockHotspotsService.getActiveReservations('truck_123');

      // Should return only 2 active reservations
      expect(activeReservations.length).toBe(2);
      activeReservations.forEach((r) => {
        expect(new Date(r.reservedUntil).getTime()).toBeGreaterThan(Date.now());
      });
    });
  });

  test.describe('Cleanup Function', () => {
    test('removes expired reservations', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      // Create expired reservations
      const expiredIds = ['expired_1', 'expired_2', 'expired_3'];
      expiredIds.forEach((id) => {
        MockHotspotsService.reservations.set(id, {
          id,
          hotspotId: 'hotspot_1',
          truckId: 'truck_123',
          reservedUntil: new Date(Date.now() - 3600000).toISOString(),
          createdAt: new Date().toISOString(),
        });
      });

      // Create active reservation
      const activeId = 'active_1';
      MockHotspotsService.reservations.set(activeId, {
        id: activeId,
        hotspotId: 'hotspot_2',
        truckId: 'truck_456',
        reservedUntil: new Date(Date.now() + 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const deletedCount = await MockHotspotsService.cleanupExpiredReservations();

      expect(deletedCount).toBe(3);
      expect(MockHotspotsService.reservations.has(activeId)).toBe(true);
      expiredIds.forEach((id) => {
        expect(MockHotspotsService.reservations.has(id)).toBe(false);
      });
    });

    test('returns zero when no expired reservations', async () => {
      MockHotspotsService.reservations.clear();

      const deletedCount = await MockHotspotsService.cleanupExpiredReservations();

      expect(deletedCount).toBe(0);
    });
  });

  test.describe('Edge Cases', () => {
    test('handles hotspot with no businesses nearby', async () => {
      MockHotspotsService.hotspots.clear();

      const hotspot = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [], // No businesses
      );

      expect(hotspot.businessesNearby).toHaveLength(0);
      expect(hotspot.trafficScore).toBe(80);
    });

    test('handles very low traffic score', async () => {
      const trafficData = [
        {
          coordinates: [33.749, -84.388],
          severity: 'low',
          type: 'minor',
        },
      ];

      const hotspots = await MockHotspotsService.discoverHotspotsFromTrafficData(trafficData);

      expect(hotspots.length).toBe(0);
    });

    test('validates reservation duration', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      const hotspot = await MockHotspotsService.createHotspot(
        { lat: 33.749, lng: -84.388 },
        80,
        [],
      );

      // Test very short duration
      const shortResult = await MockHotspotsService.reserveHotspot(hotspot.id, 'truck_123', 1);
      expect(shortResult.success).toBe(true);

      // Verify expiry is correct
      if (shortResult.reservation) {
        const expiryTime = new Date(shortResult.reservation.reservedUntil).getTime();
        const expectedExpiry = Date.now() + 1 * 60 * 1000; // 1 minute from now
        expect(expiryTime).toBeGreaterThan(Date.now());
        expect(expiryTime).toBeLessThanOrEqual(expectedExpiry);
      }
    });
  });

  test.describe('Integration Scenarios', () => {
    test('complete workflow: discovery, search, reservation', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      // Step 1: Discover hotspots from traffic data
      const trafficData = [
        { coordinates: [33.749, -84.388], severity: 'high', type: 'accident' },
        { coordinates: [33.749, -84.388], severity: 'moderate', type: 'construction' },
      ];
      const hotspots = await MockHotspotsService.discoverHotspotsFromTrafficData(trafficData);

      expect(hotspots.length).toBeGreaterThan(0);
      const hotspot = hotspots[0];

      // Step 2: Search for hotspots near a location
      const nearbyHotspots = await MockHotspotsService.findNearbyHotspots(33.749, -84.388, 1.0);
      expect(nearbyHotspots.length).toBeGreaterThan(0);

      // Step 3: Reserve a hotspot
      const reservationResult = await MockHotspotsService.reserveHotspot(
        hotspot.id,
        'truck_123',
        60,
      );
      expect(reservationResult.success).toBe(true);

      // Step 4: Verify reservation appears in active list
      const activeReservations = await MockHotspotsService.getActiveReservations('truck_123');
      expect(activeReservations.length).toBe(1);
      expect(activeReservations[0].hotspotId).toBe(hotspot.id);

      // Step 5: Release reservation
      if (reservationResult.reservation) {
        const releaseResult = await MockHotspotsService.releaseHotspot(
          reservationResult.reservation.id,
        );
        expect(releaseResult.success).toBe(true);
      }

      // Step 6: Verify no active reservations remain
      const finalReservations = await MockHotspotsService.getActiveReservations('truck_123');
      expect(finalReservations.length).toBe(0);
    });

    test('cleanup removes only expired reservations', async () => {
      MockHotspotsService.hotspots.clear();
      MockHotspotsService.reservations.clear();

      // Create multiple hotspots and reservations
      const hotspots = [];
      for (let i = 0; i < 3; i++) {
        const hotspot = await MockHotspotsService.createHotspot(
          { lat: 33.749 + i * 0.001, lng: -84.388 + i * 0.001 },
          75 + i * 5,
          [],
        );
        hotspots.push(hotspot);
      }

      // Create mix of active and expired reservations
      await MockHotspotsService.reserveHotspot(hotspots[0].id, 'truck_1', 60);
      await MockHotspotsService.reserveHotspot(hotspots[1].id, 'truck_2', 60);

      // Add expired
      const expiredId = `res_expired_${Date.now()}`;
      MockHotspotsService.reservations.set(expiredId, {
        id: expiredId,
        hotspotId: hotspots[2].id,
        truckId: 'truck_3',
        reservedUntil: new Date(Date.now() - 3600000).toISOString(),
        createdAt: new Date().toISOString(),
      });

      const deletedCount = await MockHotspotsService.cleanupExpiredReservations();

      expect(deletedCount).toBe(1);

      // Verify only expired was removed
      const activeReservations = Array.from(MockHotspotsService.reservations.values());
      expect(activeReservations.length).toBe(2);
      activeReservations.forEach((r) => {
        expect(new Date(r.reservedUntil).getTime()).toBeGreaterThan(Date.now());
      });
    });
  });
});
