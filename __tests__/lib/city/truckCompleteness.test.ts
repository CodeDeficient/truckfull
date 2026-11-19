import { describe, it, expect } from '@jest/globals';
import {
  completenessScore,
  getCompletenessFlags,
  matchesAll,
  type CompletenessKey,
} from '@/lib/city/truckCompleteness';

const empty = {
  street_address: null,
  contact_info: null,
  social_media: null,
  menu: null,
  is_claimed: null,
};

describe('getCompletenessFlags', () => {
  it('reports nothing for an empty listing', () => {
    const flags = getCompletenessFlags(empty);
    expect(completenessScore(flags)).toBe(0);
  });

  it('reads contact fields and ignores blank strings', () => {
    const flags = getCompletenessFlags({
      ...empty,
      contact_info: { phone: '(843) 555-0100', email: '   ', website: 'https://example.com' },
    });
    expect(flags.phone).toBe(true);
    expect(flags.email).toBe(false);
    expect(flags.website).toBe(true);
  });

  it('does not count a photo alone as social media', () => {
    const flags = getCompletenessFlags({
      ...empty,
      social_media: { photo_url: 'https://example.com/a.jpg' },
    });
    expect(flags.social).toBe(false);
  });

  it('counts a real social profile', () => {
    const flags = getCompletenessFlags({ ...empty, social_media: { instagram: 'truck' } });
    expect(flags.social).toBe(true);
  });

  it('treats empty menus as missing and filled menus as present', () => {
    expect(getCompletenessFlags({ ...empty, menu: [] }).menu).toBe(false);
    expect(getCompletenessFlags({ ...empty, menu: {} }).menu).toBe(false);
    expect(getCompletenessFlags({ ...empty, menu: [{ name: 'Taco' }] }).menu).toBe(true);
  });

  it('marks address and claimed', () => {
    const flags = getCompletenessFlags({ ...empty, street_address: '1 King St', is_claimed: true });
    expect(flags.address).toBe(true);
    expect(flags.claimed).toBe(true);
    expect(completenessScore(flags)).toBe(2);
  });
});

describe('matchesAll', () => {
  const flags = getCompletenessFlags({
    ...empty,
    contact_info: { phone: '1' },
    menu: [{ name: 'Taco' }],
  });

  it('matches when nothing is required', () => {
    expect(matchesAll(flags, new Set<CompletenessKey>())).toBe(true);
  });

  it('requires every selected field', () => {
    expect(matchesAll(flags, new Set<CompletenessKey>(['phone', 'menu']))).toBe(true);
    expect(matchesAll(flags, new Set<CompletenessKey>(['phone', 'email']))).toBe(false);
  });
});
