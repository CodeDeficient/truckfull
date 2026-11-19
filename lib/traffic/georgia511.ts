/**
 * Traffic Data Service - Georgia 511
 * WBS: 4.1.2
 *
 * Fetches real-time traffic data from the Georgia 511 API.
 * Implements circuit breaker pattern for resilience.
 */

import { logMessage, logWarning, logError } from '@/lib/logging';
import { z } from 'zod';

const GEORGIA_511_API_URL = 'https://511ga.org/api/v2';

// Rate limit: 10 calls per 60 seconds
const RATE_LIMIT_CALLS = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

// Cache duration: 5 minutes
const CACHE_DURATION_MS = 5 * 60 * 1000;

// Circuit breaker settings
const CIRCUIT_BREAKER_THRESHOLD = 3; // failures before opening
const CIRCUIT_BREAKER_RESET_MS = 15 * 60 * 1000; // 15 minutes before half-open

// Response schema
const TrafficEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  severity: z.string().optional(),
  description: z.string().optional(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  roadway: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type TrafficEvent = z.infer<typeof TrafficEventSchema>;

// Circuit breaker state
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  lastStateChange: number;
}

// In-memory state (would use Redis in production)
let circuitBreaker: CircuitBreakerState = {
  state: CircuitState.CLOSED,
  failures: 0,
  lastFailure: 0,
  lastStateChange: Date.now(),
};

let rateLimitWindow: number[] = [];
let cache: { data: TrafficEvent[]; timestamp: number } | null = null;

function checkRateLimit(): boolean {
  const now = Date.now();
  rateLimitWindow = rateLimitWindow.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (rateLimitWindow.length >= RATE_LIMIT_CALLS) {
    return false;
  }

  rateLimitWindow.push(now);
  return true;
}

function getCachedData(): TrafficEvent[] | null {
  if (cache && Date.now() - cache.timestamp < CACHE_DURATION_MS) {
    return cache.data;
  }
  return null;
}

function setCache(data: TrafficEvent[]): void {
  cache = { data, timestamp: Date.now() };
}

function updateCircuitBreaker(success: boolean): void {
  const now = Date.now();
  const previousState = circuitBreaker.state;

  if (success) {
    if (circuitBreaker.state === CircuitState.HALF_OPEN) {
      // Successful call in half-open state, close the circuit
      circuitBreaker.state = CircuitState.CLOSED;
      circuitBreaker.failures = 0;
      logMessage('Circuit breaker CLOSED - service recovered');
    }
  } else {
    circuitBreaker.failures++;
    circuitBreaker.lastFailure = now;

    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.state = CircuitState.OPEN;
      logWarning(`Circuit breaker OPENED after ${circuitBreaker.failures} failures`);
    }
  }

  if (previousState !== circuitBreaker.state) {
    circuitBreaker.lastStateChange = now;
  }
}

function shouldAllowRequest(): boolean {
  const now = Date.now();

  switch (circuitBreaker.state) {
    case CircuitState.CLOSED: {
      return true;
    }

    case CircuitState.OPEN: {
      // Check if enough time has passed to try half-open
      if (now - circuitBreaker.lastStateChange >= CIRCUIT_BREAKER_RESET_MS) {
        circuitBreaker.state = CircuitState.HALF_OPEN;
        circuitBreaker.lastStateChange = now;
        logMessage('Circuit breaker HALF-OPEN - attempting recovery');
        return true;
      }
      return false;
    }

    case CircuitState.HALF_OPEN: {
      // Allow only one request in half-open state
      return true;
    }

    default: {
      return true;
    }
  }
}

/**
 * Fetches traffic events from Georgia 511 API.
 * Returns cached data if circuit is open or rate limited.
 */
export async function fetchGeorgia511Traffic(): Promise<TrafficEvent[]> {
  // Check cache first
  const cached = getCachedData();

  // Check circuit breaker
  if (!shouldAllowRequest()) {
    logMessage('Circuit breaker OPEN - returning cached data');
    return cached ?? [];
  }

  // Check rate limit
  if (!checkRateLimit()) {
    logWarning('Rate limit exceeded - returning cached data');
    return cached ?? [];
  }

  // Check API key
  const apiKey = process.env.GEORGIA_511_API_KEY;
  if (!apiKey) {
    logWarning('Georgia 511 API key not configured');
    return cached ?? [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(`${GEORGIA_511_API_URL}/traffic-events`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const rawData = await response.json();

    // Validate and parse response
    const events: TrafficEvent[] = [];
    for (const item of rawData.events ?? rawData ?? []) {
      try {
        const validated = TrafficEventSchema.parse(item);
        events.push(validated);
      } catch {
        // Skip invalid events
      }
    }

    updateCircuitBreaker(true);
    setCache(events);

    logMessage(`Fetched ${events.length} traffic events from Georgia 511`);
    return events;
  } catch (error) {
    updateCircuitBreaker(false);

    if (error instanceof Error && error.name === 'AbortError') {
      logError('Georgia 511 API timeout');
    } else {
      logError('Georgia 511 API error:', error);
    }

    // Return cached data on failure
    return cached ?? [];
  }
}

/**
 * Gets the current circuit breaker state for monitoring.
 */
export function getCircuitBreakerStatus(): CircuitBreakerState {
  return { ...circuitBreaker };
}

/**
 * Resets the circuit breaker (for admin use).
 */
export function resetCircuitBreaker(): void {
  circuitBreaker = {
    state: CircuitState.CLOSED,
    failures: 0,
    lastFailure: 0,
    lastStateChange: Date.now(),
  };
  rateLimitWindow = []; // Reset rate limits too
  cache = null; // Clear cache
  logMessage('Circuit breaker and rate limits manually reset');
}
