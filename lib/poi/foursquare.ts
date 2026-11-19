export interface FoursquareVenue {
  fsq_id: string;
  name: string;
  location?: {
    address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
    formatted_address?: string;
  };
  geocodes?: {
    main?: {
      latitude: number;
      longitude: number;
    };
  };
  categories?: Array<{
    id: number;
    name: string;
    icon?: {
      prefix: string;
      suffix: string;
    };
  }>;
  rating?: number;
  stats?: {
    total_ratings?: number;
  };
  hours?: {
    status?: string;
    is_local_holiday?: boolean;
  };
  tel?: string;
  website?: string;
}

export interface FoursquareSearchResponse {
  results: FoursquareVenue[];
  context?: {
    region?: {
      id: string;
      name: string;
    };
  };
}

export interface FoursquareSearchParams {
  latitude: number;
  longitude: number;
  query?: string;
  categories?: string[];
  radius?: number;
  limit?: number;
  offset?: number;
}

export interface FoursquareSearchResult {
  venues: FoursquareVenue[];
  totalResults?: number;
}

export type FoursquareResponse<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

export interface RateLimitStatus {
  remaining?: number;
  limit?: number;
  resetTime?: Date;
}

export class FoursquareService {
  private readonly baseUrl = 'https://api.foursquare.com/v3/places';
  private rateLimitStatus: RateLimitStatus = {};
  private lastRequestTime: number = 0;
  private minRequestInterval: number = 50;
  private readonly enabled: boolean;

  constructor() {
    this.enabled = process.env.FOURSQUARE_ENABLED !== 'false';
  }

  private isDisabled(): boolean {
    return !this.enabled;
  }

  private getApiKey(): string {
    if (this.isDisabled()) return '';
    const apiKey = process.env.FOURSQUARE_API_KEY;
    if (!apiKey) {
      throw new Error('FOURSQUARE_API_KEY environment variable is not set');
    }
    return apiKey;
  }

  private async makeRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const apiKey = this.getApiKey();

    await this.enforceRateLimit();

    const response = await globalThis.fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
        ...options.headers,
      },
    });

    this.updateRateLimitStatus(response);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error_detail || errorData.error || errorMessage;
      } catch {}
      throw new Error(errorMessage);
    }

    return response.json();
  }

  private updateRateLimitStatus(response: Response): void {
    const remaining = response.headers.get('X-RateLimit-Remaining');
    const limit = response.headers.get('X-RateLimit-Limit');
    const resetTime = response.headers.get('X-RateLimit-Reset');

    this.rateLimitStatus = {
      remaining: remaining ? Number.parseInt(remaining, 10) : undefined,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
      resetTime: resetTime ? new Date(Number.parseInt(resetTime, 10) * 1000) : undefined,
    };
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  searchVenues = async (
    params: FoursquareSearchParams,
  ): Promise<FoursquareResponse<FoursquareSearchResult>> => {
    if (this.isDisabled()) return { success: false, error: 'Foursquare disabled' };
    try {
      const url = new URL(`${this.baseUrl}/search`);

      url.searchParams.append('ll', `${params.latitude},${params.longitude}`);

      if (params.query) {
        url.searchParams.append('query', params.query);
      }

      if (params.categories && params.categories.length > 0) {
        url.searchParams.append('categories', params.categories.join(','));
      }

      if (params.radius) {
        url.searchParams.append('radius', params.radius.toString());
      }

      if (params.limit) {
        url.searchParams.append('limit', params.limit.toString());
      }

      if (params.offset) {
        url.searchParams.append('offset', params.offset.toString());
      }

      url.searchParams.append(
        'fields',
        'fsq_id,name,location,geocodes,categories,rating,stats,hours,tel,website',
      );

      const data = await this.makeRequest<FoursquareSearchResponse>(url.toString());

      return {
        success: true,
        data: {
          venues: data.results,
          totalResults: data.results.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search venues',
      };
    }
  };

  getVenueDetails = async (fsqId: string): Promise<FoursquareResponse<FoursquareVenue>> => {
    if (this.isDisabled()) return { success: false, error: 'Foursquare disabled' };
    try {
      const url = new URL(`${this.baseUrl}/${fsqId}`);
      url.searchParams.append(
        'fields',
        'fsq_id,name,location,geocodes,categories,rating,stats,hours,tel,website',
      );

      const venue = await this.makeRequest<FoursquareVenue>(url.toString());

      return {
        success: true,
        data: venue,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get venue details',
      };
    }
  };

  getRateLimitStatus = (): RateLimitStatus => {
    return { ...this.rateLimitStatus };
  };
}

export const foursquareService = new FoursquareService();
