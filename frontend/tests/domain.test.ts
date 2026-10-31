import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  explainReason,
  rateMetricKey,
  formatMetric,
  mayConnect,
  numeric,
  readSelection,
  selectionUrl,
} from '../src/domain.ts';
import type { Metric, Observation } from '../src/api/client.ts';

const metric = (value: string | null): Metric => ({
  value,
  unit: 't',
  quality_status: value === null ? 'unavailable' : 'available',
});
function observation(year: number, status = 'verified', reasons: string[] = []): Observation {
  return {
    id: `synthetic-${year}`,
    year,
    scope: 'public_service',
    source_row: 2,
    source: {
      id: 'synthetic-source',
      title: 'SYNTHETIC FIXTURE',
      path: 'synthetic',
      sha256: 'synthetic',
      year,
      sheet: 'synthetic',
      scope: 'public_service',
      methodology_group: 'synthetic-v1',
      methodology_verified: true,
      publisher: null,
      catalog_url: null,
      resource_url: null,
      license: null,
      downloaded_at: null,
      issues: [],
    },
    quality_status: 'valid',
    population_usable: true,
    raw_values: {},
    metrics: {},
    issues: [],
    comparability: {
      status,
      methodology_group: 'synthetic-v1',
      previous_year: year - 1,
      population_changed: false,
      reasons,
    },
    target_rate_available: false,
    target_rate_unavailable_reason: 'synthetic',
  };
}

test('missing and malformed metrics never become a zero; explicit zero is retained', () => {
  assert.equal(numeric(metric(null)), null);
  assert.equal(numeric(metric('')), null);
  assert.equal(numeric(metric('NaN')), null);
  assert.equal(numeric(metric('Infinity')), null);
  assert.equal(formatMetric(metric(null)), 'Nema podatka');
  assert.equal(formatMetric(metric('0')), '0,00');
  assert.equal(formatMetric(metric('9773.870000000001')), '9.773,87');
  assert.match(explainReason('population_requires_review'), /populacija zahtijeva provjeru/);
});

test('unverified, nonconsecutive and changed-scope years cannot form a continuous trend', () => {
  const a = observation(2021);
  assert.equal(mayConnect(a, observation(2022)), true);
  assert.equal(mayConnect(a, observation(2022, 'provisional')), false);
  assert.equal(mayConnect(a, observation(2023)), false);
  assert.equal(mayConnect(a, { ...observation(2022), scope: 'another_scope' }), false);
  assert.equal(mayConnect(a, observation(2022, 'verified', ['methodology_group_changed'])), false);
  assert.equal(mayConnect(a, observation(2022, 'unknown-future-status')), false);
  assert.equal(
    mayConnect(a, {
      ...observation(2022),
      comparability: { ...observation(2022).comparability, previous_year: null },
    }),
    false,
  );
});

test('URL preserves selection and drops parameters outside module context', () => {
  assert.deepEqual(readSelection('?jls=sample&godina=2023'), { id: 'sample', year: '2023' });
  assert.deepEqual(readSelection('?jls=sample&godina=2030'), { id: 'sample', year: '2030' });
  assert.equal(
    selectionUrl('sample', '2022', 'http://localhost:5173/?keep=yes'),
    '/?jls=sample&godina=2022',
  );
  assert.equal(
    selectionUrl(null, null, 'http://localhost:5173/?jls=sample&godina=2022&keep=yes'),
    '/?',
  );
});

test('cross-module URLs remove stale references and preserve comparison membership', async () => {
  const { moduleUrl, changedSelection } = await import('../src/navigation.ts');
  const query =
    '?jls=a&godina=2024&usporedi=b,c&referenca=b&cilj=50&pocetni_zapis=old&scenariji=old';
  assert.equal(moduleUrl('simulator', query), '/simulator?jls=a&godina=2024&usporedi=b%2Cc');
  assert.equal(moduleUrl('explorer', query), '/explorer?jls=a&godina=2024&usporedi=b%2Cc');
  assert.equal(changedSelection('b', '2023', query).get('usporedi'), 'a,c');
  assert.equal(changedSelection('a', '2023', query).has('referenca'), false);
});

test('historical view chooses a separate derived metric and keeps official rates distinct', () => {
  for (const year of [2017, 2018, 2019, 2020])
    assert.equal(rateMetricKey(year), 'calculated_nonmixed_share_pct');
  for (const year of [2021, 2022, 2023, 2024])
    assert.equal(rateMetricKey(year), 'separate_collection_pct');
});
