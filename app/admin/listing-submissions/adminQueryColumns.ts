/**
 * Explicit column list for the admin listing-submissions page query.
 *
 * Deliberately excludes `ip_address` and `user_agent`: they are never
 * displayed, and selecting them would serialize raw submitter metadata into
 * the client component payload. `food_truck_id` is also excluded: truck
 * linking is deferred out of this PR, so the admin surface has no use for it
 * yet. The list lives in a pure module so a regression test can guard it.
 */
export const SUBMISSION_ADMIN_QUERY_COLUMNS = [
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
] as const;
