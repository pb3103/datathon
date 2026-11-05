import { test, expect } from '@playwright/test';

test('comparison year keeps the viewport while results load and hides redundant availability', async ({
  page,
  request,
}) => {
  const find = async (name: string) => {
    const response = await request.get(`/api/v1/municipalities?q=${name}`);
    const body = await response.json();
    return body.items.find((item: { name: string }) => item.name === name).id;
  };
  const zagreb = await find('Zagreb');
  const split = await find('Split');
  await page.goto(`/compare?jls=${zagreb}&usporedi=${split}&godina=2023`);
  await expect(page.locator('.core-card')).toHaveCount(2);
  await page.locator('#compare-year').scrollIntoViewIfNeeded();
  await page.evaluate(() =>
    window.scrollTo(
      0,
      document.querySelector('#compare-year')!.getBoundingClientRect().top + window.scrollY - 30,
    ),
  );
  const before = await page.evaluate(() => window.scrollY);
  await page.route('**/api/v1/comparisons?**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.locator('#compare-year').selectOption('2020');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
  await expect(page.locator('.core-card')).toHaveCount(2);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
  await expect(page.getByRole('button', { name: 'Prikaži pokazatelj' })).toHaveCount(0);
  await expect(page.locator('.insight-card').getByText(/Dostupno 2 od 2/)).toHaveCount(0);
});

test('explorer year and view changes preserve the viewport', async ({ page, request }) => {
  const body = await (await request.get('/api/v1/municipalities?q=Zagreb')).json();
  const id = body.items.find((item: { name: string }) => item.name === 'Zagreb').id;
  await page.goto(`/explorer?jls=${id}&godina=2023`);
  await expect(page.locator('.metric-card')).toHaveCount(4);
  await page.locator('.trend-panel').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await page.locator('.year-link').count();
  await page.locator('.trend-panel').getByRole('button', { name: 'Tablica', exact: true }).click();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
  await page.getByRole('button', { name: 'Odaberi 2020. godinu', exact: true }).click();
  await page.waitForTimeout(100);
  // Clicking a year in the table updates the cards without moving to their heading.
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test('incomplete insight keeps a meaningful availability note', async ({ page, request }) => {
  const ids = [];
  for (const name of ['Posedarje', 'Zadar', 'Dvor', 'Bizovac']) {
    const body = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
    ids.push(body.items.find((item: { name: string }) => item.name === name).id);
  }
  await page.goto(`/compare?jls=${ids[0]}&usporedi=${ids.slice(1).join(',')}&godina=2021`);
  await expect(
    page
      .locator('.insight-card')
      .getByText('Podaci za usporedbu dostupni su za 3 od 4 odabranih područja.'),
  ).toBeVisible();
});

test('simulator scenario editing keeps the viewport without a year selector', async ({
  page,
  request,
}) => {
  const body = await (await request.get('/api/v1/municipalities?q=Bjelovar')).json();
  const id = body.items.find((item: { name: string }) => item.name === 'Bjelovar').id;
  await page.goto(`/simulator?jls=${id}&godina=2024`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.getByLabel('Vrijednost scenarija').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  await page.route('**/simulations', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.continue();
  });
  await expect(page.getByRole('combobox', { name: 'Godina scenarija' })).toHaveCount(0);
  await page.getByLabel('Vrijednost scenarija').fill('20');
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(before, 0);
});

test('location cards align shared fields and show plain-language population context', async ({
  page,
  request,
}) => {
  const ids = [];
  for (const name of ['Zagreb', 'Split']) {
    const body = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
    ids.push(body.items.find((item: { name: string }) => item.name === name).id);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`/compare?jls=${ids[0]}&usporedi=${ids[1]}&godina=2023`);
  const cards = page.locator('.comparison-reference');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(1)).toContainText('To je oko 79 % manje u odnosu na Zagreb.');
  await expect(cards.getByRole('link', { name: 'Simuliraj ovaj cilj', exact: true })).toHaveCount(
    0,
  );
  for (const selector of ['.reference-rate', '.profile-link', '.quality-details']) {
    const first = await cards.nth(0).locator(selector).boundingBox();
    const second = await cards.nth(1).locator(selector).boundingBox();
    expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
  }
  const details = await cards.nth(1).locator('.quality-details').boundingBox();
  const warning = await cards.nth(1).locator('.reference-warnings').boundingBox();
  expect(warning!.y).toBeGreaterThan(details!.y + details!.height);
});

test('simulator comparison link scrolls to results without reloading the scenario', async ({
  page,
  request,
}) => {
  const body = await (await request.get('/api/v1/municipalities?q=Bjelovar')).json();
  const id = body.items.find((item: { name: string }) => item.name === 'Bjelovar').id;
  await page.goto(`/simulator?jls=${id}&godina=2024`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.getByLabel('Vrijednost scenarija').fill('20');
  await expect(page.locator('.simulator-change')).toContainText('20,00 %');
  let contextRequests = 0;
  page.on('request', (r) => {
    if (r.url().includes('/simulation-context?')) contextRequests++;
  });
  await page.getByRole('link', { name: 'Usporedi na grafikonu i u tablici ↓' }).click();
  await expect(page).toHaveURL(/#scenario-comparison$/);
  await expect(
    page.getByRole('heading', { name: 'Početno stanje i scenariji', exact: true }),
  ).toBeFocused();
  await expect
    .poll(() =>
      page
        .locator('#scenario-comparison')
        .evaluate((el) => Math.abs(el.getBoundingClientRect().top - 20)),
    )
    .toBeLessThan(5);
  await expect(page.getByLabel('Vrijednost scenarija')).toHaveValue('20');
  await page.goBack();
  await expect(page).not.toHaveURL(/#scenario-comparison$/);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  expect(contextRequests).toBe(0);
});
