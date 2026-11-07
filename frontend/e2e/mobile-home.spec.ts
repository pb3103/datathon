import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('mobile home has compact cards and an accessible hamburger menu', async ({ page }) => {
  for (const width of [320, 390, 600, 760]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const button = page.getByRole('button', { name: 'Otvori izbornik' });
    const navigation = page.getByRole('navigation', { name: 'Moduli' });
    await expect(button).toBeVisible();
    const toggleBox = (await button.boundingBox())!;
    const brandBox = (await page.locator('.brand').boundingBox())!;
    expect(toggleBox.x + toggleBox.width).toBeLessThanOrEqual(brandBox.x);
    const mapShortcut = page.getByRole('link', { name: 'Pronađi lokacije na karti' });
    await expect(mapShortcut).toBeVisible();
    const shortcutBox = (await mapShortcut.boundingBox())!;
    expect(shortcutBox.y + shortcutBox.height).toBeLessThan(844);
    await expect(navigation).toBeHidden();
    expect((await page.locator('.sidebar').boundingBox())!.height).toBeLessThan(90);
    const cards = page.locator('.home-step-card');
    await expect(cards).toHaveCount(4);
    for (const card of await cards.all()) {
      expect((await card.boundingBox())!.height).toBeLessThan(165);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await button.click();
    await expect(page.getByRole('button', { name: 'Zatvori izbornik' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(navigation).toBeVisible();
    expect((await navigation.boundingBox())!.x).toBeLessThan(24);
    await expect(navigation.getByRole('link')).toHaveCount(5);
    await page.keyboard.press('Escape');
    await expect(navigation).toBeHidden();
    await expect(button).toBeFocused();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'test-results/mobile-home-header.png' });
  await page.locator('.home-workflow').screenshot({ path: 'test-results/mobile-home-cards.png' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Otvori izbornik' }).click();
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  // Tap outside the dropdown without selecting an underlying card.
  await page.mouse.click(384, 600);
  await expect(page.getByRole('navigation', { name: 'Moduli' })).toBeHidden();
  await page.getByRole('button', { name: 'Otvori izbornik' }).click();
  await page
    .getByRole('navigation', { name: 'Moduli' })
    .getByRole('link', { name: 'Waste Explorer', exact: true })
    .click();
  await expect(page).toHaveURL(/\/explorer$/);
});

test('desktop retains the visible sidebar and four aligned feature cards', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Otvori izbornik' })).toBeHidden();
  await expect(page.getByRole('navigation', { name: 'Moduli' })).toBeVisible();
  const tops = await page
    .locator('.home-step-card')
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(2);
});

test('mobile home map shortcut scrolls to the existing map and moves keyboard focus', async ({
  page,
}) => {
  for (const width of [320, 390, 760]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    const link = page.getByRole('link', { name: 'Pronađi lokacije na karti' });
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#waste-map$/);
    await expect(page.locator('#map-search-title')).toBeFocused();
    await expect
      .poll(async () =>
        page.locator('#waste-map').evaluate((el) => Math.abs(el.getBoundingClientRect().top - 90)),
      )
      .toBeLessThan(3);
    await expect(page.locator('.recycling-map')).toBeVisible();
    await page.screenshot({ path: `test-results/mobile-map-shortcut-${width}.png` });
  }
});
