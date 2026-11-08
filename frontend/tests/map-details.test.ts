import test from 'node:test';
import assert from 'node:assert/strict';
import { locationHours, locationWebsite, locationNavigation } from '../src/mapLocationDetails.ts';

test('map details omit invalid hours and unsafe links without changing source values', () => {
  assert.equal(locationHours('"Outside"'), '');
  assert.equal(locationHours(''), '');
  assert.equal(locationHours('Mo-Fr 08:00-16:00'), 'Mo-Fr 08:00-16:00');
  assert.equal(locationHours('24/7'), '24/7');
  assert.equal(locationWebsite('javascript:alert(1)'), '');
  assert.equal(locationWebsite('https://example.com/'), 'https://example.com/');
  assert.equal(locationNavigation(NaN, 16), '');
  assert.equal(locationNavigation(91, 16), '');
  assert.ok(locationNavigation(45.8, 16).endsWith('destination=45.8,16'));
});
