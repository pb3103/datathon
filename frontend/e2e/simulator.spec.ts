import { openReferenceScenario } from './reference-link';
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function open(page: import('@playwright/test').Page, name = 'Bjelovar', year = '2024') {
  const response = await page.request.get(`/api/v1/municipalities?q=${encodeURIComponent(name)}`);
  const mid = (await response.json()).items.find((m: { name: string }) => m.name === name).id;
  await page.goto(`/simulator?jls=${mid}&godina=${year}`);
  await expect(page.getByRole('heading', { name: 'Oblikujte scenarij' })).toBeVisible();
  return mid;
}

test('Simulator real API: both target models, scenarios, table, draft recovery and PDF action', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await page.getByLabel('Način unosa', { exact: true }).selectOption('target');
  await page.getByLabel('Vrijednost scenarija').fill('50');
  await expect(page.locator('.simulator-result-grid')).toContainText('50,00 %');
  const diversion = await page.locator('.simulator-change strong').innerText();
  await page.getByRole('button', { name: 'Zadrži i dodaj scenarij' }).click();
  await page.getByRole('radio', { name: /Prevencija/ }).check();
  await page.getByLabel('Način unosa', { exact: true }).selectOption('target');
  await page.getByLabel('Vrijednost scenarija').fill('50');
  await expect(page.locator('.simulator-result-grid')).toContainText('50,00 %');
  expect(await page.locator('.simulator-change strong').innerText()).not.toBe(diversion);
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Scenarij 2');
  await expect(page.getByRole('button', { name: 'Ispiši izvještaj / PDF' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: /Spremi lokalno|Učitaj spremljeno|Kopiraj poveznicu|Izvezi/ }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Uvezi scenarije iz JSON-a')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.simulator-result-grid')).toContainText('50,00 %');
  await expect(page.locator('.simulator-saved')).toContainText('Moj scenarij');
  await page.getByRole('button', { name: 'Zadrži i dodaj scenarij' }).click();
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.getByRole('button', { name: 'Zadrži i dodaj scenarij' }).click();
  await expect(page.getByRole('button', { name: 'Zadrži i dodaj scenarij' })).toBeDisabled();
  await page.getByLabel('Način unosa', { exact: true }).selectOption('target');
  await page.getByLabel('Vrijednost scenarija').fill('0');
  await expect(
    page.getByText('Cilj je već dosegnut prema početnim masama.', { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('Simulator real API: Compare handoff revalidated and reference remains visible', async ({
  page,
}) => {
  const b = (await (await page.request.get('/api/v1/municipalities?q=Bjelovar')).json()).items[0]
    .id;
  const d = (await (await page.request.get('/api/v1/municipalities?q=Daruvar')).json()).items[0].id;
  await page.goto(`/compare?jls=${b}&usporedi=${d}&godina=2024`);
  await openReferenceScenario(page);
  await expect(page.locator('.simulator-reference')).toContainText('Daruvar');
  await expect(page.locator('.simulator-result-grid')).toContainText('35,56 %');
  await page.getByRole('radio', { name: /Prevencija/ }).check();
  await expect(page.locator('.simulator-result-grid')).toContainText('35,56 %');
  const url = new URL(page.url());
  url.searchParams.set('cilj', '99');
  await page.goto(url.toString());
  await expect(page.getByRole('alert')).toContainText('ne odgovara API-ju');
});

test('Simulator real API: unavailable years, population quality, invalid targets and missing year', async ({
  page,
}) => {
  const id = await open(page, 'Bjelovar', '2022');
  await expect(page).toHaveURL(/godina=2024/);
  await expect(page.getByLabel('Godina scenarija')).toHaveCount(0);
  await page.goto(`/simulator?jls=${id}&godina=2023`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await expect(
    page.getByText('2023. · Razlika između XLSX-a i PDF-a', { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Način unosa', { exact: true }).selectOption('target');
  await page.getByLabel('Vrijednost scenarija').fill('101');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.simulator-result-grid')).toHaveCount(0);
  await page.goto(`/simulator?jls=${id}&godina=2016`);
  await expect(page.getByRole('alert')).toBeVisible();
  await open(page, 'Seget');
  await expect(
    page.getByText('Obuhvaćena populacija zahtijeva provjeru.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Nema podatka');
  await open(page, 'Janjina');
  await page.getByRole('radio', { name: /Prevencija/ }).check();
  await page.getByLabel('Vrijednost scenarija').fill('100');
  await expect(page.getByText('Uz nultu ukupnu masu stopa nije definirana.')).toBeVisible();
  await expect(page.locator('.simulator-result-grid')).toContainText('Nema podatka');
  await page.getByLabel('Način unosa', { exact: true }).selectOption('target');
  await page.getByLabel('Vrijednost scenarija').fill('50');
  await expect(page.getByRole('alert')).toContainText('bez početnog odvojeno sakupljenog toka');
});

test('Simulator: no stale results on network failure, retry preserves input, malformed link', async ({
  page,
}) => {
  const id = await open(page);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.route('**/api/v1/simulations', (route) => route.abort());
  await page.getByLabel('Vrijednost scenarija').fill('20');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.simulator-result-grid')).toHaveCount(0);
  await page.unroute('**/api/v1/simulations');
  await page.getByRole('button', { name: 'Pokušaj ponovno' }).click();
  await expect(page.locator('.simulator-change')).toContainText('20,00 %');
  await page.goto(
    `/simulator?jls=${id}&godina=2024&verzija=public-service-mass-balance-v1&scenariji=${encodeURIComponent('[{"name":{},"model":"diversion"}]')}`,
  );
  await expect(page.getByRole('alert')).toBeVisible();
});

test('Simulator: real API desktop/mobile accessibility and printable report', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results/simulator-desktop.png', fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('table')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  expect(await page.evaluate(() => document.body.scrollWidth <= window.innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results/simulator-mobile.png', fullPage: true });
});
