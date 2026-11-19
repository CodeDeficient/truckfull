import { describe, expect, it } from '@jest/globals';

import {
  CREATABLE_TRUCK_FIELDS,
  forceServerManagedCreateDefaults,
  INITIAL_TRUCK_VERIFICATION_STATUS,
  pickCreatableTruckFields,
} from '@/lib/trucks/createWhitelist';

describe('pickCreatableTruckFields', () => {
  it('passes legitimate client-creatable fields through unchanged', () => {
    const body = {
      name: 'Taco Mama',
      description: 'Best tacos',
      cuisine_type: ['Mexican'],
      contact_info: { phone: '555-0100', email: 'a@b.co' },
      social_media: { instagram: 'tacomama' },
      current_location: { lat: 32.46, lng: -84.99 },
      operating_hours: { monday: { open: '09:00', close: '17:00' } },
      menu: [{ name: 'Mains', items: [{ name: 'Taco' }] }],
      price_range: '$$',
      specialties: ['al pastor'],
      data_quality_score: 0.75,
    };

    expect(pickCreatableTruckFields(body)).toEqual(body);
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
      is_active: true,
      status: 'live',
      created_at: '2000-01-01T00:00:00.000Z',
      updated_at: '2000-01-01T00:00:00.000Z',
      last_updated_at: '2000-01-01T00:00:00.000Z',
      id: 'server-id',
      admin_notes: 'hidden',
      facebook_page_id: 'fb-page',
      source_urls: ['https://example.com'],
    };

    const result = pickCreatableTruckFields(body);

    expect(result).toEqual({ name: 'Taco Mama' });
    expect(Object.keys(result)).not.toContain('verification_status');
    expect(Object.keys(result)).not.toContain('average_rating');
    expect(Object.keys(result)).not.toContain('owner_id');
  });

  it('drops unknown fields', () => {
    const result = pickCreatableTruckFields({
      name: 'Taco Mama',
      totally_unknown: 'x',
      __proto__polluted: true,
    });

    expect(result).toEqual({ name: 'Taco Mama' });
  });

  it('returns an empty object for a body with no creatable fields', () => {
    expect(
      pickCreatableTruckFields({ verification_status: 'verified', owner_id: 'x' }),
    ).toEqual({});
  });

  it('preserves explicit null values on creatable fields', () => {
    expect(pickCreatableTruckFields({ description: null })).toEqual({ description: null });
  });

  it('keeps every allowlisted field name consistent with the exported list', () => {
    const body: Record<string, unknown> = {};
    for (const field of CREATABLE_TRUCK_FIELDS) {
      body[field] = 'value';
    }

    expect(Object.keys(pickCreatableTruckFields(body)).sort()).toEqual(
      [...CREATABLE_TRUCK_FIELDS].sort(),
    );
  });
});

describe('forceServerManagedCreateDefaults', () => {
  it('forces verification_status to pending when the client requests verified', () => {
    const result = forceServerManagedCreateDefaults({
      name: 'Taco Mama',
      verification_status: 'verified',
    });

    expect(result.verification_status).toBe('pending');
    expect(result.verification_status).toBe(INITIAL_TRUCK_VERIFICATION_STATUS);
    expect(result.name).toBe('Taco Mama');
  });

  it('forces verification_status to pending when the client omits it', () => {
    const result = forceServerManagedCreateDefaults({ name: 'Taco Mama' });

    expect(result.verification_status).toBe('pending');
  });

  it('forces verification_status to pending when the client requests rejected', () => {
    const result = forceServerManagedCreateDefaults({
      name: 'Taco Mama',
      verification_status: 'rejected',
    });

    expect(result.verification_status).toBe('pending');
  });

  it('does not let a client forge any other server-managed field', () => {
    const result = forceServerManagedCreateDefaults({
      name: 'Taco Mama',
      average_rating: 5,
      review_count: 999,
      owner_id: 'attacker',
      view_count: 100_000,
      is_claimed: true,
      claimed_by: 'attacker',
    });

    expect(result).toEqual({ name: 'Taco Mama', verification_status: 'pending' });
  });
});
