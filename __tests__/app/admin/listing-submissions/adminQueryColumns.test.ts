import { describe, it, expect } from '@jest/globals';
import { SUBMISSION_ADMIN_QUERY_COLUMNS } from '@/app/admin/listing-submissions/adminQueryColumns';

describe('SUBMISSION_ADMIN_QUERY_COLUMNS', () => {
  it('never selects ip_address or user_agent', () => {
    expect(SUBMISSION_ADMIN_QUERY_COLUMNS).not.toContain('ip_address');
    expect(SUBMISSION_ADMIN_QUERY_COLUMNS).not.toContain('user_agent');
  });

  it('never selects food_truck_id while truck linking is deferred', () => {
    expect(SUBMISSION_ADMIN_QUERY_COLUMNS).not.toContain('food_truck_id');
  });

  it('includes every field the admin surface displays', () => {
    for (const field of [
      'id',
      'status',
      'truck_name',
      'contact_name',
      'contact_email',
      'phone',
      'city',
      'state',
      'website',
      'instagram_url',
      'facebook_url',
      'menu_text',
      'notes',
      'logo_path',
      'menu_asset_path',
      'source',
      'admin_notes',
      'created_at',
    ]) {
      expect(SUBMISSION_ADMIN_QUERY_COLUMNS).toContain(field);
    }
  });
});
