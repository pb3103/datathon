import type { Observation, SimulationOutput } from '../api/client';
import { formatNumber, explainIssue, visibleSourceIssues } from '../domain';
const labels: Record<string, string> = {
  total_t: 'Ukupno (t)',
  mixed_t: 'Miješano (t)',
  separate_t: 'Odvojeno sakupljeno (t)',
  rate_pct: 'Stopa (%; razlika u pb)',
  total_kg_per_person: 'Ukupno (kg/obuhv. stan.)',
  mixed_kg_per_person: 'Miješano (kg/obuhv. stan.)',
  separate_kg_per_person: 'Odvojeno (kg/obuhv. stan.)',
};
const fmt = (v: unknown) => (v == null ? 'Nema podatka' : formatNumber(Number(v)));
export function PrintReport({ data, history }: { data: SimulationOutput; history: Observation[] }) {
  const { context, scenarios } = data;
  const obs = context.observation;
  const warnings = history
    .filter((o) => o.year === obs.year || o.year >= 2023)
    .flatMap((o) => visibleSourceIssues(o.source.issues).map((i) => ({ year: o.year, issue: i })));
  return (
    <section className="print-only print-report" aria-label="Izvještaj scenarija WasteWise">
      <header>
        <p>WasteWise · matematički scenariji</p>
        <h1>
          {context.municipality.name} · {obs.year}.
        </h1>
        <p>
          Hipotetski izračun, bez prognoze učinka javne politike. Odvojeno sakupljanje nije
          recikliranje.
        </p>
      </header>
      <p>
        <strong>Početno:</strong> ukupno {fmt(scenarios[0].initial.total_t)} t, miješano{' '}
        {fmt(scenarios[0].initial.mixed_t)} t. Objavljena stopa{' '}
        {fmt(obs.metrics.separate_collection_pct.value)} %, iz masa{' '}
        {formatNumber(Number(scenarios[0].initial.rate_pct), 4)} %. Populacija{' '}
        {obs.population_usable
          ? 'prihvatljiva za izračun po stanovniku'
          : 'zahtijeva provjeru; izvedeni kg po stanovniku nisu dostupni'}
        .
      </p>
      <table>
        <caption>
          Početno stanje i neovisni scenariji; vrijednost / razlika prema početnom stanju
        </caption>
        <thead>
          <tr>
            <th scope="col">Pokazatelj</th>
            <th scope="col">Početno</th>
            {scenarios.map((s, i) => (
              <th scope="col" key={i}>
                {s.input.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(labels).map(([key, label]) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              <td>{fmt(scenarios[0].initial[key as keyof (typeof scenarios)[0]['initial']])}</td>
              {scenarios.map((s, i) => (
                <td key={i}>
                  {fmt(s.result[key as keyof typeof s.result])} / {fmt(s.difference[key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <h2>Parametri i reference</h2>
      {scenarios.map((s, i) => (
        <div className="print-scenario" key={i}>
          <strong>
            {s.input.name} · {s.input.model === 'diversion' ? 'Preusmjeravanje' : 'Prevencija'}
          </strong>
          <p>
            Unos:{' '}
            {s.input.kind === 'target'
              ? 'ciljna stopa (%)'
              : s.input.kind === 'fraction'
                ? 'udio početnog miješanog (0–1)'
                : 'promjena mase (t)'}{' '}
            = {fmt(s.input.value)}. Potrebna promjena: {fmt(s.change_t)} t.
            {s.already_reached ? ' Cilj je već dosegnut; početno stanje nije promijenjeno.' : ''}
          </p>
          {s.reference && (
            <p>
              Referenca: {s.reference.municipality.name}, {s.reference.observation.year}.,
              objavljena stopa {fmt(s.reference.observation.metrics.separate_collection_pct.value)}{' '}
              %. Izvor {s.reference.observation.source.path}; redak{' '}
              {s.reference.observation.source_row}; SHA-256 {s.reference.observation.source.sha256}.
            </p>
          )}
        </div>
      ))}
      <h2>Formule i pretpostavke</h2>
      <p>
        S=T−M; stopa=100S/T. Preusmjeravanje D: T′=T, M′=M−D, S′=S+D; za viši cilj g (%) D=gT/100−S.
        Prevencija D: T′=T−D, M′=M−D, S′=S; za viši cilj D=T−100S/g uz S&gt;0. Kg/stan.=1000×masa/P.
        Pri T′=0 stopa nije definirana.
      </p>
      <ul>
        {data.assumptions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <h2>Kvaliteta i izvori</h2>
      {obs.issues.map((i, n) => (
        <p key={n}>Lokalni zapis: {explainIssue(i)}</p>
      ))}
      {warnings.map(({ year, issue }, i) => (
        <p key={i}>
          <strong>
            {year}. ·{' '}
            {issue.code === 'source_aggregate_mismatch'
              ? 'Razlika između XLSX-a i PDF-a'
              : 'Napomena izvora'}
            :
          </strong>{' '}
          {issue.description}
        </p>
      ))}
      <p>
        Početni izvor: {obs.source.path}; list {obs.source.sheet}; redak {obs.source_row}; zapis{' '}
        {obs.id}; SHA-256 {obs.source.sha256}.
      </p>
      <p>
        {context.evidence} · Model {context.model_version}. Potpuna usporedivost godina nije
        potvrđena. Kontrola zaokruživanja ne zamjenjuje objavljenu stopu.
      </p>
    </section>
  );
}
