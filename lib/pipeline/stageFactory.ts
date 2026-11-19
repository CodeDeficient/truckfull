import type { SupabaseClient } from '@supabase/supabase-js';
import type { IngestionRunHooks } from '@/lib/cron/ingestExternalEvents';
import { runIngestion } from '@/lib/cron/ingestExternalEvents';
import type { EventCacheInvalidator } from '@/lib/events/eventCacheTargets';
import type { EventCacheTarget } from '@/lib/events/eventPageInvalidation';
import type { SyncResult } from '@/lib/events/externalEventSync';
import {
  runProductionSyncStage,
  type ProductionSyncStageResult,
} from './productionSync';
import type { IngestionStageFn, SyncStageFn } from './orchestrator';

export interface IngestionStageDeps {
  readonly runIngestion?: (
    invalidate: EventCacheInvalidator | undefined,
    hooks: IngestionRunHooks | undefined,
  ) => ReturnType<typeof runIngestion>;
}

export function createIngestionStage(deps: IngestionStageDeps = {}): IngestionStageFn {
  const run = deps.runIngestion ?? runIngestion;
  return async (invalidate, hooks) => {
    const result = await run(invalidate, {
      skipCities: hooks.skipCities,
      shouldStop: hooks.shouldStop,
      onCityCompleted: hooks.onCityCompleted,
      delay: hooks.delay,
    });
    return {
      success: result.success,
      errors: result.errors,
      interrupted: result.interrupted,
      failedCities: result.failedCities,
      stepErrors: result.stepErrors,
    };
  };
}

export interface SyncStageDeps {
  readonly staging: SupabaseClient;
  readonly prod: SupabaseClient;
  readonly invalidate?: EventCacheInvalidator;
  readonly runSync?: (options: {
    readonly skipSources: ReadonlySet<string>;
    readonly onSourceCompleted?: (source: string, result: SyncResult) => void | Promise<void>;
  }) => Promise<ProductionSyncStageResult>;
}

export function toPromiseInvalidator(
  invalidator: EventCacheInvalidator | undefined,
): ((targets: readonly EventCacheTarget[]) => Promise<void>) | undefined {
  if (!invalidator) return undefined;
  return async (targets) => {
    await invalidator(targets);
  };
}

export function createSyncStage(deps: SyncStageDeps): SyncStageFn {
  const run =
    deps.runSync ??
    ((options) =>
      runProductionSyncStage({
        staging: deps.staging,
        prod: deps.prod,
        skipSources: options.skipSources,
        invalidate: toPromiseInvalidator(deps.invalidate),
        onSourceCompleted: options.onSourceCompleted,
      }));
  return async (options) => {
    const result = await run({
      skipSources: options.skipSources,
      onSourceCompleted: options.onSourceCompleted,
    });
    return { totalErrors: result.totalErrors };
  };
}
