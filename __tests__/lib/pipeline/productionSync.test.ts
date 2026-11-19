import { describe, it, expect } from '@jest/globals';
import {
  EXTRA_SYNC_SOURCES,
  buildEventCacheTargets,
  invalidateTargets,
  listSyncSources,
} from '@/lib/pipeline/productionSync';
import { CITIES } from '@/lib/events/cities';
import type { SyncEventChange } from '@/lib/events/externalEventSync';

describe('listSyncSources', () => {
  it('returns every city source plus the extra datasets', () => {
    const sources = listSyncSources();

    expect(sources).toContain(EXTRA_SYNC_SOURCES[0]);
    expect(sources.length).toBe(Object.values(CITIES).length + EXTRA_SYNC_SOURCES.length);
  });

  it('returns only the selected source when one is given', () => {
    expect(listSyncSources('savannah_eproval')).toEqual(['savannah_eproval']);
  });
});

describe('buildEventCacheTargets', () => {
  const before = {
    id: '1b645389-2473-4a1d-8f4b-1e0f8f7f6d5c',
    city: 'Savannah',
    state: 'GA',
    title: 'Food Truck Friday',
    event_start_date: '2026-08-07',
  };
  const after = { ...before, title: 'Food Truck Friday Night' };

  it('emits targets for both sides of a change and deduplicates them', () => {
    const changes: SyncEventChange[] = [{ before, after }];
    const targets = buildEventCacheTargets(changes);

    expect(targets).toHaveLength(2);
    const keys = targets.map((target) => `${target.eventId}:${target.citySlug}:${target.eventSlug}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('deduplicates identical before and after targets', () => {
    const changes: SyncEventChange[] = [{ before, after: { ...before } }];
    const targets = buildEventCacheTargets(changes);

    expect(targets).toHaveLength(1);
  });

  it('skips changes whose rows cannot produce a slugified target', () => {
    const changes: SyncEventChange[] = [
      { before: null, after: { ...after, title: '!@#$%^&*()' } },
    ];

    expect(buildEventCacheTargets(changes)).toEqual([]);
  });
});

describe('invalidateTargets', () => {
  it('does nothing when there are no targets', async () => {
    await expect(invalidateTargets([])).resolves.toBeUndefined();
  });
});
