import assert from 'node:assert/strict';
import test from 'node:test';
import { items, sources } from '../src/guide/data.ts';
import { normalize, relatedItems, searchItems } from '../src/guide/domain.ts';
import { foodStatistic, hierarchy, questions } from '../src/guide/content.ts';
test('pretraga prepoznaje hrvatska slova, sinonime i kombinirane pojmove', () => {
  assert.equal(normalize('  ČAŠA Đ  '), 'casa d');
  assert.ok(searchItems('RACUNALO').some((item) => item.id === 'laptop'));
  assert.ok(searchItems('kora banane').some((item) => item.id === 'kore'));
  assert.ok(searchItems('papirna vrecica').some((item) => item.id === 'vrecica'));
  assert.deepEqual(searchItems('nepostojeci predmet'), []);
  assert.ok(searchItems('EE otpad').every((item) => item.source === 'ee'));
  assert.ok(searchItems('EE otpad').length >= 5);
  assert.ok(searchItems('masna kutija od pizze').some((item) => item.id === 'pizza'));
  assert.ok(searchItems('ostaci hrane').some((item) => item.id === 'ostaci'));
});
test('katalog ima jedinstvene predmete i sljedive izvore bez praznih uputa', () => {
  assert.ok(items.length >= 25 && items.length <= 40);
  assert.equal(new Set(items.map((item) => item.id)).size, items.length);
  for (const item of items) {
    assert.ok(item.route && item.preparation && item.warning && item.checkedDate);
    assert.equal(new URL(sources[item.source].url).protocol, 'https:');
  }
  assert.equal(items.find((item) => item.id === 'lijekovi')?.map, false);
});
test('svako pitanje ima jedan valjan točan odgovor i izvor', () => {
  assert.equal(questions.length, 6);
  for (const question of questions) {
    assert.ok(
      Number.isInteger(question.correct) &&
        question.correct >= 0 &&
        question.correct < question.options.length,
    );
    assert.equal(new Set(question.options).size, question.options.length);
    assert.ok(sources[question.source] && question.explanation);
  }
});

test('povezani predmeti su deterministički, ograničeni i odvojeni od upita', () => {
  assert.deepEqual(
    relatedItems('mobitel').map((item) => item.id),
    ['punjac', 'baterija', 'laptop'],
  );
  assert.deepEqual(relatedItems('nepostoji'), []);
  assert.deepEqual(relatedItems('lijekovi'), []);
  assert.equal(searchItems('mobitel').length, 1);
  for (const selected of items) {
    const ids = relatedItems(selected.id).map((item) => item.id);
    assert.ok(ids.length <= 3 && !ids.includes(selected.id));
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.every((id) => items.some((item) => item.id === id)));
    assert.deepEqual(
      relatedItems(selected.id).map((item) => item.id),
      ids,
    );
  }
});
test('audit čuva posebne tokove i ne širi povratnu naknadu na svu ambalažu', () => {
  assert.equal(items.length, 32);
  assert.deepEqual(
    items.filter((item) => item.sources.includes('deposit')).map((item) => item.id),
    ['boca', 'limenka', 'staklena-boca'],
  );
  const bulb = items.find((item) => item.id === 'stedna-zarulja')!;
  assert.ok(!bulb.preparation.includes('popravak'));
  assert.match(bulb.warning, /nije ambalažno staklo/);
  assert.match(
    items.find((item) => item.id === 'ostaci')!.warning,
    /Prihvat kuhane hrane.*razlikuje se među mjestima/,
  );
  assert.match(
    items.find((item) => item.id === 'baterija')!.warning,
    /Ne odlažite u miješani otpad/,
  );
  assert.equal(items.find((item) => item.id === 'lijekovi')!.map, false);
});
test('statistika ima referentnu godinu i kućanstva, a hijerarhija razlikuje status otpada', () => {
  assert.equal(foodStatistic.value, '57,3');
  assert.equal(foodStatistic.referenceYear, 2025);
  assert.equal(foodStatistic.publicationYear, 2026);
  assert.match(foodStatistic.scope, /kućanstava/);
  assert.match(foodStatistic.scope, /jestivi i nejestivi/);
  assert.match(foodStatistic.methodology, /Ne uključuje poslovni sektor/);
  assert.match(hierarchy[1][1], /već postao otpad/);
  assert.match(hierarchy[1][1], /nije postao otpad/);
  assert.equal(hierarchy.length, 5);
});
