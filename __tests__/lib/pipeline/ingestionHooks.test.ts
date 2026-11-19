import { jest, describe, it, expect, beforeEach } from '@jest/globals';

const mockIngestCityEvents = jest.fn();
const mockRunDedupV2 = jest.fn();
const mockClassifyRelevanceCron = jest.fn();

jest.unstable_mockModule('@/lib/events/externalEventIngestion', () => ({
  ingestCityEvents: mockIngestCityEvents,
  retryPendingGeocodes: jest.fn(),
}));

jest.unstable_mockModule('@/lib/dedup/dedupOrchestrator', () => ({
  runDedupV2: mockRunDedupV2,
}));

jest.unstable_mockModule('@/lib/cron/classifyRelevance', () => ({
  classifyRelevanceCron: mockClassifyRelevanceCron,
}));

function createChainableQuery() {
  const result = Promise.resolve({ data: [], error: null, count: 0 });
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'is', 'eq', 'gte', 'lte', 'limit', 'order', 'in', 'not']) {
    chain[method] = () => chain;
  }
  chain.then = (resolve: (value: unknown) => unknown) => result.then(resolve);
  chain.catch = (reject: (reason: unknown) => unknown) => result.catch(reject);
  return chain;
}

jest.unstable_mockModule('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => createChainableQuery(),
  }),
}));

jest.unstable_mockModule('@/lib/logging', () => ({
  logMessage: jest.fn(),
  logError: jest.fn(),
  logWarning: jest.fn(),
}));

type RunIngestion = typeof import('@/lib/cron/ingestExternalEvents').runIngestion;
type CityRegistry = typeof import('@/lib/events/cities').CITIES;

describe('runIngestion hooks', () => {
  let runIngestion: RunIngestion;
  let cities: CityRegistry;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockRunDedupV2.mockResolvedValue({
      totalClusters: 0,
      averageClusterSize: 0,
      largestClusterSize: 0,
      largestClusterKey: '',
      autoMerges: 0,
      llmCallsAttempted: 0,
      llmCallsSkippedDryRun: 0,
      humanReviewCount: 0,
      keptSeparateCount: 0,
      crossStateClusters: 0,
      crossSourceClusters: 0,
      nullCoordinateClusters: 0,
      rowsAlreadyNonCanonical: 0,
      rowsSkippedMutationBecauseAlreadyNonCanonical: 0,
      rowsNewlyMarkedNonCanonical: 0,
      mutationErrors: 0,
      queueInsertErrors: 0,
      durationMs: 0,
      dryRun: false,
    });
    mockClassifyRelevanceCron.mockResolvedValue({
      total: 0,
      tier2_classified: 0,
      tier1_reclassified: 0,
      relevant_flags_set: 0,
      errors: 0,
    });
    mockIngestCityEvents.mockResolvedValue({
      inserted: 1,
      updated: 0,
      skipped: 0,
      errors: 0,
      invalidRecords: 0,
      enrichmentFailures: 0,
      geocodePending: 0,
      duration_ms: 1,
    });

    const ingestionMod = await import('@/lib/cron/ingestExternalEvents');
    const citiesMod = await import('@/lib/events/cities');
    runIngestion = ingestionMod.runIngestion;
    cities = citiesMod.CITIES;
  });

  it('skips cities recorded by a previous interrupted run', async () => {
    const [firstCity, secondCity] = Object.keys(cities);

    const result = await runIngestion(undefined, {
      skipCities: new Set([firstCity]),
    });

    expect(result.success).toBe(true);
    const ingested = mockIngestCityEvents.mock.calls.map(
      (call) => (call[0] as { source: string }).source,
    );
    expect(ingested).not.toContain(cities[firstCity].source);
    expect(ingested).toContain(cities[secondCity].source);
  });

  it('reports every attempted city to the checkpoint hook', async () => {
    const completed: string[] = [];
    await runIngestion(undefined, {
      onCityCompleted: (city) => {
        completed.push(city);
      },
    });

    expect([...completed].sort()).toEqual(Object.keys(cities).sort());
  });

  it('stops at a city boundary after a shutdown request without running later cities', async () => {
    const cityKeys = Object.keys(cities);
    let completedCount = 0;

    const result = await runIngestion(undefined, {
      shouldStop: () => completedCount >= 1,
      onCityCompleted: () => {
        completedCount += 1;
      },
    });

    expect(result.interrupted).toBe(true);
    expect(result.success).toBe(false);
    const ingested = mockIngestCityEvents.mock.calls.map(
      (call) => (call[0] as { source: string }).source,
    );
    expect(ingested).toEqual([cities[cityKeys[0]].source]);
  });

  it('reports failed cities to the checkpoint hook so they are retried later', async () => {
    const [firstCity] = Object.keys(cities);
    mockIngestCityEvents.mockRejectedValueOnce(new Error('provider down'));
    const completed: Array<{ city: string; errors: number }> = [];

    const result = await runIngestion(undefined, {
      onCityCompleted: (city, cityResult) => {
        completed.push({ city, errors: cityResult.errors });
      },
    });

    expect(result.success).toBe(false);
    expect(completed[0]).toEqual({ city: firstCity, errors: 1 });
  });

  it('keeps default behavior when no hooks are passed', async () => {
    const result = await runIngestion();

    expect(result.success).toBe(true);
    expect(mockIngestCityEvents).toHaveBeenCalledTimes(Object.keys(cities).length);
  });
});
