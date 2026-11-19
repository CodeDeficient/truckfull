import { logError, logWarning, logMessage } from '@/lib/logging';
/**
 * User Location Service
 * Implements progressive accuracy approach for location detection:
 * GPS → Network Location → IP Geolocation → Last Known Location → Default Fallback
 */

interface LocationResult {
  lat: number;
  lng: number;
  accuracy?: number; // Accuracy in meters
  source: 'gps' | 'network' | 'ip' | 'last_known' | 'default';
  timestamp: number;
}

interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number; // milliseconds
  maximumAge?: number; // milliseconds
  fallbackTimeout?: number; // milliseconds for fallback methods
}

const DEFAULT_LOCATION = {
  lat: 39.8283, // Approximate center of the US
  lng: -98.5795,
};

class UserLocationService {
  private static readonly IP_GEOLOCATION_URL = 'https://ipapi.co/json/';
  private static readonly STORAGE_KEY = 'lastKnownUserLocation';
  private static readonly STORAGE_EXPIRATION_HOURS = 24;

  /**
   * Get user location with progressive fallback methods
   */
  public static async getUserLocation(options: LocationOptions = {}): Promise<LocationResult> {
    const {
      enableHighAccuracy = true,
      timeout = 10_000, // 10 seconds for GPS
      maximumAge = 600_000, // 10 minutes
      fallbackTimeout = 5000, // 5 seconds for fallback methods
    } = options;

    // 1. Try GPS with timeout
    try {
      const gpsResult = await this.getGpsLocation({ enableHighAccuracy, timeout, maximumAge });
      logMessage('✅ GPS location retrieved:', gpsResult);
      return gpsResult;
    } catch (error) {
      logWarning('⚠️ GPS location failed:', error);
    }

    // 2. Try network location (cell tower/Wi-Fi triangulation)
    try {
      const networkResult = await this.getNetworkLocation({ timeout: fallbackTimeout });
      logMessage('✅ Network location retrieved:', networkResult);
      return networkResult;
    } catch (error) {
      logWarning('⚠️ Network location failed:', error);
    }

    // 3. Try IP-based geolocation
    try {
      const ipResult = await this.getIpLocation({ timeout: fallbackTimeout });
      logMessage('✅ IP-based location retrieved:', ipResult);
      return ipResult;
    } catch (error) {
      logWarning('⚠️ IP-based location failed:', error);
    }

    // 4. Try last known location
    try {
      const lastKnownResult = await this.getLastKnownLocation();
      if (lastKnownResult) {
        logMessage('✅ Last known location retrieved:', lastKnownResult);
        return lastKnownResult;
      }
    } catch (error) {
      logWarning('⚠️ Last known location failed:', error);
    }

    // 5. Fallback to default location
    logMessage('🌍 Using default fallback location');
    return {
      lat: DEFAULT_LOCATION.lat,
      lng: DEFAULT_LOCATION.lng,
      source: 'default',
      timestamp: Date.now(),
    };
  }

  /**
   * Shared helper for geolocation API calls with permission checking
   */
  private static async getLocationViaGeolocationAPI(
    source: 'gps' | 'network',
    options: PositionOptions,
  ): Promise<LocationResult> {
    if (!navigator?.geolocation) {
      throw new Error('Geolocation API not supported');
    }

    // Check permission status first if supported
    if (navigator.permissions) {
      try {
        // eslint-disable-next-line sonarjs/no-intrusive-permissions -- Geolocation permission check is necessary to respect user privacy settings
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          throw new Error('Geolocation permission denied by user');
        }
      } catch (error) {
        // If permission API fails, continue with direct geolocation request
        logWarning('Could not check geolocation permission, proceeding with request:', error);
      }
    }

    return new Promise<LocationResult>((resolve, reject) => {
      // eslint-disable-next-line sonarjs/no-intrusive-permissions -- Geolocation is necessary to get user's current position for location-based services
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;

          // Validate coordinates are within valid ranges
          if (!this.isValidCoordinate(latitude, longitude)) {
            reject(new Error(`Invalid ${source} coordinates`));
            return;
          }

          resolve({
            lat: latitude,
            lng: longitude,
            accuracy,
            source,
            timestamp: Date.now(),
          });
        },
        (error) => {
          reject(new Error(`${source.toUpperCase()} error: ${error.message || 'Unknown error'}`));
        },
        options,
      );
    });
  }

  /**
   * Get location using GPS/Geolocation API
   */
  private static async getGpsLocation(options: {
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
  }): Promise<LocationResult> {
    return this.getLocationViaGeolocationAPI('gps', {
      enableHighAccuracy: options.enableHighAccuracy,
      timeout: options.timeout,
      maximumAge: options.maximumAge,
    });
  }

  /**
   * Get location via network (cell tower/Wi-Fi triangulation)
   * Note: This is typically handled by the same Geolocation API as GPS,
   * but with different parameters. This method is for potential future use
   * where we might use a different network-based service.
   */
  private static async getNetworkLocation(options: { timeout: number }): Promise<LocationResult> {
    return this.getLocationViaGeolocationAPI('network', {
      enableHighAccuracy: false, // Lower accuracy for network
      timeout: options.timeout,
      maximumAge: 300_000, // 5 minutes for network
    });
  }

  /**
   * Get location based on IP address
   */
  private static async getIpLocation(options: { timeout: number }): Promise<LocationResult> {
    try {
      // Use a timeout wrapper for fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout);

      const response = await fetch(this.IP_GEOLOCATION_URL, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`IP geolocation API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data?.lat || !data?.lon) {
        throw new Error('IP geolocation returned invalid coordinates');
      }

      const { lat, lon: lng } = data;

      // Validate coordinates are within valid ranges
      if (!this.isValidCoordinate(lat, lng)) {
        throw new Error('Invalid IP geolocation coordinates');
      }

      return {
        lat,
        lng,
        accuracy: 100_000, // IP location typically has 100km+ accuracy
        source: 'ip',
        timestamp: Date.now(),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('IP geolocation timeout');
      }
      throw error;
    }
  }

  /**
   * Get last known location from storage
   */
  private static async getLastKnownLocation(): Promise<LocationResult | null> {
    try {
      if (globalThis.window === undefined || !globalThis.localStorage) {
        return null;
      }

      const stored = globalThis.localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const locationData = JSON.parse(stored);
      const { lat, lng, source, timestamp } = locationData;

      // Validate coordinates
      if (!this.isValidCoordinate(lat, lng)) {
        logWarning('Invalid coordinates in stored location data');
        return null;
      }

      // Check if location is too old (based on expiration)
      const currentTime = Date.now();
      const timeDiff = currentTime - timestamp;
      const expirationTime = this.STORAGE_EXPIRATION_HOURS * 60 * 60 * 1000;

      if (timeDiff > expirationTime) {
        logMessage('Stored location is too old, clearing it');
        globalThis.localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      return {
        lat: Number.parseFloat(lat),
        lng: Number.parseFloat(lng),
        source,
        timestamp,
      };
    } catch (error) {
      logError('Error retrieving last known location:', error);
      return null;
    }
  }

  /**
   * Store current location as last known location
   */
  public static async setLastKnownLocation(location: LocationResult): Promise<void> {
    try {
      if (globalThis.window === undefined || !globalThis.localStorage) {
        return;
      }

      const locationData = {
        lat: location.lat,
        lng: location.lng,
        source: location.source,
        timestamp: Date.now(),
      };

      globalThis.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(locationData));
      logMessage('Last known location stored:', locationData);
    } catch (error) {
      logError('Error storing last known location:', error);
    }
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
   * Clear stored last known location
   */
  public static clearLastKnownLocation(): void {
    if (globalThis.window === undefined || !globalThis.localStorage) {
      return;
    }
    globalThis.localStorage.removeItem(this.STORAGE_KEY);
  }
}

export { UserLocationService, type LocationResult, type LocationOptions };
