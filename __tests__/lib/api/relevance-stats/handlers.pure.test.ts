import { describe, expect, it } from '@jest/globals';
import { buildSourceBreakdown } from '@/lib/api/relevance-stats/handlers';

describe('buildSourceBreakdown', () => {
  it('keys each row by source and coerces counts to numbers', () => {
    const rows = [
      { source: 'algolia', total: 12, relevant: 5 },
      { source: 'timely', total: '7', relevant: '3' },
    ] as unknown as ReadonlyArray<{ source: string; total: number; relevant: number }>;

    expect(buildSourceBreakdown(rows)).toEqual({
      algolia: { total: 12, relevant: 5 },
      timely: { total: 7, relevant: 3 },
    });
  });

  it('returns an empty breakdown when the RPC returned no data', () => {
    expect(buildSourceBreakdown(null)).toEqual({});
    expect(buildSourceBreakdown([])).toEqual({});
  });
});
