import { RateEvidence } from './RateEvidence';
import { visibleSourceIssues } from '../domain';
import { useId, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Observation } from '../api/client';
import {
  explainReason,
  formatMetric,
  formatNumber,
  isVerified,
  mayConnect,
  numeric,
} from '../domain';
import { Icon } from './Icon';

type Mode = 'mass' | 'per_person' | 'rate';
const configurations = {
  mass: {
    title: 'Količine otpada',
    unit: 't',
    series: [
      { key: 'total_t', title: 'Ukupno sakupljeno', color: '#226446' },
      { key: 'mixed_t', title: 'Miješani otpad', color: '#8292a5' },
    ],
  },
  per_person: {
    title: 'Po obuhvaćenom stanovniku',
    unit: 'kg/obuhv. stan.',
    series: [
      { key: 'total_kg_per_covered_person', title: 'Ukupno · izračunato', color: '#226446' },
      { key: 'mixed_kg_per_covered_person', title: 'Miješano · izračunato', color: '#8292a5' },
    ],
  },
  rate: {
    title: 'Izračunati udjeli i službene stope',
    unit: '%',
    series: [
      {
        key: 'separate_collection_pct',
        title: 'Službeno objavljeno · stopa odvojenog sakupljanja',
        color: '#226446',
      },
      {
        key: 'calculated_nonmixed_share_pct',
        title: 'Izračunato · udio izvan miješanog toka',
        color: '#8292a5',
      },
    ],
  },
};

export function Trends({
  observations,
  municipalityName,
  selectedYear,
  onYear,
}: {
  observations: Observation[];
  municipalityName: string;
  selectedYear: number | null;
  onYear: (year: number) => void;
}) {
  const [mode, setMode] = useState<Mode>('mass');
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const descId = useId();
  const titleId = useId();
  const patternId = `mixed-pattern-${useId().replaceAll(':', '')}`;
  const config = configurations[mode];
  const sorted = [...observations].sort((a, b) => a.year - b.year);
  const scopeLabel = sorted.some((item) => item.scope.startsWith('historical_'))
    ? 'obuhvat ovisi o godišnjem izvoru'
    : 'javna usluga';
  const connected =
    sorted.length > 1 &&
    sorted.slice(1).every((observation, index) => mayConnect(sorted[index], observation));
  const data = sorted.map((observation) => ({
    year: observation.year,
    ...Object.fromEntries(
      config.series.map((series) => [series.key, numeric(observation.metrics[series.key])]),
    ),
  }));
  const hasValues = data.some((row) =>
    config.series.some((series) => (row as Record<string, unknown>)[series.key] != null),
  );
  return (
    <section className="panel trend-panel" aria-labelledby={titleId}>
      <div className="trend-heading">
        <div>
          <div className="section-kicker">02 / Pregled kroz godine</div>
          <h2 id={titleId}>
            Godišnji pregled{' '}
            <span>
              {sorted[0]?.year}.–{sorted.at(-1)?.year}.
            </span>
          </h2>
        </div>
        <div className="view-switch" aria-label="Prikaz godišnjih podataka">
          <button aria-pressed={view === 'chart'} onClick={() => setView('chart')}>
            <Icon name="chart" />
            Grafikon
          </button>
          <button aria-pressed={view === 'table'} onClick={() => setView('table')}>
            <Icon name="database" />
            Tablica
          </button>
        </div>
      </div>
      <div className="trend-controls">
        <div className="trend-field">
          <label htmlFor="trend-metric">Pokazatelj</label>
          <select
            id="trend-metric"
            value={mode}
            onChange={(event) => setMode(event.target.value as Mode)}
          >
            <option value="mass">Količine otpada (t)</option>
            <option value="per_person">Po obuhvaćenom stanovniku (kg)</option>
            <option value="rate">Udjeli i stope (%)</option>
          </select>
        </div>
        <span className={`badge ${connected ? 'neutral' : 'warning'}`}>
          <Icon name="info" />
          {connected ? 'Usporedivi podaci' : 'Uvjetna usporedivost'}
        </span>
      </div>
      <p className="chart-description" id={descId}>
        {connected
          ? 'Povezane su samo uzastopne godine s potvrđenom usporedivošću.'
          : 'Svaka godina prikazana je zasebno. Usporedivost nije potvrđena za cijelo razdoblje, pa nema povezujuće linije ni izračuna godišnjih promjena.'}{' '}
        Obuhvat: {scopeLabel}. Jedinica: {config.unit}.
      </p>
      {view === 'chart' ? (
        <figure className="chart-figure" aria-labelledby={titleId} aria-describedby={descId}>
          {hasValues ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={290}>
                <ComposedChart
                  data={data}
                  margin={{ top: 15, right: 12, bottom: 8, left: 15 }}
                  accessibilityLayer
                >
                  <defs>
                    <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse">
                      <rect width="6" height="6" fill="#8292a5" />
                      <path d="M0 6 6 0" stroke="#fff" strokeWidth="1" />
                    </pattern>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e7ebe5" strokeDasharray="3 5" />
                  <XAxis
                    dataKey="year"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: '#59675e' }}
                    dy={8}
                  />
                  <YAxis
                    tickFormatter={(value) => formatNumber(Number(value), 0)}
                    domain={mode === 'rate' ? [0, 100] : [0, 'auto']}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#59675e' }}
                    width={62}
                  />
                  <Tooltip
                    labelFormatter={(label) => `${label}. godina`}
                    formatter={(value, name) => [
                      `${formatNumber(Number(value))} ${config.unit}`,
                      config.series.find((series) => series.key === name)?.title ?? name,
                    ]}
                    cursor={{ fill: '#edf2e9', opacity: 0.55 }}
                    contentStyle={{ borderRadius: 10, border: '1px solid #dce3d9', fontSize: 13 }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="legend-label">
                        {config.series.find((series) => series.key === value)?.title ?? value}
                      </span>
                    )}
                    iconType={connected ? 'line' : 'rect'}
                    wrapperStyle={{ paddingTop: 18 }}
                  />
                  {config.series.map((series) =>
                    connected ? (
                      <Line
                        key={series.key}
                        name={series.key}
                        dataKey={series.key}
                        type="linear"
                        stroke={series.color}
                        strokeWidth={2}
                        dot={{ r: 5 }}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    ) : (
                      <Bar
                        key={series.key}
                        name={series.key}
                        dataKey={series.key}
                        fill={
                          series.key.startsWith('mixed_') ||
                          series.key === 'calculated_nonmixed_share_pct'
                            ? `url(#${patternId})`
                            : series.color
                        }
                        radius={[4, 4, 0, 0]}
                        maxBarSize={42}
                        isAnimationActive={false}
                      />
                    ),
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="state-box">
              <Icon name="info" />
              <p>Nema podataka za ovaj pokazatelj. Razlozi su dostupni u tablici.</p>
            </div>
          )}
          <figcaption>
            {!connected &&
              config.series.some((series) => series.key.startsWith('mixed_')) &&
              'Miješani otpad označen je prugastim stupcima. '}
            Izvori: godišnji XLSX prilozi i pregledani CSV/PDF retci odabrane JLS.{' '}
            <a href="#sources">Pregled izvora i napomena ↗</a>
          </figcaption>
        </figure>
      ) : (
        <div
          className="table-scroll"
          role="region"
          aria-label="Godišnje vrijednosti, vodoravno pomicanje na manjim ekranima"
          tabIndex={0}
        >
          <table>
            <caption>
              {config.title} · {scopeLabel} · {config.unit}. Godina je gumb za promjenu odabira.
            </caption>
            <thead>
              <tr>
                <th scope="col">Godina</th>
                {config.series.map((series) => (
                  <th key={series.key} scope="col">
                    {series.title}
                    <small>{config.unit}</small>
                  </th>
                ))}
                {mode === 'per_person' && (
                  <th scope="col">
                    Ukupno · objavljeno<small>kg/obuhv. stan.</small>
                  </th>
                )}
                <th scope="col">Usporedivost i kvaliteta</th>
                <th scope="col">Izvor</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((observation) => (
                <tr
                  key={observation.year}
                  aria-current={observation.year === selectedYear ? 'true' : undefined}
                >
                  <th scope="row">
                    <button
                      className="year-link"
                      onClick={() => onYear(observation.year)}
                      aria-label={`Odaberi ${observation.year}. godinu`}
                    >
                      {observation.year}.{' '}
                      {observation.year === selectedYear && (
                        <span className="sr-only">(odabrano)</span>
                      )}
                    </button>
                  </th>
                  {config.series.map((series) => (
                    <td key={series.key}>
                      {formatMetric(observation.metrics[series.key])}
                      {numeric(observation.metrics[series.key]) === null && (
                        <small>{explainReason(observation.metrics[series.key]?.reason)}</small>
                      )}
                    </td>
                  ))}
                  {mode === 'per_person' && (
                    <td>
                      {formatMetric(
                        observation.metrics.published_kg_per_covered_person,
                        observation.year === 2024 ? 2 : 0,
                      )}
                      {observation.issues.some(
                        (issue) => issue.code === 'kg_per_capita_mismatch',
                      ) && <small className="warning-text">Nesklad · potrebna provjera</small>}
                    </td>
                  )}
                  <td>
                    <span>{isVerified(observation) ? 'Usporedivo' : 'Uvjetno'}</span>
                    {visibleSourceIssues(observation.source.issues).length > 0 && (
                      <small className="warning-text">Napomena izvora za {observation.year}.</small>
                    )}
                    {observation.issues.length > 0 && (
                      <small className="warning-text">Potrebna provjera zapisa</small>
                    )}
                  </td>
                  <td>
                    <a href={`#source-${observation.year}`}>
                      Prilog 1, redak {observation.source_row}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {mode === 'rate' && (
        <RateEvidence
          records={sorted.map((observation) => ({
            name: municipalityName,
            observation,
          }))}
        />
      )}
    </section>
  );
}
