import { test, expect } from '@playwright/test';
import data from '../src/data/recycling-map.json' with { type: 'json' };

test('home: nationwide autocomplete, map sources, filters and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('map-count')).toHaveText(`${data.summary.total} lokacija`);
  await expect(page.locator('.recycling-map .marker-cluster').first()).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Područje', exact: true })).toHaveCount(0);
  const input = page.getByRole('combobox', { name: 'Grad ili općina', exact: true });
  await expect(page.locator('.topbar')).not.toContainText('Radni prostor');
  await expect(page.locator('.recycling-explorer .recycling-source')).toHaveCount(0);
  await expect(page.getByText(/Bez koordinata —/)).toHaveCount(0);
  await expect(page.locator('a[download]')).toHaveCount(0);
  await expect(page.getByText(/Pišite za prijedloge/)).toHaveCount(0);

  await input.fill('Z');
  await expect(
    page.getByRole('option').filter({ has: page.locator('strong', { hasText: /^Zagreb$/ }) }),
  ).toBeVisible();
  await expect(page.getByRole('option').filter({ hasText: /^Zadar/ })).toBeVisible();
  await input.fill('Zag');
  await expect(page.getByRole('option').filter({ hasText: /^Zadar/ })).toHaveCount(0);
  await input.fill('Zadar');
  await input.press('Enter');
  await expect(page.locator('.recycling-area-heading')).toContainText('Zadar');
  const zadar = data.areas.find((area) => area.name === 'Zadar')!;
  await expect(page.getByTestId('map-count')).toHaveText(`${zadar.count} lokacija`);
  await page.locator('.recycling-map .leaflet-marker-icon').first().click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('Zadar');
  await expect(page.locator('.leaflet-popup-content')).not.toContainText('nije navedena');
  await expect(page.locator('.leaflet-popup-content')).not.toContainText('Izvor');

  await expect(page).toHaveURL(/\/$/);
  await input.fill('Otok');
  await input.press('Enter');
  await expect(page.locator('.area-search-status')).toContainText('Odaberite jedno');
  await expect(page.getByRole('option', { name: /Otok/ })).toHaveCount(2);
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');

  const empty = data.areas.find(
    (area) =>
      area.count === 0 &&
      area.bounds &&
      data.areas.filter((other) => other.name === area.name).length === 1,
  )!;
  await input.fill(empty.name);
  await input.press('Enter');
  await expect(page.getByTestId('map-count')).toHaveText('0 lokacija');
  await expect(page.getByRole('status').filter({ hasText: 'To ne znači' })).toBeVisible();

  await input.fill('Zagreb');
  await input.press('Enter');
  await page.getByRole('button', { name: 'data.gov.hr', exact: true }).click();
  await expect(page.getByTestId('map-count')).toHaveText('20 lokacija');
  await page.getByLabel('Prikaži', { exact: true }).selectOption('mobile');
  await expect(page.getByTestId('map-count')).toHaveText('10 lokacija');
  await page.getByLabel('Prikaži', { exact: true }).selectOption('fixed');
  await expect(page.getByTestId('map-count')).toHaveText('10 lokacija');
  const list = page.locator('.recycling-list');
  await list.locator('summary').click();
  const beforeZoom = await list.locator('li').count();
  expect(beforeZoom).toBe(10);
  for (let step = 0; step < 4; step++) {
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(page.locator('.recycling-map')).not.toHaveClass(/leaflet-zoom-anim/);
  }
  await expect.poll(() => list.locator('li').count()).toBeLessThan(beforeZoom);
  // Searching the same area resets the viewport and list.
  await input.press('Enter');
  await page.getByRole('button', { name: 'data.gov.hr', exact: true }).click();
  await expect.poll(() => list.locator('li').count()).toBe(20);
  await page.getByLabel('Prikaži', { exact: true }).selectOption('fixed');
  await page.locator('.recycling-map .leaflet-marker-icon[title="RD JAKUŠEVEC"]').click();
  await expect(page.locator('.leaflet-popup-content')).toContainText('RD JAKUŠEVEC');
  await expect(page.locator('.leaflet-popup-content')).toContainText('Radno vrijeme:');
  await expect(page.locator('.leaflet-popup-content')).not.toContainText('Telefon');
  await expect(page.locator('.leaflet-popup-content')).not.toContainText('Izvor');
  await expect(page.locator('.leaflet-popup-content p')).toHaveCount(2);
  await page.getByRole('button', { name: 'Prikaži cijelu Hrvatsku' }).click();
  await page.getByRole('button', { name: 'OpenStreetMap', exact: true }).click();
  await expect(page.getByTestId('map-count')).toHaveText(`${data.summary.osm_added} lokacija`);
  const csv = await page.request.get('/data/reciklazna_dvorista_osm_hr.csv');
  expect(csv.ok()).toBe(true);
  expect(await csv.text()).toContain('openstreetmap.org');
  await page.screenshot({ path: 'test-results/home-national-desktop.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await input.fill('Zada');
  await input.press('ArrowDown');
  await input.press('Enter');
  await expect(page.locator('.recycling-area-heading')).toContainText('Zadar');
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/home-national-mobile.png', fullPage: true });
  await expect(page.getByRole('link', { name: /Podaci o otpadu za Zadar/ })).toBeVisible();
  await page.getByRole('link', { name: /Podaci o otpadu za Zadar/ }).click();
  await expect(page).toHaveURL(/explorer\?jls=/);
});
