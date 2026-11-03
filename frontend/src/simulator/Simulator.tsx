import { Methodology } from './Methodology';
import { PrintReport } from './PrintReport';
import { changedSelection, moduleUrl } from '../navigation';
import { useEffect, useState, useRef } from 'react';
import {
  simulationApi,
  api,
  type SimulationContext,
  type SimulationOutput,
  type ScenarioInput,
  type Observation,
} from '../api/client';
import { WorkspaceLayout } from '../components/Layout';
import { Search } from '../components/Search';
import { Quality } from '../components/Quality';
import { Sources } from '../components/Sources';
import { ErrorState, Loading } from '../components/State';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { components } from '../api/schema';

type ScenarioState = components['schemas']['ScenarioState'];
const VERSION = 'public-service-mass-balance-v1' as const;
const defaultScenario = (): ScenarioInput => ({
  name: 'Moj scenarij',
  model: 'diversion',
  kind: 'fraction',
  value: '0.1',
});
const number = (v: unknown, digits = 2) =>
  v === null || v === undefined
    ? 'Nema podatka'
    : Number(v).toLocaleString('hr-HR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
const labels: Record<string, string> = {
  total_t: 'Ukupno',
  mixed_t: 'Miješano',
  separate_t: 'Odvojeno sakupljeno',
  rate_pct: 'Stopa odvojenog sakupljanja',
  total_kg_per_person: 'Ukupno po stanovniku',
  mixed_kg_per_person: 'Miješano po stanovniku',
  separate_kg_per_person: 'Odvojeno po stanovniku',
};
const modelName = (model: string) => (model === 'diversion' ? 'Preusmjeravanje' : 'Prevencija');
function read() {
  return new URLSearchParams(window.location.search);
}
function decode(params: URLSearchParams): ScenarioInput[] {
  if (!params.has('scenariji')) return [];
  if (params.get('verzija') !== VERSION)
    throw new Error('Nepodržana verzija spremljenog scenarija.');
  if ((params.get('scenariji')?.length || 0) > 12000)
    throw new Error('Poveznica scenarija je preduga.');
  let list: unknown;
  try {
    list = JSON.parse(params.get('scenariji') || '');
  } catch {
    throw new Error('Poveznica ne sadrži valjan zapis scenarija. Otvorite novi scenarij.');
  }
  if (!Array.isArray(list) || list.length < 1 || list.length > 4)
    throw new Error('Poveznica mora sadržavati 1–4 scenarija.');
  if (
    list.some(
      (s) =>
        !s ||
        typeof s !== 'object' ||
        typeof s.name !== 'string' ||
        s.name.length < 1 ||
        s.name.length > 80 ||
        !['diversion', 'prevention'].includes(s.model) ||
        !['fraction', 'tonnes', 'target'].includes(s.kind) ||
        !['string', 'number'].includes(typeof s.value) ||
        String(s.value).trim() === '' ||
        !Number.isFinite(Number(s.value)) ||
        (s.reference != null &&
          (typeof s.reference !== 'object' ||
            ['municipality_id', 'observation_id', 'source_id', 'sha256', 'metric'].some(
              (k) => typeof s.reference[k] !== 'string',
            ) ||
            !['string', 'number'].includes(typeof s.reference.target))),
    )
  )
    throw new Error('Nevaljan zapis scenarija.');
  return list as ScenarioInput[]; // The API validates every field and reference before calculation.
}
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export default function Simulator() {
  const focusContext = useRef(false);
  const [params, setParams] = useState(read);
  const id = params.get('jls');
  const year = params.get('godina') || '2024';
  const [context, setContext] = useState<SimulationContext | null>(null);
  const [history, setHistory] = useState<Observation[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [reference, setReference] = useState<SimulationContext | null>(null);
  const [saved, setSaved] = useState<ScenarioInput[]>([]);
  const [draft, setDraft] = useState<ScenarioInput>(defaultScenario);
  const [savedSignature, setSavedSignature] = useState('');
  const [validSignature, setValidSignature] = useState('');
  const signature = JSON.stringify([...saved, draft]);
  const [data, setData] = useState<SimulationOutput | null>(null);
  const [loadError, setLoadError] = useState('');
  const [calcError, setCalcError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [calcAttempt, setCalcAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  const [unit, setUnit] = useState<'t' | 'kg'>('t');
  const [table, setTable] = useState(false);
  useEffect(() => {
    const pop = () => setParams(read());
    window.addEventListener('popstate', pop);
    return () => window.removeEventListener('popstate', pop);
  }, []);
  function navigate(nextId: string, nextYear: string) {
    focusContext.current = true;
    const next = changedSelection(nextId, nextYear);
    window.history.pushState(null, '', `/simulator?${next}`);
    setParams(next);
    setNotice('Promijenjeno početno stanje; scenariji pripadaju novom radnom skupu.');
  }
  useEffect(() => {
    setUnit('t');
    setContext(null);
    setHistory([]);
    setReference(null);
    setSavedSignature('');
    setValidSignature('');
    setSaved([]);
    setDraft(defaultScenario());
    setData(null);
    setLoadError('');
    setCalcError('');
    setYears([]);
    if (!id) return;
    const abort = new AbortController();
    setLoading(true);
    (async () => {
      const profile = await api.profile(id, abort.signal);
      if (!abort.signal.aborted) {
        setYears(profile.observations.map((o) => o.year));
        setHistory(profile.observations);
      }
      const ctx = await simulationApi.context(id, year, abort.signal);
      if (
        params.get('pocetni_zapis') &&
        (params.get('pocetni_zapis') !== ctx.observation.id ||
          params.get('pocetni_sha256') !== ctx.observation.source.sha256)
      )
        throw new Error(
          'Promijenjen početni izvor iz poveznice. Otvorite novi radni skup odabirom godine.',
        );
      let list = decode(params);
      if (
        params.has('scenariji') &&
        (params.get('zapis_baze') !== ctx.observation.id ||
          params.get('sha_baze') !== ctx.observation.source.sha256)
      )
        throw new Error('Spremljeni scenarij koristi drugu reviziju izvora.');
      let ref: SimulationContext | null = null;
      if (params.get('referenca') && !params.has('scenariji')) {
        ref = await simulationApi.context(params.get('referenca')!, year, abort.signal);
        if (
          params.get('pokazatelj') !== 'separate_collection_pct' ||
          params.get('zapis') !== ref.observation.id ||
          params.get('izvor') !== ref.observation.source.id ||
          params.get('sha256') !== ref.observation.source.sha256 ||
          Number(params.get('cilj')) !==
            Number(ref.observation.metrics.separate_collection_pct.value)
        )
          throw new Error(
            'Referentni cilj ili revizija iz poveznice ne odgovara API-ju. Vratite se na Compare.',
          );
        list = [
          {
            name: `Cilj: ${ref.municipality.name}`,
            model: 'diversion',
            kind: 'target',
            value: params.get('cilj')!,
            reference: {
              municipality_id: ref.municipality.id,
              observation_id: ref.observation.id,
              source_id: ref.observation.source.id,
              sha256: ref.observation.source.sha256,
              metric: 'separate_collection_pct',
              target: params.get('cilj')!,
            },
          },
        ];
      }
      let cleanSignature = JSON.stringify(list.length ? list : [defaultScenario()]);
      if (!params.has('scenariji')) {
        try {
          const cached = JSON.parse(
            sessionStorage.getItem(`wastewise-draft:${id}:${year}`) || 'null',
          );
          if (
            cached?.version === VERSION &&
            (!params.has('referenca') || cached.originSearch === params.toString()) &&
            cached.observation === ctx.observation.id &&
            cached.sha256 === ctx.observation.source.sha256
          ) {
            list = decode(
              new URLSearchParams({
                verzija: VERSION,
                scenariji: JSON.stringify(cached.scenarios),
              }),
            );
            cleanSignature = cached.savedSignature || JSON.stringify([defaultScenario()]);
          }
        } catch {
          /* A broken local draft never bypasses source or API validation. */
        }
      }
      if (!abort.signal.aborted) {
        setSavedSignature(cleanSignature);
        setContext(ctx);
        setHistory(profile.observations);
        setYears(profile.observations.map((o) => o.year));
        setReference(ref);
        if (list.length) {
          setSaved(list.slice(0, -1));
          setDraft(list[list.length - 1]);
        }
      }
    })()
      .catch((error: Error) => {
        if (!abort.signal.aborted) setLoadError(error.message);
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, year, params, attempt]);
  useEffect(() => {
    setData(null);
    setValidSignature('');
    setCalcError('');
    if (!context?.available) {
      setBusy(false);
      return;
    }
    const abort = new AbortController();
    setBusy(true);
    const timer = setTimeout(() => {
      simulationApi
        .calculate(
          {
            municipality_id: context.municipality.id,
            year: context.observation.year,
            observation_id: context.observation.id,
            sha256: context.observation.source.sha256,
            model_version: VERSION,
            scenarios: [...saved, draft],
          },
          abort.signal,
        )
        .then((result) => {
          if (!abort.signal.aborted) {
            setData(result);
            setValidSignature(JSON.stringify([...saved, draft]));
          }
        })
        .catch((error: Error) => {
          if (!abort.signal.aborted)
            setCalcError(error.message || 'Nije moguće povezati se s API-jem.');
        })
        .finally(() => {
          if (!abort.signal.aborted) setBusy(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [context, saved, draft, calcAttempt]);
  useEffect(() => {
    if (!context || !data || signature !== validSignature) return;
    try {
      sessionStorage.setItem(
        `wastewise-draft:${id}:${year}`,
        JSON.stringify({
          version: VERSION,
          observation: context.observation.id,
          sha256: context.observation.source.sha256,
          scenarios: [...saved, draft],
          savedSignature,
          originSearch: params.toString(),
        }),
      );
    } catch {
      /* Explicit exports remain available without browser storage. */
    }
  }, [context, data, signature, validSignature, savedSignature, id, year, saved, draft, params]);
  useEffect(() => {
    if (context && focusContext.current) {
      document.getElementById('simulator-context-title')?.focus({ preventScroll: true });
      focusContext.current = false;
    }
  }, [context]);
  const latest = data?.scenarios[data.scenarios.length - 1];
  const activeRef = latest?.reference || reference;
  function update(patch: Partial<ScenarioInput>) {
    setDraft((old) => ({ ...old, ...patch }));
    setNotice('');
  }
  const chartData = data
    ? [
        { name: 'Početno stanje', ...data.scenarios[0].initial },
        ...data.scenarios.map((s) => ({ name: s.input.name, ...s.result })),
      ].map((s) => ({
        name: s.name,
        Miješano: Number(unit === 't' ? s.mixed_t : s.mixed_kg_per_person),
        'Odvojeno sakupljeno': Number(unit === 't' ? s.separate_t : s.separate_kg_per_person),
      }))
    : [];
  return (
    <WorkspaceLayout module="simulator">
      <Search onSelect={(m) => navigate(m.id, '2024')} />
      {id && (
        <div className="simulator-context-bar panel">
          <h2 id="simulator-context-title" tabIndex={-1}>
            {context?.municipality.name || 'Početno stanje'}
          </h2>
          <label>
            Godina{' '}
            <select
              aria-label="Godina scenarija"
              value={Number.isFinite(Number(year)) ? year : ''}
              onChange={(e) => navigate(id, e.target.value)}
            >
              <option value="" disabled>
                Odaberite dostupnu godinu
              </option>
              {[...new Set([...years, Number(year)])]
                .filter(Number.isFinite)
                .sort((a, b) => b - a)
                .map((y) => (
                  <option key={y}>{y}</option>
                ))}
            </select>
          </label>
          <a className="button primary" href={moduleUrl('compare')}>
            Natrag na usporedbu →
          </a>
        </div>
      )}
      {loading && <Loading />}
      {loadError && (
        <>
          <ErrorState message={loadError} onRetry={() => setAttempt((a) => a + 1)} />
          <button
            className="button primary"
            disabled={!years.length}
            onClick={() =>
              navigate(id!, String(years.includes(2024) ? 2024 : years[years.length - 1] || 2024))
            }
          >
            Otvori novi scenarij za ovu JLS
          </button>
          <a className="text-button" href="/simulator">
            Odaberi drugu zajednicu
          </a>
        </>
      )}
      {context && (
        <>
          {!context.available && (
            <div className="notice warning" role="status">
              <strong>Automatski izračun nije dostupan</strong>
              {context.reasons.map((r) => (
                <p key={r}>{r}</p>
              ))}
            </div>
          )}
          <div className="simulator-baseline">
            {[
              ['Ukupno', context.observation.metrics.total_t.value, 't'],
              ['Miješano', context.observation.metrics.mixed_t.value, 't'],
              [
                'Objavljeni postotak odvojenog sakupljanja',
                context.observation.metrics.separate_collection_pct.value,
                '%',
              ],
              [
                'Izračunati postotak odvojenog sakupljanja',
                context.observation.metrics.control_separate_collection_pct.value,
                '%',
              ],
            ].map(([label, value, u]) => (
              <article className="panel" key={label}>
                <span>{label}</span>
                <strong>
                  {number(value, label === 'Izračunati postotak odvojenog sakupljanja' ? 4 : 2)}{' '}
                  <small>{u}</small>
                </strong>
                <span className="small-muted">{context.observation.year}. · početno stanje</span>
              </article>
            ))}
          </div>
          <fieldset className="simulator-workbench" disabled={!context.available}>
            <section className="panel simulator-controls" aria-labelledby="scenario-heading">
              <div className="section-kicker">01 / Postavite pretpostavku</div>
              <h2 id="scenario-heading">Oblikujte scenarij</h2>
              <p className="draft-status">
                Za preuzimanje rezultata koristite izvoz u CSV ili PDF izvještaj.
              </p>
              <label>
                Naziv scenarija
                <input
                  maxLength={80}
                  value={draft.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <fieldset>
                <legend>Što se događa s masom?</legend>
                {(['diversion', 'prevention'] as const).map((m) => (
                  <label
                    className={`simulator-model ${draft.model === m ? 'selected' : ''}`}
                    key={m}
                  >
                    <input
                      type="radio"
                      name="model"
                      checked={draft.model === m}
                      onChange={() => update({ model: m })}
                    />
                    <span>
                      <strong>{modelName(m)}</strong>
                      <small>
                        {m === 'diversion'
                          ? 'Dio otpada koji bi završio u miješanom spremniku sakuplja se odvojeno. Ukupna količina otpada ostaje ista.'
                          : 'Sprječava se nastanak dijela otpada koji bi završio u miješanom spremniku. Ukupnog i miješanog otpada ima manje, a odvojeno sakupljena količina ostaje ista.'}
                      </small>
                    </span>
                  </label>
                ))}
              </fieldset>
              <label>
                Način unosa
                <select
                  aria-label="Način unosa"
                  value={draft.kind}
                  onChange={(e) => {
                    update({
                      kind: e.target.value as ScenarioInput['kind'],
                      value:
                        e.target.value === 'fraction'
                          ? '0.1'
                          : e.target.value === 'target'
                            ? '50'
                            : '10',
                      reference: null,
                    });
                    setReference(null);
                  }}
                >
                  <option value="fraction">Udio početnog miješanog otpada</option>
                  <option value="tonnes">Promjena u tonama</option>
                  <option value="target">Ciljana stopa odvojenog sakupljanja</option>
                </select>
              </label>
              <label>
                {draft.kind === 'target'
                  ? 'Ciljna stopa (%)'
                  : draft.kind === 'tonnes'
                    ? 'Promjena mase (t)'
                    : 'Smanjenje miješanog (%)'}
                <input
                  type="number"
                  aria-label="Vrijednost scenarija"
                  min="0"
                  max={
                    draft.kind === 'tonnes'
                      ? Number(context.observation.metrics.mixed_t.value)
                      : 100
                  }
                  step="0.01"
                  value={
                    draft.value === ''
                      ? ''
                      : String(
                          Number(
                            (Number(draft.value) * (draft.kind === 'fraction' ? 100 : 1)).toFixed(
                              2,
                            ),
                          ),
                        )
                  }
                  onChange={(e) => {
                    update({
                      value:
                        e.target.value === ''
                          ? ''
                          : draft.kind === 'fraction'
                            ? String(
                                Number(
                                  (Number(Number(e.target.value).toFixed(2)) / 100).toFixed(4),
                                ),
                              )
                            : String(Number(Number(e.target.value).toFixed(2))),
                      reference: null,
                    });
                    setReference(null);
                  }}
                />
              </label>
              {draft.kind === 'fraction' && (
                <input
                  type="range"
                  aria-label="Smanjenje miješanog klizačem"
                  min="0"
                  max="100"
                  step="0.01"
                  value={Number((Number(draft.value) * 100).toFixed(2)) || 0}
                  onChange={(e) =>
                    update({ value: String(Number((Number(e.target.value) / 100).toFixed(4))) })
                  }
                />
              )}
              <p className="small-muted">
                Promjena cilja stvara vlastiti cilj. Račun koristi nezaokruženu početnu stopu iz
                masa. Scenariji su neovisne alternative, ne uzastopni koraci.
              </p>
              <button
                className="button primary"
                disabled={!data || saved.length >= 3}
                onClick={() => {
                  setSaved((old) => [...old, draft]);
                  setDraft({ ...defaultScenario(), name: `Scenarij ${saved.length + 2}` });
                  setReference(null);
                }}
              >
                Zadrži i dodaj scenarij
              </button>
              <p className="small-muted">Do četiri scenarija uz zajedničko početno stanje.</p>
            </section>
            <section className="panel simulator-result" aria-labelledby="result-heading">
              <div className="section-kicker">02 / Matematički rezultat</div>
              <h2 id="result-heading">Što se mijenja?</h2>
              {busy && <Loading message="Računam scenarije…" />}
              {calcError && (
                <ErrorState message={calcError} onRetry={() => setCalcAttempt((a) => a + 1)} />
              )}
              {latest && (
                <>
                  <div className="simulator-change">
                    <span>
                      {draft.kind === 'tonnes' ? (
                        draft.model === 'diversion' ? (
                          `Za preusmjeravanje ${number(latest.change_t)} t u odvojeno sakupljanje potrebno je izdvojiti sljedeći postotak početnog miješanog otpada:`
                        ) : (
                          `Za smanjenje otpada za ${number(latest.change_t)} t potrebno je spriječiti nastanak sljedećeg postotka početnog miješanog otpada:`
                        )
                      ) : (
                        <>
                          {draft.kind === 'target'
                            ? `Za postotak odvojenog sakupljanja od ${number(draft.value)} % potrebno je `
                            : `Za smanjenje početnog miješanog otpada za ${number(latest.mixed_reduction_pct)} % potrebno je `}
                          {draft.model === 'diversion'
                            ? 'preusmjeriti u odvojeno sakupljanje:'
                            : 'spriječiti nastanak sljedeće količine otpada:'}
                        </>
                      )}
                    </span>
                    <strong>
                      {number(
                        draft.kind === 'tonnes' ? latest.mixed_reduction_pct : latest.change_t,
                      )}
                      <small>{draft.kind === 'tonnes' ? '%' : 't'}</small>
                    </strong>
                  </div>
                  <p className="result-explanation">
                    {draft.model === 'diversion'
                      ? `Model preusmjerava ${number(latest.change_t)} t iz miješanog u odvojeno sakupljeni tok, uz nepromijenjenu ukupnu masu.`
                      : `Model sprječava nastanak ${number(latest.change_t)} t miješanog otpada. Ukupna masa smanjuje se za isti iznos, a odvojeno sakupljena masa ostaje ista.`}
                  </p>
                  <p>
                    Početna stopa iz masa: <strong>{number(latest.initial.rate_pct)} %</strong>
                    {draft.kind === 'target' && (
                      <>
                        {' '}
                        · Željeni cilj: <strong>{number(draft.value)} %</strong>
                      </>
                    )}
                    .
                  </p>
                  <div className="simulator-result-grid">
                    <div>
                      <span>Odvojeno sakupljanje · prije → poslije</span>
                      <strong>
                        {number(latest.initial.rate_pct)} % → {number(latest.result.rate_pct)} %
                      </strong>
                    </div>
                    <div>
                      <span>Promjena ukupnog</span>
                      <strong>{number(latest.difference.total_t)} t</strong>
                    </div>
                    <div>
                      <span>Promjena miješanog po stanovniku</span>
                      <strong>{number(latest.difference.mixed_kg_per_person)} kg/stan.</strong>
                    </div>
                  </div>
                  {!context.observation.population_usable && (
                    <p className="notice warning">
                      Obuhvaćena populacija zahtijeva provjeru. Izračuni po stanovniku nisu
                      dostupni; objavljeni kg/stanovniku nisu zamjenski nazivnik.
                    </p>
                  )}
                  {latest.already_reached && (
                    <p className="notice">
                      Cilj je već dosegnut prema početnim masama. Početno stanje ostaje
                      nepromijenjeno.
                    </p>
                  )}
                  {latest.result.rate_pct === null && (
                    <p>Uz nultu ukupnu masu stopa nije definirana.</p>
                  )}
                </>
              )}
              {activeRef && draft.reference && (
                <aside className="simulator-reference">
                  <strong>Referentni cilj: {activeRef.municipality.name}</strong>
                  <p>
                    {activeRef.observation.year}. ·{' '}
                    {number(activeRef.observation.metrics.separate_collection_pct.value)} % ·
                    objavljena stopa odvojenog sakupljanja
                  </p>
                  <p>
                    {activeRef.observation.source.title} · redak {activeRef.observation.source_row}
                  </p>
                  {activeRef.observation.issues.map((issue, i) => (
                    <p className="small-muted" key={i}>
                      {issue.description}
                    </p>
                  ))}
                </aside>
              )}
              {latest && (
                <a className="button primary simulator-compare-link" href="#scenario-comparison">
                  Usporedi na grafikonu i u tablici ↓
                </a>
              )}
            </section>
          </fieldset>
          {saved.length > 0 && (
            <div className="simulator-saved" aria-label="Zadržani scenariji">
              {saved.map((s, i) => (
                <article className="panel" key={i}>
                  <strong>{s.name}</strong>
                  <span>{modelName(s.model)}</span>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSaved((old) => old.filter((_, j) => j !== i));
                    }}
                  >
                    Ukloni {s.name}
                  </button>
                </article>
              ))}
            </div>
          )}
          {data && (
            <section
              id="scenario-comparison"
              className="panel simulator-comparison"
              aria-labelledby="comparison-heading"
            >
              <div className="section-kicker">03 / Usporedite alternative</div>
              <h2 id="comparison-heading">Početno stanje i scenariji</h2>
              <div className="simulator-toolbar">
                <button
                  className="button secondary"
                  aria-pressed={!table}
                  onClick={() => setTable(false)}
                >
                  Graf
                </button>
                <button
                  className="button secondary"
                  aria-pressed={table}
                  onClick={() => setTable(true)}
                >
                  Tablica
                </button>
                <label>
                  Jedinica grafa
                  <select value={unit} onChange={(e) => setUnit(e.target.value as 't' | 'kg')}>
                    <option value="t">Tone</option>
                    <option value="kg" disabled={!context.observation.population_usable}>
                      kg po obuhvaćenom stanovniku
                    </option>
                  </select>
                </label>
              </div>
              {!table ? (
                <>
                  <p className="small-muted">
                    Masa otpada ({unit === 't' ? 't' : 'kg po obuhvaćenom stanovniku'}).
                    Preusmjeravanje mijenja sastav, prevencija smanjuje visinu stupca.
                  </p>
                  <div
                    className="simulator-chart"
                    role="region"
                    aria-label="Usporedni graf masa otpada"
                  >
                    <ResponsiveContainer width="100%" height={340}>
                      <BarChart
                        data={chartData}
                        accessibilityLayer
                        margin={{ left: 0, right: 12, bottom: 35, top: 12 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} interval={0} height={65} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(value) => number(value)} />
                        <Legend />
                        <Bar dataKey="Miješano" stackId="mass" fill="#66786c" />
                        <Bar dataKey="Odvojeno sakupljeno" stackId="mass" fill="#207c57" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="simulator-rates">
                    {data.scenarios.map((s, i) => (
                      <article key={i}>
                        <span>{s.input.name}</span>
                        <strong>{number(s.result.rate_pct)} %</strong>
                        <small>
                          {number(s.initial.rate_pct)} % → {number(s.result.rate_pct)} %
                        </small>
                      </article>
                    ))}
                  </div>
                </>
              ) : null}
              <div
                className={`simulator-table ${table ? '' : 'print-only'}`}
                tabIndex={0}
                role="region"
                aria-label="Tablica scenarija"
              >
                <table
                  style={{
                    minWidth: 220 + (data.scenarios.length + 1) * 150,
                    tableLayout: 'fixed',
                  }}
                >
                  <colgroup>
                    <col style={{ width: 220 }} />
                    <col style={{ width: 150 }} />
                    {data.scenarios.map((_, i) => (
                      <col key={i} style={{ width: 150 }} />
                    ))}
                  </colgroup>
                  <caption>Vrijednosti i razlike prema početnom stanju, {year}.</caption>
                  <thead>
                    <tr>
                      <th scope="col">Pokazatelj</th>
                      <th scope="col">Početno</th>
                      {data.scenarios.map((s, i) => (
                        <th scope="col" key={i}>
                          {s.input.name}
                          <br />
                          <small>vrijednost / razlika</small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(labels).map((key) => (
                      <tr key={key}>
                        <th scope="row">
                          {labels[key]} (
                          {key === 'rate_pct'
                            ? '% · prije → poslije'
                            : key.includes('kg')
                              ? 'kg/obuhvaćeni stan.'
                              : 't'}
                          )
                        </th>
                        <td>{number(data.scenarios[0].initial[key as keyof ScenarioState])}</td>
                        {data.scenarios.map((s, i) => (
                          <td key={i}>
                            {key === 'rate_pct' ? (
                              <>
                                {number(s.initial.rate_pct)} % → {number(s.result.rate_pct)} %
                              </>
                            ) : (
                              <>
                                {number(s.result[key as keyof ScenarioState])} /{' '}
                                {number(s.difference[key])}
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="simulator-report-inputs">
                {data.scenarios.map((s, i) => (
                  <details key={i}>
                    <summary>
                      {s.input.name} · {modelName(s.input.model)}
                    </summary>
                    <p>
                      Unos:{' '}
                      {s.input.kind === 'target'
                        ? 'ciljna stopa (%)'
                        : s.input.kind === 'fraction'
                          ? 'udio miješanog (0–1)'
                          : 'tone'}{' '}
                      = {number(s.input.value)}. Potrebna promjena: {number(s.change_t)} t.
                    </p>
                    {s.reference && (
                      <p>
                        Referenca: {s.reference.municipality.name}, {s.reference.observation.year}.,
                        objavljena stopa{' '}
                        {number(s.reference.observation.metrics.separate_collection_pct.value)} %.
                        Izvor: {s.reference.observation.source.path}, redak{' '}
                        {s.reference.observation.source_row}, SHA-256:{' '}
                        {s.reference.observation.source.sha256}.
                      </p>
                    )}
                  </details>
                ))}
              </div>
              <div className="simulator-toolbar no-print">
                <button
                  className="button secondary"
                  onClick={() => {
                    const quote = (x: unknown) => {
                      let text = String(x ?? 'Nema podatka');
                      if (/^[=+@\-\t\r]/.test(text) && !/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(text))
                        text = "'" + text;
                      return '"' + text.replaceAll('"', '""') + '"';
                    };
                    const rows = [
                      [
                        'JLS',
                        'Godina',
                        'Scenarij',
                        'Model',
                        'Pokazatelj',
                        'Jedinica',
                        'Početno',
                        'Rezultat',
                        'Razlika',
                        'Izvor SHA256',
                        'Verzija modela',
                        'Način unosa',
                        'Vrijednost unosa',
                        'Referentna JLS',
                        'Referentni izvor SHA256',
                      ],
                      ...data.scenarios.flatMap((s) =>
                        Object.keys(labels).map((k) => [
                          context.municipality.name,
                          year,
                          s.input.name,
                          s.input.model,
                          labels[k],
                          k === 'rate_pct'
                            ? '% (razlika pb)'
                            : k.includes('kg')
                              ? 'kg/obuhvaćeni stan.'
                              : 't',
                          s.initial[k as keyof ScenarioState],
                          s.result[k as keyof ScenarioState],
                          s.difference[k],
                          context.observation.source.sha256,
                          VERSION,
                          s.input.kind,
                          s.input.value,
                          s.reference?.municipality.name ?? '',
                          s.reference?.observation.source.sha256 ?? '',
                        ]),
                      ),
                      ...data.assumptions.map((a) => ['Pretpostavka', a]),
                    ];
                    download(
                      'wastewise-scenariji.csv',
                      '\uFEFF' + rows.map((r) => r.map(quote).join(';')).join('\r\n'),
                      'text/csv;charset=utf-8',
                    );
                  }}
                >
                  Izvezi CSV
                </button>
                <button className="button secondary" onClick={() => window.print()}>
                  Ispiši izvještaj / PDF
                </button>
              </div>
            </section>
          )}
          <p role="status" className="small-muted">
            {notice}
          </p>
          <section className="panel simulator-formulas">
            <h2>Ključne pretpostavke</h2>
            <p>
              Hipotetski matematički scenarij, ne prognoza učinka javne politike. Obuhvat i pouzdana
              obuhvaćena populacija ostaju isti.
            </p>
            <p>
              Preusmjeravanje čuva ukupnu masu; prevencija čuva odvojeno sakupljenu masu. Ne tvrdimo
              da je sav miješani otpad moguće odvojiti.
            </p>
            <Methodology />
          </section>
          <p className="print-only">
            Početni izvor: {context.observation.source.path}; list{' '}
            {context.observation.source.sheet}; redak {context.observation.source_row}; zapis{' '}
            {context.observation.id}; SHA-256 {context.observation.source.sha256}. Objavljena stopa{' '}
            {number(context.observation.metrics.separate_collection_pct.value)} %, početna stopa iz
            masa {number(context.observation.metrics.control_separate_collection_pct.value, 4)} %.
          </p>
          <Quality selected={context.observation} observations={history} />
          <Sources observations={history} selectedYear={Number(year)} />
        </>
      )}
      {data && <PrintReport data={data} history={history} />}
    </WorkspaceLayout>
  );
}
