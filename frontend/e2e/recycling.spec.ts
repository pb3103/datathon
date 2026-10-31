import { test, expect } from '@playwright/test';
test('home: map filters, popup and mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('.home-data-note a')).toHaveAttribute('href', /data.gov.hr/);
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(59);
  await page.getByLabel('Prikaži', { exact: true }).selectOption('collection');
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).fill('Hvar');
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).press('Enter');
  await expect(page.getByLabel('Područje', { exact: true })).toHaveValue('Hvar');
  await expect(page.getByLabel('Prikaži', { exact: true })).toHaveValue('all');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(1);
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).fill('Bjelovar');
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).press('Enter');
  await expect(page.locator('.recycling-source[role="status"]')).toContainText('još nemamo');

  await page.getByLabel('Područje', { exact: true }).selectOption('Velika Ludina');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(7);
  await page.getByLabel('Prikaži', { exact: true }).selectOption('island');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(6);
  await page.getByLabel('Područje', { exact: true }).selectOption('Hvar');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Za odabrane filtre' })).toBeVisible();
  await page.getByLabel('Prikaži', { exact: true }).selectOption('all');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(1);
  await page.getByLabel('Područje', { exact: true }).selectOption('Rugvica');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(18);
  await expect(page.locator('.recycling-list').first()).toContainText('bez koordinata');
  await page.getByLabel('Područje', { exact: true }).selectOption('Zagreb');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(20);
  await page.getByLabel('Prikaži', { exact: true }).selectOption('mobile');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(10);
  await page.getByLabel('Prikaži', { exact: true }).selectOption('fixed');
  await expect(page.locator('.recycling-map .leaflet-marker-icon')).toHaveCount(10);
  await page.locator('.leaflet-marker-icon').first().click();
  await expect(page.locator('.leaflet-popup')).toContainText('RD JAKUŠEVEC');
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.leaflet-popup')).toHaveCount(0);
  await page.locator('.leaflet-marker-icon').first().click();
  await expect
    .poll(() =>
      page.locator('.leaflet-popup').evaluate((popup) => {
        const box = popup.getBoundingClientRect();
        const map = popup.closest('.leaflet-container')!.getBoundingClientRect();
        return box.left >= map.left && box.right <= map.right;
      }),
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).fill('Zagreb');
  await page.getByRole('button', { name: 'Pretraži', exact: true }).click();
  await page.getByRole('button', { name: /^Otvori Zagreb,/ }).click();
  await expect(page).toHaveURL(/explorer\?jls=/);
});
