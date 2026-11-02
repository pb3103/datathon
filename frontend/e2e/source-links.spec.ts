import { test, expect } from '@playwright/test';

test('Explorer, Compare and Simulator show verified source document links', async ({
  page,
  request,
}) => {
  const ids = [];
  for (const name of ['Zagreb', 'Split']) {
    const body = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
    ids.push(body.items.find((item: { name: string }) => item.name === name).id);
  }
  for (const route of [
    `/explorer?jls=${ids[0]}&godina=2023`,
    `/compare?jls=${ids[0]}&usporedi=${ids[1]}&godina=2023`,
    `/simulator?jls=${ids[0]}&godina=2023`,
  ]) {
    await page.goto(route);
    const sources = page.locator('#sources');
    await expect(sources).toBeAttached();
    await expect(sources.locator('details')).toHaveCount(0);
    for (let year = 2017; year <= 2024; year++) {
      const entry = sources.locator(`#source-${year}`);
      const links = entry.locator('a');
      await expect(links).toHaveCount(year < 2021 ? 1 : 2);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute(
          'href',
          /^https:\/\/isgo-portal\.haop\.hr\/sites\/default\/files\/izvjesca\/.*\.(pdf|xlsx)$/,
        );
      }
    }
  }
});
