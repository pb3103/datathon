import { test, expect } from '@playwright/test';

test('production serves all modules on one origin with complete data and CSP', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await expect
    .poll(
      async () => {
        try {
          return (await request.get('/api/v1/health/ready')).status();
        } catch {
          return 0;
        }
      },
      { timeout: 60000 },
    )
    .toBe(200);
  const health = await request.get('/api/v1/health/ready');
  expect(health.ok()).toBeTruthy();
  const readiness = await health.json();
  expect(readiness.data.status).toBe('loaded');
  expect(readiness.data.historical_status).toBe('loaded');
  expect(Object.values(readiness.data.active_rows_by_year)).toEqual(Array(8).fill(556));
  const response = await request.get('/');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
  for (const path of ['/docs', '/openapi.json', '/.env', '/api/v1/missing']) {
    expect((await request.get(path)).status()).toBe(404);
  }
  const find = async (name: string) => {
    const body = await (await request.get(`/api/v1/municipalities?q=${name}`)).json();
    return body.items.find((item: { name: string }) => item.name === name).id;
  };
  const zagreb = await find('Zagreb');
  const split = await find('Split');
  const errors: string[] = [];
  const violations: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.exposeFunction('cspViolation', (value: string) => violations.push(value));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as unknown as { cspViolation: (value: string) => void }).cspViolation(
        `${event.violatedDirective}: ${event.blockedURI}`,
      );
    });
  });
  await page.goto('/');
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.goto('/guide');
  await expect(page.getByRole('heading', { name: 'Male navike. Velike promjene.' })).toBeVisible();
  await page.goto(`/explorer?jls=${zagreb}&godina=2023`);
  await expect(page.locator('.metric-card')).toHaveCount(4);
  await page.locator('#selected-year').selectOption('2017');
  await expect(page.locator('.metric-grid')).toHaveAttribute(
    'aria-label',
    'Pokazatelji za 2017. godinu',
  );
  await page.goto(`/compare?jls=${zagreb}&usporedi=${split}&godina=2023`);
  await expect(page.locator('.core-card')).toHaveCount(2);
  await page.goto(`/simulator?jls=${split}&godina=2023`);
  await expect(page.locator('.simulator-result-grid')).toBeVisible();
  await page.getByLabel('Način unosa', { exact: true }).selectOption('tonnes');
  await page.getByLabel('Vrijednost scenarija', { exact: true }).fill('10');
  await expect(page.locator('.result-explanation')).toContainText('10,00 t');
  await page.screenshot({ path: '/app/test-results/render-production.png', fullPage: false });
  expect(errors).toEqual([]);
  expect(violations).toEqual([]);
});
