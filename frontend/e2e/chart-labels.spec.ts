import { test, expect } from '@playwright/test';

test('chart axes, units and legends stay visible across modules and mobile layouts', async ({
  page,
}) => {
  const lookup = async (name: string) => {
    const body = await (await page.request.get(`/api/v1/municipalities?q=${name}`)).json();
    return body.items.find((item: { name: string }) => item.name === name).id;
  };
  const b = await lookup('Bjelovar');
  const d = await lookup('Daruvar');
  await page.goto(`/compare?jls=${b}&usporedi=${d}&godina=2024&metrika=separate_collection_pct`);
  const chart = page.locator('.compare-chart');
  await expect(chart.locator('.recharts-label').filter({ hasText: /^%$/ })).toHaveCount(1);
  await expect(chart.locator('.recharts-label').filter({ hasText: 'Grad / općina' })).toHaveCount(
    1,
  );
  await expect(chart.getByLabel('Legenda zajednica')).toContainText('Bjelovar');
  await expect(chart.getByLabel('Legenda zajednica')).toContainText('Daruvar');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await chart.screenshot({ path: `test-results/chart-compare-${width}.png` });
    expect(await page.evaluate(() => document.body.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Kroz godine', exact: true }).click();
  await expect(chart.locator('.recharts-label').nth(0)).toHaveText('Godina');
  await expect(chart.locator('.recharts-label').nth(1)).toHaveText('%');
  await expect(chart.locator('.recharts-legend-wrapper')).toContainText('Daruvar');
  await chart.screenshot({ path: 'test-results/chart-compare-history-mobile.png' });
  await page.goto(`/explorer?jls=${b}&godina=2024`);
  const explorer = page.locator('.trend-panel');
  await expect(explorer.locator('.recharts-label').nth(0)).toHaveText('Godina');
  await expect(explorer.locator('.recharts-label').nth(1)).toHaveText('t');
  await expect(explorer.locator('.recharts-legend-wrapper')).toContainText('Miješani otpad');
  await explorer.screenshot({ path: 'test-results/chart-explorer-mobile.png' });
  await page.goto(`/simulator?jls=${b}&godina=2024`);
  const simulator = page.locator('.simulator-chart');
  await expect(simulator.locator('.recharts-label').filter({ hasText: /^tone$/ })).toHaveCount(1);
  await expect(
    simulator.locator('.recharts-label').filter({ hasText: 'Početno stanje / scenarij' }),
  ).toHaveCount(1);
  await expect(simulator.locator('.recharts-legend-wrapper')).toContainText('Odvojeno sakupljeno');
  await page.getByLabel('Jedinica grafa').selectOption('kg');
  await expect(
    simulator.locator('.recharts-label').filter({ hasText: 'kg/obuhv. stan.' }),
  ).toHaveCount(1);
  await simulator.screenshot({ path: 'test-results/chart-simulator-mobile.png' });
});
