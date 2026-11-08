import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import mapData from '../src/data/recycling-map.json' with { type: 'json' };

test('review: all city searches accept accents, case and Đ transliterations without invalid selection', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of ['/', '/explorer', '/compare', '/simulator']) {
    await page.goto(route);
    const input = page.getByRole('combobox', { name: 'Grad ili općina', exact: true });
    for (const [query, name] of [
      ['Cakovec', 'Čakovec'],
      ['SIBENIK', 'Šibenik'],
      ['Porec', 'Poreč - Parenzo'],
      ['Djakovo', 'Đakovo'],
      ['Dakovo', 'Đakovo'],
      ['ZAGREB', 'Zagreb'],
      ['Sib', 'Šibenik'],
    ]) {
      await input.fill(query);
      await expect(
        page
          .getByRole('option')
          .filter({ has: page.locator('strong', { hasText: name }) })
          .first(),
      ).toBeVisible();
    }
    await input.fill('NepostojeceMjesto');
    await expect(page.locator('[role="option"]')).toHaveCount(0);
    await input.press('Enter');
    await expect(page).toHaveURL(new RegExp(route === '/' ? '/$' : route + '$'));
    await input.fill('');
    await expect(page.locator('[role="option"]')).toHaveCount(0);
    await input.fill('Djakovo');
    await expect(page.locator('[role="option"]').filter({ hasText: 'Đakovo' })).toBeVisible();
    await input.press('Enter');
    await expect(input).toHaveValue('Đakovo');
    if (route === '/')
      await expect(page.locator('.recycling-area-heading')).toContainText('Đakovo');
    else await expect(page).toHaveURL(/jls=/);
  }
  expect(errors).toEqual([]);
});

test('review: map retains Hvar name/address without hours and offers navigation', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('combobox', { name: 'Grad ili općina', exact: true });
  await input.fill('Hvar');
  await input.press('Enter');
  await page.locator('.recycling-map .leaflet-marker-icon').first().click();
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup).toContainText('Reciklažno dvorište Grada Hvara');
  await expect(popup).toContainText('Hvar');
  await expect(popup).not.toContainText('Radno vrijeme:');
  await expect(popup.getByRole('link', { name: 'Upute za dolazak ↗' })).toHaveAttribute(
    'href',
    /destination=/,
  );
});

for (const width of [1440, 768, 390, 320]) {
  test(`review: Compare year, table and modules remain usable at ${width}px`, async ({
    page,
    request,
  }) => {
    const ids = [];
    for (const name of ['Zagreb', 'Split']) {
      const data = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
      ids.push(data.items.find((m: { name: string }) => m.name === name).id);
    }
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/compare?jls=${ids[0]}&usporedi=${ids[1]}`);
    await expect(page.locator('.insight-card').first()).toBeVisible();
    const year = page.getByLabel('Godina usporedbe');
    expect((await year.boundingBox())!.width).toBeGreaterThanOrEqual(92);
    await year.selectOption('2019');
    await page.getByLabel('Pokazatelj usporedbe').selectOption('material_paper');
    await page.getByRole('button', { name: 'Tablica', exact: true }).click();
    const region = page.getByRole('region', { name: 'Usporedni podaci, vodoravno pomicanje' });
    await expect(region).toContainText('Nema podatka');
    if (width < 600) {
      await expect(region).toContainText('Pomaknite tablicu');
      await region.focus();
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => region.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/review-compare-${width}.png`, fullPage: true });
    expect(errors).toEqual([]);
  });
}

test('review: real Zagreb/Split references, historical shares and both simulation models remain unchanged', async ({
  page,
  request,
}) => {
  const ids: string[] = [];
  for (const [name, total, mixed, population, kg, rate] of [
    ['Zagreb', 252771.59, 139674.4, 772122, 327.37, 44.74],
    ['Split', 68991.4, 51808.25, 158943, 434.06, 24.91],
  ] as const) {
    const search = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
    const id = search.items.find((m: { name: string }) => m.name === name).id;
    ids.push(id);
    const profile = await (
      await request.get(`/api/v1/municipalities/${id}/observations?from_year=2024`)
    ).json();
    const m = profile.observations[0].metrics;
    expect(Number(m.total_t.value)).toBe(total);
    expect(Number(m.mixed_t.value)).toBe(mixed);
    expect(Number(m.covered_population.value)).toBe(population);
    expect(Number(m.total_kg_per_covered_person.value)).toBeCloseTo(kg, 2);
    expect(Number(m.separate_collection_pct.value)).toBe(rate);
    if (name === 'Zagreb')
      expect(Number(m.mixed_kg_per_covered_person.value)).toBeCloseTo(180.9, 2);
  }
  const query = `ids=${ids[0]}&ids=${ids[1]}`;
  const historical = await (await request.get(`/api/v1/comparisons?${query}&year=2019`)).json();
  const zagreb = historical.members.find(
    (m: { municipality: { name: string } }) => m.municipality.name === 'Zagreb',
  );
  const split = historical.members.find(
    (m: { municipality: { name: string } }) => m.municipality.name === 'Split',
  );
  expect(Number(zagreb.metrics.calculated_nonmixed_share_pct.value)).toBeCloseTo(22.26, 2);
  expect(Number(split.metrics.calculated_nonmixed_share_pct.value)).toBeCloseTo(15.28, 2);
  expect(Number(split.differences.calculated_nonmixed_share_pct.value)).toBeCloseTo(-6.98, 2);
  const comparison = await (await request.get(`/api/v1/comparisons?${query}&year=2024`)).json();
  expect(comparison.insights).toHaveLength(3);
  expect(comparison.insights.every((i: { unit: string }) => i.unit !== 't')).toBe(true);
  const ctx = await (
    await request.get(`/api/v1/municipalities/${ids[0]}/simulation-context?year=2024`)
  ).json();
  const response = await request.post('/api/v1/simulations', {
    data: {
      municipality_id: ids[0],
      year: 2024,
      observation_id: ctx.observation.id,
      sha256: ctx.observation.source.sha256,
      scenarios: ['diversion', 'prevention'].map((model) => ({
        name: model,
        model,
        kind: 'fraction',
        value: '0.1',
      })),
    },
  });
  expect(response.ok()).toBe(true);
  const result = await response.json();
  const [diversion, prevention] = result.scenarios;
  expect(Number(diversion.change_t)).toBe(13967.44);
  expect(Number(diversion.result.total_t)).toBe(252771.59);
  expect(Number(diversion.result.mixed_t)).toBe(125706.96);
  expect(Number(diversion.result.rate_pct)).toBeCloseTo(50.27, 2);
  expect(Number(prevention.result.total_t)).toBe(238804.15);
  expect(Number(prevention.result.mixed_t)).toBe(125706.96);
  expect(Number(prevention.result.rate_pct)).toBeCloseTo(47.36, 2);
  await page.goto(`/explorer?jls=${ids[0]}&godina=2024`);
  await expect(page.locator('.metric-grid')).toContainText('252.771,59');
  await expect(page.locator('.metric-grid')).toContainText('327,37');
});

test('review: Simulator rounds display only and exposes the selected chart/table state', async ({
  page,
  request,
}) => {
  const body = await (await request.get('/api/v1/municipalities?q=Zagreb')).json();
  const id = body.items.find((m: { name: string }) => m.name === 'Zagreb').id;
  await page.goto(`/simulator?jls=${id}&godina=2024`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  const calculated = page
    .locator('.simulator-baseline article')
    .filter({ hasText: 'Izračunati postotak' });
  await expect(calculated.locator('strong')).toHaveText('44,74 %');
  const chart = page.getByRole('button', { name: 'Graf', exact: true });
  const table = page.getByRole('button', { name: 'Tablica', exact: true });
  await expect(chart).toHaveAttribute('aria-pressed', 'true');
  const active = await chart.evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(await table.evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(active);
  await table.click();
  await expect(table).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => table.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe(active);
  await expect(page.getByRole('columnheader', { name: 'Početno', exact: true })).toBeVisible();
});

test('review: map exposes available website and preserves distinct location types', async ({
  page,
}) => {
  const yard = mapData.locations.find(
    (y) => y.website && mapData.locations.filter((other) => other.name === y.name).length === 1,
  )!;
  await page.goto('/');
  const input = page.getByRole('combobox', { name: 'Grad ili općina', exact: true });
  await input.fill(yard.municipality);
  await page
    .locator('[role="option"]')
    .filter({ has: page.locator('strong', { hasText: yard.municipality }) })
    .first()
    .click();
  const list = page.locator('.recycling-list');
  await list.locator('summary').click();
  await list.getByRole('button', { name: yard.name, exact: true }).click();
  const popup = page.locator('.leaflet-popup-content');
  await expect(popup.getByRole('link', { name: 'Web-stranica lokacije ↗' })).toHaveAttribute(
    'href',
    new URL(yard.website).href,
  );
  const kind = page.getByLabel('Prikaži', { exact: true });
  await expect(kind.locator('option')).toHaveCount(5);
});

for (const width of [1440, 768, 390, 320]) {
  test(`review: full product accessibility and API/overflow checks at ${width}px`, async ({
    page,
    request,
  }) => {
    const ids = [];
    for (const name of ['Zagreb', 'Split']) {
      const body = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
      ids.push(body.items.find((m: { name: string }) => m.name === name).id);
    }
    const errors: string[] = [];
    const failures: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (r.url().includes('/api/v1/') && r.status() >= 400)
        failures.push(`${r.status()} ${r.url()}`);
    });
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    for (const [route, ready] of [
      ['/', '.recycling-map .leaflet-marker-icon'],
      [`/explorer?jls=${ids[0]}&godina=2024`, '.metric-grid'],
      [`/compare?jls=${ids[0]}&usporedi=${ids[1]}&godina=2024`, '.insight-card'],
      [`/simulator?jls=${ids[0]}&godina=2024`, '.simulator-result-grid'],
      ['/guide', '.guide-quiz'],
    ]) {
      await page.goto(route);
      await expect(page.locator(ready).first()).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route,
      ).toBe(true);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();
      expect(
        results.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        route,
      ).toEqual([]);
      await page.screenshot({
        path: `test-results/review-${route.split('?')[0].replaceAll('/', '') || 'home'}-${width}-top.png`,
      });
    }
    expect(errors).toEqual([]);
    expect(failures).toEqual([]);
  });
}
