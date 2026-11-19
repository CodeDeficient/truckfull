import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const cronSecret = process.env.CRON_SECRET!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const FAKE_ADDRESS = `completely fake nonexistent address xyz${Date.now()}`;
const GEOCODABLE_ADDRESS = 'Forsyth Park, Savannah, GA';

async function insertTestEvent(externalId: string, address: string | null) {
  const { data, error } = await supabase
    .from('external_events')
    .insert({
      source: 'savannah_eproval',
      external_id: externalId,
      source_partition: 'test',
      title: 'E2E Geocode Test Event',
      location_address: address,
      location_lat: null,
      location_lng: null,
      event_start_date: '2026-06-01',
      event_end_date: '2026-06-01',
      permit_status: 'Approved',
      city: 'Savannah',
      state: 'GA',
    })
    .select('id, external_id')
    .single();

  if (error) throw new Error(`Failed to insert test event: ${error.message}`);
  return data;
}

async function cleanupEvent(externalId: string, address?: string | null) {
  await supabase.from('external_events').delete().eq('external_id', externalId);
  if (address) {
    await supabase.from('geocoding_failures').delete().eq('address', address);
  }
}

test.describe('Geocoding failure tracking', () => {
  test('records failure when retry-geocodes encounters unresolvable address', async ({
    request,
  }) => {
    const externalId = `test-e2e-fail-${Date.now()}`;
    await insertTestEvent(externalId, FAKE_ADDRESS);

    try {
      const response = await request.post('/api/cron/retry-geocodes', {
        headers: { authorization: `Bearer ${cronSecret}` },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.failed).toBeGreaterThanOrEqual(1);

      const { data: failure } = await supabase
        .from('geocoding_failures')
        .select('*')
        .eq('address', FAKE_ADDRESS)
        .is('resolved_at', null)
        .maybeSingle();

      expect(failure).not.toBeNull();
      expect(failure!.attempt_count).toBeGreaterThanOrEqual(1);
      expect(failure!.failure_reason).toBeTruthy();
    } finally {
      await cleanupEvent(externalId, FAKE_ADDRESS);
    }
  });

  test('records failure during ingestion when geocoding fails', async ({ request }) => {
    const externalId = `test-e2e-ingest-fail-${Date.now()}`;
    await insertTestEvent(externalId, FAKE_ADDRESS);

    try {
      const response = await request.post('/api/cron/ingest-external-events', {
        headers: { authorization: `Bearer ${cronSecret}` },
      });

      expect(response.status()).toBe(200);

      const { data: failure } = await supabase
        .from('geocoding_failures')
        .select('*')
        .eq('address', FAKE_ADDRESS)
        .is('resolved_at', null)
        .maybeSingle();

      expect(failure).not.toBeNull();
      expect(failure!.failure_reason).toContain('all_geocoding_methods_failed');
    } finally {
      await cleanupEvent(externalId, FAKE_ADDRESS);
    }
  });

  test('does not record failure when geocoding succeeds', async ({ request }) => {
    const externalId = `test-e2e-success-${Date.now()}`;
    await insertTestEvent(externalId, GEOCODABLE_ADDRESS);

    try {
      const response = await request.post('/api/cron/retry-geocodes', {
        headers: { authorization: `Bearer ${cronSecret}` },
      });

      expect(response.status()).toBe(200);

      const { data: failure } = await supabase
        .from('geocoding_failures')
        .select('*')
        .eq('address', GEOCODABLE_ADDRESS)
        .maybeSingle();

      expect(failure).toBeNull();

      const { data: event } = await supabase
        .from('external_events')
        .select('location_lat, location_lng')
        .eq('external_id', externalId)
        .single();

      expect(event).not.toBeNull();
      expect(event!.location_lat).not.toBeNull();
      expect(event!.location_lng).not.toBeNull();
    } finally {
      await cleanupEvent(externalId, GEOCODABLE_ADDRESS);
    }
  });

  test('does not record failure for events with no location address', async ({ request }) => {
    const externalId = `test-e2e-noloc-${Date.now()}`;

    await supabase.from('external_events').insert({
      source: 'savannah_eproval',
      external_id: externalId,
      source_partition: 'test',
      title: 'E2E No Location Test Event',
      location_address: null,
      location_lat: null,
      location_lng: null,
      event_start_date: '2026-06-01',
      event_end_date: '2026-06-01',
      permit_status: 'Approved',
      city: 'Savannah',
      state: 'GA',
    });

    try {
      const response = await request.post('/api/cron/retry-geocodes', {
        headers: { authorization: `Bearer ${cronSecret}` },
      });

      expect(response.status()).toBe(200);

      const { count } = await supabase
        .from('geocoding_failures')
        .select('*', { count: 'exact', head: true })
        .eq('external_id', externalId);

      expect(count).toBe(0);
    } finally {
      await supabase.from('external_events').delete().eq('external_id', externalId);
    }
  });

  test('records failure reason when address fails all geocoding methods', async ({ request }) => {
    const externalId = `test-e2e-vague-${Date.now()}`;
    const vagueAddress = `Public Park`;

    await insertTestEvent(externalId, vagueAddress);

    try {
      const response = await request.post('/api/cron/retry-geocodes', {
        headers: { authorization: `Bearer ${cronSecret}` },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.failed).toBeGreaterThanOrEqual(1);

      const { data: failure } = await supabase
        .from('geocoding_failures')
        .select('*')
        .eq('address', vagueAddress)
        .is('resolved_at', null)
        .maybeSingle();

      expect(failure).not.toBeNull();
      expect(failure!.failure_reason).toContain('all_geocoding_methods_failed');
    } finally {
      await cleanupEvent(externalId, vagueAddress);
    }
  });

  test('unauthorized request to retry-geocodes is rejected', async ({ request }) => {
    const response = await request.post('/api/cron/retry-geocodes', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    expect(response.status()).toBe(401);
  });

  test('unauthorized request to ingest-external-events is rejected', async ({ request }) => {
    const response = await request.post('/api/cron/ingest-external-events', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    expect(response.status()).toBe(401);
  });

  test('increments attempt_count on repeated failures', async ({ request }) => {
    const externalId = `test-e2e-retry-${Date.now()}`;
    await insertTestEvent(externalId, FAKE_ADDRESS);

    try {
      await request.post('/api/cron/retry-geocodes', {
        headers: { authorization: `Bearer ${cronSecret}` },
      });

      await request.post('/api/cron/retry-geocodes', {
        headers: { authorization: `Bearer ${cronSecret}` },
      });

      const { data: failure } = await supabase
        .from('geocoding_failures')
        .select('attempt_count')
        .eq('address', FAKE_ADDRESS)
        .maybeSingle();

      expect(failure).not.toBeNull();
      expect(failure!.attempt_count).toBe(2);
    } finally {
      await cleanupEvent(externalId, FAKE_ADDRESS);
    }
  });
});
