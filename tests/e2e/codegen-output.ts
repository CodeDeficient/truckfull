import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByRole('button', { name: 'Start Exploring' }).click();
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 421,
      y: 355,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 489,
      y: 260,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 563,
      y: 158,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 583,
      y: 180,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 493,
      y: 552,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 394,
      y: 443,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 364,
      y: 547,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 472,
      y: 474,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 414,
      y: 302,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 382,
      y: 327,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 508,
      y: 336,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 407,
      y: 360,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 493,
      y: 416,
    },
  });
  await page.getByRole('region', { name: 'Map' }).click({
    position: {
      x: 603,
      y: 392,
    },
  });
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await page.getByRole('button', { name: 'Find my location' }).click();
  await page.locator('.mapboxgl-user-location-accuracy-circle').click();
  await page.getByText('3').nth(1).click();
  await page.locator('div').filter({ hasText: /^3$/ }).nth(2).click();
  await page
    .getByRole('button', { name: 'Hometown Grounds logo i Hometown Grounds Coffee', exact: true })
    .click();
  await page.getByRole('button', { name: 'Go back' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('img', { name: 'Palmetto Bowls', exact: true }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Contact' }).click();
  await page.getByRole('button', { name: 'Hours' }).click();
  await page.getByRole('button', { name: 'Close popup' }).click();
});
