import { describe, expect, it } from '@jest/globals';

import {
  pickWritableTruckFields,
  WRITABLE_TRUCK_FIELDS,
} from '@/lib/trucks/updateWhitelist';

describe('pickWritableTruckFields', () => {
  it('passes legitimate owner-writable fields through unchanged', () => {
    const body = {
      name: 'Taco Mama',
      slug: 'taco-mama',
      description: 'Best tacos',
      cuisine_type: ['Mexican'],
      contact_info: { phone: '555-0100', email: 'a@b.co' },
      social_media: { instagram: 'tacomama' },
      current_location: { lat: 32.46, lng: -84.99 },
      street_address: '1 Main St',
      city: 'Columbus',
      state: 'GA',
      zip: '31901',
      timezone: 'America/New_York',
      operating_hours: { monday: { open: '09:00', close: '17:00' } },
      data_quality_score: 0.75,
    };

    expect(pickWritableTruckFields(body)).toEqual(body);
  });

  it('drops every server-managed column', () => {
    const body = {
      name: 'Taco Mama',
      verification_status: 'verified',
      average_rating: 5,
      review_count: 999,
      is_claimed: true,
      claimed_at: '2020-01-01T00:00:00.000Z',
      claimed_by: 'attacker',
      claim_verification_method: 'self',
      view_count: 100_000,
      review_status: 'approved',
      owner_id: 'attacker-id',
      user_id: 'attacker-id',
      created_at: '2000-01-01T00:00:00.000Z',
      updated_at: '2000-01-01T00:00:00.000Z',
      last_updated_at: '2000-01-01T00:00:00.000Z',
      schedule_updated_by: 'facebook',
      schedule_updated_at: '2000-01-01T00:00:00.000Z',
      location_updated_by: 'facebook',
      location_updated_at: '2000-01-01T00:00:00.000Z',
      menu_updated_by: 'facebook',
      menu_updated_at: '2000-01-01T00:00:00.000Z',
      id: 'server-id',
      admin_notes: 'hidden',
      facebook_page_id: 'fb-page',
      source_url: 'https://example.com',
    };

    const result = pickWritableTruckFields(body);

    expect(result).toEqual({ name: 'Taco Mama' });
    expect(Object.keys(result)).not.toContain('verification_status');
    expect(Object.keys(result)).not.toContain('average_rating');
    expect(Object.keys(result)).not.toContain('owner_id');
  });

  it('drops unknown fields', () => {
    const result = pickWritableTruckFields({
      name: 'Taco Mama',
      totally_unknown: 'x',
      source_urls: ['https://example.com'],
      __proto__polluted: true,
    });

    expect(result).toEqual({ name: 'Taco Mama' });
  });

  it('returns an empty object for a body with no writable fields', () => {
    expect(
      pickWritableTruckFields({ verification_status: 'verified', owner_id: 'x' }),
    ).toEqual({});
  });

  it('preserves explicit null values on writable fields', () => {
    expect(pickWritableTruckFields({ description: null })).toEqual({ description: null });
  });

  it('keeps every allowlisted field name consistent with the exported list', () => {
    const body: Record<string, unknown> = {};
    for (const field of WRITABLE_TRUCK_FIELDS) {
      body[field] = 'value';
    }

    expect(Object.keys(pickWritableTruckFields(body)).sort()).toEqual(
      [...WRITABLE_TRUCK_FIELDS].sort(),
    );
  });
});
