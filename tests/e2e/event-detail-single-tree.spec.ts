import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const CITY_PATH = '/events/augusta-ga';
const IPHONE_USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)';
const GOOGLEBOT_USER_AGENT = 'Googlebot/2.1 (+http://www.google.com/bot.html)';
const BINGBOT_USER_AGENT = 'bingbot/2.0; +http://www.bing.com/bingbot.htm';

interface EventDocumentSnapshot {
  readonly title: string;
  readonly description: string | null;
  readonly robots: string | null;
  readonly canonical: string | null;
  readonly jsonLd: readonly string[];
}

async function discoverEventPath(page: Page): Promise<string> {
  await page.goto(CITY_PATH);
  await page.waitForLoadState('networkidle');
  const eventLink = page.locator('a[href^="/events/augusta-ga/"]').first();
  await expect(eventLink).toBeVisible();
  return (await eventLink.getAttribute('href')) ?? '';
}

async function expectSingleEventTree(page: Page): Promise<string> {
  const eventPath = await discoverEventPath(page);
  const response = await page.goto(eventPath);
  expect(response?.status()).toBe(200);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('[data-testid="event-detail-page"]')).toHaveCount(1);
  await expect(page.locator('[data-testid="mobile-event-detail"]')).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(4);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/events\//);
  return eventPath;
}

async function readEventDocumentSnapshot(page: Page): Promise<EventDocumentSnapshot> {
  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) => scripts.map((script) => script.textContent?.trim() ?? ''));

  return {
    title: await page.title(),
    description: await page.locator('meta[name="description"]').getAttribute('content'),
    robots: await page.locator('meta[name="robots"]').getAttribute('content'),
    canonical: await page.locator('link[rel="canonical"]').getAttribute('href'),
    jsonLd,
  };
}

async function readPublicHtml(
  request: APIRequestContext,
  eventPath: string,
  headers?: Record<string, string>,
): Promise<string> {
  const response = await request.get(eventPath, { headers });
  expect(response.status()).toBe(200);
  const html = await response.text();
  const main = html.match(/<main[^>]*data-testid="event-detail-page"[\s\S]*?<\/main>/)?.[0] ?? '';
  const jsonLd = [
    ...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g),
  ].map(([, content]) => content?.trim() ?? '');
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? '';
  return JSON.stringify({ main, canonical, jsonLd });
}

test.describe('single responsive event detail page', () => {
  test('hard-loads the desktop event page with one semantic tree', async ({ page }) => {
    await expectSingleEventTree(page);
  });

  test.describe('mobile user agent', () => {
    test.use({ userAgent: IPHONE_USER_AGENT });

    test('hard-loads the responsive event page without a mobile duplicate', async ({ page }) => {
      await expectSingleEventTree(page);
    });

    test('navigates through a real mobile Link and preserves back/forward state', async ({
      page,
    }) => {
      await page.goto(CITY_PATH);
      await page.waitForLoadState('networkidle');
      const eventLink = page.locator('a[href^="/events/augusta-ga/"]').first();
      await expect(eventLink).toBeVisible();
      await Promise.all([page.waitForURL((url) => url.pathname !== CITY_PATH), eventLink.click()]);
      await page.waitForLoadState('networkidle');
      const canonicalEventPath = new URL(page.url()).pathname;
      expect(canonicalEventPath).toMatch(/^\/events\/[^/]+\/[^/]+$/);
      await expect(page.locator('[data-testid="event-detail-page"]')).toHaveCount(1);

      await page.goBack();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(new RegExp(`${CITY_PATH}$`));
      await expect(page.locator('[data-testid="event-detail-page"]')).toHaveCount(0);
      await expect(page.locator('[data-testid="mobile-event-detail"]')).toHaveCount(0);

      await page.goForward();
      await page.waitForLoadState('networkidle');
      expect(new URL(page.url()).pathname).toBe(canonicalEventPath);
      await expect(page.locator('[data-testid="event-detail-page"]')).toHaveCount(1);
      await expect(page.locator('[data-testid="mobile-event-detail"]')).toHaveCount(0);
    });

    test('returns to the mobile event index after a direct event-page load', async ({ page }) => {
      const eventPath = await discoverEventPath(page);
      await page.goto(eventPath);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.mobile-layout')).toHaveCount(0);

      await page.getByRole('link', { name: 'Events', exact: true }).click();
      await page.waitForURL((url) => url.pathname === '/events');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('.mobile-layout')).toBeVisible();
    });
  });

  test.describe('Googlebot user agent', () => {
    test.use({ userAgent: GOOGLEBOT_USER_AGENT });

    test('receives the shared desktop-compatible event document', async ({ page }) => {
      await expectSingleEventTree(page);
    });
  });

  test.describe('Bingbot user agent', () => {
    test.use({ userAgent: BINGBOT_USER_AGENT });

    test('receives the shared desktop-compatible event document', async ({ page }) => {
      await expectSingleEventTree(page);
    });
  });

  test('keeps canonical metadata and JSON-LD equivalent across public user agents', async ({
    browser,
  }) => {
    const userAgents: readonly (string | undefined)[] = [
      undefined,
      IPHONE_USER_AGENT,
      GOOGLEBOT_USER_AGENT,
      BINGBOT_USER_AGENT,
    ];
    const snapshots: EventDocumentSnapshot[] = [];

    for (const userAgent of userAgents) {
      const context = await browser.newContext(userAgent ? { userAgent } : {});
      try {
        const page = await context.newPage();
        const eventPath = await discoverEventPath(page);
        const response = await page.goto(eventPath);
        expect(response?.status()).toBe(200);
        await page.waitForLoadState('networkidle');
        snapshots.push(await readEventDocumentSnapshot(page));
      } finally {
        await context.close();
      }
    }

    expect(snapshots).toHaveLength(userAgents.length);
    expect(snapshots.slice(1)).toEqual(snapshots.slice(0, -1));
  });

  test('keeps event document cache variance independent of user agent with either slash form', async ({
    page,
    request,
  }) => {
    const eventPath = await discoverEventPath(page);

    for (const suffix of ['', '/']) {
      const response = await request.get(`${eventPath}${suffix}`, {
        headers: { 'user-agent': IPHONE_USER_AGENT },
      });
      expect(response.status()).toBe(200);
      expect(response.headers().vary?.toLowerCase()).not.toContain('user-agent');
    }
  });

  test('keeps server-rendered public HTML invariant for cookies and authorization', async ({
    page,
    request,
  }) => {
    const eventPath = await discoverEventPath(page);
    const anonymous = await readPublicHtml(request, eventPath);
    const withCookie = await readPublicHtml(request, eventPath, { Cookie: 'session=1' });
    const withAuthorization = await readPublicHtml(request, eventPath, {
      Authorization: 'Bearer invalid-test-token',
    });

    expect(withCookie).toBe(anonymous);
    expect(withAuthorization).toBe(anonymous);
  });

  test('returns real 404 responses for malformed and nonexistent event details', async ({
    request,
  }) => {
    const malformed = await request.get('/events/augusta-ga/not-an-event');
    expect(malformed.status()).toBe(404);
    expect(await malformed.text()).toContain('Page Not Found');

    const nonexistentPath =
      '/events/augusta-ga/truckfull-soft-404-probe-2099-12-31?source=404-test';
    const nonexistent = await request.get(nonexistentPath);
    expect(nonexistent.status()).toBe(404);
    expect(await nonexistent.text()).toContain('Page Not Found');

    const head = await request.head(nonexistentPath);
    expect(head.status()).toBe(404);
  });

  test('keeps HEAD successful for a canonical event detail', async ({ page, request }) => {
    const eventPath = await discoverEventPath(page);
    const response = await request.head(eventPath, { maxRedirects: 0 });

    expect(response.status()).toBe(200);
    expect(await response.body()).toHaveLength(0);
  });
});
