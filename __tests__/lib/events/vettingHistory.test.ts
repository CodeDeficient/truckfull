import { describe, expect, it } from '@jest/globals';

import { countSimilarPreviousEvents, scoreExternalEventHistory } from '@/lib/events/vettingHistory';

describe('scoreExternalEventHistory', () => {
  it('returns the neutral baseline when no nearby events exist', () => {
    expect(scoreExternalEventHistory(0, 0)).toEqual({ score: 0.3, eventCount: 0 });
  });

  it('uses count thresholds and adds proximity evidence below one kilometer', () => {
    expect(scoreExternalEventHistory(6, 999)).toEqual({ score: 0.6, eventCount: 6 });
    expect(scoreExternalEventHistory(21, 1000)).toEqual({ score: 0.7, eventCount: 21 });
    expect(scoreExternalEventHistory(51, 999)).toEqual({ score: 1, eventCount: 51 });
  });

  it('normalizes invalid aggregate values to the neutral baseline', () => {
    expect(scoreExternalEventHistory(Number.NaN, Number.NaN)).toEqual({
      score: 0.3,
      eventCount: 0,
    });
  });
});

describe('countSimilarPreviousEvents', () => {
  it('preserves matching past candidates while excluding current-year and unrelated events', () => {
    const count = countSimilarPreviousEvents(
      'Downtown Food Festival',
      [
        { title: 'Downtown Food Fest', event_start_date: '2025-06-01' },
        { title: 'Downtown Food Festival', event_start_date: '2026-06-01' },
        { title: 'Unrelated Music Concert', event_start_date: '2025-06-01' },
      ],
      2026,
    );

    expect(count).toBe(1);
  });
});
