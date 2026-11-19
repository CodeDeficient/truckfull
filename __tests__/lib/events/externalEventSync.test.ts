/**
 * Tests for lib/events/externalEventSync.ts
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';

describe('externalEventSync', () => {
  let syncExternalEventsToProd: (
    staging: { from: jest.Mock },
    prod: { from: jest.Mock },
    options: {
      source: string;
      dryRun: boolean;
      onEventsChanged?: (
        changes: readonly {
          before: Record<string, unknown> | null;
          after: Record<string, unknown>;
        }[],
      ) => Promise<void>;
    },
  ) => Promise<{
    synced: number;
    errors: number;
    dryRun: boolean;
    duration_ms: number;
    lastSyncedAt: string;
  }>;

  const createMockChain = (data: unknown, error: unknown) => ({
    select: jest.fn().mockReturnValue(
      (() => {
        const pageQuery = {
          maybeSingle: jest.fn().mockResolvedValue({ data, error }),
          gte: jest.fn(),
          lte: jest.fn(),
          order: jest.fn(),
          range: jest.fn().mockResolvedValue({ data, error }),
        };
        pageQuery.gte.mockReturnValue(pageQuery);
        pageQuery.lte.mockReturnValue(pageQuery);
        pageQuery.order.mockReturnValue(pageQuery);
        return { eq: jest.fn().mockReturnValue(pageQuery) };
      })(),
    ),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await import('@/lib/events/externalEventSync');
    syncExternalEventsToProd = module.syncExternalEventsToProd;
  });

  describe('syncExternalEventsToProd', () => {
    it('returns early with zero results when no sync log exists', async () => {
      const mockStaging = {
        from: jest.fn().mockReturnValue(createMockChain(null, null)),
      };
      const mockProd = { from: jest.fn() };

      const result = await syncExternalEventsToProd(mockStaging as never, mockProd as never, {
        source: 'test_source',
        dryRun: false,
      });

      expect(result.synced).toBe(0);
      expect(result.errors).toBe(0);
      expect(result.dryRun).toBe(false);
    });

    it('returns correct result structure', async () => {
      const mockStaging = {
        from: jest.fn().mockReturnValue(createMockChain(null, null)),
      };
      const mockProd = { from: jest.fn() };

      const result = await syncExternalEventsToProd(mockStaging as never, mockProd as never, {
        source: 'test_source',
        dryRun: false,
      });

      expect(result).toHaveProperty('synced');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('dryRun');
      expect(result).toHaveProperty('duration_ms');
      expect(result).toHaveProperty('lastSyncedAt');
    });

    it('uses last_synced_at from sync log when available', async () => {
      const lastSyncTime = '2024-01-15T10:00:00Z';
      const mockStaging = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({
                data: { last_synced_at: lastSyncTime },
                error: null,
              }),
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      range: jest.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
      const mockProd = { from: jest.fn() };

      const result = await syncExternalEventsToProd(mockStaging as never, mockProd as never, {
        source: 'test_source',
        dryRun: false,
      });

      expect(result.lastSyncedAt).toBe(lastSyncTime);
    });

    it('handles dry run mode correctly', async () => {
      const mockStaging = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      range: jest.fn().mockResolvedValue({
                        data: [
                          {
                            id: '1',
                            external_id: 'ext1',
                            source: 'test',
                            updated_at: '2026-08-01T00:00:00.000Z',
                          },
                        ],
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
      const mockProd = { from: jest.fn() };

      const result = await syncExternalEventsToProd(mockStaging as never, mockProd as never, {
        source: 'test_source',
        dryRun: true,
      });

      expect(result.dryRun).toBe(true);
      expect(result.synced).toBe(1);
    });

    it('returns early when no events in range', async () => {
      const mockStaging = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      range: jest.fn().mockResolvedValue({ data: [], error: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      };
      const mockProd = { from: jest.fn() };

      const result = await syncExternalEventsToProd(mockStaging as never, mockProd as never, {
        source: 'test_source',
        dryRun: false,
      });

      expect(result.synced).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('notifies the cache invalidation boundary after a successful write', async () => {
      const event = {
        id: '1',
        external_id: 'ext1',
        source: 'test_source',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const onEventsChanged = jest.fn().mockResolvedValue(undefined);
      const mockStaging = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      range: jest.fn().mockResolvedValue({ data: [event], error: null }),
                    }),
                  }),
                }),
              }),
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    external_id: event.external_id,
                    updated_at: event.updated_at,
                    raw_data: null,
                  },
                ],
                error: null,
              }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
      const mockProd = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };

      await syncExternalEventsToProd(mockStaging as never, mockProd as never, {
        source: 'test_source',
        dryRun: false,
        onEventsChanged,
      });

      expect(onEventsChanged).toHaveBeenCalledWith([
        { before: null, after: { ...event, raw_data: null } },
      ]);
    });

    it('does not advance the sync cursor when cache invalidation fails', async () => {
      const event = {
        id: '1',
        external_id: 'ext1',
        source: 'test_source',
        updated_at: '2026-08-01T00:00:00.000Z',
      };
      const onEventsChanged = jest.fn().mockRejectedValue(new Error('revalidation unavailable'));
      const mockStaging = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockReturnValue({
                  order: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      range: jest.fn().mockResolvedValue({ data: [event], error: null }),
                    }),
                  }),
                }),
              }),
              in: jest.fn().mockResolvedValue({
                data: [
                  {
                    external_id: event.external_id,
                    updated_at: event.updated_at,
                    raw_data: null,
                  },
                ],
                error: null,
              }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
      const mockProd = {
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
          delete: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
          upsert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };

      const result = await syncExternalEventsToProd(mockStaging as never, mockProd as never, {
        source: 'test_source',
        dryRun: false,
        onEventsChanged,
      });

      expect(result.errors).toBe(1);
      expect(mockProd.from).toHaveBeenCalledWith('external_events');
      const syncLogCalls = mockStaging.from.mock.calls.filter(
        (call: string[]) => call[0] === 'external_events_sync_log',
      );
      expect(syncLogCalls).toHaveLength(1);
    });
  });
});
