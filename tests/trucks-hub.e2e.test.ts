import { test, expect, type Locator, type Page } from '@playwright/test';

const INTERACTIVE_WEBKIT_SKIP =
  'Local dev sends upgrade-insecure-requests, so WebKit cannot load scripts over http://localhost';

async function expectTotalMatchesCities(card: Locator): Promise<void> {
  const counts = await card.locator('li a span:last-child').allTextContents();
  const sum = counts.reduce((total, count) => total + Number(count), 0);
  const label = `${sum.toLocaleString('en-US')} ${sum === 1 ? 'listing' : 'listings'} ·`;
  await expect(card.locator('p').first()).toContainText(label);
}

async function searchFor(page: Page, text: string): Promise<Locator> {
  const search = page.getByPlaceholder('Find your city');
  await expect(async () => {
    await search.fill('');
    await search.fill(text);
    await expect(page.getByRole('heading', { name: 'Matching cities' })).toBeVisible({
      timeout: 1000,
    });
  }).toPass({ timeout: 30_000 });
  return search;
}

test.describe('/trucks city hub', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/trucks', { waitUntil: 'networkidle' });
  });

  test('shows the hub breadcrumb and top city cards', async ({ page }) => {
    const breadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
    await expect(breadcrumb).toContainText('Home / Food Trucks by City');
    const popular = page.locator('section[aria-labelledby="top-cities"] li a');
    expect(await popular.count()).toBeGreaterThan(0);
    await expect(popular.first()).toHaveAttribute('href', /^\/city\/[a-z0-9-]+$/);
  });

  test('shows the curated truck photo wall as decoration only', async ({ page }) => {
    const tiles = page.locator('section [aria-hidden="true"] .hub-marquee-col img');
    expect(await tiles.count()).toBeGreaterThan(0);
    await expect(tiles.first()).toHaveAttribute('alt', '');
    await expect(page.locator('.hub-marquee-col a')).toHaveCount(0);
  });

  test('pauses the photo wall while it is scrolled out of view', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', INTERACTIVE_WEBKIT_SKIP);
    const column = page.locator('.hub-marquee-col').first();
    const playState = (): Promise<string | undefined> =>
      column.evaluate((element) => element.getAnimations()[0]?.playState);
    await expect.poll(playState).toBe('running');
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await expect.poll(playState).toBe('paused');
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    await expect.poll(playState).toBe('running');
  });

  test('expands a state from its top cities to the full list', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', INTERACTIVE_WEBKIT_SKIP);
    const firstState = page.locator('section[id^="state-"]').first();
    const rows = firstState.locator('li:visible');
    const toggle = firstState.getByRole('button', { name: /Show all \d+ cities/ });
    await expect(rows).toHaveCount(12);
    const total = Number((await toggle.innerText()).match(/\d+/)?.[0]);
    await expect(async () => {
      if (await toggle.isVisible()) await toggle.click();
      await expect(rows).toHaveCount(total, { timeout: 1000 });
    }).toPass({ timeout: 30_000 });
    await expect(firstState.getByRole('button', { name: 'Show fewer' })).toBeVisible();
  });

  test('sends every city link in the server HTML, even collapsed ones', async ({
    page,
    request,
  }) => {
    const html = await (await request.get('/trucks')).text();
    const served = new Set(html.match(/href="\/city\/[a-z0-9-]+"/g));
    const firstState = page.locator('section[id^="state-"]').first();
    const toggle = firstState.getByRole('button', { name: /Show all \d+ cities/ });
    const firstStateTotal = Number((await toggle.innerText()).match(/\d+/)?.[0]);
    expect(served.size).toBeGreaterThanOrEqual(firstStateTotal);
    await expect(firstState.locator('li')).toHaveCount(firstStateTotal);
  });

  test('filters cities across states by search text', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', INTERACTIVE_WEBKIT_SKIP);
    await searchFor(page, 'charleston');
    const names = await page.locator('section[id^="state-"] li a span:first-child').allInnerTexts();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(name.toLowerCase()).toContain('charleston');
    await page.getByPlaceholder('Find your city').fill('zzzz-no-city');
    await expect(page.getByRole('status')).toContainText('No cities match');
  });

  test('totals only the matching cities while searching', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', INTERACTIVE_WEBKIT_SKIP);
    await searchFor(page, 'gr');
    for (const card of await page.locator('section[id^="state-"]').all()) {
      await expectTotalMatchesCities(card);
    }
  });

  test('lists every town so each state total matches its cities', async ({ page }) => {
    for (const card of await page.locator('section[id^="state-"]').all()) {
      await expectTotalMatchesCities(card);
    }
  });

  test('treats hostile search text as plain text', async ({ page, browserName }) => {
    test.skip(browserName === 'webkit', INTERACTIVE_WEBKIT_SKIP);
    const search = await searchFor(page, '<img src=x onerror=alert(1)>');
    await expect(page.getByRole('status')).toContainText('<img src=x onerror=alert(1)>');
    await expect(page.locator('img[src="x"]')).toHaveCount(0);
    await search.fill('x'.repeat(500));
    expect((await search.inputValue()).length).toBeLessThanOrEqual(60);
  });
});
