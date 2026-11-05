import { test, expect, type Page } from '@playwright/test';

async function selectMunicipality(page: Page, name: string) {
  await page.getByRole('combobox', { name: 'Grad ili općina' }).fill(name);
  await page
    .getByRole('option')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2024');
}

test('real API: search → Bjelovar → year change → table → URL reload/back', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/explorer');
  await expect(page.getByRole('heading', { name: 'Waste Explorer.' })).toBeVisible();
  const observationsResponse = page.waitForResponse(
    (response) => response.url().includes('/observations?') && response.status() === 200,
  );
  await selectMunicipality(page, 'Bjelovar');
  const response = await observationsResponse;
  const profile = await response.json();
  expect(profile.municipality.name).toBe('Bjelovar');
  expect(profile.observations.map((item: { year: number }) => item.year)).toEqual([
    2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024,
  ]);
  await expect(page.getByRole('article', { name: 'Ukupno sakupljeno' })).toContainText('9.773,87');
  await expect(page.getByRole('article', { name: 'Odvojeno sakupljanje' })).toContainText('32,27');
  await expect(page.getByText('2023. · Razlika između XLSX-a i PDF-a')).toHaveCount(0);
  const graph = page.getByRole('application');
  await graph.focus();
  await graph.press('ArrowRight');
  await expect(page.locator('.recharts-tooltip-wrapper')).toContainText(
    /20(1[7-9]|2[0-4])\. godina/,
  );
  await page.getByLabel('Godina podataka').selectOption('2023');
  await expect(page.getByRole('article', { name: 'Ukupno sakupljeno' })).toContainText('9.187,54');
  await expect(page).toHaveURL(/godina=2023/);
  await page.getByLabel('Godina podataka').selectOption('2022');
  await expect(page.getByRole('article', { name: 'Odvojeno sakupljanje' })).toContainText('16,00');
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('2021.');
  await expect(page.getByRole('table')).toContainText('9.035,00');
  await page.getByRole('button', { name: 'Odaberi 2021. godinu' }).click();
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2021');
  await page.reload();
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2021');
  await expect(page.getByRole('article', { name: 'Ukupno sakupljeno' })).toContainText('11.054,00');
  await page.goBack();
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2022');
  await expect(page.getByRole('link', { name: /Waste Compare/ })).toHaveAttribute(
    'href',
    /compare/,
  );
  await expect(page.getByRole('link', { name: 'Waste Simulator', exact: true })).toHaveAttribute(
    'href',
    /simulator/,
  );
  expect(errors).toEqual([]);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.screenshot({ path: 'test-results/explorer-desktop.png', fullPage: true });
});

test('real API: Seget discrepancy keeps published value and withholds derived kg', async ({
  page,
}) => {
  await page.goto('/explorer');
  await selectMunicipality(page, 'Seget');
  const card = page.getByRole('article', { name: 'Ukupni otpad po stanovniku' });
  await expect(card).toContainText('Nema podatka');
  await expect(card).toContainText('363,99');
  await expect(card).toContainText('Nesklad');
  await expect(page.getByRole('article', { name: 'Ukupno sakupljeno' })).toContainText('1.698,02');
  await page.getByLabel('Pokazatelj', { exact: true }).selectOption('per_person');
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Ukupno · izračunato');
  await expect(page.getByRole('table')).toContainText('Ukupno · objavljeno');
  await expect(page.getByRole('table')).toContainText('Nema podatka');
  const profile = await (
    await page.request.get(
      `/api/v1/municipalities/${new URL(page.url()).searchParams.get('jls')}/observations?from_year=2024`,
    )
  ).json();
  expect(profile.observations[0].source_row).toBe(375);
  expect(profile.observations[0].source.sha256).toBe(
    '11c98568f49d18f4a6592e3a1f1efdfdc81fabb31e2d3fdc8ad9ab8d07ed4f72',
  );
  await expect(page.locator('#source-2024 a').first()).toHaveAttribute('href', /\.xlsx$/);
});

test('real API: keyboard search and mobile single-column layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explorer');
  const search = page.getByRole('combobox', { name: 'Grad ili općina' });
  await search.fill('Bjelovar');
  await expect(page.getByRole('option').filter({ hasText: /^Bjelovar/ })).toBeVisible();
  await search.press('ArrowDown');
  await search.press('Enter');
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2024');
  const cards = page.getByRole('article');
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(second!.y).toBeGreaterThan(first!.y + first!.height);
  expect(first!.x).toBe(second!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  });
  await page.screenshot({ path: 'test-results/explorer-mobile.png', fullPage: true });
});

test('real API: empty search results and missing requested year', async ({ page }) => {
  await page.goto('/explorer');
  await page.getByRole('combobox', { name: 'Grad ili općina' }).fill('NepostojecaJLS123');
  await page.getByRole('button', { name: 'Odaberi područje', exact: true }).click();
  await expect(page.getByText('Nema rezultata za uneseni naziv.', { exact: true })).toBeVisible();
  await selectMunicipality(page, 'Bjelovar');
  const url = new URL(page.url());
  url.searchParams.set('godina', '2030');
  await page.goto(url.href);
  await expect(page.getByText('Nema podatka za odabranu godinu', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Godina podataka')).toHaveValue('');
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.getByLabel('Godina podataka').selectOption('2023');
  await expect(page.getByRole('article', { name: 'Ukupno sakupljeno' })).toContainText('9.187,54');
});

test('controlled network failure: no stale cards and retry recovers from real API', async ({
  page,
}) => {
  await page.goto('/explorer');
  await selectMunicipality(page, 'Bjelovar');
  await page.route('**/api/v1/municipalities/*/observations?*', (route) => route.abort('failed'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Podaci nisu učitani' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(0);
  await page.unroute('**/api/v1/municipalities/*/observations?*');
  await page.getByRole('button', { name: 'Pokušaj ponovno' }).click();
  await expect(page.getByRole('article', { name: 'Ukupno sakupljeno' })).toContainText('9.773,87');
});

test('controlled loading: year/profile request shows a separate loading state', async ({
  page,
}) => {
  await page.goto('/explorer');
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/v1/municipalities/*/observations?*', async (route) => {
    await hold;
    await route.continue();
  });
  await page.getByRole('combobox', { name: 'Grad ili općina' }).fill('Bjelovar');
  await page.getByRole('combobox', { name: 'Grad ili općina' }).press('Enter');
  await expect(
    page.getByText('Učitavanje profila i dostupnih godina…', { exact: true }),
  ).toBeVisible();
  release();
  await expect(page.getByRole('article', { name: 'Ukupno sakupljeno' })).toBeVisible();
});

test('real API: an explicit zero rate stays zero and trends remain unconnected', async ({
  page,
}) => {
  await page.goto('/explorer');
  await selectMunicipality(page, 'Imotski');
  const rate = page.getByRole('article', { name: 'Odvojeno sakupljanje' });
  await expect(rate).toContainText('0,00');
  await expect(rate).not.toContainText('Nema podatka');
  await expect(page.locator('.trend-panel')).toContainText('vrijednosti prikazane zasebno');
  await expect(page.locator('.recharts-line')).toHaveCount(0);
});

test('real API: accessibility of desktop chart and mobile table', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await page.goto('/explorer');
  await selectMunicipality(page, 'Bjelovar');
  await expect(page.getByLabel('Pokazatelj', { exact: true })).toBeVisible();
  const desktop = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    desktop.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  const mobile = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    mobile.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
});
