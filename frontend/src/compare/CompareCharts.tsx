import { useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Comparison } from '../api/client';
import { formatMetric, formatNumber, mayConnect, numeric } from '../domain';
import { compareReason, historyMetric, unitLabel } from './helpers';
import { Icon } from '../components/Icon';

const colors = ['#226446', '#375f85', '#935b24', '#725882', '#436c64'];
export default function CompareCharts({
  data,
  selectedMetric,
  onMetric,
  mode,
  view,
  onMode,
  onView,
}: {
  data: Comparison;
  selectedMetric: string;
  onMetric: (key: string) => void;
  mode: 'snapshot' | 'history';
  view: 'chart' | 'table';
  onMode: (mode: 'snapshot' | 'history') => void;
  onView: (view: 'chart' | 'table') => void;
}) {
  const title = useId();
  const definition = data.metrics.find((m) => m.key === selectedMetric) ?? data.metrics[0];
  const key = definition.key;
  const snapshot = data.members.map((member) => ({
    name: member.municipality.name,
    id: member.municipality.id,
    value: member.metrics[key].quality_status === 'available' ? numeric(member.metrics[key]) : null,
  }));
  const years = [
    ...new Set(data.members.flatMap((member) => member.history.map((o) => o.year))),
  ].sort();
  const history = years.map((year) => ({
    year,
    ...Object.fromEntries(
      data.members.map((member) => {
        const m = historyMetric(member, year, key);
        return [member.municipality.id, m?.quality_status === 'available' ? numeric(m) : null];
      }),
    ),
  }));
  const connected =
    definition.family !== 'materials' &&
    data.members.every(
      (member) =>
        member.history.length > 1 &&
        member.history.slice(1).every((o, i) => mayConnect(member.history[i], o)),
    );
  const unit = unitLabel(definition.unit);
  return (
    <section className="panel compare-chart" aria-labelledby={title}>
      <div className="trend-heading">
        <div>
          <div className="section-kicker">03 / Vrijednosti u kontekstu</div>
          <h2 id={title}>Kako se razlikujete?</h2>
        </div>
        <div className="view-switch" aria-label="Prikaz usporedbe">
          <button aria-pressed={view === 'chart'} onClick={() => onView('chart')}>
            <Icon name="chart" />
            Grafikon
          </button>
          <button aria-pressed={view === 'table'} onClick={() => onView('table')}>
            <Icon name="database" />
            Tablica
          </button>
        </div>
      </div>
      <div className="compare-chart-controls">
        <div className="trend-field">
          <label htmlFor="compare-metric">Pokazatelj usporedbe</label>
          <select id="compare-metric" value={key} onChange={(e) => onMetric(e.target.value)}>
            <optgroup label="Ključni pokazatelji">
              {data.metrics
                .filter((m) => m.family !== 'materials')
                .map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({unitLabel(m.unit)})
                  </option>
                ))}
            </optgroup>
            <optgroup label="Detaljno: materijalne kategorije">
              {data.metrics
                .filter((m) => m.family === 'materials')
                .map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({unitLabel(m.unit)})
                  </option>
                ))}
            </optgroup>
          </select>
        </div>
        <div className="view-switch" aria-label="Razdoblje usporedbe">
          <button aria-pressed={mode === 'snapshot'} onClick={() => onMode('snapshot')}>
            Odabrana godina
          </button>
          <button aria-pressed={mode === 'history'} onClick={() => onMode('history')}>
            Kroz godine
          </button>
        </div>
      </div>
      <p className="chart-description">
        {mode === 'snapshot'
          ? `${data.year}. · Razlike su izračunate u odnosu na početnu JLS. Predznak opisuje smjer razlike, ne kvalitetu usluge.`
          : connected
            ? 'Povezane su samo uzastopne godine s potvrđenom usporedivošću.'
            : 'Godine su prikazane odvojeno. Usporedivost cijelog razdoblja nije potvrđena; nema povezujućih linija ni godišnjih promjena.'}{' '}
        Jedinica: {unit}.
      </p>
      {mode === 'snapshot' && snapshot.every((row) => row.value === null) && (
        <p className="notice warning">
          Za ovaj pokazatelj i godinu nema metodološki dostupnih vrijednosti. Nedostajući podatak
          nije nula; provjerite izvore ili odaberite drugi pokazatelj.
        </p>
      )}
      {view === 'chart' ? (
        <>
          <div
            className="compare-plot"
            style={{ height: mode === 'snapshot' ? Math.max(220, data.members.length * 62) : 320 }}
          >
            <ResponsiveContainer width="100%" height="100%">
              {mode === 'snapshot' ? (
                <BarChart
                  data={snapshot}
                  layout="vertical"
                  margin={{ left: 0, right: 25, top: 10, bottom: 10 }}
                  accessibilityLayer
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 5" stroke="#e0e7db" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatNumber(Number(v), 0)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={125} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [
                      `${formatNumber(Number(value))} ${unit}`,
                      definition.label,
                    ]}
                  />
                  <Bar
                    dataKey="value"
                    name={definition.label}
                    radius={[0, 5, 5, 0]}
                    maxBarSize={32}
                    isAnimationActive={false}
                  >
                    {snapshot.map((row, i) => (
                      <Cell key={row.id} fill={colors[i]} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <ComposedChart
                  data={history}
                  margin={{ left: 0, right: 15, top: 10, bottom: 10 }}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e0e7db" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis
                    width={65}
                    tickFormatter={(v) => formatNumber(Number(v), 0)}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      `${formatNumber(Number(value))} ${unit}`,
                      data.members.find((m) => m.municipality.id === name)?.municipality.name ??
                        name,
                    ]}
                    labelFormatter={(label) => `${label}. godina`}
                  />
                  <Legend
                    formatter={(value) =>
                      data.members.find((m) => m.municipality.id === value)?.municipality.name ??
                      value
                    }
                  />
                  {data.members.map((member, i) =>
                    connected ? (
                      <Line
                        key={member.municipality.id}
                        dataKey={member.municipality.id}
                        stroke={colors[i]}
                        dot={{ r: 4 }}
                        strokeDasharray={i % 2 ? '5 3' : undefined}
                        connectNulls={false}
                        isAnimationActive={false}
                      />
                    ) : (
                      <Bar
                        key={member.municipality.id}
                        dataKey={member.municipality.id}
                        fill={colors[i]}
                        radius={[3, 3, 0, 0]}
                        maxBarSize={30}
                        isAnimationActive={false}
                      />
                    ),
                  )}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
          <ul className="missing-metric-list">
            {data.members
              .filter(
                (m) =>
                  m.metrics[key].value === null || m.metrics[key].quality_status !== 'available',
              )
              .map((member) => (
                <li key={member.municipality.id}>
                  <strong>{member.municipality.name}:</strong>{' '}
                  {compareReason(member.metrics[key].reason ?? 'quality_requires_review')}
                </li>
              ))}
          </ul>
        </>
      ) : (
        <div
          className="table-scroll"
          role="region"
          tabIndex={0}
          aria-label="Usporedni podaci, vodoravno pomicanje"
        >
          <table>
            <caption>
              {definition.label} · {unit}. Razlika = odabrana JLS − početna JLS.
            </caption>
            <thead>
              <tr>
                <th scope="col">Grad / općina</th>
                {mode === 'snapshot' ? (
                  <>
                    <th scope="col">Vrijednost · {data.year}.</th>
                    <th scope="col">Razlika · {unitLabel(definition.difference_unit)}</th>
                    {definition.family === 'per_person' && (
                      <th scope="col">Objavljeno ukupno kg/stan.</th>
                    )}
                  </>
                ) : (
                  years.map((year) => (
                    <th key={year} scope="col">
                      {year}.
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {data.members.map((member) => (
                <tr key={member.municipality.id}>
                  <th scope="row">
                    {member.municipality.name}
                    {member.municipality.id === data.baseline_id && <small>Početna JLS</small>}
                  </th>
                  {mode === 'snapshot' ? (
                    <>
                      <td>
                        {formatMetric(member.metrics[key])}
                        {member.metrics[key].value === null && (
                          <small>{compareReason(member.metrics[key].reason)}</small>
                        )}
                        {member.metrics[key].quality_status === 'review_required' && (
                          <small>Potrebna provjera</small>
                        )}
                      </td>
                      <td>
                        {formatMetric(member.differences[key])}
                        {member.differences[key].value === null && (
                          <small>{compareReason(member.differences[key].reason)}</small>
                        )}
                      </td>
                      {definition.family === 'per_person' && (
                        <td>
                          {formatMetric(
                            member.observation?.metrics.published_kg_per_covered_person,
                          )}
                          {member.observation?.metrics.published_kg_per_covered_person
                            ?.quality_status === 'review_required' && (
                            <small>Nesklad · potrebna provjera</small>
                          )}
                        </td>
                      )}
                    </>
                  ) : (
                    years.map((year) => (
                      <td key={year}>
                        {formatMetric(historyMetric(member, year, key))}
                        {historyMetric(member, year, key)?.quality_status === 'review_required' && (
                          <small>Nesklad · potrebna provjera</small>
                        )}
                        {historyMetric(member, year, key)?.value == null && (
                          <small>{compareReason(historyMetric(member, year, key)?.reason)}</small>
                        )}
                      </td>
                    ))
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="chart-footnote">
        Izvori i kvaliteta prikazani su niže za svaku JLS. Graf je dostupan tipkovnicom; iste su
        vrijednosti u tablici. Materijalne kategorije ne zbrajaju se i ne pretvaraju u tone.
      </p>
    </section>
  );
}
