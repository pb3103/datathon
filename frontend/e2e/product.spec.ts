import { test, expect } from '@playwright/test';
async function pair(page: import('@playwright/test').Page) {
  const b = (await (await page.request.get('/api/v1/municipalities?q=Bjelovar')).json()).items[0]
    .id;
  const s = (await (await page.request.get('/api/v1/municipalities?q=Samobor')).json()).items[0].id;
  await page.goto(`/compare?jls=${b}&usporedi=${s}&godina=2024`);
  await page.getByRole('link', { name: 'Simuliraj ovaj cilj' }).click();
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  return { b, s };
}
test('product: round trips clear source references and retain group', async ({ page }) => {
  const { s } = await pair(page);
  await page.getByRole('link', { name: 'Waste Explorer', exact: true }).click();
  await page.getByLabel('Godina podataka').selectOption('2023');
  await page.getByRole('link', { name: 'Waste Simulator', exact: true }).click();
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('referenca')).toBeNull();
  await page.getByLabel('Godina scenarija').selectOption('2024');
  await page.getByRole('link', { name: 'Natrag na usporedbu' }).click();
  await expect(page.locator('.comparison-reference')).toHaveCount(2);
  expect(new URL(page.url()).searchParams.get('usporedi')).toContain(s);
  await page.getByRole('link', { name: 'Otvori profil u Exploreru ↗' }).first().click();
  await page.getByRole('link', { name: 'Usporedi ovu zajednicu →' }).click();
  await expect(page.locator('.comparison-reference')).toHaveCount(2);

  await page.getByRole('link', { name: 'Simuliraj ovaj cilj' }).click();
  await expect(page.locator('.simulator-reference')).toContainText('Samobor');
  await page.getByRole('link', { name: 'Waste Explorer', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).fill('Daruvar');
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).press('Enter');
  await page.getByRole('button', { name: /^Otvori Daruvar,/ }).click();
  await page.getByRole('heading', { name: /Daruvar/ }).waitFor();
  await page.getByRole('link', { name: 'Waste Simulator', exact: true }).click();
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('product: invalid links recover and unsupported models are disabled', async ({ page }) => {
  const { b } = await pair(page);
  await page.goto(`/simulator?jls=${b}&godina=2016`);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Otvori novi scenarij za ovu JLS' }).click();
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.getByLabel('Godina scenarija').selectOption('2022');
  await expect(page.getByLabel('Vrijednost scenarija')).toBeDisabled();
  await page.goto(`/simulator?jls=${b}&godina=abc`);
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Otvori novi scenarij za ovu JLS' }).click();
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.goto(
    `/simulator?jls=${b}&godina=2024&scenariji=bad&verzija=public-service-mass-balance-v1`,
  );
  await expect(page.getByRole('alert')).toContainText('valjan zapis scenarija');
  await page.getByRole('button', { name: 'Otvori novi scenarij za ovu JLS' }).click();

  await page.getByLabel('Godina scenarija').selectOption('2024');
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
});

test('product: home search, concise workflow, mobile accessibility and legacy profile', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Od podataka do pametnih odluka.', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Za građane i jedinice lokalne samouprave.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kako funkcionira?' })).toBeVisible();
  await expect(page.locator('.home-step-card')).toHaveCount(3);
  await expect(page.locator('.home-example')).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).fill('Bjelovar');
  await page.getByRole('searchbox', { name: 'Grad ili općina' }).press('Enter');
  await page.getByRole('button', { name: /^Otvori Bjelovar,/ }).click();
  await expect(page).toHaveURL(/\/explorer\?/);
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2024');
  const old = new URL(page.url());
  old.pathname = '/';
  await page.goto(old.toString());
  await expect(page).toHaveURL(/\/explorer\?/);
  await page.getByRole('link', { name: 'WasteWise početna' }).click();
  await expect(
    page.getByRole('heading', { name: 'Od podataka do pametnih odluka.', exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
});

test('product: valid unsaved draft survives reload and module round trip', async ({ page }) => {
  await pair(page);
  await page.getByRole('radio', { name: /Prevencija/ }).check();
  await page.getByLabel('Vrijednost scenarija').fill('50');
  await expect(page.locator('.simulator-result-grid')).toContainText('50,00 %');
  await expect(page.locator('.draft-status')).toContainText('Nespremljene promjene');
  await page.reload();
  await expect(page.getByLabel('Vrijednost scenarija')).toHaveValue('50');
  await expect(page.getByRole('radio', { name: /Prevencija/ })).toBeChecked();
  await expect(page.locator('.simulator-result-grid')).toContainText('50,00 %');
  await page.getByRole('link', { name: 'Waste Explorer', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Usporedi ovu zajednicu →' })).toBeVisible();
  await page.getByRole('link', { name: 'Istraži scenarij →' }).click();
  await expect(page.getByLabel('Vrijednost scenarija')).toHaveValue('50');
  await expect(page.locator('.result-explanation')).toContainText(
    'odvojeno sakupljena masa ostaje ista',
  );
  await page.getByRole('link', { name: 'Usporedi na grafikonu i u tablici ↓' }).click();
  await expect(page).toHaveURL(/#scenario-comparison/);
});

test('product: compact print preserves data and warnings without interactive UI', async ({
  page,
}) => {
  await pair(page);
  await expect(page.getByLabel('Vrijednost scenarija')).toHaveValue('38.44');
  await expect(page).toHaveTitle('Waste Simulator · WasteWise');
  await expect(page.locator('.formula-details')).not.toHaveAttribute('open');
  await page.getByRole('button', { name: 'Tablica', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Izvezi CSV' }).click();
  expect((await download).suggestedFilename()).toBe('wastewise-scenariji.csv');
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-report')).toBeVisible();
  await expect(page.getByRole('table')).toContainText('38,44');
  await expect(page.locator('.print-report')).not.toContainText(
    '2023. · Razlika između XLSX-a i PDF-a',
  );
  await expect(page.locator('.print-report')).toContainText('Samobor');
  await expect(page.locator('.skip-link')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Spremi lokalno' })).toBeHidden();
  const pdf = await page.pdf({
    path: 'test-results/product-report.pdf',
    format: 'A4',
    printBackground: true,
  });
  expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)?.length).toBe(1);
  await page.emulateMedia({ media: 'screen' });
  for (let i = 0; i < 3; i++) {
    const calculated = page.waitForResponse(
      (r) => r.url().endsWith('/api/v1/simulations') && r.status() === 200,
    );
    await page.getByRole('button', { name: 'Zadrži i dodaj scenarij' }).click();
    await calculated;
    await expect(page.locator('.simulator-result-grid')).toBeVisible();
  }
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('table')).toContainText('Scenarij 4');
  await expect(page.getByRole('columnheader')).toHaveCount(6);
  await page.pdf({
    path: 'test-results/product-report-four.pdf',
    format: 'A4',
    printBackground: true,
  });
  await page.emulateMedia({ media: 'screen' });
  await page.setViewportSize({ width: 320, height: 700 });
  expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
});

test('home: no automatic data requests, keyboard search, cards and responsive layout', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/v1/')) requests.push(r.url());
  });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Od podataka do pametnih odluka.', exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole('heading', { name: 'Od podataka do pametnih odluka.', exact: true }).focus();
  for (const module of ['Waste Explorer', 'Waste Compare', 'Waste Simulator']) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: `Otvori ${module}`, exact: true })).toBeFocused();
  }
  await page.keyboard.press('Tab');
  await expect(page.getByRole('searchbox', { name: 'Grad ili općina' })).toBeFocused();
  await page.keyboard.type('Bjelovar');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /^Otvori Bjelovar,/ })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^Otvori Bjelovar,/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/explorer\?/);
  await expect(page.getByLabel('Godina podataka')).toHaveValue('2024');
  for (const [name, path] of [
    ['Waste Explorer', 'explorer'],
    ['Waste Compare', 'compare'],
    ['Waste Simulator', 'simulator'],
  ]) {
    await page.goto('/');
    await page.getByRole('link', { name: `Otvori ${name}`, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${path}$`));
    await expect(page.getByRole('heading', { name: `${name}.`, exact: true })).toBeVisible();
  }
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  for (const [width, height] of [
    [1440, 1000],
    [820, 1180],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Kako funkcionira?', exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
    expect(
      (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({ path: `test-results/home-redesign-${width}.png`, fullPage: true });
  }
});
