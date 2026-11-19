import { test, expect } from '@playwright/test';

test.describe('Mobile parallel routing (@mobile slot)', () => {
  test.describe('desktop user-agent', () => {
    test.use({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      isMobile: false,
      hasTouch: false,
    });

    test('does not render mobile layout', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const mobileLayout = page.locator('.mobile-layout');
      await expect(mobileLayout).toHaveCount(0);
    });
  });

  test.describe('desktop without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('renders useful home content without the hydration skeleton', async ({ page }) => {
      const response = await page.goto('/');

      expect(response?.status()).toBe(200);
      expect(await response?.text()).toContain('Food Trucks Near You - TruckFull');
      await expect(page.locator('#instant-skeleton')).toBeHidden();
      await expect(page.locator('.mobile-client-experience')).toBeHidden();
    });
  });

  test.describe('mobile without JavaScript', () => {
    test.use({
      javaScriptEnabled: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      viewport: { width: 390, height: 844 },
    });

    test('renders useful home content without the mobile loader', async ({ page }) => {
      const response = await page.goto('/');

      expect(response?.status()).toBe(200);
      expect(await response?.text()).toContain('Food Trucks Near You - TruckFull');
      await expect(page.locator('.mobile-client-experience')).toBeHidden();
    });
  });

  test.describe('mobile user-agent (iOS)', () => {
    test.use({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    test('renders .mobile-layout from @mobile slot', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const mobileLayout = page.locator('.mobile-layout');
      await expect(mobileLayout).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('mobile user-agent (Android)', () => {
    test.use({ userAgent: 'Mozilla/5.0 (Android 13; Mobile) AppleWebKit/537.36' });

    test('renders .mobile-bottom-nav', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const bottomNav = page.locator('.mobile-bottom-nav');
      await expect(bottomNav).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('mobile route coverage — public SEO pages', () => {
    test.use({
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      viewport: { width: 390, height: 844 },
    });

    const pages: { path: string; content: string }[] = [
      { path: '/about', content: 'About TruckFull' },
      { path: '/features', content: 'TruckFull Features' },
      { path: '/pricing', content: 'Pricing' },
      { path: '/food-truck-event-research', content: 'Food Truck Event Research' },
      { path: '/cuisine/grill', content: 'Grill Food Trucks' },
    ];

    for (const { path, content } of pages) {
      test(`${path} loads with expected content on mobile`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status()).toBe(200);

        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toContainText(content, { timeout: 15000 });

        const mobileLayout = page.locator('.mobile-layout');
        await expect(mobileLayout).toBeVisible({ timeout: 15000 });

        const { bodyScrollHeight, innerHeight, mmScrollHeight, mmClientHeight } =
          await page.evaluate(() => {
            const mm = document.querySelector('.mobile-main');
            return {
              bodyScrollHeight: document.body.scrollHeight,
              innerHeight: window.innerHeight,
              mmScrollHeight: mm?.scrollHeight ?? 0,
              mmClientHeight: mm?.clientHeight ?? 0,
            };
          });

        if (bodyScrollHeight > innerHeight) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(300);
          const scrollY = await page.evaluate(() => window.scrollY);
          expect(scrollY).toBeGreaterThan(0);
        }

        if (mmScrollHeight > mmClientHeight) {
          expect(bodyScrollHeight).toBeGreaterThan(innerHeight);
        }
      });
    }

    test('finds an event detail page with nearby-city links and verifies mobile scroll', async ({
      page,
    }) => {
      await page.goto('/events');
      await page.waitForLoadState('networkidle');

      const cityHrefs = await page.locator('a[href^="/events/"]').evaluateAll((links) =>
        links
          .map((link) => link.getAttribute('href'))
          .filter((href): href is string => {
            if (!href) return false;
            return href.split('/').filter(Boolean).length === 2;
          }),
      );

      let foundQualifyingEvent = false;
      for (const cityHref of [...new Set(cityHrefs)]) {
        await page.goto(cityHref);
        await page.waitForLoadState('networkidle');

        const eventHrefs = await page.locator('a[href^="/events/"]').evaluateAll((links) =>
          links
            .map((link) => link.getAttribute('href'))
            .filter((href): href is string => {
              if (!href) return false;
              return href.split('/').filter(Boolean).length === 3;
            }),
        );

        for (const eventHref of [...new Set(eventHrefs)]) {
          await page.goto(eventHref);
          await page.waitForLoadState('networkidle');
          const nearbyLinks = page.getByTestId('nearby-city-links');
          if ((await nearbyLinks.count()) === 0) continue;

          await expect(nearbyLinks).toBeVisible();
          await expect(nearbyLinks.locator('a')).not.toHaveCount(0);
          foundQualifyingEvent = true;
          break;
        }

        if (foundQualifyingEvent) break;
      }

      expect(foundQualifyingEvent).toBe(true);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    });
  });
});
