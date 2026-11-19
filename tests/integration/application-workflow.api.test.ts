/**
 * Event Application Workflow Integration Tests
 * WBS: 6.3.5
 *
 * Tests the complete application workflow using real API endpoints.
 *
 * NOTE: These tests require:
 * 1. The dev server to be running at http://localhost:3000
 *    Run with: npm run dev (in another terminal)
 * 2. Local Supabase (not production)
 *    Check: Ensure SUPABASE_URL contains 'localhost:54321'
 *
 * Run tests with: npx playwright test --project=api tests/integration/application-workflow.api.test.ts
 *
 * Test Scenarios:
 * - Truck Owner applies to event -> Status "pending"
 * - Double booking prevention
 * - Tier gate (free users cannot apply to paid events)
 */

import { test, expect } from '@playwright/test';
import { getSupabaseAdmin } from '../../lib/supabase/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

const ApplicationSchema = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  truck_id: z.string().uuid(),
  status: z.enum(['pending', 'accepted', 'rejected', 'waitlisted']),
  cover_letter: z.string().nullable().optional(),
  created_at: z.string(),
  responded_at: z.string().nullable().optional(),
  organizer_message: z.string().nullable().optional(),
});

const ActionSchema = z.object({
  action: z.enum(['accept', 'reject', 'waitlist']),
  message: z.string().optional(),
});

interface TestContext {
  organizerUser: any;
  organizerProfile: any;
  truckOwnerUser: any;
  truckOwnerProfile: any;
  truck: any;
  freeEvent: any;
  paidEvent: any;
  organizerCookies: string;
  truckOwnerCookies: string;
}

test.describe('Event Application Workflow', () => {
  let testContext: TestContext;

  const TEST_ORGANIZER_EMAIL = 'test-organizer-workflow@example.com';
  const TEST_TRUCK_OWNER_EMAIL = 'test-truckowner-workflow@example.com';

  test.beforeAll(async () => {
    const admin = getSupabaseAdmin();

    const organizerUserResult = await admin.auth.admin.createUser({
      email: TEST_ORGANIZER_EMAIL,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    const truckOwnerUserResult = await admin.auth.admin.createUser({
      email: TEST_TRUCK_OWNER_EMAIL,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    if (!organizerUserResult.data.user || !truckOwnerUserResult.data.user) {
      throw new Error('Failed to create test users');
    }

    const organizerProfile = await admin
      .from('event_organizers')
      .insert({
        user_id: organizerUserResult.data.user.id,
        business_name: 'Test Event Organizer',
        verification_status: 'verified',
      })
      .select()
      .single();

    const truckOwnerProfile = await admin
      .from('profiles')
      .insert({
        id: truckOwnerUserResult.data.user.id,
        email: TEST_TRUCK_OWNER_EMAIL,
        full_name: 'Test Truck Owner',
        subscription_tier: 'free',
      })
      .select()
      .single();

    const truck = await admin
      .from('food_trucks')
      .insert({
        name: 'Test Taco Truck',
        owner_id: truckOwnerUserResult.data.user.id,
        description: 'A delicious taco truck',
        cuisine_type: ['Mexican'],
        current_location: { lat: 32.7767, lng: -96.797 },
        is_active: true,
      })
      .select()
      .single();

    const freeEvent = await admin
      .from('eventfull_events')
      .insert({
        organizer_id: organizerProfile.data.id,
        name: 'Free Food Festival',
        description: 'A free event for food trucks',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        location_data: { city: 'Dallas', state: 'TX' },
        vendor_fee: 0,
        max_vendors: 5,
        status: 'published',
      })
      .select()
      .single();

    const paidEvent = await admin
      .from('eventfull_events')
      .insert({
        organizer_id: organizerProfile.data.id,
        name: 'Premium Food Expo',
        description: 'A premium paid event',
        start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        location_data: { city: 'Dallas', state: 'TX' },
        vendor_fee: 100,
        max_vendors: 10,
        status: 'published',
      })
      .select()
      .single();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    const organizerClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);
    const truckOwnerClient = createSupabaseClient(supabaseUrl, supabaseAnonKey);

    const { data: organizerAuth } = await organizerClient.auth.signInWithPassword({
      email: TEST_ORGANIZER_EMAIL,
      password: 'TestPassword123!',
    });

    const { data: truckOwnerAuth } = await truckOwnerClient.auth.signInWithPassword({
      email: TEST_TRUCK_OWNER_EMAIL,
      password: 'TestPassword123!',
    });

    if (!organizerAuth?.session || !truckOwnerAuth?.session) {
      throw new Error('Failed to create auth sessions');
    }

    const formatCookies = (session: any) => {
      return `sb-foodtruck-auth-token=${session.access_token}; sb-foodtruck-auth-refresh-token=${session.refresh_token}`;
    };

    testContext = {
      organizerUser: organizerUserResult.data.user,
      organizerProfile: organizerProfile.data,
      truckOwnerUser: truckOwnerUserResult.data.user,
      truckOwnerProfile: truckOwnerProfile.data,
      truck: truck.data,
      freeEvent: freeEvent.data,
      paidEvent: paidEvent.data,
      organizerCookies: formatCookies(organizerAuth.session),
      truckOwnerCookies: formatCookies(truckOwnerAuth.session),
    };
  });

  test.afterAll(async () => {
    const admin = getSupabaseAdmin();

    await admin
      .from('event_applications')
      .delete()
      .gte('created_at', new Date(Date.now() - 3600000).toISOString());

    await admin
      .from('eventfull_events')
      .delete()
      .in('id', [testContext.freeEvent.id, testContext.paidEvent.id]);

    await admin.from('food_trucks').delete().eq('id', testContext.truck.id);

    await admin.from('event_organizers').delete().eq('user_id', testContext.organizerUser.id);

    await admin.from('profiles').delete().eq('id', testContext.truckOwnerUser.id);

    await admin.auth.admin.deleteUser(testContext.organizerUser.id);
    await admin.auth.admin.deleteUser(testContext.truckOwnerUser.id);
  });

  test('should create application with pending status', async ({ request }) => {
    const response = await request.post('/api/events/applications', {
      data: {
        event_id: testContext.freeEvent.id,
        truck_id: testContext.truck.id,
        cover_letter: 'We would love to participate!',
      },
    });

    expect(response.status()).toBe(401);

    const appResponse = await request.post('/api/events/applications', {
      headers: {
        Cookie: testContext.truckOwnerCookies,
      },
      data: {
        event_id: testContext.freeEvent.id,
        truck_id: testContext.truck.id,
        cover_letter: 'We would love to participate!',
      },
    });

    expect(appResponse.status()).toBe(200);

    const appData = await appResponse.json();
    expect(appData.success).toBe(true);
    expect(appData.application.status).toBe('pending');
    expect(appData.application.id).toBeDefined();

    const admin = getSupabaseAdmin();
    const { data: application } = await admin
      .from('event_applications')
      .select('*')
      .eq('id', appData.application.id)
      .single();

    expect(application).toBeDefined();
    expect(application?.status).toBe('pending');
  });

  test('should prevent duplicate applications for same event', async ({ request }) => {
    const firstResponse = await request.post('/api/events/applications', {
      headers: {
        Cookie: testContext.truckOwnerCookies,
      },
      data: {
        event_id: testContext.freeEvent.id,
        truck_id: testContext.truck.id,
        cover_letter: 'First application',
      },
    });

    expect(firstResponse.status()).toBe(200);

    const secondResponse = await request.post('/api/events/applications', {
      headers: {
        Cookie: testContext.truckOwnerCookies,
      },
      data: {
        event_id: testContext.freeEvent.id,
        truck_id: testContext.truck.id,
        cover_letter: 'Second application',
      },
    });

    expect(secondResponse.status()).toBe(409);

    const errorData = await secondResponse.json();
    expect(errorData.error).toContain('already applied');
  });

  test('should block free tier users from paid events', async ({ request }) => {
    const response = await request.post('/api/events/applications', {
      headers: {
        Cookie: testContext.truckOwnerCookies,
      },
      data: {
        event_id: testContext.paidEvent.id,
        truck_id: testContext.truck.id,
        cover_letter: 'I want to join the premium event',
      },
    });

    expect(response.status()).toBe(403);

    const errorData = await response.json();
    expect(errorData.error).toContain('Upgrade required');
    expect(errorData.upgrade_required).toBe(true);

    const admin = getSupabaseAdmin();
    await admin
      .from('profiles')
      .update({ subscription_tier: 'pro' })
      .eq('id', testContext.truckOwnerUser.id);

    const upgradeResponse = await request.post('/api/events/applications', {
      headers: {
        Cookie: testContext.truckOwnerCookies,
      },
      data: {
        event_id: testContext.paidEvent.id,
        truck_id: testContext.truck.id,
        cover_letter: 'I want to join the premium event',
        payment_disclaimer_accepted: true,
      },
    });

    expect(upgradeResponse.status()).toBe(200);

    const upgradeData = await upgradeResponse.json();
    expect(upgradeData.success).toBe(true);
  });
});
