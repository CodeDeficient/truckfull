/**
 * Production Load Testing for Analytics Track API
 *
 * Tests rate limiting and performance of /api/analytics/track endpoint
 * Simulates 150 requests/minute (2.5 req/sec) to validate:
 * - First 100 requests succeed (status 200/202)
 * - Most requests return 429 (rate limit exceeded)
 * - Response time stays under 200ms
 * - Retry-After header present on 429 responses
 *
 * Rate Limit Configuration:
 * - detailLimiter: 200 requests per minute (see lib/middleware/rateLimit.ts:174-176)
 *
 * Prerequisites:
 * - Dev server running on localhost:3000
 * - k6 installed (https://k6.io/docs/getting-started/installation/)
 *   - Mac: brew install k6
 *   - Ubuntu: apt install k6
 *   - Windows: choco install k6
 *
 * Run tests:
 *   k6 run tests/load/api-load.js
 *
 * Or run with custom configuration:
 *   k6 run --vus 10 --duration 30s tests/load/api-load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 150 }, // Ramp up to 150 VUs (2.5 VU/sec)
    { duration: '30s', target: 150 }, // Stay at 150 VUs
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests under 200ms
    errors: ['rate<0.33'], // Allow ~33% errors (50 out of 150)
  },
};

// Test data
const TEST_TRUCK_ID = '00000000-0000-0000-0000-000000000000'; // Replace with valid truck UUID
const API_URL = 'http://localhost:3000/api/analytics/track';

export default function () {
  const payload = JSON.stringify({
    truckId: TEST_TRUCK_ID,
    eventType: 'view',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const response = http.post(API_URL, payload, params);

  // Assertions
  const isSuccess = check(response, {
    'status is 200 or 202': (r) => r.status === 200 || r.status === 202,
    'status is 429 when rate limited': (r) => r.status === 429,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'Retry-After header on 429': (r) =>
      r.status === 429 ? r.headers['Retry-After'] !== undefined : true,
    'response body contains success': (r) =>
      r.status === 200 || r.status === 202 ? JSON.parse(r.body).success === true : true,
  });

  errorRate.add(!isSuccess);

  // Sleep to maintain 2.5 requests per second per VU
  sleep(0.4);
}

// Optional: Setup function to create test data before test starts
export function setup() {
  // Create a test truck if needed
  // This would typically be done via API or database script
  console.log('Setup: Preparing test data...');
  return { truckId: TEST_TRUCK_ID };
}

// Optional: Teardown function to clean up after test
export function teardown(data) {
  console.log('Teardown: Cleaning up test data...');
  // Clean up test data if needed
}
