import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlace } from '../src/placeSearch.ts';

test('city search accepts Croatian accents, case and both Đ transliterations', () => {
  for (const [query, name] of [
    ['Cakovec', 'Čakovec'],
    ['SIBENIK', 'Šibenik'],
    ['Porec', 'Poreč'],
    ['Djakovo', 'Đakovo'],
    ['Dakovo', 'Đakovo'],
    ['Zagreb', 'Zagreb'],
  ])
    assert.equal(normalizePlace(query), normalizePlace(name));
  assert.equal(normalizePlace(' Grad Đakovo '), 'dakovo');
  assert.equal(normalizePlace(''), '');
  assert.ok(normalizePlace('Šibenik').includes(normalizePlace('Sib')));
});
