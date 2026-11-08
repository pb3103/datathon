import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openSection(page: import('@playwright/test').Page, id: string) {
  await page.locator(`#guide-tab-${id}`).click();
  await expect(page.locator(`#${id}`)).toBeVisible();
}

test('Guide: pretraga, sinonimi, izvori, oporavak i karta', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Moduli' })
    .getByRole('link', { name: 'Waste Guide', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Male navike. Velike promjene.' })).toBeVisible();
  const search = page.getByLabel('Predmet ili materijal');
  await search.fill('RACUNALO');
  await page.getByRole('button', { name: /Laptop/ }).click();
  await expect(page.locator('#item-title')).toHaveText('Laptop');
  await expect(page.locator('.guide-item a[target="_blank"]')).toHaveAttribute('href', /gov.hr/);
  await page.reload();
  await expect(page.locator('#item-title')).toHaveText('Laptop');
  await page.getByRole('button', { name: 'Očisti', exact: true }).click();
  await expect(search).toBeFocused();
  await search.fill('xxyyzz');
  await expect(page.getByText('Nema rezultata', { exact: false })).toBeVisible();
  await search.fill('baterija');
  await page.getByRole('button', { name: /Prijenosna baterija/ }).click();
  await expect(page.getByText(/ne potvrđuje da pojedina lokacija/)).toBeVisible();
  await page.getByRole('link', { name: /Pronađi mjesto za odlaganje/ }).click();
  await expect(page).toHaveURL(/\/#waste-map$/);
  await expect(page.locator('#waste-map')).toBeInViewport();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.goto('/guide?predmet=nepostoji');
  await expect(page.locator('#item-title')).toHaveText('Pronađite pravo mjesto za svoj otpad');
});

test('Guide: hijerarhija, tematske poveznice i lokalne upute', async ({ page }) => {
  await page.goto('/guide');
  await openSection(page, 'prevencija');
  await page.getByRole('button', { name: /03Recikliranje|03 Recikliranje/ }).click();
  await expect(page.locator('#hierarchy-detail h3')).toHaveText('Recikliranje');
  await page
    .locator('.guide-topic-grid article')
    .filter({ hasText: 'Tekstil' })
    .getByRole('link', { name: 'Provjeri odlaganje →' })
    .click();
  await expect(page.locator('#item-title')).toHaveText('Majica');
  await page.getByLabel('Predmet ili materijal').fill('staklenka');
  await page.getByRole('button', { name: /Staklenka/ }).click();
  await expect(page.locator('.guide-item')).toContainText(
    'Način predaje i boju spremnika provjerite',
  );
  await expect(page.locator('.guide-item')).not.toContainText('Lokalna uputa: Zagreb');
});

test('Guide: kviz zaključava odgovor, računa rezultat i resetira se', async ({ page }) => {
  await page.goto('/guide#kviz');
  const quiz = page.locator('.guide-quiz');
  await expect(quiz.getByRole('status')).toHaveCount(0);
  for (const [index, answer] of [0, 0, 2, 1, 0, 2].entries()) {
    await quiz.getByRole('radio').nth(answer).check();
    await expect(quiz.getByRole('radio').first()).toBeDisabled();
    await expect(quiz.locator('.guide-answer.is-correct')).toHaveCount(1);
    await expect(quiz.locator('.guide-answer.is-incorrect')).toHaveCount(2);
    await expect(quiz.getByRole('status')).not.toContainText('Točno.');
    await quiz
      .getByRole('button', { name: index === 5 ? 'Prikaži rezultat' : 'Sljedeće pitanje' })
      .click();
  }
  await expect(quiz.getByRole('heading')).toHaveText('5 od 6 točnih odgovora');
  await quiz.getByRole('button', { name: 'Pokušaj ponovno' }).click();
  await expect(quiz).toContainText('Pitanje 1 od 6');
  await expect(quiz.getByRole('status')).toHaveCount(0);
});

for (const [width, height] of [
  [1440, 1000],
  [768, 1180],
  [390, 844],
  [320, 844],
]) {
  test(`Guide: prikaz i pristupačnost ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/guide?predmet=stedna-zarulja');
    await expect(page.locator('#item-title')).toHaveText('Štedna žarulja');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBeTruthy();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({ path: `/app/test-results/guide-top-${width}.png` });
    await page.screenshot({ path: `/app/test-results/guide-${width}.png`, fullPage: true });
    await openSection(page, 'kviz');
    await page.locator('.guide-quiz input').first().focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.guide-quiz input').first()).toBeChecked();
  });
}

test('Guide: tematske slike se učitavaju, naslov prati Home i sadržaj je očuvan', async ({
  page,
}) => {
  for (const width of [1440, 820, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    const homeOffset = await page
      .locator('.home-hero .home-eyebrow')
      .evaluate(
        (el) =>
          el.getBoundingClientRect().top -
          document.querySelector('.topbar')!.getBoundingClientRect().bottom,
      );
    const homeSize = await page
      .locator('#page-title')
      .evaluate((element) => getComputedStyle(element).fontSize);
    await page.goto('/guide');
    expect(
      await page.locator('#page-title').evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBe(parseFloat(homeSize));
    const guideOffset = await page
      .locator('.guide-hero .guide-eyebrow')
      .evaluate(
        (el) =>
          el.getBoundingClientRect().top -
          document.querySelector('.topbar')!.getBoundingClientRect().bottom,
      );
    expect(Math.abs(guideOffset - homeOffset)).toBeLessThanOrEqual(1);
    await expect(page.locator('.guide-hero .guide-eyebrow')).toHaveText('EKO VODIČ · ODRŽIVOST');
    await expect(page.locator('.guide-hero img')).toHaveCount(0);
    await openSection(page, 'prevencija');
    const photos = page.locator('.guide-topic-photo');
    await expect(photos).toHaveCount(4);
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await expect
        .poll(() => photo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true);
    }
    const allImages = page.locator('.guide-hero img, .guide-page img');
    await expect(allImages).toHaveCount(4);
    const imageUrls = await allImages.evaluateAll((images) =>
      images.map((image) => image.getAttribute('src')),
    );
    expect(new Set(imageUrls).size).toBe(imageUrls.length);
    for (const image of await allImages.all()) {
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
        .toBe(true);
    }
    await expect(page.locator('.guide-fact')).toHaveCount(6);
    await expect(page.locator('.guide-fact .guide-source')).toHaveCount(6);
    await openSection(page, 'cinjenice');
    await page
      .locator('#cinjenice')
      .evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `/app/test-results/guide-facts-${width}.png` });
    await openSection(page, 'prevencija');
    await page
      .locator('#prevencija')
      .evaluate((element) => element.scrollIntoView({ block: 'start' }));
    await page.screenshot({ path: `/app/test-results/guide-prevention-${width}.png` });
  }
});

test('Guide: povezane upute su zasebne od rezultata i odabir se ažurira', async ({ page }) => {
  await page.goto('/guide');
  const search = page.getByLabel('Predmet ili materijal');
  await search.fill('MOBILNI TELEFON');
  await page
    .locator('.guide-results')
    .getByRole('button', { name: /Mobitel/ })
    .click();
  await expect(page.locator('.guide-results li')).toHaveCount(1);
  await expect(page.locator('.guide-results button')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.guide-results')).toContainText('Odabrano');
  const related = page.getByRole('group', { name: 'Možda vas zanima i' });
  await expect(related.getByRole('button')).toHaveCount(3);
  await expect(related).toContainText('Punjač');
  await expect(related).toContainText('Prijenosna baterija');
  await related.getByRole('button', { name: /Punjač/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#item-title')).toHaveText('Punjač');
  await expect(search).toHaveValue('Punjač');
  await expect(page).toHaveURL(/predmet=punjac/);
  await expect(page.locator('#item-title')).toBeFocused();
  await page.getByRole('button', { name: 'Očisti', exact: true }).click();
  await expect(related).toHaveCount(0);
  await search.fill('istekli lijekovi');
  await page.locator('.guide-results button').click();
  await expect(related).toHaveCount(0);
  await expect(page.locator('.guide-item')).toContainText('Ljekarna');
});

test('Guide: PPWR, statistika i razlikovanje ponovne uporabe imaju provjerljive izvore', async ({
  page,
}) => {
  await page.goto('/guide');
  await openSection(page, 'ciljevi');
  const ppwr = page.locator('.guide-ppwr');
  await expect(ppwr).not.toHaveAttribute('open', '');
  await ppwr.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(ppwr).toHaveAttribute('open', '');
  await expect(ppwr.locator('time[datetime="2025-02-11"]')).toHaveText('11. veljače 2025.');
  await expect(ppwr.locator('time[datetime="2026-08-12"]')).toHaveText('12. kolovoza 2026.');
  await expect(ppwr).toContainText('Pojedine obveze imaju zasebne rokove');
  await expect(ppwr.locator('a').first()).toHaveAttribute(
    'href',
    'https://eur-lex.europa.eu/eli/reg/2025/40/oj',
  );
  await openSection(page, 'cinjenice');
  const food = page.getByRole('article', { name: 'Otpad od hrane u Hrvatskoj' });
  await expect(food.locator('.guide-stat-number')).toContainText('57,3');
  await expect(food).toContainText('2025. · kućanstva');
  await expect(food).toContainText('jestivi i nejestivi');
  await food.getByText('Obuhvat istraživanja', { exact: true }).click();
  await expect(food).toContainText('Ne uključuje poslovni sektor');
  await expect(food.locator('a').first()).toHaveAttribute('href', /ver_5.pdf#page=5$/);
  await openSection(page, 'prevencija');
  await page.getByRole('button', { name: /02.*Priprema za ponovnu uporabu/ }).click();
  await expect(page.locator('#hierarchy-detail')).toContainText('već postao otpad');
  await expect(page.locator('#hierarchy-detail')).toContainText('nije postao otpad');
  for (const [width, height] of [
    [1440, 1000],
    [768, 1180],
    [390, 844],
    [320, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await openSection(page, 'ciljevi');
    await ppwr.evaluate((element) => element.scrollIntoView({ block: 'start' }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(ppwr).toBeVisible();
    await page.screenshot({ path: `/app/test-results/guide-ppwr-${width}.png` });
  }
});

test('Guide: pet sidara i sve poveznice registra izvora otvaraju odgovarajuće odredište', async ({
  page,
  context,
}) => {
  await page.goto('/guide');
  const tabs = page.getByRole('tab');
  for (const tab of await tabs.all()) {
    const id = await tab.getAttribute('aria-controls');
    await tab.click();
    expect(new URL(page.url()).hash).toBe(`#${id}`);
    await expect(page.locator(`#${id}`)).toBeVisible();
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
  }
  const registry = page.locator('.guide-maintenance details');
  await registry.locator('summary').click();
  const links = registry.locator('a');
  await expect(links).toHaveCount(18);
  // Verify new-tab navigation without making the test depend on third-party uptime.
  // Actual source content and availability were checked separately during the audit.
  await context.route(/^https:\/\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<title>Provjera odredišta izvora</title>',
    }),
  );
  for (const link of await links.all()) {
    const destination = await link.getAttribute('href');
    await expect(link).toHaveAttribute('target', '_blank');
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(destination!);
    await popup.close();
  }
});

test('Guide redizajn: svih 32 predmeta, upute, izvori i pet razina', async ({ page }) => {
  const { items, sources } = await import('../src/guide/data');
  const { hierarchy, facts } = await import('../src/guide/content');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/guide');
  expect(items).toHaveLength(32);
  for (const item of items) {
    await page.getByLabel('Predmet ili materijal').fill(item.name);
    await page.locator('.guide-results button').filter({ hasText: item.name }).first().click();
    await expect(page.locator('#item-title')).toHaveText(item.name);
    const detail = page.locator('.guide-item');
    for (const text of [item.route, item.preparation, item.warning]) {
      await expect(detail).toContainText(text);
    }
    for (const source of item.sources) {
      await expect(detail.locator(`a[href="${sources[source].url}"]`)).toHaveCount(1);
    }
    await expect(detail.locator('.guide-map-link')).toHaveCount(item.map ? 1 : 0);
    await expect(detail.locator('.guide-local')).toHaveCount(item.local ? 1 : 0);
  }
  await openSection(page, 'prevencija');
  for (const [index, [title, description, example]] of hierarchy.entries()) {
    await page
      .getByRole('group', { name: 'Razine hijerarhije otpada' })
      .getByRole('button')
      .nth(index)
      .click();
    for (const text of [title, description, example])
      await expect(page.locator('#hierarchy-detail')).toContainText(text);
  }
  await openSection(page, 'cinjenice');
  for (const [title, text, action] of facts) {
    const fact = page.locator('.guide-fact').filter({ hasText: title });
    await fact.locator('summary').click();
    await expect(fact).toContainText(text);
    await expect(fact).toContainText(action);
  }
  await openSection(page, 'ciljevi');
  for (const [index, year, target] of [
    [0, 2025, 55],
    [1, 2030, 60],
    [2, 2035, 65],
  ]) {
    const milestone = page.locator('.guide-eu-timeline li').nth(index);
    await expect(milestone).toContainText(String(year));
    await expect(milestone).toContainText(`${target} %`);
  }
  await expect(page.locator('.guide-eu-landfill')).toContainText('≤ 10 %');
  expect(errors).toEqual([]);
});

for (const correct of [true, false]) {
  test(`Guide redizajn: cijeli kviz s ${correct ? 'točnim' : 'pogrešnim'} odgovorima`, async ({
    page,
  }) => {
    const { questions } = await import('../src/guide/content');
    await page.goto('/guide#kviz');
    const quiz = page.locator('.guide-quiz');
    for (const [index, question] of questions.entries()) {
      await expect(quiz.getByRole('progressbar')).toHaveAttribute('value', String(index));
      if (index > 0) await expect(quiz.getByRole('heading')).toBeFocused();
      const chosen = correct ? question.correct : (question.correct + 1) % question.options.length;
      await quiz.getByRole('radio').nth(chosen).focus();
      await page.keyboard.press('Space');
      await expect(quiz.getByRole('status')).toContainText(question.explanation);
      await expect(quiz.locator('.guide-answer').nth(question.correct)).toHaveClass(/is-correct/);
      await expect(quiz.locator('.guide-answer.is-incorrect')).toHaveCount(
        question.options.length - 1,
      );
      await expect(quiz.getByRole('status')).not.toContainText('Točan odgovor:');
      await quiz
        .getByRole('button', {
          name: index === questions.length - 1 ? 'Prikaži rezultat' : 'Sljedeće pitanje',
        })
        .click();
    }
    await expect(quiz.getByRole('heading')).toHaveText(`${correct ? 6 : 0} od 6 točnih odgovora`);
    await expect(quiz.getByRole('progressbar')).toHaveAttribute('value', '6');
    await quiz.getByRole('button', { name: 'Pokušaj ponovno' }).click();
    await expect(quiz.getByRole('progressbar')).toHaveAttribute('value', '0');
    await expect(quiz.getByRole('radio').first()).not.toBeChecked();
  });
}

test('Guide tabovi: izravne poveznice, Back/Forward, stanje i tipkovnica', async ({ page }) => {
  await page.goto('/guide');
  const search = page.getByLabel('Predmet ili materijal');
  await search.fill('stak');
  await openSection(page, 'prevencija');
  await page.getByRole('button', { name: /03.*Recikliranje/ }).click();
  await openSection(page, 'kviz');
  await page.locator('.guide-quiz').getByRole('radio').first().check();
  await page.goBack();
  await expect(page.locator('#prevencija')).toBeVisible();
  await expect(page.locator('#hierarchy-detail h3')).toHaveText('Recikliranje');
  await page.goBack();
  await expect(page.locator('#odvajanje')).toBeVisible();
  await expect(search).toHaveValue('stak');
  await page.goForward();
  await page.goForward();
  await expect(page.locator('.guide-quiz').getByRole('radio').first()).toBeChecked();
  await page.locator('#guide-tab-kviz').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#guide-tab-odvajanje')).toBeFocused();
  await expect(page.locator('#odvajanje')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#guide-tab-prevencija')).toBeFocused();
  await page.keyboard.press('End');
  await expect(page.locator('#guide-tab-kviz')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#guide-tab-odvajanje')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#guide-tab-kviz')).toBeFocused();
  for (const id of ['odvajanje', 'prevencija', 'ciljevi', 'cinjenice', 'kviz']) {
    await page.goto(`/guide?predmet=laptop#${id}`);
    await expect(page.locator(`#guide-tab-${id}`)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await page.reload();
    await expect(page.locator(`#${id}`)).toBeVisible();
  }
  await openSection(page, 'odvajanje');
  await expect(page.locator('#item-title')).toHaveText('Laptop');
  await expect(search).toHaveValue('Laptop');
});

for (const [width, height] of [
  [1440, 900],
  [768, 900],
  [390, 844],
  [320, 844],
]) {
  test(`Guide tabovi: svi prikazi, kontrast i pretraga iznad pregiba ${width}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.setViewportSize({ width, height });
    await page.goto('/guide');
    await expect(page.getByLabel('Predmet ili materijal')).toBeInViewport();
    for (const id of ['odvajanje', 'prevencija', 'ciljevi', 'cinjenice', 'kviz']) {
      await openSection(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (id === 'ciljevi') {
        const disclosure = page.locator('.guide-ppwr');
        await disclosure.locator('summary').click();
        await expect(disclosure.locator('time').first()).toBeVisible();
        await page.locator('.guide-green-deal summary').click();
      }
      if (id === 'cinjenice') {
        for (const summary of await page.locator('.guide-fact summary').all())
          await summary.click();
      }
      const result = await new AxeBuilder({ page }).analyze();
      expect(result.violations).toEqual([]);
    }
    expect(errors).toEqual([]);
  });
}

test('EU ciljevi: zajednički pregled, zaseban pokazatelj i PPWR tipkovnicom', async ({
  page,
  context,
}) => {
  await page.goto('/guide#ciljevi');
  await expect(page.locator('#guide-tab-ciljevi')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.guide-eu-timeline li')).toHaveCount(3);
  await expect(page.locator('.guide-eu-overview')).toContainText('Nisu ostvareni rezultati');
  await expect(page.locator('.guide-eu-note')).toHaveCount(0);
  await expect(page.locator('.guide-eu-timeline .guide-eu-landfill')).toHaveCount(0);
  const disclosure = page.locator('.guide-ppwr');
  await expect(disclosure.locator('time').first()).not.toBeVisible();
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(disclosure.locator('time[datetime="2025-02-11"]')).toBeVisible();
  await expect(disclosure.locator('time[datetime="2026-08-12"]')).toBeVisible();
  await expect(disclosure).toContainText('Uredba (EU) 2025/40');
  await expect(disclosure).toContainText('Pojedine obveze imaju zasebne rokove');
  await context.route(/^https:\/\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Izvor</title>' }),
  );
  const links = page.locator('#ciljevi .guide-source');
  await page.locator('.guide-green-deal summary').click();
  await expect(links).toHaveCount(5);
  for (const link of await links.all()) {
    const url = await link.getAttribute('href');
    const popupPromise = page.waitForEvent('popup');
    await link.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(url!);
    await popup.close();
  }
  await disclosure.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(disclosure.locator('time').first()).not.toBeVisible();
});

test('EU zeleni plan: neovisni accordioni, sadržaj i siguran službeni izvor', async ({
  page,
  context,
}) => {
  await page.goto('/guide#ciljevi');
  await expect(page.locator('#targets-title')).toHaveText('Europski ciljevi gospodarenja otpadom');
  await expect(page.locator('.guide-eu-description')).toHaveText(
    'Koliki dio komunalnog otpada trebamo reciklirati?',
  );
  const ppwr = page.locator('.guide-ppwr');
  const green = page.locator('.guide-green-deal');
  for (const disclosure of [ppwr, green]) await expect(disclosure).not.toHaveAttribute('open', '');
  await green.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(green).toHaveAttribute('open', '');
  await expect(ppwr).not.toHaveAttribute('open', '');
  await expect(green).toContainText('2019.');
  await expect(green).toContainText('2050.');
  await expect(green).toContainText('a ne o jednom propisu');
  await expect(green.locator('.guide-green-goals > div')).toHaveCount(3);
  await expect(green.locator('.guide-green-circular')).toContainText('Kružno gospodarstvo');
  await expect(green.locator('.guide-green-steps li')).toHaveCount(4);
  await expect(green).toContainText('Samo odvajanje otpada ne jamči recikliranje.');
  await expect(page.locator('.guide-eu-context-note')).toContainText('Europski zeleni plan postavlja širi smjer');
  await ppwr.locator('summary').click();
  await expect(ppwr).toHaveAttribute('open', '');
  await expect(green).toHaveAttribute('open', '');
  await green.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(green).not.toHaveAttribute('open', '');
  await expect(ppwr).toHaveAttribute('open', '');
  await green.locator('summary').click();
  const link = green.getByRole('link', { name: /Vijeće EU-a · Europski zeleni plan/ });
  await expect(link).toHaveAttribute(
    'href',
    'https://www.consilium.europa.eu/en/policies/european-green-deal/',
  );
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await context.route('https://www.consilium.europa.eu/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Izvor</title>' }),
  );
  const popupPromise = page.waitForEvent('popup');
  await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL('https://www.consilium.europa.eu/en/policies/european-green-deal/');
  await popup.close();
  await ppwr.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(ppwr).not.toHaveAttribute('open', '');
  await expect(green).toHaveAttribute('open', '');
});

test('Zanimljivosti: šest kartica, savjeti i izvori dostupni tipkovnicom', async ({ page }) => {
  const { facts } = await import('../src/guide/content');
  const { sources } = await import('../src/guide/data');
  await page.goto('/guide#cinjenice');
  await expect(page.locator('#facts-title')).toHaveText('Jeste li znali?');
  await expect(
    page.getByText('Šest činjenica koje mijenjaju način na koji gledamo na otpad.'),
  ).toBeVisible();
  await expect(page.locator('.guide-fact')).toHaveCount(6);
  await expect(page.locator('.guide-fact-icon')).toHaveCount(6);
  for (const [title, text, action, source] of facts) {
    const card = page.locator('.guide-fact').filter({ hasText: title });
    await expect(card).not.toHaveAttribute('open', '');
    await card.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(card.locator('.guide-fact-body')).toBeVisible();
    await expect(card).toContainText(text);
    await expect(card).toContainText(action);
    await expect(card.locator('.guide-source')).toHaveAttribute('href', sources[source].url);
    await card.locator('summary').focus();
    await page.keyboard.press('Space');
    await expect(card.locator('.guide-fact-body')).not.toBeVisible();
  }
  const stat = page.locator('.guide-food-statistic');
  await expect(stat.locator('.guide-stat-number')).toContainText('57,3 kg');
  await expect(stat).toContainText('po stanovniku godišnje');
  await expect(stat).toContainText('2025. · kućanstva');
  await expect(stat).toContainText('jestivi i nejestivi dio');
  await expect(stat.locator('.guide-stat-tip')).toContainText('Planirajte kupnju');
  await stat.locator('.guide-stat-details summary').focus();
  await page.keyboard.press('Enter');
  await expect(stat.locator('.guide-stat-details')).toContainText('1.021 kućanstva');
  await expect(stat.locator('.guide-stat-details')).toContainText('Ne uključuje poslovni sektor');
});

test('Zanimljivosti: otvaranje kartice ne pomiče susjedni stupac', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/guide#cinjenice');
  const neighbour = page.locator('.guide-fact--3');
  const before = await neighbour.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  await page.locator('.guide-fact--0 summary').click();
  const after = await neighbour.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
  expect(Math.abs(after - before)).toBeLessThan(1);
  const expanded = await page.locator('.guide-fact--0').boundingBox();
  const following = await page.locator('.guide-fact--2').boundingBox();
  expect(following!.y - (expanded!.y + expanded!.height)).toBeLessThanOrEqual(15);
});
