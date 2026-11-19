/**
 * TomTom Traffic API Service
 * WBS: 4.1.3
 *
 * Provides traffic data and scoring using the TomTom Traffic API.
 * Implements retry logic, caching, and fallback mechanisms for resilience.
 */

import { logMessage, logWarning, logError } from '@/lib/logging';

const TOMTOM_API_BASE_URL = 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute';

export interface TrafficScore {
  score: number;
  level: 'light' | 'moderate' | 'heavy' | 'severe';
  currentSpeed: number;
  freeFlowSpeed: number;
  confidence: number;
  roadClosure?: boolean;
  isFallback?: boolean;
}

export interface TomTomConfig {
  apiKey?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  cacheTTL?: number;
  fallbackScore?: number;
  minConfidence?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface TomTomServiceStatus {
  apiKey: string;
  cacheSize: number;
  totalRequests: number;
  totalErrors: number;
  totalFallbacks: number;
  circuitBreakerState: CircuitBreakerState;
}

interface CacheEntry {
  data: TrafficScore;
  timestamp: number;
}

interface TrafficLevel {
  level: 'light' | 'moderate' | 'heavy' | 'severe';
  threshold: number;
}

export class TomTomTrafficService {
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private retryDelay: number;
  private cacheTTL: number;
  private fallbackScore: number | null;
  private minConfidence: number;
  private circuitBreakerThreshold: number;
  private circuitBreakerTimeout: number;
  private cache: Map<string, CacheEntry>;
  private metrics: {
    totalRequests: number;
    totalErrors: number;
    totalFallbacks: number;
  };
  private circuitBreaker: {
    state: CircuitBreakerState;
    failures: number;
    lastFailureTime: number;
  };
  private readonly trafficLevels: TrafficLevel[] = [
    { level: 'light', threshold: 0.3 },
    { level: 'moderate', threshold: 0.6 },
    { level: 'heavy', threshold: 0.85 },
    { level: 'severe', threshold: 1 },
  ];

  constructor(config: TomTomConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.TOMTOM_API_KEY ?? '';

    if (!this.apiKey) {
      throw new Error('API key is required');
    }

    this.timeout = config.timeout ?? 5000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 100;
    this.cacheTTL = config.cacheTTL ?? 5 * 60 * 1000;
    this.fallbackScore = config.fallbackScore ?? null;
    this.minConfidence = config.minConfidence ?? 0.5;
    this.circuitBreakerThreshold = config.circuitBreakerThreshold ?? 5;
    this.circuitBreakerTimeout = config.circuitBreakerTimeout ?? 60_000;
    this.cache = new Map();
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalFallbacks: 0,
    };
    this.circuitBreaker = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
    };
  }

  /**
   * Gets traffic score for a given location.
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Traffic score or null if unavailable
   */
  async getTrafficScore(lat: number, lng: number): Promise<TrafficScore | null> {
    this.metrics.totalRequests++;

    this.validateCoordinates(lat, lng);

    this.updateCircuitBreakerState();

    if (this.isCircuitBreakerOpen()) {
      logWarning('TomTom: Circuit breaker is open, fast-failing request');
      return null;
    }

    const cacheKey = this.getCacheKey(lat, lng);
    const cached = this.getFromCache(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const result = await this.fetchWithRetry(lat, lng);
      this.setCache(cacheKey, result);
      this.recordSuccess();
      logMessage(`TomTom: Fetched traffic score for ${lat}, ${lng}: ${result.score}`);
      return result;
    } catch {
      this.metrics.totalErrors++;
      this.recordFailure();

      const fallbackResult = this.getFallbackResult(lat, lng);
      if (fallbackResult) {
        this.metrics.totalFallbacks++;
        return fallbackResult;
      }

      return null;
    }
  }

  private updateCircuitBreakerState(): void {
    if (this.circuitBreaker.state === 'open') {
      const now = Date.now();
      if (now - this.circuitBreaker.lastFailureTime >= this.circuitBreakerTimeout) {
        this.circuitBreaker.state = 'half-open';
        logMessage('TomTom: Circuit breaker transitioned to half-open');
      }
    }
  }

  private isCircuitBreakerOpen(): boolean {
    return this.circuitBreaker.state === 'open';
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();

    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'open';
      logWarning('TomTom: Circuit breaker reopened after half-open failure');
    } else if (this.circuitBreaker.failures >= this.circuitBreakerThreshold) {
      this.circuitBreaker.state = 'open';
      logWarning(`TomTom: Circuit breaker opened after ${this.circuitBreaker.failures} failures`);
    }
  }

  private recordSuccess(): void {
    if (this.circuitBreaker.state === 'half-open') {
      this.circuitBreaker.state = 'closed';
      this.circuitBreaker.failures = 0;
      logMessage('TomTom: Circuit breaker closed after successful request');
    } else {
      this.circuitBreaker.failures = 0;
    }
  }

  /**
   * Fetches traffic data with retry logic.
   */
  private async fetchWithRetry(lat: number, lng: number, attempt = 0): Promise<TrafficScore> {
    try {
      return await this.fetchTrafficData(lat, lng);
    } catch (error) {
      if (attempt >= this.maxRetries) {
        throw error;
      }

      const isRetryable = this.isRetryableError(error);
      if (!isRetryable) {
        throw error;
      }

      const delay = this.retryDelay * Math.pow(2, attempt);
      await this.sleep(delay);

      return this.fetchWithRetry(lat, lng, attempt + 1);
    }
  }

  /**
   * Fetches traffic data from TomTom API.
   */
  private async fetchTrafficData(lat: number, lng: number): Promise<TrafficScore> {
    const url = `${TOMTOM_API_BASE_URL}/10/json?key=${this.apiKey}&point=${lat},${lng}&unit=MPH`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          logWarning(`TomTom: Rate limited. Retry after ${retryAfter ?? 'unknown'} seconds`);
          throw new Error(`Rate limited: ${response.status}`);
        }

        logError(`TomTom: API returned ${response.status}`);
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.flowSegmentData) {
        logError('TomTom: Invalid response structure');
        throw new Error('Invalid response structure');
      }

      const { currentSpeed, freeFlowSpeed, confidence, roadClosure } = data.flowSegmentData;

      if (confidence < this.minConfidence) {
        logWarning(`TomTom: Low confidence score (${confidence}) - data may be unreliable`);
        throw new Error(`Low confidence: ${confidence}`);
      }

      return this.calculateTrafficScore(currentSpeed, freeFlowSpeed, confidence, roadClosure);
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        logError('TomTom: Request timeout');
        throw new Error('Timeout');
      }

      throw error;
    }
  }

  /**
   * Calculates traffic score from speed data.
   */
  private calculateTrafficScore(
    currentSpeed: number,
    freeFlowSpeed: number,
    confidence: number,
    roadClosure?: boolean,
  ): TrafficScore {
    let score: number;

    if (roadClosure) {
      score = 1;
    } else if (currentSpeed === 0 && freeFlowSpeed === 0) {
      score = 0;
    } else if (currentSpeed === 0) {
      score = 1;
    } else if (freeFlowSpeed === 0) {
      score = 0;
    } else if (currentSpeed > freeFlowSpeed) {
      score = 0;
    } else {
      score = 1 - currentSpeed / freeFlowSpeed;
      score = Math.max(0, Math.min(1, score));
    }

    score = Math.round(score * 100) / 100;
    const trafficLevel = this.getTrafficLevel(score);

    return {
      score,
      level: trafficLevel.level,
      currentSpeed,
      freeFlowSpeed,
      confidence,
      roadClosure,
    };
  }

  /**
   * Gets traffic level from score.
   */
  private getTrafficLevel(score: number): TrafficLevel {
    for (const item of this.trafficLevels) {
      if (score < item.threshold) {
        return item;
      }
    }
    return { level: 'severe', threshold: 1 };
  }

  /**
   * Validates coordinates.
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new TypeError('Invalid coordinates');
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error('Invalid coordinates');
    }
  }

  /**
   * Validates coordinates and returns boolean.
   */
  private isValidCoordinates(lat: number, lng: number): boolean {
    try {
      this.validateCoordinates(lat, lng);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets cache key for coordinates.
   */
  private getCacheKey(lat: number, lng: number): string {
    return `${lat.toFixed(4)},${lng.toFixed(4)}`;
  }

  /**
   * Gets cached data if available and not expired.
   */
  private getFromCache(key: string): TrafficScore | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp >= this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Sets cache entry.
   */
  private setCache(key: string, data: TrafficScore): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Gets fallback result on error.
   */
  private getFallbackResult(lat: number, lng: number): TrafficScore | null {
    if (this.fallbackScore !== null) {
      const trafficLevel = this.getTrafficLevel(this.fallbackScore);
      return {
        score: this.fallbackScore,
        level: trafficLevel.level,
        currentSpeed: 0,
        freeFlowSpeed: 0,
        confidence: 0,
        isFallback: true,
      };
    }

    const cached = this.getFromCache(this.getCacheKey(lat, lng));
    if (cached) {
      return { ...cached, isFallback: true };
    }

    return null;
  }

  /**
   * Checks if error is retryable.
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('fetch') ||
        message.includes('econnreset')
      );
    }
    return false;
  }

  /**
   * Sleep helper for retry delays.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clears the cache.
   */
  clearCache(): void {
    this.cache.clear();
    logMessage('TomTom: Cache cleared');
  }

  /**
   * Gets service status for monitoring.
   */
  getStatus(): TomTomServiceStatus {
    return {
      apiKey: this.apiKey.slice(0, 8) + '...',
      cacheSize: this.cache.size,
      totalRequests: this.metrics.totalRequests,
      totalErrors: this.metrics.totalErrors,
      totalFallbacks: this.metrics.totalFallbacks,
      circuitBreakerState: this.circuitBreaker.state,
    };
  }

  /**
   * Resets metrics.
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      totalFallbacks: 0,
    };
    logMessage('TomTom: Metrics reset');
  }
}
