import {
  ChartLegend,
  ChartPlaceTick,
  chartTooltipStyle,
  useDismissibleChartTooltip,
  useCompactChart,
  compactTick,
} from '../components/ChartPresentation';
import { chartPalette } from '../chartPalette';
import { RateEvidence } from '../components/RateEvidence';
import { rateMetricKey } from '../domain';
import { useEffect, useId } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const colors = chartPalette.communities;
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
  const compact = useCompactChart();
  const { chartRef, tooltipInteraction } = useDismissibleChartTooltip();
  const availableMetrics = data.metrics.filter(
    (metric) =>
      metric.family !== 'materials' ||
      data.members.some((member) => {
        const value = member.metrics[metric.key];
        return value?.quality_status === 'available' && numeric(value) !== null;
      }),
  );
  const materialMetrics = availableMetrics.filter((metric) => metric.family === 'materials');
  const definition = availableMetrics.find((m) => m.key === selectedMetric) ?? availableMetrics[0];
  useEffect(() => {
    if (selectedMetric !== definition.key) onMetric(definition.key);
  }, [selectedMetric, definition.key, onMetric]);
  const key = definition.key;
  const isRate = key === 'separate_collection_pct';
  const displayKey = isRate ? rateMetricKey(data.year) : key;
  const historyKey = (year: number) => (isRate ? rateMetricKey(year) : key);
  const snapshot = data.members.map((member) => ({
    name: member.municipality.name,
    id: member.municipality.id,
    value:
      member.metrics[displayKey].quality_status === 'available'
        ? numeric(member.metrics[displayKey])
        : null,
  }));
  const years = [
    ...new Set(data.members.flatMap((member) => member.history.map((o) => o.year))),
  ].sort();
  const history = years.map((year) => ({
    year,
    ...Object.fromEntries(
      data.members.map((member) => {
        const m = historyMetric(member, year, historyKey(year));
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
  const baselineName =
    data.members.find((member) => member.municipality.id === data.baseline_id)?.municipality.name ??
    'početnu lokaciju';
  return (
    <section className="panel compare-chart" aria-labelledby={title}>
      <div className="trend-heading">
        <div>
          <div className="section-kicker">03 / Vrijednosti u kontekstu</div>
          <h2 id={title}>Razlike među zajednicama</h2>
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
              {availableMetrics
                .filter((m) => m.family !== 'materials' && m.family !== 'historical_share')
                .map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.key === 'separate_collection_pct' ? 'Otpad izvan miješanog toka' : m.label} (
                    {unitLabel(m.unit)})
                  </option>
                ))}
            </optgroup>
            {materialMetrics.length > 0 && (
              <optgroup label="Detaljno: materijalne kategorije">
                {materialMetrics.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label} ({unitLabel(m.unit)})
                  </option>
                ))}
              </optgroup>
            )}
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
          ? `${data.year}. · Vrijednosti za odabrane gradove i općine.`
          : connected
            ? 'Povezane su samo uzastopne godine s potvrđenom usporedivošću.'
            : 'Obuhvat podataka razlikuje se među godinama, pa su vrijednosti prikazane zasebno.'}{' '}
        Jedinica: {unit}.
      </p>
      {mode === 'snapshot' && snapshot.every((row) => row.value === null) && (
        <p className="notice warning">
          Za ovaj pokazatelj i godinu podaci nedostaju ili zahtijevaju provjeru. Odaberite drugu
          godinu ili pokazatelj.
        </p>
      )}
      {isRate && (
        <p className="small-muted">
          2017.–2020.: izračunati udio izvan miješanog toka. Od 2021.: objavljena stopa odvojenog
          sakupljanja. To nije postotak recikliranog otpada.
        </p>
      )}
      {view === 'chart' ? (
        <>
          <div
            ref={chartRef}
            className="compare-plot"
            role="region"
            aria-label="Graf usporedbe lokacija"
            tabIndex={0}
          >
            <ResponsiveContainer
              width="100%"
              height={
                mode === 'snapshot'
                  ? Math.max(220, data.members.length * 48 + 70)
                  : compact
                    ? 260
                    : 320
              }
              minWidth={compact && mode === 'history' && data.members.length > 2 ? 520 : undefined}
            >
              {mode === 'snapshot' ? (
                <BarChart
                  data={snapshot}
                  layout="vertical"
                  margin={{ left: compact ? 16 : 16, right: 16, top: 10, bottom: compact ? 4 : 18 }}
                  accessibilityLayer
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 5" stroke="#e0e7db" />
                  <XAxis
                    type="number"
                    height={50}
                    tickCount={compact ? 4 : 5}
                    label={{
                      value: unit,
                      position: 'insideBottom',
                      offset: 0,
                      fontSize: compact ? 9 : 12,
                      fill: '#52665a',
                    }}
                    tickFormatter={(v) =>
                      compact ? compactTick(Number(v)) : formatNumber(Number(v), 0)
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={compact ? 88 : 145}
                    tick={compact ? <ChartPlaceTick /> : { fontSize: 12 }}
                    label={{
                      content: ({ viewBox }) => {
                        if (!viewBox || !('x' in viewBox)) return null;
                        const x = 8;
                        const y = Number(viewBox.y) + Number(viewBox.height) / 2;
                        return (
                          <text
                            className="recharts-label"
                            x={x}
                            y={y}
                            transform={`rotate(-90, ${x}, ${y})`}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={compact ? 9 : 12}
                            fill="#52665a"
                          >
                            Grad / općina
                          </text>
                        );
                      },
                    }}
                  />
                  <Tooltip
                    {...tooltipInteraction}
                    position={compact ? { x: 0, y: 0 } : undefined}
                    contentStyle={chartTooltipStyle}
                    wrapperStyle={{ maxWidth: 'calc(100vw - 64px)', pointerEvents: 'none' }}
                    itemStyle={{ whiteSpace: 'normal', overflowWrap: 'anywhere', padding: '3px 0' }}
                    labelStyle={{ fontSize: 'inherit', marginBottom: 4 }}
                    formatter={(value) => [
                      `${formatNumber(Number(value))} ${unit}`,
                      isRate
                        ? data.year < 2021
                          ? 'Izvan miješanog toka · izračunati udio'
                          : 'Odvojeno sakupljanje · objavljena stopa'
                        : definition.label,
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
                  margin={{ left: compact ? 14 : 18, right: 12, top: 10, bottom: compact ? 4 : 20 }}
                  accessibilityLayer
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e0e7db" />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: compact ? 10 : 11 }}
                    interval={compact ? 0 : 'preserveStartEnd'}
                    height={48}
                    label={{
                      value: 'Godina',
                      position: 'insideBottom',
                      offset: 0,
                      fontSize: compact ? 9 : 12,
                      fill: '#52665a',
                    }}
                  />
                  <YAxis
                    width={compact ? 48 : 75}
                    label={{
                      value: unit,
                      angle: -90,
                      position: 'insideLeft',
                      offset: -10,
                      fontSize: compact ? 9 : 12,
                      fill: '#52665a',
                    }}
                    tickFormatter={(v) =>
                      compact ? compactTick(Number(v)) : formatNumber(Number(v), 0)
                    }
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    {...tooltipInteraction}
                    position={compact ? { x: 0, y: 0 } : undefined}
                    contentStyle={chartTooltipStyle}
                    wrapperStyle={{ maxWidth: 'calc(100vw - 64px)', pointerEvents: 'none' }}
                    itemStyle={{ whiteSpace: 'normal', overflowWrap: 'anywhere', padding: '3px 0' }}
                    labelStyle={{ fontSize: 'inherit', marginBottom: 4 }}
                    formatter={(value, name) => [
                      `${formatNumber(Number(value))} ${unit}`,
                      data.members.find((m) => m.municipality.id === name)?.municipality.name ??
                        name,
                    ]}
                    labelFormatter={(label) =>
                      `${label}. godina${isRate ? (Number(label) < 2021 ? ' · Izračunato' : ' · Službeno objavljeno') : ''}`
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
          <ChartLegend
            items={data.members.map((member, index) => ({
              label: member.municipality.name,
              color: colors[index],
            }))}
          />
          <ul className="missing-metric-list">
            {data.members
              .filter(
                (m) =>
                  m.metrics[displayKey].value === null ||
                  m.metrics[displayKey].quality_status !== 'available',
              )
              .map((member) => (
                <li key={member.municipality.id}>
                  <strong>{member.municipality.name}:</strong>{' '}
                  {compareReason(member.metrics[displayKey].reason ?? 'quality_requires_review')}
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
          {compact && (
            <p className="compare-table-hint">Pomaknite tablicu vodoravno za sve stupce.</p>
          )}
          <table>
            <caption className="sr-only">
              {isRate ? 'Otpad izvan miješanog toka' : definition.label} ({unit})
            </caption>
            <thead>
              <tr>
                <th scope="col">Grad / općina</th>
                {mode === 'snapshot' ? (
                  <>
                    <th scope="col">Vrijednost · {data.year}.</th>
                    <th scope="col">
                      Razlika u odnosu na {baselineName} · {unitLabel(definition.difference_unit)}
                    </th>
                    {definition.family === 'per_person' && (
                      <th scope="col">Objavljeno ukupno kg/stan.</th>
                    )}
                  </>
                ) : (
                  years.map((year) => (
                    <th key={year} scope="col">
                      {year}.{' '}
                      {isRate && (
                        <small>{year < 2021 ? 'Izračunato' : 'Službeno objavljeno'}</small>
                      )}
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
                    {member.municipality.id === data.baseline_id && <small>Početna lokacija</small>}
                  </th>
                  {mode === 'snapshot' ? (
                    <>
                      <td>
                        {formatMetric(member.metrics[displayKey])}
                        {member.metrics[displayKey].value === null && (
                          <small>{compareReason(member.metrics[displayKey].reason)}</small>
                        )}
                        {member.metrics[displayKey].quality_status === 'review_required' && (
                          <small>Potrebna provjera</small>
                        )}
                      </td>
                      <td>
                        {formatMetric(member.differences[displayKey])}
                        {member.differences[displayKey].value === null && (
                          <small>{compareReason(member.differences[displayKey].reason)}</small>
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
                        {formatMetric(historyMetric(member, year, historyKey(year)))}
                        {historyMetric(member, year, historyKey(year))?.quality_status ===
                          'review_required' && <small>Nesklad · potrebna provjera</small>}
                        {historyMetric(member, year, historyKey(year))?.value == null && (
                          <small>
                            {compareReason(historyMetric(member, year, historyKey(year))?.reason)}
                          </small>
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
        Izvori i kvaliteta prikazani su niže za svaku lokaciju. Graf je dostupan tipkovnicom; iste
        su vrijednosti u tablici. Materijalne kategorije ne zbrajaju se i ne pretvaraju u tone.
      </p>
      {isRate && (
        <RateEvidence
          records={data.members.flatMap((member) =>
            member.history
              .filter((o) => mode === 'history' || o.year === data.year)
              .map((observation) => ({ name: member.municipality.name, observation })),
          )}
        />
      )}
    </section>
  );
}
