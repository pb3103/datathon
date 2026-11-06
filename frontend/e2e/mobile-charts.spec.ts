import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function places(request: import('@playwright/test').APIRequestContext) {
  const ids: string[] = [];
  for (const name of ['Zagreb', 'Split']) {
    const body = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
    ids.push(body.items.find((item: { name: string }) => item.name === name).id);
  }
  return ids;
}

async function noOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() =>
    [...document.querySelectorAll('main *')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.right > innerWidth + 1 && !el.closest('.simulator-chart, .simulator-table, .sr-only')
        );
      })
      .map((el) => ({
        tag: el.tagName,
        className: el.className,
        right: el.getBoundingClientRect().right,
      })),
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    JSON.stringify(overflow.slice(0, 12)),
  ).toBe(true);
}

async function legendFits(panel: import('@playwright/test').Locator) {
  const legend = panel.locator('.chart-legend-outside');
  await expect(legend).toBeVisible();
  const outer = await panel.boundingBox();
  const inner = await legend.boundingBox();
  expect(inner!.y + inner!.height).toBeLessThanOrEqual(outer!.y + outer!.height);
  expect(inner!.x + inner!.width).toBeLessThanOrEqual(outer!.x + outer!.width);
  await expect(panel.locator('.chart-axis-key')).toHaveCount(0);
  await expect(panel.locator('.recharts-label')).toHaveCount(2);
  await expect(panel.locator('.recharts-label').first()).toBeVisible();
  await expect(panel.locator('.recharts-label').last()).toBeVisible();
}

test('mobile search and map fit together in one viewport', async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const discovery = page.locator('.home-discovery');
    await discovery.scrollIntoViewIfNeeded();
    const panel = await discovery.boundingBox();
    expect(panel!.height).toBeLessThan(720);
    await expect(discovery.getByRole('combobox', { name: 'Grad ili općina' })).toBeVisible();
    const map = await page.locator('.recycling-map').boundingBox();
    expect(map!.height).toBeGreaterThanOrEqual(210);
    expect(map!.height).toBeLessThanOrEqual(265);
    await noOverflow(page);
    await discovery.screenshot({ path: `test-results/mobile-map-${width}.png` });
  }
});

test('mobile Explorer and Compare show complete legends and axis units', async ({
  page,
  request,
}) => {
  const [zagreb, split] = await places(request);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`/explorer?jls=${zagreb}&godina=2023`);
    const trends = page.locator('.trend-panel');
    let plotTop: number | undefined;
    for (const metric of ['mass', 'per_person', 'rate']) {
      await page.locator('#trend-metric').selectOption(metric);
      await legendFits(trends);
      const top = await trends
        .locator('.recharts-wrapper')
        .evaluate((el) => el.getBoundingClientRect().top + scrollY);
      if (plotTop !== undefined) expect(Math.abs(top - plotTop)).toBeLessThan(2);
      plotTop = top;
      await noOverflow(page);
    }
    await page.locator('#trend-metric').selectOption('mass');
    await trends.screenshot({ path: `test-results/mobile-explorer-${width}.png` });
    await page.goto(`/compare?jls=${zagreb}&usporedi=${split}&godina=2023`);
    const compare = page.locator('.compare-chart');
    await legendFits(compare);
    await expect(page.getByText('Korišteni skup podataka ↗')).toHaveCount(2);
    await compare.locator('.recharts-bar-rectangle path').first().hover();
    const tooltip = compare.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toBeVisible();
    const tip = await tooltip.boundingBox();
    expect(tip!.width).toBeLessThanOrEqual(230);
    expect(tip!.x).toBeGreaterThanOrEqual(0);
    expect(tip!.x + tip!.width).toBeLessThanOrEqual(width);
    await noOverflow(page);
    await compare.screenshot({ path: `test-results/mobile-compare-${width}.png` });
    await compare.getByRole('button', { name: 'Kroz godine' }).click();
    await legendFits(compare);
    await noOverflow(page);
  }
});

test('mobile Simulator keeps contrasting stream legend visible with multiple scenarios', async ({
  page,
  request,
}) => {
  const [, split] = await places(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/simulator?jls=${split}&godina=2023`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  const comparison = page.locator('.simulator-comparison');
  await legendFits(comparison);
  await comparison.screenshot({ path: 'test-results/mobile-simulator.png' });
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Zadrži i dodaj scenarij' }).click();
    await expect(page.locator('.simulator-rates article')).toHaveCount(i + 2);
  }
  await legendFits(comparison);
  await noOverflow(page);
  await page.setViewportSize({ width: 320, height: 844 });
  await legendFits(comparison);
  await noOverflow(page);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
});

test('five-location comparisons retain legends and readable history on mobile', async ({
  page,
  request,
}) => {
  const ids = [];
  for (const name of ['Zagreb', 'Split', 'Rijeka', 'Osijek', 'Slavonski Brod']) {
    const body = await (
      await request.get(`/api/v1/municipalities?q=${encodeURIComponent(name)}`)
    ).json();
    ids.push(body.items.find((item: { name: string }) => item.name === name).id);
  }
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto(
    `/compare?jls=${ids[0]}&usporedi=${ids.slice(1).join(',')}&godina=2023&metrika=separate_collection_pct`,
  );
  const panel = page.locator('.compare-chart');
  await legendFits(panel);
  await expect(panel.locator('.chart-legend-outside li')).toHaveCount(5);
  await panel.getByRole('button', { name: 'Kroz godine' }).click();
  await legendFits(panel);
  await noOverflow(page);
  const scroller = panel.locator('.compare-plot');
  expect(await scroller.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(
    true,
  );
  await panel.screenshot({ path: 'test-results/mobile-five-location-history.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await legendFits(panel);
  await noOverflow(page);
});
