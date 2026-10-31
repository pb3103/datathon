import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function add(page: Page, name: string) {
  const input = page.getByRole('searchbox', { name: 'Grad ili općina' });
  await input.fill(name);
  await input.press('Enter');
  await page.getByRole('button', { name: new RegExp(`^Otvori ${name},`) }).click();
}
async function id(request: APIRequestContext, name: string) {
  const response = await request.get(`/api/v1/municipalities?q=${encodeURIComponent(name)}`);
  const data = await response.json();
  return data.items.find((m: { name: string }) => m.name === name).id as string;
}
async function pair(page: Page) {
  await page.goto('/compare');
  await add(page, 'Bjelovar');
  await expect(page.getByLabel('Godina usporedbe')).toHaveValue('2024');
  await add(page, 'Daruvar');
  await expect(page.getByRole('heading', { name: 'Gdje su najveće razlike?' })).toBeVisible();
}

test('Compare real API: Explorer context, manual group, differences, years and simulator handoff', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/explorer');
  await add(page, 'Bjelovar');
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2024');
  await page.getByRole('link', { name: 'Waste Compare', exact: true }).click();
  await expect(page.getByLabel('Godina usporedbe')).toHaveValue('2024');
  await add(page, 'Daruvar');
  await expect(page.getByRole('heading', { name: 'Gdje su najveće razlike?' })).toBeVisible();
  await page.getByLabel('Pokazatelj usporedbe').selectOption('separate_collection_pct');
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('32,27');
  await expect(page.getByRole('table')).toContainText('35,56');
  await expect(page.getByRole('table')).toContainText('3,29');
  await expect(page.getByRole('table')).toContainText('Razlika · pb');
  await expect(page.getByText('2023. · Razlika između XLSX-a i PDF-a')).toHaveCount(0);
  await expect(page.locator('.insight-card').first()).toContainText('Dostupno 2 od 2');
  await page.getByLabel('Godina usporedbe').selectOption('2022');
  await expect(page.getByRole('table')).toContainText('16,00');
  await page.getByLabel('Godina usporedbe').selectOption('2023');
  await expect(page.getByRole('table')).toContainText('18,36');
  await page.reload();
  await expect(page.getByLabel('Godina usporedbe')).toHaveValue('2023');
  await expect(page.getByLabel('Pokazatelj usporedbe')).toHaveValue('separate_collection_pct');
  await page.goBack();
  await expect(page.getByLabel('Godina usporedbe')).toHaveValue('2022');
  await expect(
    page.getByText('Automatska simulacija nije dostupna za ovaj zapis.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Odaberi 2024. za provjeru dostupnosti' }).click();
  const link = page.getByRole('link', { name: 'Simuliraj ovaj cilj' });
  await expect(link).toHaveAttribute('href', /referenca=.*sha256=/);
  await link.click();
  await expect(page.getByRole('heading', { name: 'Oblikujte scenarij' })).toBeVisible();
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await expect(page).toHaveURL(/\/simulator\?.*pokazatelj=separate_collection_pct/);
  expect(errors).toEqual([]);
});

test('Compare real API: peer cards, county expansion, maximum five and removal', async ({
  page,
}) => {
  await page.goto('/compare');
  await add(page, 'Bjelovar');
  await page.getByRole('button', { name: 'Predloži slične JLS' }).click();
  await expect(page.locator('.peer-card')).toHaveCount(5);
  await expect(page.locator('.peer-card').filter({ hasText: 'U rasponu 0,5–2' })).toHaveCount(5);
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: 'Dodaj u usporedbu', exact: true }).first().click();
    await expect(page.locator('.selected-municipality')).toHaveCount(i + 2);
  }
  for (const button of await page.locator('.peer-card button').all())
    await expect(button).toBeDisabled();
  await add(page, 'Daruvar');
  await expect(page.getByText(/Moguće je odabrati najviše pet/)).toBeVisible();
  await expect(page.locator('.selected-municipality')).toHaveCount(5);
  await page.getByLabel('Filtar prijedloga').selectOption('same_county');
  await expect(page.getByText(/Nema dovoljno kandidata u rasponu 0,5–2/)).toBeVisible();
  await expect(page.locator('.peer-card')).toHaveCount(5);
  await expect(page.locator('.selected-municipality')).toHaveCount(5);
  await page
    .getByRole('button', { name: /^Ukloni / })
    .last()
    .click();
  await expect(page.locator('.selected-municipality')).toHaveCount(4);
});

test('Compare real API: seven materials, discrete histories and traceable sources', async ({
  page,
}) => {
  await pair(page);
  const selector = page.getByLabel('Pokazatelj usporedbe');
  for (const key of ['paper', 'plastic', 'glass', 'metal', 'bulky', 'textile', 'bio'])
    await expect(selector.locator(`option[value="material_${key}"]`)).toHaveCount(1);
  await selector.selectOption('material_paper');
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('27,86');
  await expect(page.getByRole('table')).toContainText('15,77');
  await page.getByRole('button', { name: 'Kroz godine', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('2021.');
  await expect(page.getByRole('table')).toContainText('2024.');
  await page.getByRole('button', { name: 'Grafikon', exact: true }).click();
  await expect(page.locator('.recharts-line')).toHaveCount(0);
  await page.locator('#source-2023 summary').click();
  await expect(page.locator('#source-2023')).toContainText('Prilog 2. KO 2023.');
  await expect(page.locator('#source-2023')).toContainText('SHA-256');
});

test('Compare real API: questionable population excludes peers and per-person results', async ({
  page,
  request,
}) => {
  const a = await id(request, 'Seget');
  const b = await id(request, 'Bjelovar');
  await page.goto(`/compare?jls=${a}&usporedi=${b}&godina=2024`);
  await expect(page.getByRole('heading', { name: 'Gdje su najveće razlike?' })).toBeVisible();
  await page.getByRole('button', { name: 'Predloži slične JLS' }).click();
  await expect(page.locator('.peer-card')).toHaveCount(0);
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Nema podatka');
  await expect(page.getByRole('table')).toContainText('363,99');
  await expect(page.getByRole('table')).toContainText('Nesklad');
  await page.getByLabel('Godina usporedbe').selectOption('2023');
  await page.getByLabel('Pokazatelj usporedbe').selectOption('published_kg_per_covered_person');
  await page.getByRole('button', { name: 'Kroz godine', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('363,99');
  await expect(page.getByRole('table')).toContainText('Nesklad · potrebna provjera');
});

test('Compare real API: network failure does not retain stale results and retry works', async ({
  page,
}) => {
  await pair(page);
  await page.route('**/api/v1/comparisons?*', (r) => r.abort('failed'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Podaci nisu učitani' })).toBeVisible();
  await expect(page.locator('.insight-card')).toHaveCount(0);
  await page.unroute('**/api/v1/comparisons?*');
  await page.getByRole('button', { name: 'Pokušaj ponovno' }).click();
  await expect(page.getByRole('heading', { name: 'Gdje su najveće razlike?' })).toBeVisible();
});

test('Compare real API: desktop/mobile accessibility and responsive charts', async ({ page }) => {
  await pair(page);
  await page.getByRole('button', { name: 'Predloži slične JLS' }).click();
  await expect(page.locator('.peer-card')).toHaveCount(5);
  const desktop = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    desktop.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/compare-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const mobile = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    mobile.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/compare-mobile.png', fullPage: true });
});
