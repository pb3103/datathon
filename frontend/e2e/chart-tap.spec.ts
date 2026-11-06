import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test('all chart tooltips dismiss on another tap and reopen without refresh', async ({
  page,
  request,
}) => {
  const ids = [];
  for (const name of ['Zagreb', 'Split']) {
    const body = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
    ids.push(body.items.find((item: { name: string }) => item.name === name).id);
  }
  const [zagreb, split] = ids;
  for (const [url, selector] of [
    [`/explorer?jls=${zagreb}&godina=2023`, '.trend-panel'],
    [`/compare?jls=${zagreb}&usporedi=${split}&godina=2023`, '.compare-chart'],
    [`/simulator?jls=${split}&godina=2023`, '.simulator-comparison'],
  ]) {
    await page.goto(url);
    const panel = page.locator(selector);
    const mark = panel.locator('.recharts-bar-rectangle path').first();
    const tooltip = panel.locator('.recharts-tooltip-wrapper');
    await mark.tap();
    await expect(tooltip).toBeVisible();
    await panel.locator('h2').tap();
    await expect(tooltip).not.toBeVisible();
    await mark.tap();
    await expect(tooltip).toBeVisible();
    const svg = panel.locator('.recharts-surface').first();
    await svg.tap({ position: { x: 3, y: 3 } });
    await expect(tooltip).not.toBeVisible();
    await mark.tap();
    await expect(tooltip).toBeVisible();
    await page.getByRole('button', { name: 'Otvori izbornik' }).tap();
    await expect(tooltip).not.toBeVisible();
  }
});
