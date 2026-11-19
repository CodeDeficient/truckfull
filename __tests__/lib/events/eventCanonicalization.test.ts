import { describe, expect, it } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.remote.types';
import {
  EVENT_CANONICAL_CONFIRMED,
  EVENT_CANONICAL_LOOKUP_EXHAUSTED,
  EVENT_CANONICAL_LOOKUP_FAILED,
  EVENT_EVENT_NOT_FOUND,
  findEventCanonicalRedirect,
  isEventCanonicalRedirect,
  resolveEventCanonicalRedirect,
} from '@/lib/events/eventCanonicalization';

interface SourceRow {
  readonly title: string;
  readonly is_canonical: boolean | null;
}

interface CanonicalRow {
  readonly title: string;
  readonly city: string | null;
  readonly state: string | null;
}

interface FakeClientOptions {
  readonly sourceRows: readonly SourceRow[];
  readonly canonicalRows?: readonly CanonicalRow[];
  readonly errorTable?: 'external_events' | 'canonical_events';
}

function createFakeClient({
  sourceRows,
  canonicalRows = [],
  errorTable,
}: FakeClientOptions): SupabaseClient<Database> {
  return {
    from(table: string) {
      const rows = [...(table === 'external_events' ? sourceRows : canonicalRows)];
      const query = {
        select: () => query,
        ilike: () => query,
        eq: () => query,
        gte: () => query,
        order: () => query,
        limit: async () => ({
          data: rows,
          error: table === errorTable ? { message: 'database unavailable' } : null,
        }),
        range: async (start: number, end: number) => ({
          data: rows.slice(start, end + 1),
          error: table === errorTable ? { message: 'database unavailable' } : null,
        }),
      };
      return query;
    },
  } as unknown as SupabaseClient<Database>;
}

const EVENT_PATH = '/events/atlanta-ga/summer-festival-2026-08-01';

describe('event canonicalization', () => {
  it('confirms a canonical event without searching the canonical view', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({ sourceRows: [{ title: 'Summer Festival', is_canonical: true }] }),
      EVENT_PATH,
    );

    expect(result).toBe(EVENT_CANONICAL_CONFIRMED);
  });

  it('returns a redirect for a known duplicate in another city', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({
        sourceRows: [{ title: 'Summer Festival', is_canonical: false }],
        canonicalRows: [{ title: 'Summer Festival', city: 'Marietta', state: 'GA' }],
      }),
      EVENT_PATH,
    );

    expect(isEventCanonicalRedirect(result)).toBe(true);
    expect(result).toBe('/events/marietta-ga/summer-festival-2026-08-01');
  });

  it('confirms a duplicate whose canonical row remains in the requested city', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({
        sourceRows: [{ title: 'Summer Festival', is_canonical: false }],
        canonicalRows: [{ title: 'Summer Festival', city: 'Atlanta', state: 'GA' }],
      }),
      EVENT_PATH,
    );

    expect(result).toBe(EVENT_CANONICAL_CONFIRMED);
  });

  it('fails open when a duplicate has no confirmed canonical replacement', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({
        sourceRows: [{ title: 'Summer Festival', is_canonical: false }],
        canonicalRows: [{ title: 'Different Festival', city: 'Marietta', state: 'GA' }],
      }),
      EVENT_PATH,
    );

    expect(result).toBeNull();
  });

  it('preserves JavaScript title normalization for canonical decisions', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({
        sourceRows: [{ title: 'Community Awareness Cancer Walk/Run', is_canonical: true }],
      }),
      '/events/atlanta-ga/community-awareness-cancer-walkrun-2026-08-01',
    );

    expect(result).toBe(EVENT_CANONICAL_CONFIRMED);
  });

  it('returns a static 404 decision for an unknown eligible-path event', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({ sourceRows: [] }),
      '/events/atlanta-ga/ghost-festival-2026-08-01',
    );

    expect(result).toBe(EVENT_EVENT_NOT_FOUND);
  });

  it('fails open when the source lookup reaches its safety limit', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({
        sourceRows: Array.from({ length: 1000 }, (_, index) => ({
          title: `Other Event ${index}`,
          is_canonical: true,
        })),
      }),
      '/events/atlanta-ga/ghost-festival-2026-08-01',
    );

    expect(result).toBe(EVENT_CANONICAL_LOOKUP_EXHAUSTED);
  });

  it('fails open when the canonical lookup reaches its safety limit', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({
        sourceRows: [{ title: 'Summer Festival', is_canonical: false }],
        canonicalRows: Array.from({ length: 10_000 }, (_, index) => ({
          title: `Other Event ${index}`,
          city: 'Atlanta',
          state: 'GA',
        })),
      }),
      EVENT_PATH,
    );

    expect(result).toBe(EVENT_CANONICAL_LOOKUP_EXHAUSTED);
  });

  it('returns a failed decision instead of treating a database error as a 404', async () => {
    const result = await findEventCanonicalRedirect(
      createFakeClient({ sourceRows: [], errorTable: 'external_events' }),
      EVENT_PATH,
    );

    expect(result).toBe(EVENT_CANONICAL_LOOKUP_FAILED);
  });

  it('fails open when the canonical query throws before returning a result', async () => {
    const client = {
      from: () => {
        throw new Error('database timeout');
      },
    } as unknown as SupabaseClient<Database>;

    const result = await resolveEventCanonicalRedirect(
      'atlanta-ga',
      'summer-festival-2026-08-01',
      client,
    );

    expect(result).toBe(EVENT_CANONICAL_LOOKUP_FAILED);
  });
});
