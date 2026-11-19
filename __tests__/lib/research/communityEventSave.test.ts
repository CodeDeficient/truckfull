import { describe, it, expect } from '@jest/globals';
import { buildCommunityEventInsert, shouldSaveCommunityEvent } from '@/lib/research/manualResearch';
import type { ParsedEventData } from '@/lib/research/parseEventText';

const parsed = {
  name: 'Food Truck Friday',
  description: 'Trucks downtown',
  date: '2026-11-06',
  category: 'festival',
  location: { address: '1 Main St', city: 'Augusta', state: 'GA', lat: null, lng: null },
  contactInfo: { phone: null, email: null, website: null },
} as unknown as ParsedEventData;

const input = {
  text: 'Food Truck Friday downtown Augusta',
  shareWithCommunity: true,
  userId: '11111111-2222-3333-4444-555555555555',
};

describe('shouldSaveCommunityEvent', () => {
  it('saves a new shared event', () => {
    expect(shouldSaveCommunityEvent({ shareWithCommunity: true })).toBe(true);
  });

  it('never writes to an existing event', () => {
    expect(
      shouldSaveCommunityEvent({
        shareWithCommunity: true,
        sourceEventId: '00000000-0000-0000-0000-000000000001',
      }),
    ).toBe(false);
  });

  it('does not save when sharing is off', () => {
    expect(shouldSaveCommunityEvent({ shareWithCommunity: false })).toBe(false);
  });
});

describe('buildCommunityEventInsert', () => {
  const row = buildCommunityEventInsert(input, parsed, { lat: 33.47, lng: -81.97 });

  it('saves the event without a public score', () => {
    expect(row.vetting_score).toBeNull();
    expect(row.vetting_result).toBeNull();
    expect(row.vetted_at).toBeNull();
  });

  it('leaves food truck relevance to the classifier', () => {
    expect(row.is_food_truck_relevant).toBeNull();
  });

  it('records the submitter and community source', () => {
    expect(row.submitted_by).toBe(input.userId);
    expect(row.is_community_submitted).toBe(true);
    expect(row.source).toBe('community');
    expect(row.location_lat).toBe(33.47);
    expect(row.location_lng).toBe(-81.97);
    expect(row.vetting_location_type).toBe('approximate');
  });
});
