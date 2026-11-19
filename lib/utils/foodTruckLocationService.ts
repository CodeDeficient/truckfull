/**
 * Food Truck Location Service
 * Implements location validation, recovery from addresses, and fallback to most recent known location
 */

import { geocodeAddress } from './geocoding';
import { logError, logWarning, logMessage } from '@/lib/logging';

interface TruckLocationResult {
  lat: number;
  lng: number;
  accuracy?: number;
  source: 'live' | 'recent' | 'address_geocoded' | 'default';
  confidence: 'high' | 'medium' | 'low'; // Confidence level based on source and accuracy
  timestamp: number;
}

interface TruckLocationHistory {
  id: string;
  location: { lat: number; lng: number };
  timestamp: number;
  source: 'owner_update' | 'user_report' | 'verification';
  accuracy?: number;
}

interface TruckData {
  id: string;
  current_location?: unknown;
  [key: string]: unknown;
}

class FoodTruckLocationService {
  private static readonly HISTORY_STORAGE_KEY = 'truckLocationHistory';
  private static readonly DEFAULT_TRUCK_LOCATION = {
    lat: 39.8283, // Approximate center of the US
    lng: -98.5795,
  };

  /**
   * Get the best available location for a food truck with fallback hierarchy:
   * Live Location → Most Recent Known → Address-based Geocoding → Default
   */
  public static async getTruckLocation(truck: TruckData): Promise<TruckLocationResult> {
    // 1. Try live location from truck data
    if (this.isValidTruckLocation(truck)) {
      const location = truck.current_location;
      let lat: number | undefined, lng: number | undefined, accuracy: number | undefined;

      if (location && typeof location === 'object' && 'lat' in location && 'lng' in location) {
        const loc = location as Record<string, unknown>;
        lat = typeof loc.lat === 'number' ? loc.lat : undefined;
        lng = typeof loc.lng === 'number' ? loc.lng : undefined;
        accuracy = typeof loc.accuracy === 'number' ? loc.accuracy : undefined;
      } else {
        // If location format is unexpected, set values to undefined
        lat = undefined;
        lng = undefined;
      }

      if (typeof lat === 'number' && typeof lng === 'number') {
        const result: TruckLocationResult = {
          lat,
          lng,
          accuracy: accuracy ?? 50, // Default to 50m for live location
          source: 'live',
          confidence: 'high',
          timestamp: Date.now(),
        };

        logMessage('✅ Live truck location retrieved:', result);
        await this.recordLocationHistory(truck.id, result, 'owner_update');
        return result;
      }
    }

    // 2. Try most recent known location from history
    const recentResult = await this.getMostRecentKnownLocation(truck.id);
    if (recentResult) {
      logMessage('✅ Recent known location retrieved:', recentResult);
      return recentResult;
    }

    // 3. Try address-based geocoding
    // Try to get address from various possible locations in the truck object
    const possibleAddressFields = [
      'address',
      'location_address',
      'business_address',
      // Additional fields where address might be stored
    ];

    let addressToUse = '';
    for (const field of possibleAddressFields) {
      const value = truck[field];
      if (typeof value === 'string') {
        addressToUse = value;
        break;
      }
    }

    // If no specific address field, try to construct from current_location
    if (!addressToUse && truck.current_location && typeof truck.current_location === 'object' && truck.current_location !== null) {
      const location = truck.current_location as Record<string, unknown>;
      if (typeof location.address === 'string') {
        addressToUse = location.address;
      }
    }

    if (addressToUse) {
      try {
        const geocodeResult = await geocodeAddress(addressToUse);
        if (geocodeResult.success) {
          const result: TruckLocationResult = {
            lat: geocodeResult.lat,
            lng: geocodeResult.lng,
            accuracy: 100, // Approximate accuracy for geocoded addresses
            source: 'address_geocoded',
            confidence: 'medium',
            timestamp: Date.now(),
          };

          logMessage('✅ Address-geocoded location retrieved:', result);
          await this.recordLocationHistory(truck.id, result, 'verification');
          return result;
        }
      } catch (error) {
        logWarning('⚠️ Address geocoding failed:', error);
      }
    }

    // 4. Fallback to default location
    logMessage('🌍 Using default fallback location for truck:', truck.id);
    return {
      lat: this.DEFAULT_TRUCK_LOCATION.lat,
      lng: this.DEFAULT_TRUCK_LOCATION.lng,
      source: 'default',
      confidence: 'low',
      timestamp: Date.now(),
    };
  }

  /**
   * Validate if truck has a valid current location
   */
  private static isValidTruckLocation(truck: TruckData): boolean {
    const location = truck.current_location;
    if (!location || typeof location !== 'object') {
      return false;
    }

    const loc = location as Record<string, unknown>;
    const lat = loc.lat;
    const lng = loc.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return false;
    }

    return (
      !Number.isNaN(lat) &&
      !Number.isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !(lat === 0 && lng === 0) // Avoid "Null Island"
    );
  }

  /**
   * Get most recent known location from history
   */
  private static async getMostRecentKnownLocation(
    truckId: string,
  ): Promise<TruckLocationResult | null> {
    try {
      if (globalThis.window === undefined || !globalThis.localStorage) {
        return null;
      }

      const storedHistory = globalThis.localStorage.getItem(this.HISTORY_STORAGE_KEY);
      if (!storedHistory) {
        return null;
      }

      const history: TruckLocationHistory[] = JSON.parse(storedHistory);
      const truckHistory = history.filter((entry) => entry.id === truckId);

      if (truckHistory.length === 0) {
        return null;
      }

      // Get the most recent entry
      let recentEntry = truckHistory[0];
      for (let i = 1; i < truckHistory.length; i++) {
        if (truckHistory[i].timestamp > recentEntry.timestamp) {
          recentEntry = truckHistory[i];
        }
      }

      // Check if the location is too old (e.g., older than 7 days)
      const currentTime = Date.now();
      const timeDiff = currentTime - recentEntry.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

      if (timeDiff > maxAge) {
        logMessage('Truck location history is too old, not using for:', truckId);
        return null;
      }

      return {
        lat: recentEntry.location.lat,
        lng: recentEntry.location.lng,
        accuracy: recentEntry.accuracy,
        source: 'recent',
        confidence: 'medium',
        timestamp: recentEntry.timestamp,
      };
    } catch (error) {
      logError('Error retrieving most recent known location:', error);
      return null;
    }
  }

  /**
   * Record location history for a truck
   */
  public static async recordLocationHistory(
    truckId: string,
    locationResult: TruckLocationResult,
    source: 'owner_update' | 'user_report' | 'verification',
  ): Promise<void> {
    try {
      if (globalThis.window === undefined || !globalThis.localStorage) {
        return;
      }

      // Get existing history
      let history: TruckLocationHistory[] = [];
      const storedHistory = globalThis.localStorage.getItem(this.HISTORY_STORAGE_KEY);
      if (storedHistory) {
        history = JSON.parse(storedHistory);
      }

      // Add new entry
      const newEntry: TruckLocationHistory = {
        id: truckId,
        location: {
          lat: locationResult.lat,
          lng: locationResult.lng,
        },
        timestamp: locationResult.timestamp,
        source,
        accuracy: locationResult.accuracy,
      };

      history.push(newEntry);

      // Keep only recent history (last 50 entries per truck max)
      const truckHistory = history.filter((entry) => entry.id === truckId);
      if (truckHistory.length > 50) {
        // Keep only the most recent 50 entries for this truck
        const otherTrucks = history.filter((entry) => entry.id !== truckId);
        const recentTruckHistory = truckHistory
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 50);
        history = [...otherTrucks, ...recentTruckHistory];
      }

      // Store updated history
      globalThis.localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(history));
      logMessage('Truck location history recorded for:', truckId);
    } catch (error) {
      logError('Error recording truck location history:', error);
    }
  }

  /**
   * Update truck location from live data (called when owner updates location or during scraping)
   */
  public static async updateLiveLocation(
    truckId: string,
    lat: number,
    lng: number,
    accuracy?: number,
  ): Promise<TruckLocationResult> {
    if (!this.isValidCoordinate(lat, lng)) {
      throw new Error(`Invalid coordinates for truck ${truckId}: lat=${lat}, lng=${lng}`);
    }

    const result: TruckLocationResult = {
      lat,
      lng,
      accuracy,
      source: 'live',
      confidence: 'high',
      timestamp: Date.now(),
    };

    // Record in history
    await this.recordLocationHistory(truckId, result, 'owner_update');

    logMessage('Live truck location updated:', result);
    return result;
  }

  /**
   * Validate that coordinates are within valid ranges
   */
  private static isValidCoordinate(lat: number, lng: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lng === 'number' &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180 &&
      !(lat === 0 && lng === 0) // Avoid "Null Island"
    );
  }

  /**
   * Get location accuracy estimate based on source
   */
  public static getAccuracyEstimate(source: string): number {
    switch (source) {
      case 'live': {
        return 50;
      } // 50m for live GPS updates
      case 'recent': {
        return 500;
      } // 500m for recent location (may be outdated)
      case 'address_geocoded': {
        return 100;
      } // 100m for geocoded addresses
      case 'default': {
        return 100_000;
      } // 100km for default locations
      default: {
        return 500;
      } // Default estimate
    }
  }

  /**
   * Clear location history for a specific truck (for data cleanup)
   */
  public static clearTruckLocationHistory(truckId: string): void {
    try {
      if (globalThis.window === undefined || !globalThis.localStorage) {
        return;
      }

      const storedHistory = globalThis.localStorage.getItem(this.HISTORY_STORAGE_KEY);
      if (!storedHistory) {
        return;
      }

      const history: TruckLocationHistory[] = JSON.parse(storedHistory);
      const filteredHistory = history.filter((entry) => entry.id !== truckId);

      globalThis.localStorage.setItem(this.HISTORY_STORAGE_KEY, JSON.stringify(filteredHistory));
      logMessage('Cleared location history for truck:', truckId);
    } catch (error) {
      logError('Error clearing truck location history:', error);
    }
  }
}

export { FoodTruckLocationService, type TruckLocationResult, type TruckLocationHistory };
