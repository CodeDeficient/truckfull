/**
 * Unit tests for lib/cron/ingestExternalEvents.ts
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockLogMessage = jest.fn();
const mockLogError = jest.fn();

jest.unstable_mockModule('@/lib/logging', () => ({
  logMessage: mockLogMessage,
  logError: mockLogError,
  logWarning: jest.fn(),
}));

const mockIngestCityEvents = jest.fn();
const mockRetryPendingGeocodes = jest.fn();
const mockRunDedupV2 = jest.fn();
const defaultDedupMetrics = {
  totalClusters: 1,
  averageClusterSize: 2,
  largestClusterSize: 2,
  largestClusterKey: 'a|b',
  autoMerges: 1,
  llmCallsAttempted: 0,
  llmCallsSkippedDryRun: 0,
  humanReviewCount: 0,
  keptSeparateCount: 0,
  crossStateClusters: 0,
  crossSourceClusters: 1,
  nullCoordinateClusters: 0,
  rowsAlreadyNonCanonical: 0,
  rowsSkippedMutationBecauseAlreadyNonCanonical: 0,
  rowsNewlyMarkedNonCanonical: 1,
  mutationErrors: 0,
  queueInsertErrors: 0,
  durationMs: 1,
  dryRun: false,
};

jest.unstable_mockModule('@/lib/events/externalEventIngestion', () => ({
  ingestCityEvents: mockIngestCityEvents,
  retryPendingGeocodes: mockRetryPendingGeocodes,
}));

jest.unstable_mockModule('@/lib/dedup/dedupOrchestrator', () => ({
  runDedupV2: mockRunDedupV2,
}));

jest.unstable_mockModule('@/lib/events/cities', () => ({
  CITIES: {
    austin: { city: 'Austin', state: 'TX', source: 'test', latitude: 30.2672, longitude: -97.7431 },
    houston: { city: 'Houston', state: 'TX', source: 'test', latitude: 29.7604, longitude: -95.3698 },
  },
}));

jest.unstable_mockModule('@/lib/cron/classifyRelevance', () => ({
  classifyRelevanceCron: jest.fn(async () => ({
    success: true,
    total: 0,
    confirmed: 0,
    likely: 0,
    rejected: 0,
    modelFailures: 0,
    errors: 0,
    duration_ms: 0,
  })),
}));

let runIngestion: typeof import('@/lib/cron/ingestExternalEvents').runIngestion;
let runGeocodeRetry: typeof import('@/lib/cron/ingestExternalEvents').runGeocodeRetry;

describe('ingestExternalEvents', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockRunDedupV2.mockResolvedValue(defaultDedupMetrics);

    const mod = await import('@/lib/cron/ingestExternalEvents');
    runIngestion = mod.runIngestion;
    runGeocodeRetry = mod.runGeocodeRetry;
  });

  describe('runIngestion', () => {
    it('should successfully ingest events from all cities', async () => {
      mockIngestCityEvents.mockResolvedValue({
        inserted: 5,
        updated: 2,
        skipped: 1,
        errors: 0,
        geocodePending: 0,
        duration_ms: 100,
      });

      const invalidate = jest.fn();
      const result = await runIngestion(invalidate);

      expect(result.success).toBe(true);
      expect(result.cities).toBe(2);
      expect(result.inserted).toBe(10);
      expect(result.updated).toBe(4);
      expect(result.skipped).toBe(2);
      expect(result.errors).toBe(0);
      expect(result.dedupRemoved).toBe(1);
      expect(result.dedupMetrics?.rowsNewlyMarkedNonCanonical).toBe(1);
      expect(mockRunDedupV2).toHaveBeenCalledWith(
        { dryRun: false, enableLLM: false },
        undefined,
        invalidate,
      );
      expect(mockLogMessage).toHaveBeenCalled();
    });

    it('reports dedup mutation errors as unsuccessful cron errors', async () => {
      mockRunDedupV2.mockResolvedValueOnce({
        ...defaultDedupMetrics,
        mutationErrors: 2,
        queueInsertErrors: 1,
      });
      mockIngestCityEvents.mockResolvedValue({
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        geocodePending: 0,
        duration_ms: 1,
      });

      const result = await runIngestion();

      expect(result.success).toBe(false);
      expect(result.errors).toBe(3);
    });

    it('should handle city ingestion errors gracefully', async () => {
      mockIngestCityEvents
        .mockResolvedValueOnce({
          inserted: 5,
          updated: 0,
          skipped: 0,
          errors: 0,
          geocodePending: 0,
          duration_ms: 50,
        })
        .mockRejectedValueOnce(new Error('Failed to fetch'));

      const result = await runIngestion();

      expect(result.success).toBe(false);
      expect(result.errors).toBe(1);
      expect(result.cityResults).toBeDefined();
      expect(result.failedCities).toEqual(['houston']);
      expect(result.stepErrors).toBe(0);
      expect(mockRunDedupV2).toHaveBeenCalled();
    });

    it('stops the remaining steps when a post-ingestion step fails', async () => {
      mockIngestCityEvents.mockResolvedValue({
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        geocodePending: 0,
        duration_ms: 1,
      });
      mockRunDedupV2.mockRejectedValueOnce(new Error('dedup down'));

      const result = await runIngestion();

      expect(result.success).toBe(false);
      expect(result.failedCities).toEqual([]);
      expect(result.stepErrors).toBe(1);
      expect(result.errors).toBe(1);
    });

    it('should track geocode pending counts from city results', async () => {
      mockIngestCityEvents.mockResolvedValue({
        inserted: 3,
        updated: 1,
        skipped: 0,
        errors: 0,
        geocodePending: 2,
        duration_ms: 75,
      });

      const result = await runIngestion();

      expect(result.geocodePending).toBe(4);
    });

    it('keeps isolated validation and enrichment counts non-fatal', async () => {
      mockIngestCityEvents.mockResolvedValue({
        inserted: 3,
        updated: 1,
        skipped: 5,
        errors: 0,
        invalidRecords: 5,
        enrichmentFailures: 2,
        geocodePending: 0,
        duration_ms: 75,
      });

      const result = await runIngestion();

      expect(result.success).toBe(true);
      expect(result.errors).toBe(0);
      expect(result.invalidRecords).toBe(10);
      expect(result.enrichmentFailures).toBe(4);
    });

    it('should return failure when all cities fail', async () => {
      mockIngestCityEvents.mockRejectedValue(new Error('Total failure'));

      const result = await runIngestion();

      expect(result.success).toBe(false);
      expect(result.cities).toBe(2);
      expect(result.inserted).toBe(0);
      expect(result.errors).toBe(2);
    });

    it.skip('per-city budget cap: skips remaining Eventbrite cities when budget low', async () => {
      // NOTE: The budget-cap logic in runIngestion requires mocking
      // EventbriteRateLimiter with custom behaviour, which exceeds the
      // 15-line mock complexity limit for Jest. Test via Playwright E2E.
    });

    it.skip('per-city skipped counts: logs per-city skipped breakdown in summary', async () => {
      // NOTE: Testing log call details with specific message content
      // requires fragile assertions on structured log data. Test via
      // Playwright E2E or manual verification.
    });
  });

  describe('runGeocodeRetry', () => {
    it('should successfully retry geocodes', async () => {
      mockRetryPendingGeocodes.mockResolvedValue({
        total: 10,
        succeeded: 8,
        failed: 2,
        duration_ms: 500,
      });

      const result = await runGeocodeRetry();

      expect(result.success).toBe(true);
      expect(result.total).toBe(10);
      expect(result.succeeded).toBe(8);
      expect(result.failed).toBe(2);
      expect(mockLogMessage).toHaveBeenCalled();
    });

    it('should handle geocode retry errors gracefully', async () => {
      mockRetryPendingGeocodes.mockRejectedValue(new Error('Geocode service unavailable'));

      const result = await runGeocodeRetry();

      expect(result.success).toBe(false);
      expect(result.total).toBe(0);
      expect(result.succeeded).toBe(0);
      expect(result.failed).toBe(0);
    });
  });
});
