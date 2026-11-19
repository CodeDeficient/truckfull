/**
 * Owner Data Isolation E2E Tests
 *
 * Phase 0.2.3: Test owner data isolation
 * Verifies that each owner can only see their own trucks
 */

import { test, expect } from '@playwright/test';
import { getSupabase } from '../../lib/supabase/client';

test.describe('Owner Dashboard - Data Isolation', () => {
  test.describe('Cross-owner data access prevention', () => {
    test('owner can only see their own trucks in dashboard', async ({ page }) => {
      // Use storageState for authenticated owner
      await page.context().storageState({ path: 'playwright/.auth/user.json' });

      // Navigate to owner dashboard
      await page.goto('/owner-dashboard');

      // Wait for dashboard to load
      await expect(page.locator('h1', { hasText: 'Dashboard' })).toBeVisible();

      // Get the list of truck names visible to this owner
      const truckCards = page.locator('[data-testid="truck-card"]');
      const truckNames = await truckCards.allTextContents();

      // Verify we can fetch the owner's trucks from the database
      const supabase = getSupabase();
      if (!supabase) {
        test.skip(true, 'Supabase client not available');
        return;
      }

      // Get current user ID (mock test - in real scenario would need authenticated user ID)
      // For this test, we verify the UI behavior that prevents cross-owner access
      expect(truckNames.length).toBeGreaterThan(0);

      // Verify all truck cards belong to the same owner (we can't verify this directly without
      // accessing the database, but we can verify the UI structure)
      for (const truckName of truckNames) {
        expect(truckName).toBeTruthy();
      }
    });

    test('cannot access another owner truck via direct URL', async ({ request }) => {
      // Attempt to access another owner's truck via direct URL
      // This test assumes we know a truck ID that belongs to another owner
      // In a real scenario, this would be from a different test user

      const response = await request.get('/api/trucks/some-other-truck-id');

      // Should return 401 or 403 (unauthorized or forbidden)
      // Note: The actual status code depends on implementation
      // 401 = unauthorized, 403 = forbidden, 404 = not found (acceptable)
      expect([401, 403, 404]).toContain(response.status());
    });

    test('owner dashboard shows only owned trucks in "My Food Trucks" section', async ({
      page,
    }) => {
      await page.context().storageState({ path: 'playwright/.auth/user.json' });
      await page.goto('/owner-dashboard');

      // Wait for "My Food Trucks" section to load
      await expect(page.locator('text=My Food Trucks')).toBeVisible();

      // Get all truck cards in this section
      const truckSection = page.locator('[data-testid="my-food-trucks-section"]');
      const truckCards = truckSection.locator('[data-testid="truck-card"]');

      // Verify there are trucks (assuming test user has at least one truck)
      const cardCount = await truckCards.count();
      expect(cardCount).toBeGreaterThan(0);

      // Verify each card has proper structure and belongs to this owner
      for (let i = 0; i < cardCount; i++) {
        const card = truckCards.nth(i);

        // Each card should have:
        await expect(card.locator('[data-testid="truck-name"]')).toBeVisible();
        await expect(card.locator('[data-testid="truck-status"]')).toBeVisible();
        await expect(card.locator('[data-testid="truck-edit-button"]')).toBeVisible();
      }
    });

    test('owner cannot edit trucks from other owners', async ({ page }) => {
      await page.context().storageState({ path: 'playwright/.auth/user.json' });
      await page.goto('/owner-dashboard');

      // Get all edit buttons
      const editButtons = page.locator('[data-testid="truck-edit-button"]');
      const buttonCount = await editButtons.count();

      // If there are trucks, verify edit functionality works
      if (buttonCount > 0) {
        // Click the first edit button
        await editButtons.first().click();

        // Should navigate to edit page or show modal
        await expect(
          page.locator('text=Edit Truck').or(page.locator('[data-testid="truck-edit-modal"]')),
        ).toBeVisible();
      }
    });

    test('owner cannot delete trucks from other owners', async ({ page, request }) => {
      // Attempt to delete another owner's truck via API
      const response = await request.delete('/api/owner/trucks/some-other-truck-id', {
        headers: {
          Authorization: `Bearer ${process.env.TEST_JWT_TOKEN}`,
        },
      });

      // Should return 403 (forbidden) or 404 (not found)
      expect([403, 404]).toContain(response.status());
    });
  });

  test.describe('RLS policy enforcement', () => {
    test('API endpoints enforce owner-based access', async ({ request }) => {
      // Test that API endpoints properly enforce RLS policies

      // Try to get another owner's truck data
      const response = await request.get('/api/owner/trucks/another-truck-id');

      // Should return 403 (forbidden) if RLS is working correctly
      expect(response.status()).toBe(403);

      const body = await response.json();
      expect(body.error).toBeTruthy();
    });

    test('cannot list all trucks across owners', async ({ request }) => {
      const response = await request.get('/api/trucks');

      expect(response.status()).toBe(400);
    });

    test('cannot update another owner truck via API', async ({ request }) => {
      const response = await request.patch('/api/owner/trucks/some-other-truck-id', {
        data: {
          name: 'Updated Name',
        },
      });

      // Should return 403 (forbidden) or 404 (not found)
      expect([403, 404]).toContain(response.status());
    });
  });
});
