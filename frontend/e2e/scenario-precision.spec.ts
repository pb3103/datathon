import { test, expect } from '@playwright/test';

test('all scenario models and input modes use two decimal places', async ({ page, request }) => {
  const body = await (await request.get('/api/v1/municipalities?q=Bjelovar')).json();
  const id = body.items.find((item: { name: string }) => item.name === 'Bjelovar').id;
  await page.goto(`/simulator?jls=${id}&godina=2024`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  for (const model of ['Preusmjeravanje', 'Prevencija']) {
    await page.getByRole('radio', { name: new RegExp(model) }).check();
    for (const kind of ['fraction', 'tonnes', 'target']) {
      await page.getByLabel('Način unosa', { exact: true }).selectOption(kind);
      const input = page.getByLabel('Vrijednost scenarija', { exact: true });
      await expect(input).toHaveAttribute('step', '0.01');
      await input.fill('56.789');
      await expect(input).toHaveValue('56.79');
      if (kind === 'fraction') {
        const slider = page.getByLabel('Smanjenje miješanog klizačem');
        await slider.fill('56');
        await expect(input).toHaveValue('56');
        await slider.fill('56.78');
        await expect(input).toHaveValue('56.78');
      }
    }
  }
});
