import { describe, it, expect } from '@jest/globals';
import { createIngestionStage, createSyncStage, toPromiseInvalidator } from '@/lib/pipeline/stageFactory';
import type { IngestionRunHooks } from '@/lib/cron/ingestExternalEvents';
import type { SyncResult } from '@/lib/events/externalEventSync';
import type { EventCacheInvalidator } from '@/lib/events/eventCacheTargets';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';

describe('createIngestionStage', () => {
  it('reports every attempted city to the checkpoint hook', async () => {
    const reported: string[] = [];
    const stage = createIngestionStage({
      async runIngestion(_invalidate, hooks: IngestionRunHooks | undefined) {
        await hooks?.onCityCompleted?.('augusta', result(0));
        await hooks?.onCityCompleted?.('savannah', result(1));
        return { success: false, errors: 1, cities: 2, inserted: 0, updated: 0, skipped: 0, invalidRecords: 0, enrichmentFailures: 0, geocodePending: 0, duration_ms: 1 };
      },
    });

    const outcome = await stage(undefined, {
      skipCities: new Set(),
      shouldStop: () => false,
      onCityCompleted: (city) => {
        reported.push(city);
      },
      delay: async () => {},
    });

    expect(reported).toEqual(['augusta', 'savannah']);
    expect(outcome.errors).toBe(1);
    expect(outcome.success).toBe(false);
  });

  it('forwards the skipped cities and stop signal into the runner', async () => {
    let seenSkip: readonly string[] = [];
    let stopped = false;
    const stage = createIngestionStage({
      async runIngestion(_invalidate, hooks: IngestionRunHooks | undefined) {
        seenSkip = [...(hooks?.skipCities ?? [])];
        stopped = hooks?.shouldStop?.() ?? false;
        return { success: true, errors: 0, cities: 1, inserted: 0, updated: 0, skipped: 0, invalidRecords: 0, enrichmentFailures: 0, geocodePending: 0, duration_ms: 1 };
      },
    });

    await stage(undefined, {
      skipCities: new Set(['augusta']),
      shouldStop: () => true,
      onCityCompleted: () => {},
      delay: async () => {},
    });

    expect(seenSkip).toEqual(['augusta']);
    expect(stopped).toBe(true);
  });

  it('propagates an interrupted result', async () => {
    const stage = createIngestionStage({
      async runIngestion() {
        return { success: false, errors: 0, interrupted: true, cities: 1, inserted: 0, updated: 0, skipped: 0, invalidRecords: 0, enrichmentFailures: 0, geocodePending: 0, duration_ms: 1 };
      },
    });

    const outcome = await stage(undefined, {
      skipCities: new Set(),
      shouldStop: () => true,
      onCityCompleted: () => {},
      delay: async () => {},
    });

    expect(outcome.interrupted).toBe(true);
  });

  it('passes the target-aware invalidator through to the runner', async () => {
    const targets = [
      { eventId: 'e1', citySlug: 'augusta', eventSlug: 'fall-festival', platform: 'eventbrite' },
    ] as unknown as readonly EventCacheTarget[];
    let received: readonly EventCacheTarget[] = [];
    const invalidator: EventCacheInvalidator = (value) => {
      received = value;
    };
    const stage = createIngestionStage({
      async runIngestion(invalidate) {
        await invalidate?.(targets);
        return { success: true, errors: 0, cities: 1, inserted: 0, updated: 0, skipped: 0, invalidRecords: 0, enrichmentFailures: 0, geocodePending: 0, duration_ms: 1 };
      },
    });

    await stage(invalidator, {
      skipCities: new Set(),
      shouldStop: () => false,
      onCityCompleted: () => {},
      delay: async () => {},
    });

    expect(received).toEqual(targets);
  });
});

describe('createSyncStage', () => {
  it('maps completed sources and total errors', async () => {
    const completed: string[] = [];
    const stage = createSyncStage({
      staging: {} as never,
      prod: {} as never,
      async runSync(options) {
        await options.onSourceCompleted?.('augusta_eproval', syncResult(0));
        return { synced: 2, totalErrors: 0, processedSources: ['augusta_eproval'], skippedSources: [], durationMs: 1 };
      },
    });

    const outcome = await stage({
      skipSources: new Set(),
      onSourceCompleted: (source) => {
        completed.push(source);
      },
    });

    expect(completed).toEqual(['augusta_eproval']);
    expect(outcome.totalErrors).toBe(0);
  });

  it('forwards skipped sources to the sync runner', async () => {
    let seenSkip: readonly string[] = [];
    const stage = createSyncStage({
      staging: {} as never,
      prod: {} as never,
      async runSync(options) {
        seenSkip = [...options.skipSources];
        return { synced: 0, totalErrors: 0, processedSources: [], skippedSources: [...seenSkip], durationMs: 1 };
      },
    });

    await stage({ skipSources: new Set(['done']), onSourceCompleted: () => {} });

    expect(seenSkip).toEqual(['done']);
  });

  it('normalizes a shared EventCacheInvalidator into a promise-returning form', async () => {
    const seen: readonly EventCacheTarget[][] = [];
    const valueReturning: EventCacheInvalidator = (targets) => {
      seen.push([...targets]);
    };
    const targets = [] as unknown as readonly EventCacheTarget[];

    const wrapped = toPromiseInvalidator(valueReturning);
    await wrapped?.(targets);

    expect(seen).toEqual([targets]);
    expect(toPromiseInvalidator(undefined)).toBeUndefined();
  });
});

function result(errors: number) {
  return {
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors,
    invalidRecords: 0,
    enrichmentFailures: 0,
    geocodePending: 0,
    duration_ms: 1,
  };
}

function syncResult(errors: number): SyncResult {
  return {
    synced: 0,
    errors,
    dryRun: false,
    duration_ms: 1,
    lastSyncedAt: new Date(0).toISOString(),
  };
}
