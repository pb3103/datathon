import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fmt = (v: string | null) =>
  v === null
    ? 'Nema podatka'
    : Number(v).toLocaleString('hr-HR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function id(page: import('@playwright/test').Page, name: string, county?: string) {
  const data = await (
    await page.request.get(`/api/v1/municipalities?q=${encodeURIComponent(name)}`)
  ).json();
  return data.items.find(
    (m: { name: string; county: string }) => m.name === name && (!county || m.county === county),
  ).id;
}

test('history Explorer: all eight years, real API metrics and unconnected table', async ({
  page,
}) => {
  const b = await id(page, 'Bjelovar');
  const profile = await (await page.request.get(`/api/v1/municipalities/${b}/observations`)).json();
  await page.goto(`/explorer?jls=${b}&godina=2017`);
  await expect(page.locator('.trend-panel h2')).toContainText('2017.–2024.');
  await expect(page.locator('.chart-description')).toContainText(
    'obuhvat ovisi o godišnjem izvoru',
  );
  for (const o of profile.observations) {
    await page.getByLabel('Godina podataka').selectOption(String(o.year));
    await expect(page.locator('.metric-card').first()).toContainText(fmt(o.metrics.total_t.value));
    if (o.year < 2021) {
      await expect(page.locator('.metric-card').last()).toContainText('Nema podatka');
      await expect(
        page.getByText('Kontrolni omjer razlike tokova (T−M)/T:', { exact: false }),
      ).toBeVisible();
    }
  }
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table').locator('tbody tr')).toHaveCount(8);
  await expect(
    page.getByText('2023. · Razlika između XLSX-a i PDF-a', { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel('Godina podataka').selectOption('2017');
  await page.getByRole('link', { name: 'Usporedi ovu zajednicu →' }).click();
  await expect(page.getByLabel('Godina usporedbe')).toHaveValue('2017');
});

test('history Compare: every year, peer algorithm, missing official rate and materials', async ({
  page,
}) => {
  const b = await id(page, 'Bjelovar'),
    s = await id(page, 'Samobor');
  await page.goto(`/compare?jls=${b}&usporedi=${s}&godina=2017`);
  for (let y = 2017; y <= 2024; y++) {
    const q = new URLSearchParams({ year: String(y), baseline_id: b });
    q.append('ids', b);
    q.append('ids', s);
    const data = await (await page.request.get(`/api/v1/comparisons?${q}`)).json();
    await page.getByLabel('Godina usporedbe').selectOption(String(y));
    await expect(page.getByRole('heading', { name: `Ključni pokazatelji · ${y}.` })).toBeVisible();
    await expect(page.locator('.core-card').first()).toContainText(
      fmt(data.members[0].metrics.total_kg_per_covered_person.value),
    );
    if (y < 2021) {
      await expect(page.locator('.reference-rate').first()).toContainText('Nema podatka');
      await expect(page.getByRole('link', { name: 'Simuliraj ovaj cilj' })).toHaveCount(0);
    }
  }
  await page.getByLabel('Godina usporedbe').selectOption('2017');
  await page.getByRole('button', { name: 'Predloži slične JLS' }).click();
  await expect(page.locator('.peer-card')).toHaveCount(5);
  await page.getByLabel('Pokazatelj usporedbe').selectOption('material_paper');
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  await expect(page.getByRole('table')).toContainText('Nema podatka');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results/historical-compare-mobile.png', fullPage: true });
});

test('history identity and sources: Sveta Nedelja counties, PDF correction and unchanged Simulator eligibility', async ({
  page,
}) => {
  const z = await id(page, 'Sveta Nedelja', 'Zagrebačka'),
    i = await id(page, 'Sveta Nedelja', 'Istarska');
  for (const [mid, mass] of [
    [z, '4.000,32'],
    [i, '988,68'],
  ]) {
    await page.goto(`/explorer?jls=${mid}&godina=2017`);
    await expect(page.locator('.metric-card').first()).toContainText(mass);
  }
  const jan = await id(page, 'Janjina');
  await page.goto(`/explorer?jls=${jan}&godina=2017`);
  await expect(page.locator('.published-value')).toContainText('1.361');
  await page.locator('#source-2017 summary').click();
  await expect(page.locator('#source-2017')).toContainText('CSV iz PDF-a');
  await expect(page.locator('#source-2017')).toContainText('Izvorni PDF');
  const b = await id(page, 'Bjelovar');
  await page.goto(`/simulator?jls=${b}&godina=2017`);
  await expect(page.getByText('Automatski izračun nije dostupan')).toBeVisible();
  await expect(page.getByLabel('Vrijednost scenarija')).toBeDisabled();
  await page.getByLabel('Godina scenarija').selectOption('2020');
  await expect(page.getByLabel('Vrijednost scenarija')).toBeDisabled();
  await page.getByLabel('Godina scenarija').selectOption('2023');
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.getByLabel('Godina scenarija').selectOption('2024');
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.screenshot({
    path: 'test-results/historical-simulator-regression.png',
    fullPage: true,
  });
});

test('source presentation: one compact note, keyboard details and original provenance', async ({
  page,
}) => {
  const b = await id(page, 'Bjelovar');
  await page.goto(`/explorer?jls=${b}&godina=2017`);
  const note = page.locator('.historical-method-note');
  await expect(note).toHaveCount(1);
  await expect(note).toContainText('službenih godišnjih izvješća');
  const more = note.getByText('Saznaj više', { exact: true });
  await more.focus();
  await page.keyboard.press('Enter');
  await expect(note.locator('details')).toHaveAttribute('open');
  await expect(note).toContainText('nije službeno objavljena stopa');
  await expect(note.getByRole('link')).toHaveCount(4);
  await note.getByRole('link', { name: 'Izvor za 2017.' }).click();
  await expect(page).toHaveURL(/#source-2017$/);
  await page.locator('#source-2017 summary').click();
  await expect(page.locator('#source-2017')).toContainText('wastewise_2017_ZUPANIJE_DOPUNJENE.csv');
  for (let year = 2017; year <= 2024; year++) {
    await expect(page.locator(`#source-${year} summary`)).toContainText(
      `Prikaz odabranih podataka_JLS za ${year}.${year < 2021 ? 'csv' : 'xlsx'}`,
    );
  }
  await expect(page.getByText('Razlika između XLSX-a i PDF-a', { exact: false })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await note.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/compact-quality-mobile.png' });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});
