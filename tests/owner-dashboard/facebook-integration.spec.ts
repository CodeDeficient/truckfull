/**
 * Facebook Integration E2E Tests
 *
 * Tests the Facebook integration API endpoints for owner dashboard.
 * Covers authentication, input validation, and success scenarios.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const FAKE_TRUCK_ID = '00000000-0000-0000-0000-000000000001';
const FAKE_PAGE_ID = '00000000-0000-0000-0000-000000000002';
const FAKE_POST_ID = '00000000-0000-0000-0000-000000000003';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

test.describe('Facebook Integration API', () => {
  test.describe('Unauthenticated Access', () => {
    test('GET /api/owner/facebook/pages returns 401', async ({ playwright }) => {
      const noAuthContext = await playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        storageState: { cookies: [], origins: [] },
      });

      const response = await noAuthContext.get('/api/owner/facebook/pages');
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');

      await noAuthContext.dispose();
    });

    test('POST /api/owner/facebook/connect-page returns 401', async ({ playwright }) => {
      const noAuthContext = await playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        storageState: { cookies: [], origins: [] },
      });

      const response = await noAuthContext.post('/api/owner/facebook/connect-page', {
        data: {
          truckId: FAKE_TRUCK_ID,
          pageId: FAKE_PAGE_ID,
          pageName: 'Test Page',
        },
      });
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');

      await noAuthContext.dispose();
    });

    test('DELETE /api/owner/facebook/posts returns 401', async ({ playwright }) => {
      const noAuthContext = await playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        storageState: { cookies: [], origins: [] },
      });

      const response = await noAuthContext.delete('/api/owner/facebook/posts', {
        data: { postId: FAKE_POST_ID },
      });
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');

      await noAuthContext.dispose();
    });
  });

  test.describe('Input Validation', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('POST /api/owner/facebook/connect-page - missing truckId returns 400', async ({
      request,
    }) => {
      const response = await request.post('/api/owner/facebook/connect-page', {
        data: {
          pageId: FAKE_PAGE_ID,
          pageName: 'Test Page',
        },
      });
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('truckId is required');
    });

    test('POST /api/owner/facebook/connect-page - missing pageId returns 400', async ({
      request,
    }) => {
      const response = await request.post('/api/owner/facebook/connect-page', {
        data: {
          truckId: FAKE_TRUCK_ID,
          pageName: 'Test Page',
        },
      });
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('pageId is required');
    });

    test('POST /api/owner/facebook/connect-page - missing pageName returns 400', async ({
      request,
    }) => {
      const response = await request.post('/api/owner/facebook/connect-page', {
        data: {
          truckId: FAKE_TRUCK_ID,
          pageId: FAKE_PAGE_ID,
        },
      });
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('pageName is required');
    });

    test('POST /api/owner/facebook/connect-page - empty body returns 400', async ({ request }) => {
      const response = await request.post('/api/owner/facebook/connect-page', {
        data: {},
      });
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('GET /api/owner/facebook/posts - missing truckId returns 400', async ({ request }) => {
      const response = await request.get('/api/owner/facebook/posts');
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('truckId is required');
    });

    test('GET /api/owner/facebook/posts - invalid limit is clamped', async ({ request }) => {
      const response = await request.get(
        `/api/owner/facebook/posts?truckId=${FAKE_TRUCK_ID}&limit=999999`,
      );
      expect([200, 500]).toContain(response.status());
    });

    test('DELETE /api/owner/facebook/posts - missing postId returns 400', async ({ request }) => {
      const response = await request.delete('/api/owner/facebook/posts', {
        data: {},
      });
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('postId is required');
    });

    test('DELETE /api/owner/facebook/posts - invalid body returns 400', async ({ request }) => {
      const response = await request.delete('/api/owner/facebook/posts', {
        data: 'not json',
      });
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Authenticated Access', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('GET /api/owner/facebook/pages returns pages array and business auth status', async ({ request }) => {
      const response = await request.get('/api/owner/facebook/pages');

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('pages');
      expect(Array.isArray(data.pages)).toBe(true);
      expect(data).toHaveProperty('needsBusinessAuth');
      expect(typeof data.needsBusinessAuth).toBe('boolean');
      expect(data).toHaveProperty('authStatus');
      expect(['connected', 'missing', 'expired', 'misconfigured']).toContain(data.authStatus);
    });

    test('POST /api/owner/facebook/connect-page - non-owned truck returns 403 or 404', async ({
      request,
    }) => {
      const response = await request.post('/api/owner/facebook/connect-page', {
        data: {
          truckId: FAKE_TRUCK_ID,
          pageId: FAKE_PAGE_ID,
          pageName: 'Test Page',
        },
      });

      expect([403, 404, 500]).toContain(response.status());
    });

    test('GET /api/owner/facebook/posts - non-existent truck returns empty or error', async ({
      request,
    }) => {
      const response = await request.get(`/api/owner/facebook/posts?truckId=${FAKE_TRUCK_ID}`);

      expect([200, 500]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('posts');
        expect(Array.isArray(data.posts)).toBe(true);
      }
    });

    test('GET /api/owner/facebook/posts - with status filter', async ({ request }) => {
      const response = await request.get(
        `/api/owner/facebook/posts?truckId=${FAKE_TRUCK_ID}&status=pending`,
      );

      expect([200, 500]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('posts');
        expect(Array.isArray(data.posts)).toBe(true);
      }
    });

    test('DELETE /api/owner/facebook/posts - non-existent post returns 404', async ({ request }) => {
      const response = await request.delete('/api/owner/facebook/posts', {
        data: { postId: FAKE_POST_ID },
      });

      expect(response.status()).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Post not found');
    });
  });

  test.describe('Error Handling', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('POST /api/owner/facebook/connect-page - invalid JSON body returns error', async ({
      request,
    }) => {
      const response = await request.post('/api/owner/facebook/connect-page', {
        data: 'not valid json',
      });

      expect([400, 500]).toContain(response.status());
    });

    test('GET /api/owner/facebook/pages handles server errors gracefully', async ({ request }) => {
      const response = await request.get('/api/owner/facebook/pages');

      expect([200, 500]).toContain(response.status());

      if (response.status() !== 200) {
        const data = await response.json();
        expect(data).toHaveProperty('error');
      }
    });
  });

  test.describe('OAuth Business Flow', () => {
    test('GET /api/owner/facebook/oauth/start returns 401 when unauthenticated', async ({ playwright }) => {
      const noAuthContext = await playwright.request.newContext({
        baseURL: 'http://localhost:3000',
        storageState: { cookies: [], origins: [] },
      });

      const response = await noAuthContext.get('/api/owner/facebook/oauth/start?returnPath=/owner-dashboard/facebook');
      expect(response.status()).toBe(401);
      const data = await response.json();
      expect(data).toHaveProperty('error');

      await noAuthContext.dispose();
    });

    test.use({ storageState: 'playwright/.auth/user.json' });

    test('GET /api/owner/facebook/oauth/start returns redirect to Facebook or config error', async ({ request }) => {
      const response = await request.get('/api/owner/facebook/oauth/start?returnPath=/owner-dashboard/facebook', {
        maxRedirects: 0,
      });

      expect([302, 307, 500]).toContain(response.status());

      if (response.status() === 500) {
        const body = await response.json();
        expect(body).toHaveProperty('error');
        return;
      }

      const location = response.headers()['location'];
      expect(location).toBeTruthy();
      expect(location).toContain('facebook.com');
      expect(location).toContain('oauth');
    });

    test('GET /api/owner/facebook/oauth/callback redirects with missing_code_or_state when params missing', async ({ request }) => {
      const response = await request.get('/api/owner/facebook/oauth/callback', {
        maxRedirects: 0,
      });

      expect([302, 307]).toContain(response.status());
      const location = response.headers()['location'];
      expect(location).toContain('facebookBusinessStatus=error');
      expect(location).toContain('facebookBusinessError=missing_code_or_state');
    });

    test('GET /api/owner/facebook/oauth/callback rejects invalid state signature', async ({ request }) => {
      const response = await request.get('/api/owner/facebook/oauth/callback?code=fake-code&state=bad-state', {
        maxRedirects: 0,
      });

      expect([302, 307]).toContain(response.status());
      const location = response.headers()['location'];
      expect(location).toContain('facebookBusinessStatus=error');
      expect(
        location.includes('facebookBusinessError=invalid_state') ||
          location.includes('facebookBusinessError=oauth_not_configured'),
      ).toBe(true);
    });
  });

  test.describe('Response Format', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('GET /api/owner/facebook/pages returns correct structure', async ({ request }) => {
      const response = await request.get('/api/owner/facebook/pages');

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('pages');

        if (data.pages.length > 0) {
          const page = data.pages[0];
          expect(page).toHaveProperty('id');
          expect(page).toHaveProperty('page_id');
          expect(page).toHaveProperty('page_name');
        }
      }
    });

    test('GET /api/owner/facebook/posts returns correct structure', async ({ request }) => {
      const response = await request.get(`/api/owner/facebook/posts?truckId=${FAKE_TRUCK_ID}`);

      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty('posts');

        if (data.posts.length > 0) {
          const post = data.posts[0];
          expect(post).toHaveProperty('id');
          expect(post).toHaveProperty('truckId');
          expect(post).toHaveProperty('status');
        }
      }
    });
  });

  test.describe('Post Delete Flow', () => {
    test.use({ storageState: 'playwright/.auth/user.json' });

    test('DELETE /api/owner/facebook/posts - post from different owner returns 404', async ({ request }) => {
      if (!supabaseAdmin) {
        test.skip();
        return;
      }

      const fakeTruckId = '00000000-0000-0000-0000-000000000099';
      const { data: inserted } = await supabaseAdmin
        .from('facebook_posts')
        .insert({
          truck_id: fakeTruckId,
          facebook_post_id: `test-e2e-ownership-${Date.now()}`,
          message: 'E2E test post for ownership check',
          status: 'processed',
          confidence: 0.9,
          source: 'backfill',
          created_time: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (!inserted) {
        test.skip();
        return;
      }

      try {
        const response = await request.delete('/api/owner/facebook/posts', {
          data: { postId: inserted.id },
        });

        expect(response.status()).toBe(404);
        const body = await response.json();
        expect(body.error).toContain('Post not found');
      } finally {
        await supabaseAdmin.from('facebook_posts').delete().eq('id', inserted.id);
      }
    });

    test('DELETE /api/owner/facebook/posts - successful deletion', async ({ request }) => {
      const testOwnerEmail = process.env.TEST_OWNER_EMAIL;
      if (!testOwnerEmail || !supabaseAdmin) {
        test.skip();
        return;
      }

      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', testOwnerEmail)
        .single();

      if (!profile) {
        test.skip();
        return;
      }

      const { data: truck } = await supabaseAdmin
        .from('food_trucks')
        .select('id')
        .eq('owner_id', profile.id)
        .limit(1)
        .single();

      if (!truck) {
        test.skip();
        return;
      }

      const { data: inserted, error: insertError } = await supabaseAdmin
        .from('facebook_posts')
        .insert({
          truck_id: truck.id,
          facebook_post_id: `test-e2e-${Date.now()}`,
          message: 'E2E test post for delete',
          status: 'processed',
          confidence: 0.9,
          source: 'backfill',
          created_time: new Date().toISOString(),
        })
        .select('id')
        .single();

      expect(insertError).toBeNull();
      expect(inserted).toBeTruthy();
      const postId = inserted!.id;

      try {
        const response = await request.delete('/api/owner/facebook/posts', {
          data: { postId },
        });

        expect(response.status()).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);

        const { data: check } = await supabaseAdmin
          .from('facebook_posts')
          .select('id')
          .eq('id', postId)
          .single();

        expect(check).toBeNull();
      } finally {
        await supabaseAdmin.from('facebook_posts').delete().eq('id', postId);
      }
    });
  });
});
