/**
 * Foursquare Places API Service
 *
 * Provides venue popularity and foot traffic data using the Foursquare Places API.
 *
 * Migrated from deprecated v3 API (api.foursquare.com/v3) to new Places API
 * (places-api.foursquare.com) which requires X-Places-Api-Version header.
 *
 * API Docs: https://docs.foursquare.com/developer/reference/place-search
 */

import { logWarning, logError } from '@/lib/logging';

const FOURSQUARE_API_BASE_URL = 'https://places-api.foursquare.com';
const PLACES_API_VERSION = '2025-06-17';

export interface FoursquareVenueData {
  id: string;
  name: string;
  popularity: number;
  rating?: number;
  price?: number;
  hours?: { isOpen: boolean };
  location: { lat: number; lng: number; address: string };
  tel?: string;
}

export interface FoursquareSearchResult {
  results: FoursquareVenueData[];
  totalResults: number;
}

export interface FoursquareConfig {
  apiKey?: string;
  timeout?: number;
}

export class FoursquareService {
  private apiKey: string;
  private timeout: number;
  private readonly enabled: boolean;

  constructor(config: FoursquareConfig = {}) {
    this.enabled = process.env.FOURSQUARE_ENABLED !== 'false';
    this.apiKey = config.apiKey ?? process.env.FOURSQUARE_API_KEY ?? '';

    if (this.enabled && !this.apiKey) {
      throw new Error('Foursquare API key is required');
    }

    this.timeout = config.timeout ?? 10_000;
  }

  private isDisabled(): boolean {
    return !this.enabled || !this.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      'X-Places-Api-Version': PLACES_API_VERSION,
    };
  }

  async getVenuePopularity(placeId: string): Promise<FoursquareVenueData | null> {
    if (!placeId || placeId.trim() === '') {
      throw new Error('Place ID is required');
    }
    if (this.isDisabled()) return null;

    const url = `${FOURSQUARE_API_BASE_URL}/places/${encodeURIComponent(placeId)}?fields=fsq_place_id,name,latitude,longitude,location,popularity,rating,price,hours,tel`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        logWarning(`Foursquare: Venue not found for place ID: ${placeId}`);
        return null;
      }

      if (response.status === 429) {
        logWarning('Foursquare: Rate limited or out of credits');
        return null;
      }

      if (!response.ok) {
        logError(`Foursquare: API returned ${response.status}`);
        return null;
      }

      const data = await response.json();

      return this.parseVenueResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        logError('Foursquare: Request timeout');
        return null;
      }

      throw error;
    }
  }

  async searchVenuesByLocation(
    lat: number,
    lng: number,
    radius: number = 1000,
  ): Promise<FoursquareVenueData[]> {
    if (this.isDisabled()) return [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new TypeError('Invalid coordinates');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates');
    }

    if (!Number.isFinite(radius) || radius <= 0 || radius > 100_000) {
      throw new Error('Radius must be between 0 and 100000 meters');
    }

    const url = `${FOURSQUARE_API_BASE_URL}/places/search?ll=${lat},${lng}&radius=${radius}&fields=fsq_place_id,name,latitude,longitude,location,popularity,rating,price,hours`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        logWarning('Foursquare: Rate limited or out of credits');
        return [];
      }

      if (!response.ok) {
        logError(`Foursquare: Search API returned ${response.status}`);
        return [];
      }

      const data = await response.json();

      return this.parseSearchResponse(data);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        logError('Foursquare: Search request timeout');
        return [];
      }

      throw error;
    }
  }

  private parseVenueResponse(data: Record<string, unknown>): FoursquareVenueData {
    const fsqId = (data.fsq_place_id as string) || (data.fsq_id as string) || '';
    const name = (data.name as string) || 'Unknown';

    let popularity = 0;
    if (data.popularity !== undefined && typeof data.popularity === 'number') {
      popularity = data.popularity;
    }

    const rating = data.rating as number | undefined;
    const price = data.price as number | undefined;

    let isOpen = true;
    if (data.hours !== undefined && typeof data.hours === 'object' && data.hours !== null) {
      const hours = data.hours as { open_now?: boolean; is_open?: boolean };
      isOpen = hours.open_now !== false && hours.is_open !== false;
    }

    const location = data.location as Record<string, unknown> | undefined;
    const address = (location?.formatted_address as string) || (location?.address as string) || '';
    const tel = typeof data.tel === 'string' ? data.tel : undefined;

    const lat =
      (data.latitude as number) || (location?.latitude as number) || (location?.lat as number) || 0;
    const lng =
      (data.longitude as number) ||
      (location?.longitude as number) ||
      (location?.lng as number) ||
      0;

    return {
      id: fsqId,
      name,
      popularity: Math.max(0, Math.min(1, popularity)),
      rating,
      price,
      hours: { isOpen },
      location: { lat, lng, address },
      tel,
    };
  }

  async searchVenueByName(
    query: string,
    near?: string,
  ): Promise<FoursquareVenueData | null> {
    if (this.isDisabled()) return null;
    if (!query.trim()) return null;

    const params = new URLSearchParams({
      query: query.trim(),
      limit: '1',
      fields: 'fsq_place_id,name,latitude,longitude,location,tel',
    });

    if (near) {
      params.set('near', near);
    }

    const url = `${FOURSQUARE_API_BASE_URL}/places/search?${params.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 429) {
        logWarning('Foursquare: Rate limited or out of credits');
        return null;
      }

      if (!response.ok) {
        logError(`Foursquare: Name search returned ${response.status}`);
        return null;
      }

      const data = await response.json();
      const results = this.parseSearchResponse(data);
      return results[0] ?? null;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        logError('Foursquare: Name search timeout');
        return null;
      }

      throw error;
    }
  }

  private parseSearchResponse(data: Record<string, unknown>): FoursquareVenueData[] {
    const results = data.results as Array<Record<string, unknown>> | undefined;

    if (!Array.isArray(results)) {
      return [];
    }

    return results.map((venue) => this.parseVenueResponse(venue));
  }
}

let foursquareServiceInstance: FoursquareService | null = null;

export function getFoursquareService(): FoursquareService {
  if (!foursquareServiceInstance) {
    foursquareServiceInstance = new FoursquareService();
  }
  return foursquareServiceInstance;
}

export async function getVenuePopularity(placeId: string): Promise<FoursquareVenueData | null> {
  const service = getFoursquareService();
  return service.getVenuePopularity(placeId);
}

export async function searchVenueByName(
  query: string,
  near?: string,
): Promise<FoursquareVenueData | null> {
  const service = getFoursquareService();
  return service.searchVenueByName(query, near);
}

export async function searchVenuesByLocation(
  lat: number,
  lng: number,
  radius: number = 1000,
): Promise<FoursquareVenueData[]> {
  const service = getFoursquareService();
  return service.searchVenuesByLocation(lat, lng, radius);
}
