import { describe, expect, it } from '@jest/globals';
import { getReviewActionMessage } from '@/components/owner/PostProcessingHistory';

describe('getReviewActionMessage', () => {
  it('describes the location decision required for ambiguous reviews', () => {
    expect(getReviewActionMessage('ambiguous_location')).toBe(
      'Review required: confirm the exact service location before applying.',
    );
  });

  it('describes the date decision required for unresolved schedules', () => {
    expect(getReviewActionMessage('unresolved_schedule')).toBe(
      'Review required: confirm the service date before applying.',
    );
  });

  it('returns no notice when an update is confirmable', () => {
    expect(getReviewActionMessage()).toBeNull();
  });
});
