import { datasetLink } from '../components/Sources';
import { changedSelection } from '../navigation';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import {
  api,
  compareApi,
  type Comparison,
  type Municipality,
  type Peers,
  type Profile,
} from '../api/client';
import { WorkspaceLayout } from '../components/Layout';
import { Search } from '../components/Search';
import { Icon } from '../components/Icon';
import { ErrorState, Loading } from '../components/State';
import { Quality } from '../components/Quality';
import { explainIssue, formatMetric, formatNumber, numeric, rateMetricKey } from '../domain';
import { compareReason, unitLabel } from './helpers';
import { CompareSources } from './CompareSources';
const CompareCharts = lazy(() => import('./CompareCharts'));

type Remote<T> =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; value: T };
function readCompare() {
  const params = new URLSearchParams(window.location.search);
  return {
    ids: [params.get('jls'), ...(params.get('usporedi')?.split(',') ?? [])].filter(
      (id): id is string => Boolean(id),
    ),
    year: params.get('godina') ?? '2024',
    county: params.get('zupanija') === 'same_county' ? 'same_county' : 'all',
    metric: params.get('metrika') ?? 'total_kg_per_covered_person',
    view: params.get('prikaz') === 'table' ? ('table' as const) : ('chart' as const),
    mode: params.get('razdoblje') === 'history' ? ('history' as const) : ('snapshot' as const),
  };
}

export default function Compare() {
  const [selection, setSelection] = useState(readCompare);
  const [names, setNames] = useState<Record<string, Municipality>>({});
  const [baseline, setBaseline] = useState<Remote<Profile>>({ status: 'idle' });
  const [data, setData] = useState<Remote<Comparison>>({ status: 'idle' });
  const [peers, setPeers] = useState<Remote<Peers>>({ status: 'idle' });
  const [peerAttempt, setPeerAttempt] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  const idsKey = selection.ids.join(',');
  const baseId = selection.ids[0];
  const update = useCallback(
    (change: Partial<ReturnType<typeof readCompare>>) => {
      const next = { ...selection, ...change };
      const url = new URL(window.location.href);
      url.search = '';
      for (const key of ['jls', 'usporedi', 'godina', 'zupanija', 'metrika', 'prikaz', 'razdoblje'])
        url.searchParams.delete(key);
      if (next.ids[0]) url.searchParams.set('jls', next.ids[0]);
      if (next.ids.length > 1) url.searchParams.set('usporedi', next.ids.slice(1).join(','));
      url.searchParams.set('godina', next.year);
      url.searchParams.set('zupanija', next.county);
      url.searchParams.set('metrika', next.metric);
      url.searchParams.set('prikaz', next.view);
      url.searchParams.set('razdoblje', next.mode);
      window.history.pushState(null, '', url.pathname + url.search);
      setSelection(next);
    },
    [selection],
  );
  useEffect(() => {
    const pop = () => setSelection(readCompare());
    window.addEventListener('popstate', pop);
    document.title = 'Waste Compare · WasteWise';
    return () => window.removeEventListener('popstate', pop);
  }, []);
  useEffect(() => {
    if (!baseId) {
      setBaseline({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setBaseline({ status: 'loading' });
    api
      .profile(baseId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setBaseline({ status: 'success', value });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setBaseline({ status: 'error', message: error.message });
      });
    return () => controller.abort();
  }, [baseId, attempt]);
  useEffect(() => {
    if (selection.ids.length < 2) {
      setData({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setData({ status: 'loading' });
    compareApi
      .comparison(selection.ids, Number(selection.year), controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData({ status: 'success', value });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setData({ status: 'error', message: error.message });
      });
    return () => controller.abort();
    // Selection order determines the reference and is intentionally preserved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, selection.year, attempt]);
  useEffect(() => {
    if (!baseId || !peerAttempt) {
      setPeers({ status: 'idle' });
      return;
    }
    const controller = new AbortController();
    setPeers({ status: 'loading' });
    compareApi
      .peers(baseId, Number(selection.year), selection.county, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setPeers({ status: 'success', value });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setPeers({ status: 'error', message: error.message });
      });
    return () => controller.abort();
  }, [baseId, selection.year, selection.county, peerAttempt]);
  const baseProfile = baseline.status === 'success' ? baseline.value : null;
  const comparison = data.status === 'success' ? data.value : null;
  const resolveName = (id: string) =>
    comparison?.members.find((m) => m.municipality.id === id)?.municipality.name ??
    (baseProfile?.municipality.id === id ? baseProfile.municipality.name : names[id]?.name) ??
    'Učitavanje naziva…';
  const choose = (municipality: Municipality) => {
    if (selection.ids.includes(municipality.id)) {
      setNotice('Ta je lokacija već u odabranoj skupini.');
      return;
    }
    if (selection.ids.length >= 5) {
      setNotice('Moguće je odabrati najviše pet lokacija. Uklonite jednu pa dodajte drugu.');
      return;
    }
    setNames((old) => ({ ...old, [municipality.id]: municipality }));
    setNotice('');
    update({ ids: [...selection.ids, municipality.id] });
  };
  const years = baseProfile?.observations.map((o) => o.year).sort((a, b) => b - a) ?? [];
  const baselineObservation = baseProfile?.observations.find(
    (o) => String(o.year) === selection.year,
  );
  const allObservations = comparison?.members.flatMap((member) => member.history) ?? [];
  const uniqueSources = [...new Map(allObservations.map((o) => [o.source.id, o])).values()];
  return (
    <WorkspaceLayout module="compare">
      <Search onSelect={choose} />
      <section className="panel compare-selection" aria-labelledby="selection-title">
        <div className="section-title">
          <div className="compare-heading-context">
            <h2 id="selection-title">Vaša skupina za usporedbu</h2>
            {baseId && (
              <div className="year-select compare-global-year">
                <label htmlFor="compare-year">Godina podataka</label>
                <select
                  id="compare-year"
                  aria-label="Godina usporedbe"
                  value={years.includes(Number(selection.year)) ? selection.year : ''}
                  onChange={(e) => update({ year: e.target.value })}
                >
                  <option value="" disabled>
                    Odaberite godinu
                  </option>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}.
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <span className="badge neutral">{selection.ids.length} / 5 lokacija</span>
        </div>
        <p className="small-muted">
          Odaberite 2–5 gradova ili općina za usporedbu. Razlike se računaju u odnosu na prvu
          odabranu lokaciju.
        </p>
        <div className="selected-municipalities">
          {selection.ids.map((id, index) => (
            <div className="selected-municipality" key={`${id}-${index}`}>
              <div>
                <strong>{resolveName(id)}</strong>
                {index === 0 && <small>Početna lokacija</small>}
              </div>
              <button
                className="remove-member"
                onClick={() => update({ ids: selection.ids.filter((v) => v !== id) })}
                aria-label={`Ukloni ${resolveName(id)}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <p className="sr-only" role="status">
          {`Odabrano lokacija: ${selection.ids.length}.`}
        </p>
        {notice && (
          <p className="notice warning" role="status">
            {notice}
          </p>
        )}
        {baseId && (
          <div className="compare-filters" aria-label="Postavke usporedbe">
            <div className="year-select county-select">
              <label htmlFor="peer-county">Filtar područja za prijedloge</label>
              <select
                id="peer-county"
                value={selection.county}
                onChange={(e) => update({ county: e.target.value })}
              >
                <option value="all">Cijela Hrvatska</option>
                <option value="same_county">Ista županija</option>
              </select>
            </div>
            <button className="button primary" onClick={() => setPeerAttempt((a) => a + 1)}>
              <Icon name="compare" />
              Predloži slične lokacije
            </button>
          </div>
        )}
        {baseline.status === 'error' && (
          <ErrorState message={baseline.message} onRetry={() => setAttempt((a) => a + 1)} />
        )}
      </section>
      {peers.status === 'loading' && <Loading message="Traženje prijedloga za usporedbu…" />}
      {peers.status === 'error' && (
        <ErrorState message={peers.message} onRetry={() => setPeerAttempt((a) => a + 1)} />
      )}
      {peers.status === 'success' && (
        <section className="peer-section" aria-labelledby="peers-title">
          <div className="section-title">
            <div>
              <h2 id="peers-title">Prijedlozi za usporedbu</h2>
            </div>
            <span className="badge neutral">{peers.value.items.length} prijedloga</span>
          </div>

          {peers.value.status === 'unavailable' && (
            <p className="notice warning">
              <Icon name="alert" />
              {compareReason(peers.value.reason)}
            </p>
          )}
          {peers.value.expanded && (
            <p className="notice warning">
              <Icon name="alert" />
              {compareReason('population_range_expanded')}
            </p>
          )}
          {peers.value.status === 'empty' && (
            <p className="notice warning">Nema prihvatljivih kandidata za ovaj filtar i godinu.</p>
          )}
          <details className="peer-disclosure" open>
            <summary>Prikaži prijedloge zajednica ({peers.value.items.length})</summary>
            <div
              className="peer-grid"
              role="region"
              aria-label="Kartice predloženih lokacija"
              tabIndex={0}
            >
              {peers.value.items.map((peer) => (
                <article
                  className="peer-card"
                  key={peer.municipality.id}
                  aria-label={`Prijedlog ${peer.municipality.name}`}
                >
                  <div className="peer-card-top">
                    <span
                      className={`badge ${peer.within_preferred_range ? 'neutral' : 'warning'}`}
                    >
                      {!peer.within_preferred_range
                        ? 'Prošireni raspon'
                        : Number(peer.population_ratio) < 0.8
                          ? '0,5–<0,8× · manje stanovnika'
                          : Number(peer.population_ratio) <= 1.2
                            ? '0,8–1,2× · sličan broj stanovnika'
                            : '>1,2–2× · više stanovnika'}
                    </span>
                    <Icon name="pin" />
                  </div>
                  <h3>{peer.municipality.name}</h3>
                  <p>{peer.municipality.county}</p>
                  <div className="peer-population">
                    <strong>{formatNumber(peer.covered_population, 0)}</strong>
                    <span>obuhvaćenih stanovnika · {peers.value.year}.</span>
                  </div>
                  <dl>
                    <dt>Omjer prema početnoj lokaciji</dt>
                    <dd>{formatNumber(Number(peer.population_ratio))}×</dd>
                  </dl>
                  <button
                    className="button secondary"
                    disabled={
                      selection.ids.includes(peer.municipality.id) || selection.ids.length >= 5
                    }
                    onClick={() => choose(peer.municipality)}
                  >
                    {selection.ids.includes(peer.municipality.id) ? 'Dodano' : 'Dodaj u usporedbu'}
                  </button>
                </article>
              ))}
            </div>
          </details>
          <details className="quality-details">
            <summary>
              <Icon name="info" />
              Kako su odabrani prijedlozi?
            </summary>
            <div>
              <p>
                Predlažemo mjesta sa sličnim brojem stanovnika obuhvaćenih uslugom sakupljanja
                otpada, uz odabrani filtar županije. Ako ih nema dovoljno, uključujemo i mjesta koja
                se više razlikuju po veličini. Slična veličina ne znači i jednake uvjete
                gospodarenja otpadom.
              </p>
              <p>
                Prednost imaju omjeri obuhvaćenih stanovnika od 0,5 do 2 u odnosu na početnu
                lokaciju. Oznake na karticama dijele taj raspon na manje od 0,8×, od 0,8 do 1,2× i
                više od 1,2×. To je opis veličine zajednice, a ne ocjena njezina gospodarenja
                otpadom.
              </p>
              {peers.value.items.length < 5 && <p>{compareReason('fewer_candidates_available')}</p>}
            </div>
          </details>
        </section>
      )}
      {selection.ids.length === 0 && (
        <section className="welcome-state">
          <div className="welcome-icon">
            <Icon name="compare" />
          </div>
          <h2>Odaberite područja za usporedbu</h2>
          <p>
            Pronađite gradove ili općine za usporedbu
            <br className="desktop-break" /> ili istražite prijedloge prema obuhvaćenoj populaciji.
          </p>
        </section>
      )}
      {selection.ids.length === 1 && (
        <div className="compare-start notice">
          <Icon name="info" />
          <span>
            Odabrano: <strong>{resolveName(baseId)}</strong>. Pretragom dodajte još jedno područje
            ili odaberite prijedlog za početak usporedbe.
          </span>
        </div>
      )}
      {data.status === 'loading' && <Loading message="Učitavanje usporedbe, razlika i izvora…" />}
      {data.status === 'error' && (
        <ErrorState message={data.message} onRetry={() => setAttempt((a) => a + 1)} />
      )}
      {comparison && (
        <>
          <section className="compare-core" aria-label="Pokazatelji odabranih zajednica">
            <p className="small-muted">
              {comparison.year < 2021
                ? 'Udio izvan miješanog toka izračunat je iz ukupne i miješane količine otpada.'
                : 'Postotak odvojenog sakupljanja preuzet je iz službenih podataka.'}{' '}
              Količina po stanovniku izračunata je za stanovnike obuhvaćene uslugom sakupljanja
              otpada.
            </p>
            <div className="core-grid">
              {comparison.members.map((m) => (
                <article className="panel core-card" key={m.municipality.id}>
                  <h3>{m.municipality.name}</h3>
                  <dl>
                    {[
                      [
                        rateMetricKey(comparison.year),
                        comparison.year < 2021
                          ? 'Udio izvan miješanog toka'
                          : 'Odvojeno sakupljanje',
                        '%',
                      ],
                      [
                        'total_kg_per_covered_person',
                        'Ukupno po obuhvaćenom stanovniku',
                        'kg/stan.',
                      ],
                      ['total_t', 'Ukupno', 't'],
                      ['mixed_t', 'Miješano', 't'],
                    ].map(([key, label, unit]) => (
                      <div key={key}>
                        <dt>{label}</dt>
                        <dd>
                          {key === 'calculated_nonmixed_share_pct' &&
                          numeric(m.metrics[key]) === null
                            ? 'Nije dostupno'
                            : formatMetric(m.metrics[key])}
                          {numeric(m.metrics[key]) !== null && ` ${unit}`}
                          {m.metrics[key]?.quality_status === 'review_required' && (
                            <span className="badge warning">Potrebna provjera</span>
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {m.observation && !m.observation.population_usable && (
                    <p className="source-warning">
                      Obuhvaćena populacija zahtijeva provjeru; izračunati kg po stanovniku nisu
                      dostupni.
                    </p>
                  )}
                  {[
                    rateMetricKey(comparison.year),
                    'total_kg_per_covered_person',
                    'total_t',
                    'mixed_t',
                  ].some((key) => numeric(m.metrics[key]) === null) && (
                    <p className="small-muted">
                      „Nije dostupno” znači da podatak nedostaje ili ga nije moguće pouzdano
                      izračunati.
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
          <section className="insights-section" aria-labelledby="insights-title">
            <div className="section-title">
              <div>
                <h2 id="insights-title">Gdje su najveće razlike?</h2>
              </div>
              <span className="badge neutral">{comparison.year}.</span>
            </div>

            <div className="insight-grid">
              {[...comparison.insights]
                .sort(
                  (a, b) =>
                    Number(a.metric.startsWith('material_')) -
                    Number(b.metric.startsWith('material_')),
                )
                .map((insight) => (
                  <article className="insight-card" key={insight.metric}>
                    <span className="section-kicker">
                      {insight.year}. · {unitLabel(insight.unit)}
                    </span>
                    <h3>{insight.label}</h3>
                    <p className="insight-value">
                      {formatNumber(Number(insight.difference))}
                      <small>{unitLabel(insight.difference_unit)} raspona</small>
                    </p>
                    <div className="insight-pair">
                      <span>
                        {insight.low_municipality.name}
                        <strong>
                          {formatNumber(Number(insight.low_value))} {unitLabel(insight.unit)}
                        </strong>
                      </span>
                      <Icon name="arrow" />
                      <span>
                        {insight.high_municipality.name}
                        <strong>
                          {formatNumber(Number(insight.high_value))} {unitLabel(insight.unit)}
                        </strong>
                      </span>
                    </div>
                    {insight.available_count < comparison.members.length && (
                      <p className="field-hint">
                        Podaci za usporedbu dostupni su za {insight.available_count} od{' '}
                        {comparison.members.length} odabranih područja.
                      </p>
                    )}
                  </article>
                ))}
            </div>
            {!comparison.insights.length && (
              <p className="notice">
                Nema različitih, dovoljno potpunih vrijednosti za izdvajanje uvida.
              </p>
            )}
            <details className="quality-details">
              <summary>Kako izdvajamo razlike?</summary>
              <div>
                <p>
                  Za svaku metriku računa se raspon (najveća − najmanja vrijednost), podijeljen
                  najvećom apsolutnom vrijednošću. Prednost imaju pokazatelji po stanovniku i
                  razlike u postotnim bodovima; apsolutne mase prikazuju se ako nema dovoljno takvih
                  razlika. Unutar tog izbora prikazuju se do tri najveća relativna raspona, najviše
                  jedan iz svake skupine metrika. Objavljeni ukupni kg/stanovnik izostavljeni su iz
                  uvida kako se isti pokazatelj ne bi brojio dvaput.
                </p>
                <p>
                  Koriste se samo dostupne vrijednosti koje ne zahtijevaju provjeru. To nije
                  statistička značajnost, vjerojatnost ni ocjena sustava. Izostale metrike:{' '}
                  {comparison.insight_exclusions
                    .map((key) => comparison.metrics.find((m) => m.key === key)?.label ?? key)
                    .join(', ') || 'nema'}
                  .
                </p>
              </div>
            </details>
          </section>
          <Quality
            compact
            selected={
              comparison.members.find((m) => m.municipality.id === comparison.baseline_id)
                ?.observation ?? undefined
            }
            observations={uniqueSources}
          />
          <Suspense fallback={<Loading message="Učitavanje usporednog prikaza…" />}>
            <CompareCharts
              data={comparison}
              mode={selection.mode}
              view={selection.view}
              onMode={(mode) => update({ mode })}
              onView={(view) => update({ view })}
              selectedMetric={selection.metric}
              onMetric={(metric) => update({ metric })}
            />
          </Suspense>
          <section
            id="reference-results"
            className="comparison-reference-grid"
            aria-label="Referentni rezultati i izvori"
          >
            {comparison.members.map((member) => (
              <article
                className="panel comparison-reference"
                key={member.municipality.id}
                aria-label={`Referentni rezultat ${member.municipality.name}`}
              >
                <div className="peer-card-top">
                  <h3>
                    {member.municipality.name}
                    {member.municipality.id === comparison.baseline_id && (
                      <small className="small-muted"> · Početna lokacija</small>
                    )}
                  </h3>
                  <span className="badge neutral">{comparison.year}.</span>
                </div>
                <p className="small-muted">{member.municipality.county}</p>
                <p className="field-hint">
                  Uslugom je obuhvaćeno{' '}
                  <strong>{formatMetric(member.observation?.metrics.covered_population, 0)}</strong>{' '}
                  stanovnika.
                  {member.municipality.id !== comparison.baseline_id &&
                    member.population_ratio !== null && (
                      <>
                        {' '}
                        {Math.round(Math.abs(Number(member.population_ratio) - 1) * 100) === 0
                          ? 'To je približno jednak broj kao za početnu zajednicu'
                          : `To je oko ${formatNumber(Math.abs(Number(member.population_ratio) - 1) * 100, 0)} % ${Number(member.population_ratio) > 1 ? 'više' : 'manje'} u odnosu na ${resolveName(comparison.baseline_id)}`}
                        .
                      </>
                    )}
                </p>
                <p className="reference-rate">
                  {member.metrics[rateMetricKey(comparison.year)]?.value == null
                    ? 'Nije dostupno'
                    : formatMetric(member.metrics[rateMetricKey(comparison.year)])}
                  {numeric(member.metrics[rateMetricKey(comparison.year)]) !== null && ' %'}
                  <small>
                    {comparison.year < 2021
                      ? 'Izračunati udio izvan miješanog toka'
                      : 'Službena stopa odvojenog sakupljanja'}
                  </small>
                </p>
                <div className="reference-origin">
                  {member.metrics[rateMetricKey(comparison.year)]?.value != null && (
                    <span className="badge neutral indicator-origin">
                      {comparison.year < 2021 ? 'Izračunato' : 'Službeno objavljeno'}
                    </span>
                  )}
                </div>
                <a
                  className="text-button profile-link"
                  href={`/explorer?${changedSelection(member.municipality.id, String(comparison.year))}`}
                >
                  Otvori profil u Exploreru ↗
                </a>
                <div className="reference-dataset">
                  {member.observation && datasetLink(member.observation.source) && (
                    <a
                      className="text-button"
                      href={datasetLink(member.observation.source)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Korišteni skup podataka ↗
                    </a>
                  )}
                </div>
                <div className="reference-warnings">
                  {member.warnings.includes('population_outside_preferred_range') && (
                    <p className="source-warning">
                      <Icon name="alert" />
                      Broj stanovnika obuhvaćenih uslugom znatno se razlikuje od početne lokacije (
                      {resolveName(comparison.baseline_id)}). Uzmite tu razliku u obzir pri
                      usporedbi podataka.
                    </p>
                  )}
                  {!member.observation && (
                    <p className="notice warning">{compareReason('missing_year')}</p>
                  )}
                  {member.observation?.issues
                    .filter((issue) => issue.severity !== 'info')
                    .map((issue, i) => (
                      <p className="source-warning" key={i}>
                        <Icon name="alert" />
                        {explainIssue(issue)}
                      </p>
                    ))}
                </div>
              </article>
            ))}
          </section>
          <CompareSources data={comparison} />
        </>
      )}
      {baselineObservation &&
        !baselineObservation.population_usable &&
        selection.ids.length < 2 && (
          <p className="notice warning">
            Obuhvaćena populacija početne lokacije zahtijeva provjeru. Automatski prijedlozi nisu
            dostupni; ručno možete usporediti dostupne mase i stopu.
          </p>
        )}
    </WorkspaceLayout>
  );
}
