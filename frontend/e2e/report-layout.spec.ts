import { test, expect } from '@playwright/test';

test('print report uses baseline cards, shared formulas and a concise source credit', async ({ page, request }) => {
  const body = await (await request.get('/api/v1/municipalities?q=Split')).json();
  const id = body.items.find((item: { name: string }) => item.name === 'Split').id;
  await page.goto(`/simulator?jls=${id}&godina=2023`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  const report = page.locator('.print-report');
  await expect(report).toBeVisible();
  await expect(report.locator('.print-baseline-grid > div')).toHaveCount(4);
  await expect(report.locator('.formula-card')).toHaveCount(4);
  await expect(report.getByRole('heading', { name: 'Što znače oznake?' })).toBeVisible();
  await expect(report).not.toContainText('SHA-256');
  await expect(report).not.toContainText('redak');
  await expect(report.locator('.print-source-credit a')).toHaveAttribute('href', /isgo-portal.haop.hr/);
  await page.setViewportSize({ width: 794, height: 1123 });
  await report.screenshot({ path: '/app/test-results/report-layout.png' });
});
