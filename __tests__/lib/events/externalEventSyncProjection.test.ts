import { describe, expect, it } from '@jest/globals';

import {
  EXTERNAL_EVENT_SYNC_PROJECTION,
  isMateriallyChanged,
  needsRawDataForComparison,
} from '@/lib/events/externalEventSync';

const CONTENT_HASH = 'a'.repeat(64);

describe('external event sync projection', () => {
  it('includes every comparison field without selecting raw_data', () => {
    const requiredColumns = [
      'category',
      'city',
      'city_partition_guid',
      'community_shared_at',
      'description',
      'event_end_date',
      'event_end_time',
      'event_start_date',
      'event_start_time',
      'external_id',
      'id',
      'updated_at',
      'hidden_reason',
      'is_canonical',
      'is_community_submitted',
      'is_food_truck_relevant',
      'is_hidden',
      'location_address',
      'location_lat',
      'location_lng',
      'matched_keywords',
      'organization',
      'permit_end_date',
      'permit_end_time',
      'permit_start_date',
      'permit_start_time',
      'permit_status',
      'relevance_classified_at',
      'relevance_confidence',
      'relevance_model',
      'relevance_reasoning',
      'relevance_review_decision',
      'relevance_review_needed',
      'relevance_reviewed_at',
      'relevance_reviewed_by',
      'relevance_score',
      'source',
      'source_partition',
      'source_type',
      'source_updated_at',
      'source_url',
      'state',
      'submitted_by',
      'title',
      'verification_badge',
      'verification_tier',
      'vetted_at',
      'vetting_location_type',
      'vetting_result',
      'vetting_score',
      'vetting_version',
      'website',
    ];

    for (const column of requiredColumns) {
      expect(EXTERNAL_EVENT_SYNC_PROJECTION).toContain(column);
    }
    expect(EXTERNAL_EVENT_SYNC_PROJECTION).toMatch(/(^|,\s*)content_hash(,|$)/);
    expect(EXTERNAL_EVENT_SYNC_PROJECTION).not.toMatch(/(^|,\s*)raw_data(,|$)/);
    expect(EXTERNAL_EVENT_SYNC_PROJECTION).not.toContain('*');
  });

  it('uses projected values to detect material changes', () => {
    const existing = {
      id: 'prod-id',
      updated_at: '2026-08-07T00:00:00Z',
      title: 'Same Event',
      content_hash: CONTENT_HASH,
    };
    expect(
      isMateriallyChanged(
        {
          id: 'staging-id',
          updated_at: '2026-08-07T00:01:00Z',
          title: 'Same Event',
          content_hash: CONTENT_HASH,
        },
        existing,
      ),
    ).toBe(false);
    expect(
      isMateriallyChanged(
        { id: 'staging-id', title: 'Changed Event', content_hash: CONTENT_HASH },
        existing,
      ),
    ).toBe(true);
  });

  it('requires raw_data only when a hash cannot establish equality', () => {
    const existing = { title: 'Same Event', content_hash: CONTENT_HASH };
    expect(
      needsRawDataForComparison({ title: 'Same Event', content_hash: CONTENT_HASH }, existing),
    ).toBe(false);
    expect(needsRawDataForComparison({ title: 'Same Event' }, existing)).toBe(true);
  });
});
